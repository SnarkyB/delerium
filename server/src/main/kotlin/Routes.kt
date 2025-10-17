import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import io.ktor.http.*
import io.ktor.server.routing.*

fun Routing.apiRoutes(repo: PasteRepo, rl: TokenBucket?, pow: PowService?, cfg: AppConfig) {
    route("/api") {
        get("/pow") {
            if (cfg.powEnabled && pow != null) call.respond(pow.newChallenge())
            else call.respond(HttpStatusCode.NoContent)
        }
        post("/pastes") {
            if (rl != null) {
                val ip = call.request.headers["X-Forwarded-For"]?.split(",")?.first()?.trim() 
                    ?: call.request.origin.remoteHost
                if (!rl.allow("POST:$ip")) {
                    call.respond(HttpStatusCode.TooManyRequests, ErrorResponse("rate_limited")); return@post
                }
            }
            val body = try { call.receive<CreatePasteRequest>() } catch (_: Exception) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse("invalid_json")); return@post
            }
            if (cfg.powEnabled && pow != null) {
                val sub = body.pow ?: run {
                    call.respond(HttpStatusCode.BadRequest, ErrorResponse("pow_required")); return@post
                }
                if (!pow.verify(sub.challenge, sub.nonce)) {
                    call.respond(HttpStatusCode.BadRequest, ErrorResponse("pow_invalid")); return@post
                }
            }
            val ctSize = base64UrlSize(body.ct)
            val ivSize = base64UrlSize(body.iv)
            if (ctSize <= 0 || ivSize !in 12..64 || ctSize > cfg.maxSizeBytes) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse("size_invalid")); return@post
            }
            if (body.meta.expireTs <= (System.currentTimeMillis()/1000L) + 10) {
                call.respond(HttpStatusCode.BadRequest, ErrorResponse("expiry_too_soon")); return@post
            }
            val id = Ids.randomId(cfg.idLength)
            val deleteToken = Ids.randomId(24)
            try {
                repo.create(id, body.ct, body.iv, body.meta, deleteToken)
                call.respond(CreatePasteResponse(id, deleteToken))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, ErrorResponse("db_error"))
            }
        }
        get("/pastes/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val row = repo.getIfAvailable(id) ?: return@get call.respond(HttpStatusCode.NotFound)
            val payload = repo.toPayload(row)
            if (repo.shouldDeleteAfterView(row)) {
                repo.delete(id)
            } else {
                repo.incrementViews(id)
            }
            call.respond(payload)
        }
        delete("/pastes/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            val token = call.request.queryParameters["token"] ?: return@delete call.respond(
                HttpStatusCode.BadRequest, ErrorResponse("missing_token"))
            val ok = repo.deleteIfTokenMatches(id, token)
            if (!ok) call.respond(HttpStatusCode.Forbidden, ErrorResponse("invalid_token"))
            else call.respond(HttpStatusCode.NoContent)
        }
    }
}
