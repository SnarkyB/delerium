import java.security.SecureRandom

object Ids {
    private val alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    private val rnd = SecureRandom()
    fun randomId(len: Int): String =
        (0 until len).map { alphabet[rnd.nextInt(alphabet.length)] }.joinToString("")
}

fun base64UrlSize(bytesB64Url: String): Int {
    val s = bytesB64Url.replace("-", "+").replace("_", "/")
    val pad = (4 - s.length % 4) % 4
    val total = s.length + pad
    return (total / 4) * 3
}
