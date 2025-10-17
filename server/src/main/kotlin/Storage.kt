import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.deleteWhere
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import java.security.MessageDigest
import java.time.Instant

object Pastes : Table("pastes") {
    val id = varchar("id", 32).uniqueIndex()
    val ct = text("ct")
    val iv = text("iv")
    val expireTs = long("expire_ts")
    val viewsAllowed = integer("views_allowed").nullable()
    val viewsUsed = integer("views_used").default(0)
    val singleView = bool("single_view").default(false)
    val mime = varchar("mime", 128).nullable()
    val deleteTokenHash = varchar("delete_token_hash", 128)
    val createdAt = long("created_at")
}

class PasteRepo(private val db: Database, private val pepper: String) {
    init { transaction(db) { SchemaUtils.createMissingTablesAndColumns(Pastes) } }

    private fun hashToken(raw: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        md.update(pepper.toByteArray())
        val out = md.digest(raw.toByteArray())
        return out.joinToString("") { "%02x".format(it) }
    }

    fun create(id: String, ct: String, iv: String, meta: PasteMeta, rawDeleteToken: String) {
        val now = Instant.now().epochSecond
        transaction(db) {
            Pastes.insert {
                it[Pastes.id] = id
                it[Pastes.ct] = ct
                it[Pastes.iv] = iv
                it[Pastes.expireTs] = meta.expireTs
                it[Pastes.viewsAllowed] = meta.viewsAllowed
                it[Pastes.singleView] = meta.singleView ?: false
                it[Pastes.mime] = meta.mime
                it[Pastes.deleteTokenHash] = hashToken(rawDeleteToken)
                it[Pastes.createdAt] = now
            }
        }
    }

    fun getIfAvailable(id: String): ResultRow? = transaction(db) {
        val now = Instant.now().epochSecond
        Pastes.selectAll().where { Pastes.id eq id and (Pastes.expireTs greater now) }.singleOrNull()
    }

    fun incrementViews(id: String) = transaction(db) {
        val row = Pastes.selectAll().where { Pastes.id eq id }.singleOrNull() ?: return@transaction
        val allowed = row[Pastes.viewsAllowed]
        val used = row[Pastes.viewsUsed]
        if (allowed != null && used >= allowed) return@transaction
        Pastes.update({ Pastes.id eq id }) { it[viewsUsed] = used + 1 }
    }

    fun deleteIfTokenMatches(id: String, rawToken: String): Boolean = transaction(db) {
        val hash = hashToken(rawToken)
        val row = Pastes.selectAll().where { Pastes.id eq id }.singleOrNull() ?: return@transaction false
        if (row[Pastes.deleteTokenHash] != hash) return@transaction false
        Pastes.deleteWhere { Pastes.id eq id } > 0
    }

    fun delete(id: String): Boolean = transaction(db) {
        Pastes.deleteWhere { Pastes.id eq id } > 0
    }

    fun shouldDeleteAfterView(row: ResultRow): Boolean {
        val single = row[Pastes.singleView]
        val allowed = row[Pastes.viewsAllowed]
        val used = row[Pastes.viewsUsed]
        return single || (allowed != null && used + 1 >= allowed)
    }

    fun toPayload(row: ResultRow): PastePayload {
        val allowed = row[Pastes.viewsAllowed]
        val used = row[Pastes.viewsUsed]
        val left = allowed?.let { (it - used).coerceAtLeast(0) }
        return PastePayload(
            ct = row[Pastes.ct],
            iv = row[Pastes.iv],
            meta = PasteMeta(
                expireTs = row[Pastes.expireTs],
                viewsAllowed = row[Pastes.viewsAllowed],
                mime = row[Pastes.mime],
                singleView = row[Pastes.singleView]
            ),
            viewsLeft = left
        )
    }
}
