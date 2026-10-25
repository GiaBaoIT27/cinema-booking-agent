# Docker — chạy toàn bộ stack (backend + agent + frontend + infra)

## Yêu cầu

- Docker Desktop (Docker Engine ≥ 24) với Compose v2
- (Tùy chọn) Google API key cho agent: lấy tại https://aistudio.google.com/apikey

## Quy mô stack

| Service   | Container       | Port host | Port trong network      | Ghi chú                                    |
| --------- | --------------- | --------- | ------------------------ | ------------------------------------------ |
| frontend  | cinema_frontend | 3001      | 3001                     | Next.js demo fixture (không gọi API)        |
| backend   | cinema_backend  | 3000      | 3000                     | NestJS, prefix `/api/v1`                    |
| agent     | cinema_agent    | 3002      | 3002                     | LangGraph + Gemini, SSE                     |
| postgres  | cinema_postgres | 5432      | 5432                     | cinema_admin / cinema_password / cinema_db  |
| redis     | cinema_redis    | 6379      | 6379                     | cache + seat hold                           |
| redisinsight | cinema_redisinsight | 5540 | 5540                  | UI xem Redis (tùy chọn)                     |

Network nội mạng: backend trả lời tại `http://backend:3000/api/v1`, postgres tại `postgres:5432`, redis tại `redis:6379` — **không dùng localhost bên trong compose**.

## Chạy nhanh

```bash
#1. (Tùy chọn, cho agent) tạo file .env ở ROOT repo:
#    GOOGLE_API_KEY=your_key_here
#    # AGENT_JWT_SECRET=...  (để trống vẫn chạy — backend tự verify JWT)

#2. Build + khởi động toàn bộ
docker compose up -d --build

#3. Xem trạng thái (chờ3 service app HEALTHY)
docker compose ps

#4. Seed dữ liệu mẫu (sau khi backend HEALTHY — schema do TypeORM synchronize tạo)
docker compose run --rm backend node -r dotenv/config dist/database/seeds/run-seed.js
```

Smoke-test:

```bash
curl http://localhost:3000/api/v1/movies        # backend
curl http://localhost:3002/health               # agent
curl http://localhost:3001                      # frontend
```

## Biến môi trường

- **backend**: đọc `apps/cinema-backend/.env` (env_file trong compose), rồi **override**
  `DB_HOST=postgres`, `REDIS_HOST=redis`, `NODE_ENV=development` (synchronize=true vì dự án
  chưa có migration — KHÔNG đặt production ở cấu hình này).
- **agent**: đọc `apps/cinema-agent/.env`, override `BACKEND_API_URL=http://backend:3000/api/v1`
  và `CORS_ORIGINS=http://localhost:3001`. `GOOGLE_API_KEY` lấy từ `.env` **gốc** (compose
  substitution) — thiếu key thì container agent sẽ dừng lúc khởi động (đúng hành vi designed).
- **frontend**: không cần secret — app demo fixture, không gọi backend/DB.

## Seed dữ liệu

```bash
docker compose run --rm backend node -r dotenv/config dist/database/seeds/run-seed.js
```

> Không dùng `npm run db:seed` trong container: script đó chạy lại `npm run build`
> (cần devDependencies đã bị prune ở image runner). Ảnh đã build sẵn `dist/`.

## Kiểm thử

```bash
# Unit test agent (backend giả + mô hình giả — không cần Gemini key)
docker compose run --rm agent npm test

# Typecheck / build từng app khi develop local (không qua Docker)
cd apps/cinema-agent && npm run typecheck
cd apps/cinema-backend && npm run build
```

## Lệnh thường dùng

```bash
docker compose logs -f backend      # log1 service
docker compose up -d --build backend  # build lại1 service
docker compose down                  # dừng (giữ dữ liệu postgres volume)
docker compose down -v               # dừng + XÓA dữ liệu (reset DB)
```

## Ghi chú cấu hình

- `apps/*/Dockerfile` dùng multi-stage: build (tsc/next build) → runner chỉ chứa
  deps production + artifact. `.dockerignore` loại `node_modules`, `dist`, `.env`.
- Backend `NODE_ENV=development` trong compose là **chủ đích** (TypeORM tự sync schema).
  Sang production thật sự thì cần migration + `NODE_ENV=production`.
- Agent `JWT_SECRET` để trống thì agent chỉ đọc token và chuyển nguyên cho backend verify;
  điền cùng `JWT_ACCESS_SECRET` của backend nếu muốn agent tự check chữ ký.
