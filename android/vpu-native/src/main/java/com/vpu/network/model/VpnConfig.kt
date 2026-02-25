package com.vpu.network.model

data class VpnConfig(
  val mode: String = "BALANCED",
  val rotateExitNodeMinutes: Int = 5,
  val enforcePrivateDns: Boolean = true,
  val failStrategy: String = "FAIL_CLOSED",
  val dnsPolicy: DnsPolicy = DnsPolicy(),
  val providerPolicies: Map<String, ProviderPolicy> = emptyMap(),
  val blockingMode: String = "HARD_BLOCK"
)

data class DnsPolicy(
  val blocklist: List<String> = emptyList(),
  val allowlist: List<String> = emptyList(),
  val version: String = "local"
)

data class ProviderPolicy(
  val trackerBlocking: Boolean = true,
  val queryMutation: Boolean = true,
  val locationMasking: Boolean = true,
  val locationRadiusMiles: Int = 50,
  val notifyOnBlock: Boolean = true,
  val allowExceptions: List<String> = emptyList()
)
