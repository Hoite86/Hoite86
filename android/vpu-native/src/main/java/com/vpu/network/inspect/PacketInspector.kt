package com.vpu.network.inspect

data class PacketHostResolution(
  val host: String?,
  val protocol: String,
  val confidence: Double
)

object PacketInspector {
  fun inspect(packet: ByteArray, length: Int): PacketHostResolution {
    if (length < 1) {
      return PacketHostResolution(null, "unknown", 0.0)
    }

    val version = (packet[0].toInt() ushr 4) and 0x0F
    return when (version) {
      4 -> inspectIpv4(packet, length)
      6 -> inspectIpv6(packet, length)
      else -> PacketHostResolution(null, "unknown", 0.0)
    }
  }

  private fun inspectIpv4(packet: ByteArray, length: Int): PacketHostResolution {
    if (length < 20) return PacketHostResolution(null, "ipv4", 0.0)
    val ihl = (packet[0].toInt() and 0x0F) * 4
    if (ihl < 20 || length < ihl + 8) return PacketHostResolution(null, "ipv4", 0.0)

    val protocol = packet[9].toInt() and 0xFF
    return when (protocol) {
      17 -> inspectUdp(packet, length, ihl)
      6 -> inspectTcp(packet, length, ihl)
      else -> PacketHostResolution(null, "ipv4", 0.0)
    }
  }

  private fun inspectIpv6(packet: ByteArray, length: Int): PacketHostResolution {
    if (length < 48) return PacketHostResolution(null, "ipv6", 0.0)
    val nextHeader = packet[6].toInt() and 0xFF
    val payloadOffset = 40

    return when (nextHeader) {
      17 -> inspectUdp(packet, length, payloadOffset)
      6 -> inspectTcp(packet, length, payloadOffset)
      else -> PacketHostResolution(null, "ipv6", 0.0)
    }
  }

  private fun inspectUdp(packet: ByteArray, length: Int, offset: Int): PacketHostResolution {
    if (length < offset + 8) return PacketHostResolution(null, "udp", 0.0)

    val srcPort = ((packet[offset].toInt() and 0xFF) shl 8) or (packet[offset + 1].toInt() and 0xFF)
    val dstPort = ((packet[offset + 2].toInt() and 0xFF) shl 8) or (packet[offset + 3].toInt() and 0xFF)
    val payloadStart = offset + 8

    if (dstPort == 53 || srcPort == 53) {
      val host = parseDnsQuestion(packet, payloadStart, length)
      return PacketHostResolution(host, "dns", if (host != null) 1.0 else 0.2)
    }

    if (dstPort == 443 || srcPort == 443) {
      val host = parseQuicInitialForSni(packet, payloadStart, length)
      if (host != null) {
        return PacketHostResolution(host, "quic", 0.75)
      }

      // (Later Date) Complete QUIC CRYPTO reassembly for fragmented Initial packets.
      return PacketHostResolution(null, "quic", 0.2)
    }

    return PacketHostResolution(null, "udp", 0.0)
  }

  private fun inspectTcp(packet: ByteArray, length: Int, offset: Int): PacketHostResolution {
    if (length < offset + 20) return PacketHostResolution(null, "tcp", 0.0)
    val dataOffset = ((packet[offset + 12].toInt() ushr 4) and 0x0F) * 4
    if (dataOffset < 20) return PacketHostResolution(null, "tcp", 0.0)

    val payloadStart = offset + dataOffset
    if (payloadStart >= length) return PacketHostResolution(null, "tcp", 0.0)

    val host = parseTlsSni(packet, payloadStart, length)
    if (host != null) {
      return PacketHostResolution(host, "tls", 0.9)
    }

    // (Later Date) Add stream reassembly for split TLS records across multiple TCP segments.
    return PacketHostResolution(null, "tls", 0.1)
  }

  private fun parseDnsQuestion(packet: ByteArray, payloadStart: Int, length: Int): String? {
    if (length < payloadStart + 12) return null

    var cursor = payloadStart + 12
    val labels = mutableListOf<String>()

    while (cursor < length) {
      val labelLen = packet[cursor].toInt() and 0xFF
      if (labelLen == 0) break
      if (labelLen > 63 || cursor + 1 + labelLen > length) return null

      val label = packet.copyOfRange(cursor + 1, cursor + 1 + labelLen).toString(Charsets.UTF_8)
      labels.add(label)
      cursor += 1 + labelLen
    }

    return if (labels.isNotEmpty()) labels.joinToString(".") else null
  }

  private fun parseTlsSni(packet: ByteArray, payloadStart: Int, length: Int): String? {
    if (length < payloadStart + 5) return null

    val contentType = packet[payloadStart].toInt() and 0xFF
    if (contentType != 22) return null

    val tlsRecordLength = ((packet[payloadStart + 3].toInt() and 0xFF) shl 8) or
      (packet[payloadStart + 4].toInt() and 0xFF)
    val recordEnd = payloadStart + 5 + tlsRecordLength
    if (tlsRecordLength <= 0 || recordEnd > length) return null

    val handshakeBytes = packet.copyOfRange(payloadStart + 5, recordEnd)
    return parseSniFromClientHello(handshakeBytes)
  }

  private fun parseQuicInitialForSni(packet: ByteArray, payloadStart: Int, length: Int): String? {
    if (length < payloadStart + 6) return null

    val first = packet[payloadStart].toInt() and 0xFF
    val longHeader = (first and 0x80) != 0
    val initialPacketType = ((first ushr 4) and 0x03) == 0
    if (!longHeader || !initialPacketType) return null

    // Heuristic scan for embedded TLS ClientHello in QUIC CRYPTO payload.
    // Robust QUIC frame parsing is still required for production.
    val payload = packet.copyOfRange(payloadStart, length)
    val handshakeIndex = payload.indexOf(0x01)
    if (handshakeIndex < 0 || handshakeIndex + 4 >= payload.size) return null

    val candidate = payload.copyOfRange(handshakeIndex, payload.size)
    return parseSniFromClientHello(candidate)
  }

  private fun parseSniFromClientHello(handshake: ByteArray): String? {
    if (handshake.size < 42) return null
    if ((handshake[0].toInt() and 0xFF) != 1) return null

    var cursor = 4 // handshake header
    cursor += 2 // version
    cursor += 32 // random

    if (cursor >= handshake.size) return null
    val sessionIdLength = handshake[cursor].toInt() and 0xFF
    cursor += 1 + sessionIdLength

    if (cursor + 2 > handshake.size) return null
    val cipherLength = ((handshake[cursor].toInt() and 0xFF) shl 8) or (handshake[cursor + 1].toInt() and 0xFF)
    cursor += 2 + cipherLength

    if (cursor >= handshake.size) return null
    val compressionLength = handshake[cursor].toInt() and 0xFF
    cursor += 1 + compressionLength

    if (cursor + 2 > handshake.size) return null
    val extensionsLength = ((handshake[cursor].toInt() and 0xFF) shl 8) or (handshake[cursor + 1].toInt() and 0xFF)
    cursor += 2
    val extensionsEnd = cursor + extensionsLength
    if (extensionsEnd > handshake.size) return null

    while (cursor + 4 <= extensionsEnd) {
      val extType = ((handshake[cursor].toInt() and 0xFF) shl 8) or (handshake[cursor + 1].toInt() and 0xFF)
      val extLength = ((handshake[cursor + 2].toInt() and 0xFF) shl 8) or (handshake[cursor + 3].toInt() and 0xFF)
      cursor += 4
      if (cursor + extLength > extensionsEnd) return null

      if (extType == 0) {
        if (cursor + 2 > extensionsEnd) return null
        val listLength = ((handshake[cursor].toInt() and 0xFF) shl 8) or (handshake[cursor + 1].toInt() and 0xFF)
        cursor += 2
        if (cursor + listLength > extensionsEnd || cursor + 3 > extensionsEnd) return null

        val nameType = handshake[cursor].toInt() and 0xFF
        if (nameType != 0) return null

        val nameLength = ((handshake[cursor + 1].toInt() and 0xFF) shl 8) or (handshake[cursor + 2].toInt() and 0xFF)
        if (cursor + 3 + nameLength > extensionsEnd) return null

        return handshake.copyOfRange(cursor + 3, cursor + 3 + nameLength).toString(Charsets.UTF_8)
      }

      cursor += extLength
    }

    return null
  }

  private fun ByteArray.indexOf(target: Int): Int {
    for (i in indices) {
      if ((this[i].toInt() and 0xFF) == target) return i
    }
    return -1
  }
}
