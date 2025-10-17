data class CreatePasteRequest(
    val ct: String,
    val iv: String,
    val meta: PasteMeta,
    val pow: PowSubmission? = null
)
data class PasteMeta(
    val expireTs: Long,
    val viewsAllowed: Int? = null,
    val mime: String? = null,
    val singleView: Boolean? = null
)
data class PowSubmission(val challenge: String, val nonce: Long)
data class CreatePasteResponse(val id: String, val deleteToken: String)
data class PastePayload(val ct: String, val iv: String, val meta: PasteMeta, val viewsLeft: Int?)
data class ErrorResponse(val error: String)
