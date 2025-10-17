# Zero‑Knowledge Paste (Ktor + Docker Compose)

A Pastebin‑style app where the server never sees plaintext. All crypto happens in the browser.
- Client: AES‑GCM via Web Crypto; key lives in the URL **fragment**.
- Server: Ktor stores only ciphertext + minimal metadata.
- Reverse proxy: Nginx serves static client and proxies `/api` to Ktor.
- PoW + simple rate‑limit for abuse mitigation.

## Quick start

```bash
export DELETION_TOKEN_PEPPER=$(openssl rand -hex 16)   # recommended
docker compose up --build
# open http://localhost:8080
```

## Layout
- `client/` – static HTML/JS (encrypt/decrypt in browser)
- `server/` – Ktor backend + SQLite (at /data in container)
- `reverse-proxy/nginx.conf` – serves client + proxies /api
- `docker-compose.yml` – brings it all together

## API (server)
- `GET /api/pow` → `{ challenge, difficulty, expiresAt }` or 204 if disabled
- `POST /api/pastes` with `{ ct, iv, meta:{expireTs, singleView?, viewsAllowed?, mime?}, pow? }`
  → `{ id, deleteToken }`
- `GET /api/pastes/:id` → `{ ct, iv, meta, viewsLeft }`
- `DELETE /api/pastes/:id?token=...` → 204 if valid

## Notes
- Keys are never sent to the server (in `#fragment`).
- Set CSP/headers are strict both in Ktor and Nginx.
- Data volume `server-data` persists ciphertext DB across restarts.
- Adjust PoW difficulty in `server/src/main/resources/application.conf`.
