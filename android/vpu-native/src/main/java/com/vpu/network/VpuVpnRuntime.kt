package com.vpu.network

import org.json.JSONArray
import org.json.JSONObject

object VpuVpnRuntime {
  @Volatile
  var status: String = "idle"

  @Volatile
  var metrics: String = "{}"

  private val decisionBuffer: ArrayDeque<JSONObject> = ArrayDeque()
  private const val maxDecisions = 200

  @Synchronized
  fun pushDecision(decision: JSONObject) {
    decisionBuffer.addLast(decision)
    while (decisionBuffer.size > maxDecisions) {
      decisionBuffer.removeFirst()
    }
  }

  @Synchronized
  fun recentDecisionsJson(): String {
    val array = JSONArray()
    decisionBuffer.forEach { array.put(it) }
    return array.toString()
  }
}
