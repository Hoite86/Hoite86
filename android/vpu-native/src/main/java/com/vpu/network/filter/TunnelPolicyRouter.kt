package com.vpu.network.filter

import com.vpu.network.model.ProviderPolicy

class TunnelPolicyRouter {
  private val providerMappings: Map<String, List<String>> = mapOf(
    "Google" to listOf("google.com", "gstatic.com", "googleapis.com", "youtube.com"),
    "Meta" to listOf("facebook.com", "fbcdn.net", "instagram.com", "whatsapp.com"),
    "TikTok" to listOf("tiktok.com", "byteoversea.com", "tiktokcdn.com"),
    "Microsoft" to listOf("microsoft.com", "bing.com", "live.com"),
    "Messaging" to listOf("signal.org", "telegram.org", "discord.com")
  )

  fun resolveProvider(host: String): String {
    val normalized = host.lowercase()
    providerMappings.entries.forEach { entry ->
      if (entry.value.any { suffix -> normalized == suffix || normalized.endsWith(".$suffix") }) {
        return entry.key
      }
    }
    return "Unknown"
  }

  fun shouldBlockHost(
    host: String,
    blockList: List<String>,
    allowList: List<String>,
    providerPolicies: Map<String, ProviderPolicy>
  ): Pair<Boolean, String> {
    val provider = resolveProvider(host)
    val providerPolicy = providerPolicies[provider]

    if (allowList.any { suffix -> host == suffix || host.endsWith(".$suffix") }) {
      return Pair(false, provider)
    }

    if (providerPolicy?.allowExceptions?.any { suffix -> host == suffix || host.endsWith(".$suffix") } == true) {
      return Pair(false, provider)
    }

    if (providerPolicy != null && !providerPolicy.trackerBlocking) {
      return Pair(false, provider)
    }

    val blocked = blockList.any { suffix -> host == suffix || host.endsWith(".$suffix") }
    return Pair(blocked, provider)
  }
}
