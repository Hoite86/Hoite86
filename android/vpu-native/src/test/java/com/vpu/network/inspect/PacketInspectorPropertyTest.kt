package com.vpu.network.inspect

import kotlin.random.Random
import org.junit.Assert.assertNotNull
import org.junit.Test

class PacketInspectorPropertyTest {
  @Test
  fun parser_should_not_crash_on_random_payloads() {
    repeat(5000) {
      val size = Random.nextInt(1, 2048)
      val payload = ByteArray(size) { Random.nextInt(0, 256).toByte() }
      val result = PacketInspector.inspect(payload, payload.size)
      assertNotNull(result)
    }
  }
}
