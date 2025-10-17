# ---- builder ----
FROM gradle:8.10.2-jdk17 AS builder
WORKDIR /build
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src
RUN gradle --no-daemon clean installDist

# ---- runner ----
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=builder /build/build/install/zk-paste-server/ /app/
ENV DELETION_TOKEN_PEPPER=change-me
VOLUME ["/data"]
EXPOSE 8080
ENTRYPOINT ["/app/bin/zk-paste-server"]
