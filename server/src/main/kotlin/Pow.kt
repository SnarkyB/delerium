import java.security.SecureRandom
import java.time.Instant
import java.security.MessageDigest
import java.util.Base64

data class PowChallenge(val challenge: String, val difficulty: Int, val expiresAt: Long)

class PowService(private val difficulty: Int, private val ttlSeconds: Int) {
    private val rand = SecureRandom()
    private val cache = mutableMapOf<String, Long>() // challenge -> expiry

    fun newChallenge(): PowChallenge {
        val bytes = ByteArray(16)
        rand.nextBytes(bytes)
        val ch = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        val exp = Instant.now().epochSecond + ttlSeconds
        cache[ch] = exp
        return PowChallenge(ch, difficulty, exp)
    }

    fun verify(challenge: String, nonce: Long): Boolean {
        val exp = cache[challenge] ?: return false
        if (Instant.now().epochSecond > exp) return false
        val md = MessageDigest.getInstance("SHA-256")
        val input = "$challenge:$nonce".toByteArray()
        val digest = md.digest(input)
        val bits = leadingZeroBits(digest)
        val ok = bits >= difficulty
        if (ok) cache.remove(challenge)
        return ok
    }

    private fun leadingZeroBits(b: ByteArray): Int {
        var bits = 0
        for (by in b) {
            val v = by.toInt() and 0xff
            if (v == 0) { bits += 8; continue }
            bits += Integer.numberOfLeadingZeros(v) - 24
            break
        }
        return bits
    }
}
