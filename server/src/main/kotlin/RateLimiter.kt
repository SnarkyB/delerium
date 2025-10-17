import java.util.concurrent.ConcurrentHashMap
import kotlin.math.min

class TokenBucket(private val capacity: Int, private val refillPerMinute: Int) {
    private data class State(var tokens: Double, var last: Long)
    private val map = ConcurrentHashMap<String, State>()

    fun allow(key: String): Boolean {
        val nowMs = System.currentTimeMillis()
        val st = map.computeIfAbsent(key) { State(capacity.toDouble(), nowMs) }
        synchronized(st) {
            val elapsedMin = (nowMs - st.last) / 60000.0
            st.tokens = min(capacity.toDouble(), st.tokens + elapsedMin * refillPerMinute)
            st.last = nowMs
            return if (st.tokens >= 1.0) { st.tokens -= 1.0; true } else false
        }
    }
}
