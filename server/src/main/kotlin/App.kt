import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.serialization.jackson.jackson
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCallPipeline
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.plugins.calllogging.CallLogging
import io.ktor.server.plugins.compression.Compression
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.server.routing.routing
import org.jetbrains.exposed.sql.Database

data class AppConfig(
    val dbPath: String,
    val deletionPepper: String,
    val powEnabled: Boolean,
    val powDifficulty: Int,
    val powTtl: Int,
    val rlEnabled: Boolean,
    val rlCapacity: Int,
    val rlRefill: Int,
    val maxSizeBytes: Int,
    val idLength: Int
)

fun Application.module() {
    val cfg = environment.config
    val appCfg = AppConfig(
        dbPath = cfg.property("storage.dbPath").getString(),
        deletionPepper = System.getenv("DELETION_TOKEN_PEPPER") ?: "dev-pepper-change-me",
        powEnabled = cfg.propertyOrNull("storage.pow.enabled")?.getString()?.toBoolean() ?: true,
        powDifficulty = cfg.property("storage.pow.difficulty").getString().toInt(),
        powTtl = cfg.property("storage.pow.ttlSeconds").getString().toInt(),
        rlEnabled = cfg.propertyOrNull("storage.rateLimit.enabled")?.getString()?.toBoolean() ?: true,
        rlCapacity = cfg.property("storage.rateLimit.capacity").getString().toInt(),
        rlRefill = cfg.property("storage.rateLimit.refillPerMinute").getString().toInt(),
        maxSizeBytes = cfg.property("storage.paste.maxSizeBytes").getString().toInt(),
        idLength = cfg.property("storage.paste.idLength").getString().toInt()
    )

    install(Compression)
    install(ContentNegotiation) { jackson() }
    install(CallLogging) { level = org.slf4j.event.Level.INFO }
    install(CORS) {
        allowMethod(HttpMethod.Get); allowMethod(HttpMethod.Post); allowMethod(HttpMethod.Delete)
        anyHost(); allowHeaders { true }; exposeHeader(HttpHeaders.ContentType)
    }
    intercept(ApplicationCallPipeline.Setup) {
        call.response.headers.append("Referrer-Policy", "no-referrer")
        call.response.headers.append("X-Content-Type-Options", "nosniff")
        call.response.headers.append("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none';")
        call.response.headers.append("Permissions-Policy", "accelerometer=(), geolocation=(), camera=(), microphone=()")
    }

    val hikari = HikariDataSource(HikariConfig().apply {
        jdbcUrl = appCfg.dbPath
        maximumPoolSize = 5
    })
    val db = Database.connect(hikari)
    val repo = PasteRepo(db, appCfg.deletionPepper)
    val rl = if (appCfg.rlEnabled) TokenBucket(appCfg.rlCapacity, appCfg.rlRefill) else null
    val pow = if (appCfg.powEnabled) PowService(appCfg.powDifficulty, appCfg.powTtl) else null

    routing {
        apiRoutes(repo, rl, pow, appCfg)
    }
}
