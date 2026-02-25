package com.vpu.network

import android.app.Service
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import com.vpu.network.filter.TunnelPolicyRouter
import com.vpu.network.inspect.PacketInspector
import com.vpu.network.model.DnsPolicy
import com.vpu.network.model.ProviderPolicy
import com.vpu.network.model.VpnConfig
import org.json.JSONObject
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class VpuVpnService : VpnService() {
  private var vpnInterface: ParcelFileDescriptor? = null
  private val running = AtomicBoolean(false)
  private val ioExecutor = Executors.newSingleThreadExecutor()
  private val router = TunnelPolicyRouter()

  @Volatile
  private var status: String = "idle"

  @Volatile
  private var config: VpnConfig = VpnConfig()

  companion object {
    const val ACTION_START = "com.vpu.network.START"
    const val ACTION_STOP = "com.vpu.network.STOP"
    const val EXTRA_CONFIG = "config"

    @Volatile
    var lastMetricsJson: String = "{}"
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        VpuVpnRuntime.status = "starting"
        val payload = intent.getStringExtra(EXTRA_CONFIG) ?: "{}"
        config = parseConfig(payload)
        startTunnel()
      }
      ACTION_STOP -> stopTunnel()
    }

    return Service.START_STICKY
  }

  override fun onDestroy() {
    stopTunnel()
    ioExecutor.shutdownNow()
    super.onDestroy()
  }

  private fun startTunnel() {
    if (running.get()) {
      status = "active"
      VpuVpnRuntime.status = status
      return
    }

    status = "starting"
    VpuVpnRuntime.status = status

    val builder = Builder()
      .setSession("VPU Tunnel")
      .addAddress("10.13.37.2", 24)
      .addRoute("0.0.0.0", 0)
      .setMtu(1500)

    if (config.enforcePrivateDns) {
      builder.addDnsServer("1.1.1.1")
      builder.addDnsServer("9.9.9.9")
    }

    vpnInterface = builder.establish()

    if (vpnInterface == null) {
      status = "error"
      VpuVpnRuntime.status = status
      if (config.failStrategy == "FAIL_CLOSED") {
        stopSelf()
      }
      return
    }

    running.set(true)
    status = "active"
    VpuVpnRuntime.status = status

    ioExecutor.execute {
      val input = FileInputStream(vpnInterface!!.fileDescriptor)
      val output = FileOutputStream(vpnInterface!!.fileDescriptor)
      val packet = ByteArray(32767)
      var blockedCount = 0
      var forwardedPackets = 0
      var policyHits = 0
      var parsedHosts = 0
      var quicPackets = 0

      while (running.get()) {
        val length = input.read(packet)
        if (length <= 0) {
          continue
        }

        val resolution = PacketInspector.inspect(packet, length)
        if (resolution.host != null) {
          parsedHosts += 1
        }
        if (resolution.protocol == "quic") {
          quicPackets += 1
        }

        val host = resolution.host ?: "unknown.local"
        val (blocked, provider) = router.shouldBlockHost(
          host.lowercase(),
          config.dnsPolicy.blocklist,
          config.dnsPolicy.allowlist,
          config.providerPolicies
        )

        policyHits += 1
        val shouldEnforceHardBlock = config.blockingMode == "HARD_BLOCK" && blocked
        val shouldSoftBlock = config.blockingMode == "SOFT_BLOCK" && blocked

        VpuVpnRuntime.pushDecision(
          JSONObject()
            .put("host", host)
            .put("provider", provider)
            .put("blocked", shouldEnforceHardBlock)
            .put("softBlocked", shouldSoftBlock)
            .put("protocol", resolution.protocol)
            .put("confidence", resolution.confidence)
            .put("timestamp", System.currentTimeMillis())
        )

        if (shouldEnforceHardBlock) {
          blockedCount += 1
          if (config.failStrategy == "FAIL_CLOSED") {
            continue
          }
        }

        if (shouldSoftBlock) {
          blockedCount += 1
        }

        forwardedPackets += 1
        output.write(packet, 0, length)
      }

      val metrics = JSONObject()
        .put("status", status)
        .put("blockedDomains", blockedCount)
        .put("forwardedPackets", forwardedPackets)
        .put("policyHits", policyHits)
        .put("parsedHosts", parsedHosts)
        .put("quicPackets", quicPackets)
        .put("blockingMode", config.blockingMode)
        .put("policyVersion", config.dnsPolicy.version)
      lastMetricsJson = metrics.toString()
      VpuVpnRuntime.metrics = lastMetricsJson
    }
  }

  private fun stopTunnel() {
    running.set(false)
    status = "stopped"
    VpuVpnRuntime.status = status
    vpnInterface?.close()
    vpnInterface = null
    stopSelf()
  }

  private fun parseConfig(raw: String): VpnConfig {
    return try {
      val json = JSONObject(raw)
      val dnsPolicyJson = json.optJSONObject("dnsPolicy")
      val block = mutableListOf<String>()
      val allow = mutableListOf<String>()

      dnsPolicyJson?.optJSONArray("blocklist")?.let { arr ->
        for (i in 0 until arr.length()) block.add(arr.optString(i))
      }
      dnsPolicyJson?.optJSONArray("allowlist")?.let { arr ->
        for (i in 0 until arr.length()) allow.add(arr.optString(i))
      }

      val providerPolicies = mutableMapOf<String, ProviderPolicy>()
      val providerJson = json.optJSONObject("providerPolicies")
      providerJson?.keys()?.forEach { provider ->
        val p = providerJson.optJSONObject(provider)
        if (p != null) {
          val allowExceptions = mutableListOf<String>()
          p.optJSONArray("allowExceptions")?.let { arr ->
            for (i in 0 until arr.length()) allowExceptions.add(arr.optString(i))
          }

          providerPolicies[provider] = ProviderPolicy(
            trackerBlocking = p.optBoolean("trackerBlocking", true),
            queryMutation = p.optBoolean("queryMutation", true),
            locationMasking = p.optBoolean("locationMasking", true),
            locationRadiusMiles = p.optInt("locationRadiusMiles", 50),
            notifyOnBlock = p.optBoolean("notifyOnBlock", true),
            allowExceptions = allowExceptions
          )
        }
      }

      VpnConfig(
        mode = json.optString("mode", "BALANCED"),
        rotateExitNodeMinutes = json.optInt("rotateExitNodeMinutes", 5),
        enforcePrivateDns = json.optBoolean("enforcePrivateDns", true),
        failStrategy = json.optString("failStrategy", "FAIL_CLOSED"),
        blockingMode = json.optString("blockingMode", "HARD_BLOCK"),
        dnsPolicy = DnsPolicy(
          blocklist = block,
          allowlist = allow,
          version = dnsPolicyJson?.optString("version", "local") ?: "local"
        ),
        providerPolicies = providerPolicies
      )
    } catch (_error: Throwable) {
      VpnConfig()
    }
  }
}
