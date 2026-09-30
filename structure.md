# STRUCTURE.md — Cấu trúc dự án Cinema Booking Agent

> Tài liệu mô tả **cấu trúc thư mục, kiến trúc nội bộ và quy ước** của dự án,
> lập bằng khảo sát trực tiếp mã nguồn (không suy đoán).
> Khảo sát ngày 27/09/2026 — commit `11c0930`, nhánh `main`.

---

## 1. Tổng quan

**Cinema Booking Agent** là hệ thống quản lý rạp chiếu phim + đặt vé điện tử, định hướng tích hợp một **AI booking agent**.

Dự án tổ chức theo kiểu **monorepo nhẹ**:

| Thuộc tính | Giá trị |
| --- | --- |
| Kiểu cấu trúc | Monorepo-style (chỉ phân chia ranh giới thư mục) |
| Package manager ở root | **Không có** — không `package.json` ở root, không workspace |
| Quản lý phụ thuộc | Mỗi app tự có `package.json` + `package-lock.json` (npm) |
| App chạy được | **1** (`cinema-backend`) |
| App chờ khởi tạo | **3** (`cinema-frontend`, `cinema-mobile`, `cinema-agent`) |
| Backend framework | **NestJS 12** (TypeScript, ESM) |
| ORM | **TypeORM** |
| Database | **PostgreSQL 16** |
| Cache / Distributed lock | **Redis 7** (`ioredis` + `redlock`) |
| Xác thực | **JWT** (`passport-jwt`) — Access + Refresh token |
| Test runner | **Vitest** (chưa có file test nào) |
| Linter | **oxlint** (không dùng ESLint) |
| Format | **Prettier** |
| Phân tích phụ thuộc | **dependency-cruiser** |

> ⚠️ Monorepo ở đây **chỉ là ranh giới thư mục**. Không có workspace, không có shared package, không có turbo/nx.

---

## 2. Cây thư mục toàn dự án

```text
cinema-booking-agent/
│
├── .editorconfig                  # Quy ước indentation (2 spaces, LF, UTF-8)
├── .gitignore                     # Bỏ node_modules, dist, .env, venv, .next, .expo...
├── README.md                      # Tài liệu tổng: cách cấu hình & chạy dự án
├── docker-compose.yml             # PostgreSQL 16 + Redis 7 (dev infrastructure)
│
├── .github/
│   └── README.md                  # Placeholder — CI/CD chưa thiết lập
│
├── docs/
│   └── README.md                  # Placeholder — tài liệu dự án sẽ đặt ở đây
│
├── packages/
│   └── README.md                  # Placeholder — shared package khi có nhu cầu thật
│
└── apps/
    ├── cinema-agent/
    │   └── README.md              # Placeholder — AI booking agent (chưa khởi tạo)
    │
    ├── cinema-frontend/
    │   └── README.md              # Placeholder — Web app (chưa khởi tạo)
    │
    ├── cinema-mobile/
    │   └── README.md              # Placeholder — Mobile app (chưa khởi tạo)
    │
    └── cinema-backend/            # ★ Ứng dụng duy nhất đang chạy được
        ├── .env                   # Biến môi trường LOCAL (gitignored)
        ├── .env.example           # Template biến môi trường (đã commit)
        ├── .prettierrc            # singleQuote: true, trailingComma: all
        ├── README.md              # README mặc định của NestJS starter
        │
        ├── deps.html              # ✦ Output dependency-cruiser
        ├── deps.sv                # ✦ Output dependency-cruiser
        ├── deps.svg               # ✦ Output dependency-cruiser
        │
        ├── nest-cli.json          # Cấu hình Nest CLI (sourceRoot: src)
        ├── oxlint.json            # Cấu hình lint rules
        ├── package.json           # Scripts + dependencies
        ├── package-lock.json      # Lock file npm
        ├── tsconfig.json          # Cấu hình TypeScript (path aliases)
        ├── tsconfig.build.json    # Cấu hình build (chỉ include src/)
        ├── tsconfig.build.tsbuildinfo  # Cache incremental build
        ├── vitest.config.ts       # Cấu hình unit test (*.spec.ts)
        ├── vitest.config.e2e.ts   # Cấu hình e2e test (*.e2e-spec.ts)
        │
        └── src/
            ├── main.ts            # Entry point — bootstrap ứng dụng
            ├── app.module.ts      # Root module — lắp ráp toàn bộ hệ thống
            │
            ├── common/            # ★ Hạ tầng dùng chung
            ├── config/            # ★ Cấu hình theo namespace
            ├── database/          # ★ Seeder dữ liệu mẫu
            └── modules/           # ★ 16 feature modules
```

**Chú giải**

- `★` = thành phần cốt lõi của backend.
- `✦` = file sinh tự động bởi `dependency-cruiser`, không phải mã nguồn viết tay.
- **Không tồn tại** thư mục `test/` trong backend (đã kiểm tra trực tiếp).
- **Không tồn tại** file `*.spec.ts` hay `*.e2e-spec.ts` nào trong toàn repo.

---

## 3. Phân tích tầng gốc (Root)

### 3.1 `.editorconfig`

```ini
root = true
[*]        charset=utf-8, LF, indent=2 spaces, insert_final_newline, trim trailing ws
[*.md]     không trim trailing whitespace
```

### 3.2 `.gitignore`

| Nhóm | Rules |
| --- | --- |
| Build | `node_modules/`, `dist/`, `build/`, `coverage/`, `*.tsbuildinfo` |
| Secret | `.env`, `.env.*` (trừ `.env.example`), `apps/*/.env`, `apps/*/.env.*` |
| Python | `venv/`, `.venv/`, `__pycache__/`, `*.py[cod]` |
| Frontend/Tooling | `.next/`, `.expo/`, `.turbo/` |
| OS/Editor | `.DS_Store`, `Thumbs.db`, `.idea/`, `.vscode/` |

> Rules Python/Next/Expo/Turbopack được đặt sẵn — ám chỉ các app đó *dự kiến* sẽ dùng các stack này.

### 3.3 `docker-compose.yml`

```yaml
version: "3.8"
services:
  postgres:   # postgres:16-alpine  → container: cinema_postgres
              # user: cinema_admin / pass: cinema_password / db: cinema_db
              # port: 5432:5432  | volume: postgres_data
  redis:      # redis:7-alpine    → container: cinema_redis
              # port: 6379:6379   (không có volume)
volumes:
  postgres_data:
```

Chứa **infrastructure**, **không** chứa app backend. Backend chạy trực tiếp trên máy dev bằng `npm run start:dev`.

### 3.4 `.github/`, `docs/`, `packages/`

Cả ba chỉ có `README.md` nội dung placeholder — chưa có workflow CI/CD, chưa có tài liệu, chưa có package dùng chung.

---

## 4. Bốn ứng dụng trong `apps/`

| App | Trạng thái | Nội dung thực tế |
| --- | --- | --- |
| `cinema-backend` | ✅ Chạy được | ~290 file mã nguồn TypeScript |
| `cinema-frontend` | ⏳ Chưa khởi tạo | Chỉ `README.md` |
| `cinema-mobile` | ⏳ Chưa khởi tạo | Chỉ `README.md` |
| `cinema-agent` | ⏳ Chưa khởi tạo | Chỉ `README.md` |

README của ba app placeholder đều cùng một cấu trúc:

```md
# <Tên App>
<Mô tả 1 dòng>

Status: Pending initialization.
```

Mô tả từng app (theo README gốc):

- **Cinema Backend** — backend NestJS hiện có, `apps/cinema-backend`.
- **Cinema Frontend** — web app cho trải nghiệm khách hàng + quản trị.
- **Cinema Mobile** — app mobile cho khách hàng.
- **Cinema Agent** — AI booking agent.

---

## 5. `apps/cinema-backend` — Chi tiết

### 5.1 File cấu hình ở thư mục app

#### `package.json`

```json
{
  "name": "cinema-backend-new",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "imports": {
    "#src/*":     "./dist/*",
    "#modules/*": "./dist/modules/*"
  }
}
```

**Scripts**

| Script | Lệnh | Mục đích |
| --- | --- | --- |
| `build` | `nest build` | Build sang `dist/` |
| `start` | `nest start` | Chạy 1 lần |
| `start:dev` | `nest start --watch` | **Chạy dev (watch)** |
| `start:debug` | `nest start --debug --watch` | Chạy debug |
| `start:prod` | `node dist/main` | Chạy production |
| `deploy` | `nest deploy` | Deploy (Nest Mau) |
| `db:seed` | `npm run build && node -r dotenv/config dist/database/seeds/run-seed.js` | Seed dữ liệu |
| `lint` | `oxlint src/ test/` | Lint |
| `format` | `prettier --write "src/**/*.ts" "test/**/*.ts"` | Format |
| `test` | `vitest run` | Unit test |
| `test:watch` | `vitest` | Watch test |
| `test:cov` | `vitest run --coverage` | Coverage |
| `test:debug` | `vitest --inspect-brk --no-file-parallelism` | Debug test |
| `test:e2e` | `vitest run --config ./vitest.config.e2e.ts` | E2E test |

**Dependencies (runtime)**

| Nhóm | Packages |
| --- | --- |
| NestJS core | `@nestjs/common`, `core`, `config`, `platform-express` (`^12.x`) |
| NestJS integration | `@nestjs/typeorm`, `jwt`, `passport`, `mapped-types`, `cache-manager` |
| ORM / DB | `typeorm`, `pg` |
| Auth | `passport`, `passport-jwt`, `bcrypt` |
| Cache / Lock | `ioredis`, `redlock`, `cache-manager` |
| Validation | `class-validator`, `class-transformer` |
| Upload | `cloudinary`, `multer` |
| Khác | `rxjs`, `reflect-metadata` |

**DevDependencies chính:** `@nestjs/cli`, `@nestjs/schematics`, `@nestjs/testing`, `typescript ^6`, `vitest ^4`, `@vitest/coverage-v8`, `vite-tsconfig-paths`, `oxlint`, `prettier`, `supertest`, `dependency-cruiser`, `source-map-support`.

> ⚠️ `@types/ioredis` vẫn nằm trong devDependencies dù `ioredis` đã có sẵn types — là tàn dư.
> ⚠️ `package.json` có `"lint": "oxlint src/ test/"` nhưng thư mục `test/` không tồn tại.

#### `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "module": "nodenext", "moduleResolution": "nodenext",
    "target": "ES2023", "strict": true,
    "experimentalDecorators": true, "emitDecoratorMetadata": true,
    "outDir": "./dist", "incremental": true,
    "types": ["vitest/globals", "node"],
    "paths": {
      "#src/*":     ["./src/*"],
      "#modules/*": ["./src/modules/*"]
    }
  }
}
```

**Điểm quan trọng**

- `module: nodenext` + `"type": "module"` → **bắt buộc** khi import file nội bộ phải kèm đuôi `.js`
  (vd: `import { AppModule } from './app.module.js'` dù file gốc là `.ts`).
- Hai path alias: `#src/*` → `./src/*`, `#modules/*` → `./src/modules/*`.
- `strict: true` nhưng `strictPropertyInitialization: false` (phù hợp entity TypeORM dùng decorator).
- `types` chứa `vitest/globals` → dùng `describe/it/expect` không cần import.

#### `tsconfig.build.json`

Kế thừa `tsconfig.json`; `rootDir: ./src`, `include: ["src"]`,
`exclude: ["node_modules", "test", "dist", "**/*spec.ts"]`.

#### `nest-cli.json`

```json
{ "sourceRoot": "src", "compilerOptions": { "deleteOutDir": true } }
```

#### `oxlint.json`

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-floating-promises": "warn"
  },
  "env": { "node": true }
}
```

#### `.prettierrc`

```json
{ "singleQuote": true, "trailingComma": "all" }
```

#### Vitest

| File | `include` | Ghi chú |
| --- | --- | --- |
| `vitest.config.ts` | `**/*.spec.ts` | `globals: true`, dùng `vite-tsconfig-paths` |
| `vitest.config.e2e.ts` | `**/*.e2e-spec.ts` | `globals: true`, dùng `vite-tsconfig-paths` |

Cả hai đều `root: './'`.

#### `.env.example` — 27 biến, 5 nhóm

```env
# 1. Máy chủ     PORT=3000, NODE_ENV=development, API_PREFIX=api/v1
# 2. PostgreSQL   DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
# 3. JWT          JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES=30m
#                 JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES=7d
# 4. Cloudinary   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# 5. Redis        REDIS_HOST=127.0.0.1, REDIS_PORT=6379
```

> ⚠️ Cloudinary **bắt buộc** — `env.validation.ts` chặn khởi động nếu thiếu.
> File `.env` thật tồn tại trên máy dev nhưng đã bị `.gitignore`.
> `API_PREFIX=api/v1` có trong env nhưng `main.ts` **hardcode** chuỗi `'api/v1'` — biến này hiện chưa được đọc.

#### `deps.html` / `deps.sv` / `deps.svg`

Output của `dependency-cruiser` (xác nhận qua `<title>dependency-cruiser output</title>`).
Không có file cấu hình `.dependency-cruiser.*` nào được commit — cấu hình có thể đã bị xoá hoặc chạy bằng CLI flag.

---

### 5.2 Quy trình khởi động (Bootstrap)

#### `src/main.ts`

```text
NestFactory.create(AppModule)
  │
  ├─ app.enableCors()                          // Bật CORS (không cấu hình origin)
  ├─ app.setGlobalPrefix('api/v1')             // Mọi route đều /api/v1/...
  │
  ├─ app.useGlobalPipes(ValidationPipe)        // whitelist: true  → loại bỏ field thừa
  │                                             // transform: true  → ép kiểu sang DTO
  │                                             // lỗi → 422 UNPROCESSABLE_ENTITY
  │                                             // exceptionFactory trả về mảng
  │                                             //   [{ field, message }, ...]
  │
  ├─ app.useGlobalInterceptors(TransformInterceptor(Reflector))
  │                                             // Bọc response theo pattern chuẩn
  │
  ├─ app.useGlobalFilters(Rfc7807ExceptionFilter)
  │                                             // Lỗi theo chuẩn RFC 7807
  │                                             // (application/problem+json)
  │
  └─ app.listen(process.env.PORT ?? 3000)
```

#### `src/app.module.ts` — Root Module

**a) `ConfigModule.forRoot` (global)**

```ts
{
  isGlobal: true,
  envFilePath: '.env',
  validate: validateEnv,        // từ src/common/config/env.validation.ts
  load: [appConfig, databaseConfig, jwtConfig, redisConfig],
}
```

**b) `TypeOrmModule.forRootAsync`**

```ts
{
  type: 'postgres',
  host/port/username/password/database  ← configService.get('database.*'),
  autoLoadEntities: true,               // tự đăng ký entity của TypeOrmModule.forFeature
  synchronize: configService.get('database.synchronize'),
}
```

> `synchronize` đọc từ env → ở dev thường `true`. Dự án **không dùng TypeORM migration**.

**c) 17 module được lắp ráp (theo thứ tự khai báo)**

```text
AuthModule → RbacModule → UsersModule → CinemasModule → DistributorsModule
→ MoviesModule → GenresModule → LocationsModule → PromotionsModule → FnbModule
→ UploadModule → SeatTypeModule → BookingsModule → ShowtimesModule
→ RedisModule → OrdersModule → PaymentsModule
```

**d) 2 Global Guards (`APP_GUARD`) — chạy đúng theo thứ tự khai báo**

```text
1. JwtAuthGuard      → xác thực JWT, attach user vào request
2. PermissionsGuard  → kiểm tra quyền của user vừa được xác thực
```

**e) Middleware toàn cục**

```ts
consumer.apply(HeaderValidationMiddleware)
         .forRoutes({ path: '*', method: RequestMethod.ALL })
```

#### Luồng xử lý một request

```text
HTTP Request
   │
   ▼
HeaderValidationMiddleware        (middleware — path '*')
   │
   ▼
JwtAuthGuard                      (APP_GUARD #1)
   │  → @Public() bypass
   ▼
PermissionsGuard                  (APP_GUARD #2)
   │  → dựa trên @Permissions()
   ▼
ValidationPipe                    (global pipe — validate DTO)
   │
   ▼
Controller → Service → Repository (TypeORM) → PostgreSQL
                                    ↕
                            RedisService (cache / redlock)
   │
   ▼
TransformInterceptor              (bọc response)
   │
   ▼  (nếu có lỗi)
Rfc7807ExceptionFilter            (format lỗi RFC 7807)
```

---

### 5.3 `src/common/` — Hạ tầng dùng chung

```text
src/common/
├── config/
│   └── env.validation.ts              # validateEnv() — chặn boot nếu env thiếu/sai
│
├── decorators/
│   ├── api-message.decorator.ts       # @ApiMessage() — override message của response
│   ├── current-user.decorator.ts      # @CurrentUser() — lấy user từ request
│   ├── permissions.decorator.ts       # @Permissions(...) — metadata cho PermissionsGuard
│   └── public.decorator.ts            # @Public() — bypass JwtAuthGuard
│
├── dto/
│   └── base-response.dto.ts           # Cấu trúc response chuẩn
│
├── filters/
│   └── rfc7807-exception.filter.ts    # Lỗi → application/problem+json
│
├── guards/
│   ├── jwt-auth.guard.ts              # Global guard #1
│   └── permissions.guard.ts           # Global guard #2
│
├── interceptors/
│   └── transform.interceptor.ts       # Bọc response + đọc @ApiMessage qua Reflector
│
├── middleware/
│   └── header-validation.middleware.ts # Kiểm tra Accept header
│
├── redis/
│   ├── redis.constant.ts              # Key/token prefix
│   ├── redis.module.ts                # RedisModule (cung cấp RedisService)
│   └── redis.service.ts               # Wrapper ioredis + redlock
│
└── transformers/
    └── numeric.transformer.ts         # Transform số thập phân (TypeORM)
```

**Đặc điểm thiết kế**

- `common/` **không** phải một NestJS module — nó là thư viện helper import trực tiếp.
- Riêng `RedisModule` là module thật, được import vào `AppModule` và các module cần cache/lock.
- Guards / interceptors / filters được đăng ký **toàn cục** ở `app.module.ts` và `main.ts`,
  **không** đăng ký riêng lẻ theo từng module.

---

### 5.4 `src/config/` — Cấu hình theo namespace

| File | Namespace | Biến đọc vào |
| --- | --- | --- |
| `app.config.ts` | `app` | `PORT`, `NODE_ENV`, `API_PREFIX` |
| `database.config.ts` | `database` | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` |
| `jwt.config.ts` | `jwt` | `JWT_ACCESS_SECRET/EXPIRES`, `JWT_REFRESH_SECRET/EXPIRES` |
| `redis.config.ts` | `redis` | `REDIS_HOST`, `REDIS_PORT` |

Nạp qua `ConfigModule.forRoot({ load: [...] })` → truy cập bằng `configService.get('database.host')`.

> Khác với `common/config/env.validation.ts` (validate *tính bắt buộc*), `src/config/*` chỉ *đóng gói* giá trị.

---

### 5.5 `src/database/seeds/` — Seeder dữ liệu mẫu

**18 file** = 17 seeder đánh số + 1 file điều phối.

```text
src/database/seeds/
├── run-seed.ts                        # CLI điều phối (entry của npm run db:seed)
├── 1-permission.seed.ts               # PermissionSeeder
├── 2-role.seed.ts                     # RoleSeeder
├── 3-user.seed.ts                     # UserSeeder
├── 4-location.seed.ts                 # LocationSeeder
├── 5-distributor.seed.ts              # DistributorSeeder
├── 6-promotion.seed.ts                # PromotionSeeder
├── 7-fnb-item.seed.ts                 # FnbItemSeeder
├── 8-seat-type.seed.ts                # SeatTypeSeeder
├── 9-genre.seed.ts                    # GenreSeeder
├── 10-role-permissions.seed.ts        # RolePermissionSeeder
├── 11-cineplexe.seed.ts               # CineplexSeeder
├── 12-auditorium.seeder.ts            # AuditoriumSeeder  ← đuôi ".seeder" (lệ)
├── 13-seats.seed.ts                   # SeatSeeder
├── 14-movie.seed.ts                   # MovieSeeder
├── 15-price-rule.seed.ts              # PriceRuleSeeder
├── 16-showtime.seed.ts                # ShowtimeSeeder
└── 17-showtime-seat-price.seed.ts     # ShowtimeSeatPriceSeeder
```

**Cách `run-seed.ts` hoạt động**

```ts
import 'dotenv/config';
const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});
const dataSource = app.get(DataSource);
// new XSeeder().run(dataSource) cho từng seeder
await app.close();
```

- Dùng `createApplicationContext` → **không khởi động HTTP server**, không mở PORT.
- Lấy `DataSource` từ DI rồi truyền tay vào từng seeder.
- Chạy qua `npm run db:seed` = build trước → chạy `dist/database/seeds/run-seed.js` với `dotenv`.

> ⚠️ **Thứ tự thực thi KHÁC số prefix trên tên file.** Thứ tự thật trong `run-seed.ts`:

| # chạy | Seeder | File |
| --- | --- | --- |
| 1 | `RoleSeeder` | `2-role.seed.ts` |
| 2 | `PromotionSeeder` | `6-promotion.seed.ts` |
| 3 | `DistributorSeeder` | `5-distributor.seed.ts` |
| 4 | `LocationSeeder` | `4-location.seed.ts` |
| 5 | `FnbItemSeeder` | `7-fnb-item.seed.ts` |
| 6 | `SeatTypeSeeder` | `8-seat-type.seed.ts` |
| 7 | `GenreSeeder` | `9-genre.seed.ts` |
| 8 | `PermissionSeeder` | `1-permission.seed.ts` |
| 9 | `RolePermissionSeeder` | `10-role-permissions.seed.ts` |
| 10 | `UserSeeder` | `3-user.seed.ts` |
| 11 | `CineplexSeeder` | `11-cineplexe.seed.ts` |
| 12 | `AuditoriumSeeder` | `12-auditorium.seeder.ts` |
| 13 | `SeatSeeder` | `13-seats.seed.ts` |
| 14 | `MovieSeeder` | `14-movie.seed.ts` |
| 15 | `PriceRuleSeeder` | `15-price-rule.seed.ts` |
| 16 | `ShowtimeSeeder` | `16-showtime.seed.ts` |
| 17 | `ShowtimeSeatPriceSeeder` | `17-showtime-seat-price.seed.ts` |

Số prefix chỉ là **gợi ý thứ tự phụ thuộc**, không phải thứ tự chạy. Ngoài ra có **2 điểm không nhất quán**:
file `12-auditorium.seeder.ts` dùng đuôi `.seeder` thay vì `.seed`; số comment trong `run-seed.ts` bị lặp (gọi bước 15 hai lần).

---

### 5.6 `src/modules/` — 16 Feature Modules

#### Bảng tổng quan

| # | Module | File module | Controllers | Services | Entities | DTOs |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `auth` | `auth.module.ts` | 1 | 2 | — | 2 |
| 2 | `bookings` | `bookings.module.ts` | 1 | 2 | — | 3 |
| 3 | `cinemas` | `cinemas.module.ts` | 3 | 3 | 3 | 13 |
| 4 | `distributors` | `distributors.module.ts` | 1 | 1 | 1 | 5 |
| 5 | `fnb` | `fnb.module.ts` | 1 | 1 | 1 | 4 |
| 6 | `genres` | `genres.module.ts` | 1 | 1 | 2 | 4 |
| 7 | `locations` | `locations.module.ts` | 2 | 2 | 2 | 5 |
| 8 | `movies` | `movies.module.ts` | 1 | 1 | 1 | 10 |
| 9 | `orders` | `orders.module.ts` | 3 | 3 | 4 | 5 |
| 10 | `payments` | `payments.module.ts` | 1 | 1 | 1 | — |
| 11 | `promotions` | `promotions.module.ts` | 1 | 1 | 1 | 6 |
| 12 | `rbac` | `rbac.module.ts` | 4 | 4 | 4 | 12 |
| 13 | `seat-types` | `seat-types.module.ts` | 1 | 1 | 1 | 2 |
| 14 | `showtimes` | `showtimes.module.ts` | 2 | 2 | 4 | 17 |
| 15 | `upload` | `upload.module.ts` | — | 1 | — | — |
| 16 | `users` | `users.module.ts` | 1 | 1 | 1 | 5 |

**Tổng cộng: 16 module · 24 controllers · 27 services · 26 entities · 93 DTOs.**

> Đếm bằng glob: `*.controller.ts` = 24, `*.service.ts` = 27, `*.dto.ts` = 93,
> `*.entity.ts` = 25 + `fnb-item.entities.ts` = **26**,
> `*.enum.ts` = 27 + `showtime-seat-status.ts` = **28**.
> (Hai file sau **lệ tên** nên không khớp glob chuẩn.)

#### Hai pattern thư mục đang tồn tại song song

Dự án **chưa thống nhất** cách tổ chức thư mục module.

**Pattern A — “Flat”** (cũ hơn, dùng cho module đơn giản):

```text
<module>/
├── <module>.module.ts
├── <module>.controller.ts      ← nằm ngay trong thư mục
├── <module>.service.ts
├── constants/
├── dto/
├── entities/
└── enums/
```

Dùng bởi: `auth`, `distributors`, `fnb`, `genres`, `locations`, `movies`,
`payments`, `promotions`, `seat-types`, `users`.

**Pattern B — “Layered”** (mới hơn, tách controllers/services):

```text
<module>/
├── <module>.module.ts
├── controllers/                ← tách riêng
│   └── *.controller.ts
├── services/
│   └── *.service.ts
├── constants/
├── dto/
├── entities/
├── enums/
└── events/                     ← chỉ showtimes có
```

Dùng bởi: `bookings`, `cinemas`, `orders`, `rbac`, `showtimes`.

> Khi thêm module mới, **nên chọn Pattern B** để dần thống nhất.

#### Chi tiết từng module

**1. `auth` — Xác thực**

```text
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── constants/auth-redis.constant.ts
├── dto/  login.dto.ts · register.dto.ts
├── services/token-revocation.service.ts
└── strategies/jwt.strategy.ts
```

- Strategy JWT (`jwt.strategy.ts`) phục vụ `JwtAuthGuard`.
- `TokenRevocationService` dùng Redis để thu hồi token (logout / refresh rotation).
- `auth-redis.constant.ts` chứa key prefix cho phiên.

**2. `bookings` — Giữ ghế (seat hold)**

```text
bookings/
├── bookings.module.ts
├── constants/booking-redis.constant.ts
├── controllers/bookings.controller.ts
├── dto/  hold-seats.dto.ts · release-seats.dto.ts · confirm-booking.dto.ts
└── services/ booking.service.ts · seat-lock.service.ts
```

Module đăng ký `TypeOrmModule.forFeature([Showtime, ShowtimeSeat, ShowtimeSeatPrice, Seat])`
và **export** cả `BookingService` lẫn `SeatLockService` (module khác dùng lại).

- `SeatLockService` — phân bổ ghế tạm bằng **Redis lock (redlock)**, chống double-booking.
- 3 DTO tương ứng với 3 bước: `hold` → `release` → `confirm`.

**3. `cinemas` — Cụm rạp / phòng chiếu / ghế**

```text
cinemas/
├── cinemas.module.ts
├── constants/  auditorium-redis.constant.ts · cineplex-redis.constant.ts
├── controllers/ auditorium.controller.ts · cineplex.controller.ts · seat.controller.ts
├── dto/
│   ├── auditoriums/  create · update · query · update-status · create-seat-layout   (5)
│   ├── cineplexes/   create · update · update-status · query · query-showtimes
│   │                 · query-auditoriums · query-fnb-items                          (7)
│   └── seats/        update-seat.dto.ts                                             (1)
├── entities/  auditorium.entity.ts · cineplex.entity.ts · seat.entity.ts
├── enums/     audio-type · auditorium-status · cineplex-status
│              · screen-type · seat-status                                           (5)
└── services/  auditorium.service.ts · cineplex.service.ts · seat.service.ts
```

Module lớn thứ 2. `create-seat-layout.dto.ts` gợi ý có API tạo **bản đồ ghế theo lưới** (rows × seats).

**4. `distributors` — Nhà phát hành phim**

```text
distributors/
├── distributors.module.ts · distributors.controller.ts · distributors.service.ts
├── dto/  create · update · update-status · query · distributor-movies-query   (5)
├── entities/distributor.entity.ts
└── enums/distributor-status.enum.ts
```

**5. `fnb` — Đồ ăn / thức uống**

```text
fnb/
├── fnb.module.ts · fnb.controller.ts · fnb.service.ts
├── constants/fnb-redis.constant.ts
├── dto/  create · update · update-status · query                                  (4)
├── entities/fnb-item.entities.ts     ← đuôi ".entities" (số nhiều, lệ)
└── enums/ fnb-category.enum.ts · fnb-item-type.enum.ts
```

**6. `genres` — Thể loại phim**

```text
genres/
├── genres.module.ts · genres.controller.ts · genres.service.ts
├── constants/genre-redis.constant.ts
├── dto/  create · update · query · query-genre-movies                             (4)
└── entities/ genre.entity.ts · movie-genre.entity.ts   ← entity quan hệ N–N
```

**7. `locations` — Tỉnh / thành & phường/xã**

```text
locations/
├── locations.module.ts
├── provinces.controller.ts · provinces.service.ts
├── wards.controller.ts      · wards.service.ts        ← 2 resource trong 1 module
├── constants/location-redis.constant.ts
├── dto/  create-province · create-ward · query-province · query-wards
│         · query-province-wards                                                   (5)
├── entities/ province.entity.ts · ward.entity.ts
└── enums/    province-type.enum.ts · ward-type.enum.ts
```

**8. `movies` — Phim**

```text
movies/
├── movies.module.ts · movies.controller.ts · movies.service.ts
├── constants/movie-redis.constant.ts
├── dto/  create · create-response · update · update-status · update-genres
│         · get-movies-query · get-movie-showtimes-query
│         · movie-list-response · movie-detail-response
│         · movie-showtimes-response                                               (10)
├── entities/movie.entity.ts
├── enums/    movie-age-rating.enum.ts · movie-status.enum.ts
└── interfaces/movie-media.interface.ts   ← interface TS duy nhất trong các module
```

Module duy nhất có thư mục `interfaces/`.

**9. `orders` — Đơn hàng & vé**

```text
orders/
├── orders.module.ts
├── controllers/ order.controller.ts · order-fnb-details.controller.ts
│                · ticket.controller.ts
├── dto/  create-order · create-order-response · fnb-order-item
│         · get-tickets-query · ticket-list-response                                (5)
├── entities/ order.entity.ts · order-seat-details.entity.ts
│             · order-fnb-details.entity.ts · ticket.entity.ts                      (4)
├── enums/    order-status · order-channel · payment-method
│              · ticket-status · fnb-detail-status                                  (5)
└── services/  order.service.ts · order-fnb-details.service.ts · ticket.service.ts
```

Module tách rõ **2 dòng sản phẩm trong 1 đơn**: vé ghế (`order-seat-details` + `ticket`)
và F&B (`order-fnb-details`).

**10. `payments` — Thanh toán**

```text
payments/
├── payments.module.ts
├── payment.controller.ts
├── payment.service.ts
├── entities/payment-transaction.entity.ts
└── enums/    payment-gateway.enum.ts · payment-transaction-status.enum.ts
```

Module nhỏ nhất — **không có DTO nào**.

**11. `promotions` — Khuyến mãi**

```text
promotions/
├── promotions.module.ts · promotions.controller.ts · promotions.service.ts
├── dto/  create · update · update-status · query
│         · query-promotions-public · validate-promotion                            (6)
├── entities/promotion.entity.ts
├── enums/promotion.enum.ts
└── transformers/numeric.transformer.ts   ← bản copy, trùng với common/transformers
```

Có `query-promotions-public` (endpoint public, không cần login)
và `validate-promotion` (kiểm tra mã giảm giá khi đặt vé).

**12. `rbac` — Phân quyền**

```text
rbac/
├── rbac.module.ts
├── controllers/ roles.controller.ts · permissions.controller.ts
│                · role-permissions.controller.ts · user-roles.controller.ts        (4)
├── dto/
│   ├── permissions/       create · update · query                                  (3)
│   ├── role/              create · update · query · update-role-permissions        (4)
│   ├── role-permission/   append · update · query                                  (3)
│   └── user-role/         assign-user-role · sync-user-roles                       (2)
├── entities/ role.entity.ts · permission.entity.ts
│             · role-permission.entity.ts · user-role.entity.ts                     (4)
├── enums/role.enum.ts
└── services/ roles.service.ts · permissions.service.ts
              · role-permissions.service.ts · user-roles.service.ts                 (4)
```

4 entity = 4 bảng RBAC kinh điển: `role`, `permission`, `role_permission`, `user_role`.
Đây là module DTO lớn thứ 2 (12 cái).

**13. `seat-types` — Loại ghế**

```text
seat-types/
├── seat-types.module.ts · seat-type.controller.ts · seat-type.service.ts
├── constants/seat-type-redis.constant.ts
├── dto/  create-seat-type.dto.ts · update-seat-type.dto.ts
├── entities/seat-type.entity.ts
└── enums/seat-type-code.enum.ts
```

**14. `showtimes` — Suất chiếu & giá vé**

```text
showtimes/
├── showtimes.module.ts
├── constants/  showtime-redis.constant.ts · price-rule-redis.constant.ts
├── controllers/ showtime.controller.ts · price-rule.controller.ts
├── dto/                                                                        (17)
│   ├── showtime:  create · create-response · update · update-status · get-query
│   │              · detail-response · list-response
│   │              · seat-matrix-response · seat-price-response
│   ├── price rule: create · create-response · update · get-query
│   │              · detail-response · list-response
│   └── price override: override-seat-price · batch-override-seat-prices
├── entities/ showtime.entity.ts · showtime-seat.entity.ts
│             · showtime-seat-price.entity.ts · price-rules.entity.ts              (4)
├── enums/    showtime-status · showtime-seat-status
│              · projection-type · day-type                                         (4)
├── events/   showtime-cancelled.event.ts     ← module duy nhất có events/
└── services/ showtime.service.ts · price-rule.service.ts
```

Module **lớn nhất** theo số DTO (17). Import `RedisModule` trực tiếp.
Đây là module quan trọng nhất của domain — ghép `cinemas`(ghế) + `movies`(phim) + giá.

**15. `upload` — Upload ảnh (Cloudinary)**

```text
upload/
├── upload.module.ts
├── cloudinary.provider.ts     ← factory provider cấu hình Cloudinary
└── upload.service.ts
```

**Không có controller** — chỉ export service để các module khác gọi upload.

**16. `users` — Người dùng**

```text
users/
├── users.module.ts · users.controller.ts · users.service.ts
├── dto/  create-internal-user · update-me · assign-role
│         · update-user-status · query-users                                        (5)
├── entities/user.entity.ts
└── enums/ membership-tier.enum.ts · user-status.enum.ts
```

`assign-role.dto.ts` → module này nối với `rbac` để gán role cho user.
`create-internal-user` → endpoint tạo tài khoản nội bộ (staff/admin).

---

## 6. Mô hình dữ liệu — 26 Entities

### Bảng theo module

| Module | Entity | Ghi chú |
| --- | --- | --- |
| `users` | `user` | Người dùng (khách + nội bộ) |
| `rbac` | `role` · `permission` · `role_permission` · `user_role` | 4 bảng RBAC |
| `locations` | `province` · `ward` | Tỉnh/thành, phường/xã |
| `distributors` | `distributor` | Nhà phát hành phim |
| `genres` | `genre` · `movie_genre` | Thể loại + bảng ghép N–N |
| `movies` | `movie` | Phim |
| `cinemas` | `cineplex` · `auditorium` · `seat` | Cụm rạp → phòng chiếu → ghế |
| `seat-types` | `seat_type` | Loại ghế |
| `showtimes` | `showtime` · `showtime_seat` · `showtime_seat_price` · `price_rules` | Suất chiếu + trạng thái ghế + giá |
| `promotions` | `promotion` | Khuyến mãi |
| `fnb` | `fnb_item` | Đồ ăn/thức uống |
| `orders` | `order` · `order_seat_details` · `order_fnb_details` · `ticket` | Đơn hàng + chi tiết |
| `payments` | `payment_transaction` | Giao dịch thanh toán |

### Sơ đồ quan hệ chính (theo tên entity)

```text
province 1──n ward
   │
   └──n cineplex 1──n auditorium 1──n seat ──n seat_type
                              │
distributor 1──n movie n──n genre
                    │
                    └──n showtime 1──n showtime_seat 1──1 showtime_seat_price
                              │                 │
                              │                 └── price_rules
                              │
user 1──n role (qua user_role) n──n permission (qua role_permission)
   │
   └──n order 1──n order_seat_details ──n ticket
             └──n order_fnb_details ──n fnb_item
             │
             └──n payment_transaction
             │
             └── promotion
```

### Enum theo module (28 file)

| Module | Enums |
| --- | --- |
| `users` | `membership-tier`, `user-status` |
| `rbac` | `role` |
| `locations` | `province-type`, `ward-type` |
| `distributors` | `distributor-status` |
| `movies` | `movie-status`, `movie-age-rating` |
| `cinemas` | `cineplex-status`, `auditorium-status`, `seat-status`, `screen-type`, `audio-type` |
| `seat-types` | `seat-type-code` |
| `showtimes` | `showtime-status`, `showtime-seat-status`, `projection-type`, `day-type` |
| `promotions` | `promotion` |
| `fnb` | `fnb-category`, `fnb-item-type` |
| `orders` | `order-status`, `order-channel`, `payment-method`, `ticket-status`, `fnb-detail-status` |
| `payments` | `payment-gateway`, `payment-transaction-status` |

---

## 7. Quy ước code đang áp dụng

### 7.1 Import & module system

```ts
// ✅ Bắt buộc: đuôi .js cho file nội bộ (ESM + nodenext)
import { AppModule } from './app.module.js';
import { Showtime } from '#modules/showtimes/entities/showtime.entity.js';
import { RedisModule } from '#src/common/redis/redis.module.js';
```

- Dùng `#modules/*` khi import **chéo module**.
- Dùng `#src/*` khi import từ `common/`.
- Dùng relative `./` hoặc `../` khi import **nội bộ module**.

### 7.2 Cấu trúc file module (khuyến nghị — Pattern B)

```text
<module>/
├── <module>.module.ts      ← TypeOrmModule.forFeature + controllers + providers + exports
├── controllers/*.controller.ts
├── services/*.service.ts
├── constants/*-redis.constant.ts     ← key prefix Redis của module
├── dto/*.dto.ts                      ← request/response DTO (class-validator)
├── entities/*.entity.ts              ← TypeORM entity
├── enums/*.enum.ts
└── events/*.event.ts                 *(tùy chọn)*
```

### 7.3 Quy ước đặt tên

| Cái tên | Quy ước | Ví dụ |
| --- | --- | --- |
| File module | `<module>.module.ts` | `showtimes.module.ts` |
| Controller | `<resource>.controller.ts` | `showtime.controller.ts` |
| Service | `<resource>.service.ts` | `booking.service.ts` |
| DTO request | `<verb>-<resource>.dto.ts` | `create-showtime.dto.ts` |
| DTO response | `<verb>-<resource>-response.dto.ts` | `showtime-detail-response.dto.ts` |
| DTO query | `query-<x>.dto.ts` / `get-<x>-query.dto.ts` | `get-showtimes-query.dto.ts` |
| Entity | `<resource>.entity.ts` (số ít) | `movie.entity.ts` |
| Enum | `<resource>-<thing>.enum.ts` | `movie-status.enum.ts` |
| Redis constant | `<resource>-redis.constant.ts` | `booking-redis.constant.ts` |
| Seeder | `<n>-<resource>.seed.ts` | `14-movie.seed.ts` |

> ⚠️ Có vài điểm **lệ**: `fnb-item.entities.ts` (số nhiều), `price-rules.entity.ts` (số nhiều),
> `12-auditorium.seeder.ts` (`.seeder` thay vì `.seed`).

### 7.4 Response & lỗi

- Response thành công đi qua `TransformInterceptor`.
- Lỗi đi qua `Rfc7807ExceptionFilter` → `application/problem+json`.
- Lỗi validation → **422** với mảng `[{ field, message }, ...]`.
- `@ApiMessage()` để đổi message của response thành công.

### 7.5 Bảo mật

- `JwtAuthGuard` + `PermissionsGuard` đăng ký **global** → mặc định mọi endpoint **đều cần đăng nhập**.
- Endpoint public phải đánh dấu `@Public()`.
- Quyền hạn khai báo bằng `@Permissions(...)`.

### 7.6 Xử lý số thập phân — code trùng lặp

Có **2 bản** `numeric.transformer.ts`:

- `src/common/transformers/numeric.transformer.ts`
- `src/modules/promotions/transformers/numeric.transformer.ts`

→ Nên gộp về `common/` và bỏ bản trong `promotions`.

---

## 8. Chạy dự án & kiểm thử

### 8.1 Thứ tự khởi động local

```bash
# 1. Ở root — bật infrastructure
docker compose up -d                # → postgres:5432, redis:6379

# 2. Sang backend
cd apps/cinema-backend
copy .env.example .env              # rồi điền JWT secret + Cloudinary credentials
npm install

# 3. (tuỳ chọn) seed dữ liệu mẫu
npm run db:seed

# 4. Chạy dev
npm run start:dev                   # → http://localhost:3000/api/v1
```

```bash
docker compose down                 # dừng infrastructure khi xong
```

### 8.2 Bảng lệnh backend

| Lệnh | Việc làm |
| --- | --- |
| `npm run start:dev` | Dev server (watch) |
| `npm run build` | Build production |
| `npm run start:prod` | Chạy production |
| `npm run db:seed` | Seed dữ liệu (build trước) |
| `npm run lint` | oxlint |
| `npm run format` | Prettier |
| `npm test` | Vitest unit |
| `npm run test:e2e` | Vitest e2e |
| `npm run test:cov` | Coverage |

### 8.3 Trạng thái kiểm thử

| Hạng mục | Trạng thái |
| --- | --- |
| Thư mục `test/` | ❌ **Không tồn tại** |
| File `*.spec.ts` | ❌ **Không có** |
| File `*.e2e-spec.ts` | ❌ **Không có** |
| `vitest.config.ts` | ✅ Có |
| `vitest.config.e2e.ts` | ✅ Có |
| `@nestjs/testing`, `supertest` | ✅ Đã cài |
| CI/CD (`.github/workflows`) | ❌ Chưa có |

→ **Test infra đã sẵn sàng nhưng chưa có test nào được viết.**

---

## 9. Trạng thái & hạn chế hiện tại

### 9.1 Đã sẵn sàng

- ✅ `apps/cinema-backend` chạy được với PostgreSQL + Redis.
- ✅ 16 feature module, 26 entity, seed đầy đủ 17 bước.
- ✅ Auth (JWT) + RBAC + validation + format lỗi chuẩn.
- ✅ Redis cache & distributed lock (redlock) cho giữ ghế.

### 9.2 Hạn chế (theo README gốc + khảo sát)

1. **Chỉ 1 app chạy được** — `cinema-frontend`, `cinema-mobile`, `cinema-agent` đều là placeholder.
2. **Không có workspace ở root** — không `package.json` gốc, mỗi app tự quản lý npm riêng.
3. **Không có CI/CD** — `.github/` chỉ có README.
4. **Không có test nào** dù test infra đã cấu hình xong.
5. **Không dùng TypeORM migration** — dựa vào `synchronize` từ env.
6. **`API_PREFIX` env không được đọc** — `main.ts` hardcode `'api/v1'`.
7. **Cloudinary bắt buộc** — thiếu là backend không khởi động được.
8. **Hai pattern thư mục module song song** — Flat vs Layered chưa thống nhất.
9. **Code trùng** — `numeric.transformer.ts` có 2 bản.
10. **Đặt tên file không nhất quán** — `.entities`, `.seeder`, `price-rules`.
11. **Chưa có tài liệu API** — không Swagger/OpenAPI (`@nestjs/swagger` không nằm trong dependencies).
12. **Chưa có app AI agent** — mục tiêu chính của repo (`cinema-agent`) chưa bắt đầu.

---

## 10. Phụ lục

### 10.1 Thống kê nhanh

| Hạng mục | Số lượng |
| --- | --- |
| Apps trong `apps/` | 4 (1 chạy được, 3 placeholder) |
| File mã nguồn backend | ~290 |
| Feature modules | 16 |
| Module cài ở `AppModule` | 17 (gồm `RedisModule`) |
| Controllers | 24 |
| Services | 27 |
| Entities | 26 |
| DTOs | 93 |
| Enums | 28 |
| File seed | 18 (17 seeder + 1 runner) |
| Global guards | 2 |
| File test | 0 |

### 10.2 Tech stack tóm tắt

```text
Runtime     Node.js (ESM, TypeScript 6, target ES2023)
Framework   NestJS 12 (@nestjs/common, core, config, typeorm, jwt, passport)
ORM         TypeORM + pg
Cache       Redis 7 (ioredis, redlock, cache-manager, @nestjs/cache-manager)
Auth        JWT (passport-jwt, bcrypt) — access 30m / refresh 7d
Upload      Cloudinary + Multer
Validation  class-validator + class-transformer (ValidationPipe global)
Lint        oxlint
Format      Prettier
Test        Vitest 4 + Supertest + @vitest/coverage-v8
Analysis    dependency-cruiser
Infra       Docker Compose (postgres:16-alpine, redis:7-alpine)
```

### 10.3 Điểm cần lưu ý khi làm việc với repo này

1. **Luôn import với đuôi `.js`** cho file nội bộ, nếu không sẽ lỗi build với `nodenext`.
2. **Endpoint mặc định cần đăng nhập** — dùng `@Public()` nếu muốn cho phép anonymous.
3. **Response đã được bọc sẵn** — đừng tự trả `{ data, ... }` thêm lần nữa.
4. **Lỗi validation là 422**, không phải 400.
5. **Không có migration** — đổi entity = đổi schema trực tiếp qua `synchronize`.
6. **Không có test** — nếu thêm tính năng, nên viết test (infra đã sẵn).
