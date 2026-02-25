package com.vpu.network

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.vpu.network.filter.TunnelPolicyRouter
import com.vpu.network.model.ProviderPolicy
import org.json.JSONObject

class VpuVpnModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val router = TunnelPolicyRouter()
  private var lastConfig: JSONObject = JSONObject()

  override fun getName(): String = "VpuVpnModule"

  @ReactMethod
  fun startTunnel(config: String, promise: Promise) {
    try {
      lastConfig = JSONObject(config)
      val intent = Intent(reactContext, VpuVpnService::class.java).apply {
        action = VpuVpnService.ACTION_START
        putExtra(VpuVpnService.EXTRA_CONFIG, config)
      }
      reactContext.startService(intent)
      VpuVpnRuntime.status = "starting"
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("VPN_START_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun stopTunnel(promise: Promise) {
    try {
      val intent = Intent(reactContext, VpuVpnService::class.java).apply {
        action = VpuVpnService.ACTION_STOP
      }
      reactContext.startService(intent)
      VpuVpnRuntime.status = "stopped"
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("VPN_STOP_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    promise.resolve(VpuVpnRuntime.status)
  }

  @ReactMethod
  fun getMetrics(promise: Promise) {
    promise.resolve(VpuVpnRuntime.metrics)
  }

  @ReactMethod
  fun getRecentDecisions(promise: Promise) {
    promise.resolve(VpuVpnRuntime.recentDecisionsJson())
  }

  @ReactMethod
  fun evaluateHost(host: String, promise: Promise) {
    try {
      val dnsPolicy = lastConfig.optJSONObject("dnsPolicy") ?: JSONObject()
      val blockList = mutableListOf<String>()
      val allowList = mutableListOf<String>()
      dnsPolicy.optJSONArray("blocklist")?.let { arr ->
        for (i in 0 until arr.length()) blockList.add(arr.optString(i))
      }
      dnsPolicy.optJSONArray("allowlist")?.let { arr ->
        for (i in 0 until arr.length()) allowList.add(arr.optString(i))
      }

      val providerPolicies = mutableMapOf<String, ProviderPolicy>()
      val providerJson = lastConfig.optJSONObject("providerPolicies")
      providerJson?.keys()?.forEach { provider ->
        providerJson.optJSONObject(provider)?.let { p ->
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

      val result = router.shouldBlockHost(host.lowercase(), blockList, allowList, providerPolicies)
      val response = JSONObject()
        .put("host", host.lowercase())
        .put("provider", result.second)
        .put("blocked", result.first)
      promise.resolve(response.toString())
    } catch (error: Throwable) {
      promise.reject("VPN_EVAL_FAILED", error.message, error)
    }
  }
}
