plugins {
    kotlin("jvm") version "2.0.0"
    application
}
repositories { mavenCentral() }
dependencies {
    val ktor = "3.0.0"
    implementation("io.ktor:ktor-server-core-jvm:$ktor")
    implementation("io.ktor:ktor-server-netty-jvm:$ktor")
    implementation("io.ktor:ktor-server-content-negotiation-jvm:$ktor")
    implementation("io.ktor:ktor-serialization-jackson-jvm:$ktor")
    implementation("io.ktor:ktor-server-cors-jvm:$ktor")
    implementation("io.ktor:ktor-server-compression-jvm:$ktor")
    implementation("io.ktor:ktor-server-call-logging-jvm:$ktor")
    implementation("io.ktor:ktor-server-rate-limit-jvm:$ktor")
    implementation("ch.qos.logback:logback-classic:1.5.12")

    implementation("org.jetbrains.exposed:exposed-core:0.54.0")
    implementation("org.jetbrains.exposed:exposed-dao:0.54.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.54.0")
    implementation("com.zaxxer:HikariCP:5.1.0")
    implementation("org.xerial:sqlite-jdbc:3.46.0.0")

    implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")
}
application { mainClass.set("AppKt") }
kotlin { jvmToolchain(17) }
