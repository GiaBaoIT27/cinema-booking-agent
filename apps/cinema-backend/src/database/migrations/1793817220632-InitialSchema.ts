import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793817220632 implements MigrationInterface {
  name = 'InitialSchema1793817220632';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "promotions" ("id" BIGSERIAL NOT NULL, "code" character varying(50) NOT NULL, "discount_type" character varying(20) NOT NULL, "discount_value" numeric(12,2) NOT NULL, "max_discount_amount" numeric(12,2), "min_order_amount" numeric(12,2) NOT NULL DEFAULT '0', "usage_limit" integer, "used_count" integer NOT NULL DEFAULT '0', "start_date" TIMESTAMP NOT NULL, "end_date" TIMESTAMP NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8ab10e580f70c3d2e2e4b31ebf2" UNIQUE ("code"), CONSTRAINT "PK_380cecbbe3ac11f0e5a7c452c34" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b768cab9aae627f93319736b8b" ON "promotions"  ("is_active", "start_date", "end_date") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8ab10e580f70c3d2e2e4b31ebf" ON "promotions"  ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" BIGSERIAL NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(255), "is_system" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE ("code"), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id")); COMMENT ON COLUMN "roles"."code" IS 'Mã định danh (SUPER_ADMIN, CINEMA_MANAGER, ...)'; COMMENT ON COLUMN "roles"."name" IS 'Tên hiển thị (Quản lý Rạp, Nhân viên Soát vé, ...)'; COMMENT ON COLUMN "roles"."description" IS 'Mô tả chi tiết phạm vi quyền hạn'; COMMENT ON COLUMN "roles"."is_system" IS 'Đánh dấu vai trò mặc định của hệ thống'`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("role_id" bigint NOT NULL, "permission_id" bigint NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" BIGSERIAL NOT NULL, "code" character varying(100) NOT NULL, "name" character varying(100) NOT NULL, "module" character varying(50) NOT NULL, "description" character varying(255), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id")); COMMENT ON COLUMN "permissions"."code" IS 'Mã hành động chuẩn resource:action (VD: movie:create)'; COMMENT ON COLUMN "permissions"."name" IS 'Tên hiển thị quyền hạn (VD: Tạo mới phim)'; COMMENT ON COLUMN "permissions"."module" IS 'Nhóm chức năng (MOVIE_MANAGEMENT, SHOWTIME_MANAGEMENT, ...)'; COMMENT ON COLUMN "permissions"."description" IS 'Mô tả chi tiết quyền'`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("id" BIGSERIAL NOT NULL, "user_id" bigint NOT NULL, "role_id" bigint NOT NULL, "cineplex_id" bigint, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8acd5cf26ebd158416f477de799" PRIMARY KEY ("id")); COMMENT ON COLUMN "user_roles"."cineplex_id" IS 'Cụm rạp làm việc (NULL = Toàn hệ thống / Global Scope)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_user_role_global_unique" ON "user_roles"  ("user_id", "role_id") WHERE cineplex_id IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_user_role_cineplex_unique" ON "user_roles"  ("user_id", "role_id", "cineplex_id") WHERE cineplex_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "seat_types" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "code" character varying(20) NOT NULL, "name" character varying(50) NOT NULL, "price_multiplier" numeric(3,2) NOT NULL DEFAULT '1', "surcharge_amount" numeric(15,2) NOT NULL DEFAULT '0', "color_code" character varying(10) NOT NULL, "seat_count" integer NOT NULL DEFAULT '1', "description" character varying(255), "display_order" integer NOT NULL DEFAULT '1', CONSTRAINT "UQ_bf0bac69a10beea12d050138021" UNIQUE ("code"), CONSTRAINT "CHK_350e32b0385b47c560c74c4dab" CHECK ("color_code" ~* '^#[0-9A-Fa-f]{6}$'), CONSTRAINT "CHK_ab0367f98b78ac9f554a9d2e19" CHECK ("seat_count" >= 1), CONSTRAINT "CHK_4dad0c6c1ff65a9a570c400b2b" CHECK ("surcharge_amount" >= 0.00), CONSTRAINT "CHK_c99f0a986d22a6ea6e1c4c6506" CHECK ("price_multiplier" >= 1.00), CONSTRAINT "PK_cc30b45350e85f39187f4fe1606" PRIMARY KEY ("id")); COMMENT ON COLUMN "seat_types"."created_at" IS 'Thời điểm bản ghi được khởi tạo'; COMMENT ON COLUMN "seat_types"."updated_at" IS 'Thời điểm bản ghi được cập nhật gần nhất'; COMMENT ON COLUMN "seat_types"."deleted_at" IS 'Thời điểm xóa mềm (Null nếu chưa bị xóa)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_seat_types_code_unique" ON "seat_types"  ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "price_rules" ("id" BIGSERIAL NOT NULL, "cineplex_id" bigint, "projection_type" character varying(20) NOT NULL DEFAULT '2D', "day_type" character varying(20) NOT NULL DEFAULT 'WEEKDAY', "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "base_price" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_bc2ba1057ace0e61bda89f587f" CHECK ("end_time" > "start_time"), CONSTRAINT "CHK_ea35d85955e8a24540064be50c" CHECK ("base_price" >= 0.00), CONSTRAINT "PK_332f84d0bdaa08303a9292653f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_price_rules_cineplex_id" ON "price_rules"  ("cineplex_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_price_rules_lookup" ON "price_rules"  ("projection_type", "day_type", "start_time") `,
    );
    await queryRunner.query(
      `CREATE TABLE "showtime_seats" ("showtime_id" bigint NOT NULL, "seat_id" bigint NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'AVAILABLE', "user_id" bigint, "hold_expires_at" TIMESTAMP, "order_code" character varying(64), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_67fd77b244071aed7faad558a80" PRIMARY KEY ("showtime_id", "seat_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "showtimes" ("id" BIGSERIAL NOT NULL, "auditorium_id" bigint NOT NULL, "movie_id" bigint NOT NULL, "projection_type" character varying(20) NOT NULL DEFAULT '2D', "audio_language" character varying(50) NOT NULL, "subtitle_language" character varying(50), "start_time" TIMESTAMP NOT NULL, "end_time" TIMESTAMP NOT NULL, "cleaning_minutes" integer NOT NULL DEFAULT '15', "status" character varying(20) NOT NULL DEFAULT 'SCHEDULED', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_839fbbb54f144edd34fa877161" CHECK ("cleaning_minutes" >= 0), CONSTRAINT "CHK_3d59c190c648947678429a01bc" CHECK ("end_time" > "start_time"), CONSTRAINT "PK_2d979092e692ec1a7b505893ee2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_showtimes_auditorium_id" ON "showtimes"  ("auditorium_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_showtimes_movie_id" ON "showtimes"  ("movie_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_showtimes_status" ON "showtimes"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "showtime_seat_prices" ("showtime_id" bigint NOT NULL, "seat_type_id" bigint NOT NULL, "final_price" numeric(12,2) NOT NULL, "is_overridden" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_a2ba2df013fded033a53f7ea1b" CHECK ("final_price" >= 0), CONSTRAINT "PK_7a25f56409f0038fd615f33331a" PRIMARY KEY ("showtime_id", "seat_type_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_showtime_seat_prices_seat_type_id" ON "showtime_seat_prices"  ("seat_type_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "full_name" character varying(150) NOT NULL, "email" character varying(100) NOT NULL, "phone_number" character varying(20) NOT NULL, "password_hash" character varying(255) NOT NULL, "date_of_birth" date, "membership_tier" character varying(20) NOT NULL DEFAULT 'MEMBER', "loyalty_points" integer NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_17d1817f241f10a3dbafb169fd2" UNIQUE ("phone_number"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")); COMMENT ON COLUMN "users"."full_name" IS 'Họ và tên người dùng'; COMMENT ON COLUMN "users"."email" IS 'Email đăng nhập & nhận vé'; COMMENT ON COLUMN "users"."phone_number" IS 'Số điện thoại nhận SMS/Zalo ONS'; COMMENT ON COLUMN "users"."password_hash" IS 'Mật khẩu đã mã hóa (Bcrypt)'; COMMENT ON COLUMN "users"."date_of_birth" IS 'Ngày sinh (xác thực độ tuổi xem phim)'; COMMENT ON COLUMN "users"."membership_tier" IS 'Hạng thành viên (MEMBER, VIP, VVIP)'; COMMENT ON COLUMN "users"."loyalty_points" IS 'Điểm thưởng tích lũy'; COMMENT ON COLUMN "users"."status" IS 'Trạng thái tài khoản (ACTIVE, UNVERIFIED, BLOCKED)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_17d1817f241f10a3dbafb169fd" ON "users"  ("phone_number") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cineplexes" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "code" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "province_id" bigint NOT NULL, "ward_id" bigint NOT NULL, "address" character varying(500) NOT NULL, "latitude" double precision, "longitude" double precision, "phone_number" character varying(20), "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "UQ_a01533036e910d51b40e9d38a2d" UNIQUE ("code"), CONSTRAINT "CHK_0c70f54ba39ca12e987c792be5" CHECK ("status" IN ('ACTIVE', 'MAINTENANCE', 'CLOSED')), CONSTRAINT "CHK_1d4830934019053070117a21c6" CHECK ("longitude" IS NULL OR ("longitude" >= -180.0 AND "longitude" <= 180.0)), CONSTRAINT "CHK_a1c837c14319a27991b0313c00" CHECK ("latitude" IS NULL OR ("latitude" >= -90.0 AND "latitude" <= 90.0)), CONSTRAINT "PK_90551629292c7aaaeb920d494dc" PRIMARY KEY ("id")); COMMENT ON COLUMN "cineplexes"."created_at" IS 'Thời điểm bản ghi được khởi tạo'; COMMENT ON COLUMN "cineplexes"."updated_at" IS 'Thời điểm bản ghi được cập nhật gần nhất'; COMMENT ON COLUMN "cineplexes"."deleted_at" IS 'Thời điểm xóa mềm (Null nếu chưa bị xóa)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_cineplexes_code_unique" ON "cineplexes"  ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cineplexes_province_id" ON "cineplexes"  ("province_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cineplexes_ward_id" ON "cineplexes"  ("ward_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cineplexes_status" ON "cineplexes"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "seats" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "auditorium_id" bigint NOT NULL, "seat_type_id" bigint NOT NULL, "row_label" character varying(5) NOT NULL, "column_number" integer NOT NULL, "seat_number" character varying(10) NOT NULL, "coord_x" integer NOT NULL, "coord_y" integer NOT NULL, "grid_span" integer NOT NULL DEFAULT '1', "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "CHK_256ebbf35d4542b15fdad7413b" CHECK ("status" IN ('ACTIVE', 'MAINTENANCE', 'DISABLED')), CONSTRAINT "CHK_e6ea1ac1554a6605dd4da0fee8" CHECK ("grid_span" >= 1), CONSTRAINT "CHK_3029bca9fe3444394dc2d4f8cf" CHECK ("coord_y" >= 0), CONSTRAINT "CHK_cc4304c648c2f0165ea3d2eccd" CHECK ("coord_x" >= 0), CONSTRAINT "CHK_9470377cae6426932cb290371c" CHECK (length("seat_number") > 0), CONSTRAINT "CHK_23b0572c0c3c742a4e2c54d20d" CHECK ("column_number" > 0), CONSTRAINT "CHK_7f4b47f10eff68d86c629d465e" CHECK (length("row_label") > 0), CONSTRAINT "PK_3fbc74bb4638600c506dcb777a7" PRIMARY KEY ("id")); COMMENT ON COLUMN "seats"."created_at" IS 'Thời điểm bản ghi được khởi tạo'; COMMENT ON COLUMN "seats"."updated_at" IS 'Thời điểm bản ghi được cập nhật gần nhất'; COMMENT ON COLUMN "seats"."deleted_at" IS 'Thời điểm xóa mềm (Null nếu chưa bị xóa)'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_seats_auditorium_id" ON "seats"  ("auditorium_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_seats_seat_type_id" ON "seats"  ("seat_type_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_seats_status" ON "seats"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "auditoriums" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "cineplex_id" bigint NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "screen_type" character varying(30) NOT NULL DEFAULT 'STANDARD', "audio_type" character varying(50) NOT NULL DEFAULT '7.1_SURROUND', "total_seats" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "CHK_89f223f4e6d376a63194bab30d" CHECK ("total_seats" > 0), CONSTRAINT "CHK_83d8e444c47e3212bec40fb88d" CHECK ("status" IN ('ACTIVE', 'MAINTENANCE', 'INACTIVE')), CONSTRAINT "CHK_a802e3b425e6a7e65fe789fc9d" CHECK ("screen_type" IN ('STANDARD', 'IMAX', '4DX', 'GOLD_CLASS')), CONSTRAINT "PK_7c89a4e25280efb7b40ae81a129" PRIMARY KEY ("id")); COMMENT ON COLUMN "auditoriums"."created_at" IS 'Thời điểm bản ghi được khởi tạo'; COMMENT ON COLUMN "auditoriums"."updated_at" IS 'Thời điểm bản ghi được cập nhật gần nhất'; COMMENT ON COLUMN "auditoriums"."deleted_at" IS 'Thời điểm xóa mềm (Null nếu chưa bị xóa)'`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auditoriums_cineplex_id" ON "auditoriums"  ("cineplex_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auditoriums_status" ON "auditoriums"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "distributors" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(255) NOT NULL, "tax_code" character varying(50) NOT NULL, "address" character varying(500) NOT NULL, "contact_person" character varying(255) NOT NULL, "contact_email" character varying(100) NOT NULL, "contact_phone" character varying(20) NOT NULL, "bank_account_number" character varying(50), "bank_name" character varying(100), "status" character varying(20) NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "UQ_a7f2264da9280b0bea6e63bc102" UNIQUE ("name"), CONSTRAINT "UQ_6e635df081b6c8dad6f7248abca" UNIQUE ("tax_code"), CONSTRAINT "PK_a3741291eb0af96f795b25d90b4" PRIMARY KEY ("id")); COMMENT ON COLUMN "distributors"."created_at" IS 'Thời điểm bản ghi được khởi tạo'; COMMENT ON COLUMN "distributors"."updated_at" IS 'Thời điểm bản ghi được cập nhật gần nhất'; COMMENT ON COLUMN "distributors"."deleted_at" IS 'Thời điểm xóa mềm (Null nếu chưa bị xóa)'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_82be419c14d6dee6fbdc529169" ON "distributors"  ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6e635df081b6c8dad6f7248abc" ON "distributors"  ("tax_code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a7f2264da9280b0bea6e63bc10" ON "distributors"  ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "fnb_items" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "sku" character varying(50) NOT NULL, "name" character varying(150) NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'SINGLE', "category" character varying(20) NOT NULL, "unit" character varying(20) NOT NULL DEFAULT 'PHẦN', "base_price" numeric(12,2) NOT NULL DEFAULT '0', "image_url" character varying(500), "description" text, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_63d795b4a08542045c026f356f0" UNIQUE ("sku"), CONSTRAINT "UQ_4afc4bb1a3ac7cb7f7189688f3f" UNIQUE ("name"), CONSTRAINT "CHK_610146ed77ee25a41be3fb607d" CHECK (length("name") > 0), CONSTRAINT "CHK_ee15d29e149f1f87d300659688" CHECK (length("sku") > 0), CONSTRAINT "CHK_b3c51d316f05a0d95ba5c5c727" CHECK ("base_price" >= 0.00), CONSTRAINT "PK_bf2a8f5e6b1070f4a8293e9b8c4" PRIMARY KEY ("id")); COMMENT ON COLUMN "fnb_items"."created_at" IS 'Thời điểm bản ghi được khởi tạo'; COMMENT ON COLUMN "fnb_items"."updated_at" IS 'Thời điểm bản ghi được cập nhật gần nhất'; COMMENT ON COLUMN "fnb_items"."deleted_at" IS 'Thời điểm xóa mềm (Null nếu chưa bị xóa)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_fnb_items_sku_unique" ON "fnb_items"  ("sku") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_fnb_items_name_unique" ON "fnb_items"  ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fnb_items_type" ON "fnb_items"  ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fnb_items_category" ON "fnb_items"  ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fnb_items_is_active" ON "fnb_items"  ("is_active") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wards_type_enum" AS ENUM('WARD', 'COMMUNE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "wards" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "province_id" bigint NOT NULL, "code" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "type" "public"."wards_type_enum" NOT NULL, CONSTRAINT "PK_f67afa72e02ac056570c0dde279" PRIMARY KEY ("id")); COMMENT ON COLUMN "wards"."created_at" IS 'Thời điểm bản ghi được khởi tạo'; COMMENT ON COLUMN "wards"."updated_at" IS 'Thời điểm bản ghi được cập nhật gần nhất'; COMMENT ON COLUMN "wards"."deleted_at" IS 'Thời điểm xóa mềm (Null nếu chưa bị xóa)'; COMMENT ON COLUMN "wards"."province_id" IS 'ID của tỉnh/thành phố trực thuộc'; COMMENT ON COLUMN "wards"."code" IS 'Mã định danh phường/xã/thị trấn (Hành chính)'; COMMENT ON COLUMN "wards"."name" IS 'Tên đầy đủ của phường/xã/thị trấn'; COMMENT ON COLUMN "wards"."type" IS 'Loại hình đơn vị hành chính cấp xã (Phường, Xã, Thị trấn)'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d5d88a978693bfe04cc6d55871" ON "wards"  ("province_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_24f16d2207b1dcb6ce07d81d20" ON "wards"  ("code") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."provinces_type_enum" AS ENUM('CITY', 'PROVINCE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "provinces" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "code" character varying(10) NOT NULL, "name" character varying(255) NOT NULL, "type" "public"."provinces_type_enum" NOT NULL, CONSTRAINT "PK_2e4260eedbcad036ec53222e0c7" PRIMARY KEY ("id")); COMMENT ON COLUMN "provinces"."created_at" IS 'Thời điểm bản ghi được khởi tạo'; COMMENT ON COLUMN "provinces"."updated_at" IS 'Thời điểm bản ghi được cập nhật gần nhất'; COMMENT ON COLUMN "provinces"."deleted_at" IS 'Thời điểm xóa mềm (Null nếu chưa bị xóa)'; COMMENT ON COLUMN "provinces"."code" IS 'Mã định danh tỉnh/thành phố (Hành chính)'; COMMENT ON COLUMN "provinces"."name" IS 'Tên đầy đủ của tỉnh/thành phố'; COMMENT ON COLUMN "provinces"."type" IS 'Loại hình đơn vị hành chính (Tỉnh, Thành phố TW...)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f4b684af62d5cb3aa174f6b9b8" ON "provinces"  ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "genres" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(255), CONSTRAINT "UQ_f78b7a129c054c6eaacf369da19" UNIQUE ("code"), CONSTRAINT "UQ_f105f8230a83b86a346427de94d" UNIQUE ("name"), CONSTRAINT "PK_80ecd718f0f00dde5d77a9be842" PRIMARY KEY ("id")); COMMENT ON COLUMN "genres"."created_at" IS 'Thời điểm bản ghi được khởi tạo'; COMMENT ON COLUMN "genres"."updated_at" IS 'Thời điểm bản ghi được cập nhật gần nhất'; COMMENT ON COLUMN "genres"."deleted_at" IS 'Thời điểm xóa mềm (Null nếu chưa bị xóa)'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_genres_code_unique" ON "genres"  ("code") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_genres_name_unique" ON "genres"  ("name") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."movies_age_rating_enum" AS ENUM('P', 'K', 'T13', 'T16', 'T18')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."movies_status_enum" AS ENUM('UPCOMING', 'SHOWING', 'ENDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "movies" ("id" BIGSERIAL NOT NULL, "distributor_id" bigint NOT NULL, "title" character varying(255) NOT NULL, "original_title" character varying(255), "description" text, "director" character varying(255), "cast" text, "duration_minutes" integer NOT NULL, "age_rating" "public"."movies_age_rating_enum" NOT NULL, "country" character varying(100), "original_language" character varying(50), "revenue_share_ratio" numeric(5,2) NOT NULL, "trailer_url" character varying(500), "poster_url" character varying(500), "banner_url" character varying(500), "release_date" date NOT NULL, "end_date" date NOT NULL, "status" "public"."movies_status_enum" NOT NULL DEFAULT 'UPCOMING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_342920d888b628841fae63ae2e" CHECK ("end_date" >= "release_date"), CONSTRAINT "CHK_77f8c7b654704eb2eace03a8c4" CHECK ("revenue_share_ratio" >= 0 AND "revenue_share_ratio" <= 100), CONSTRAINT "CHK_14acee0dbb1b97ef4c0dce35a2" CHECK ("duration_minutes" > 0), CONSTRAINT "PK_c5b2c134e871bfd1c2fe7cc3705" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tickets" ("id" BIGSERIAL NOT NULL, "order_id" bigint NOT NULL, "showtime_id" bigint NOT NULL, "seat_id" bigint NOT NULL, "ticket_code" character varying(100) NOT NULL, "price" numeric(12,2) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'VALID', "checked_in_at" TIMESTAMP, "checked_in_by" bigint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_40e7b62bf74bc61a7d74d682936" UNIQUE ("ticket_code"), CONSTRAINT "CHK_8c6d1dafe4a63a121896cd4723" CHECK ("price" >= 0.00), CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tickets_order_id" ON "tickets"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tickets_showtime_id" ON "tickets"  ("showtime_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tickets_seat_id" ON "tickets"  ("seat_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_tickets_ticket_code_unique" ON "tickets"  ("ticket_code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tickets_status" ON "tickets"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tickets_checked_in_by" ON "tickets"  ("checked_in_by") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_tickets_showtime_seat_active" ON "tickets"  ("showtime_id", "seat_id") WHERE "status" IN ('VALID', 'CHECKED_IN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_seat_details" ("id" BIGSERIAL NOT NULL, "order_id" bigint NOT NULL, "showtime_id" bigint NOT NULL, "seat_id" bigint NOT NULL, "price" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_52b6aee334c0781fd7830ddf86" CHECK ("price" >= 0.00), CONSTRAINT "PK_eff3e7823cd168f8c69c039e838" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_seat_details_order_id" ON "order_seat_details"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_seat_details_showtime_id" ON "order_seat_details"  ("showtime_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_seat_details_seat_id" ON "order_seat_details"  ("seat_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" BIGSERIAL NOT NULL, "order_code" character varying(64) NOT NULL, "user_id" bigint NOT NULL, "staff_id" bigint, "showtime_id" bigint NOT NULL, "channel" character varying(20) NOT NULL DEFAULT 'ONLINE_APP', "subtotal_tickets" numeric(12,2) NOT NULL, "subtotal_fnb" numeric(12,2) NOT NULL DEFAULT '0', "discount_amount" numeric(12,2) NOT NULL DEFAULT '0', "final_amount" numeric(12,2) NOT NULL DEFAULT '0', "payment_method" character varying(30), "paid_txn_ref" character varying(100), "status" character varying(20) NOT NULL DEFAULT 'PENDING', "qr_code_token" character varying(500), "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e462c2f2237b3049aa6be3fce06" UNIQUE ("order_code"), CONSTRAINT "UQ_6f34e2d7b0027d9a080032e3dee" UNIQUE ("qr_code_token"), CONSTRAINT "CHK_ede3eb6a0f686a95c0f9861f34" CHECK ("final_amount" >= 0.00), CONSTRAINT "CHK_f218f87a310dd9ac8b6d37f608" CHECK ("discount_amount" >= 0.00), CONSTRAINT "CHK_ef8b157cbdd770cb6b0c4836e7" CHECK ("subtotal_fnb" >= 0.00), CONSTRAINT "CHK_719fd86e17992de719b8c5e46a" CHECK ("subtotal_tickets" >= 0.00), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_orders_order_code_unique" ON "orders"  ("order_code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_user_id" ON "orders"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_staff_id" ON "orders"  ("staff_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_showtime_id" ON "orders"  ("showtime_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orders_status" ON "orders"  ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_orders_qr_code_token_unique" ON "orders"  ("qr_code_token") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_fnb_details" ("id" BIGSERIAL NOT NULL, "order_id" bigint NOT NULL, "fnb_item_id" bigint NOT NULL, "quantity" integer NOT NULL, "unit_price" numeric(12,2) NOT NULL, "subtotal" numeric(12,2) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'PENDING', "fulfilled_at" TIMESTAMP, "fulfilled_by" bigint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_f5ea90e7c9fa7bbbde4e09598d" CHECK ("subtotal" >= 0.00), CONSTRAINT "CHK_0fd1ae5b3bb593ca54c1dde612" CHECK ("unit_price" >= 0.00), CONSTRAINT "CHK_af5ae3a074cb3bd90d293e8709" CHECK ("quantity" > 0), CONSTRAINT "PK_88ce00e88975f2c693b40418db5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_fnb_details_order_id" ON "order_fnb_details"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_fnb_details_fnb_item_id" ON "order_fnb_details"  ("fnb_item_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_fnb_details_status" ON "order_fnb_details"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_order_fnb_details_fulfilled_by" ON "order_fnb_details"  ("fulfilled_by") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_transactions" ("id" BIGSERIAL NOT NULL, "order_id" bigint NOT NULL, "txn_ref" character varying(100) NOT NULL, "payment_gateway" character varying(30) NOT NULL, "transaction_no" character varying(100), "amount" numeric(12,2) NOT NULL, "payment_status" character varying(30) NOT NULL DEFAULT 'INITIATED', "response_code" character varying(50), "gateway_payload" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "paid_at" TIMESTAMP, "settled_at" TIMESTAMP, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_17e93eb6ef433708652f52a0555" UNIQUE ("txn_ref"), CONSTRAINT "CHK_0bfa606cbce738b06229749781" CHECK ("amount" >= 0.00), CONSTRAINT "PK_d32b3c6b0d2c1d22604cbcc8c49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payment_transactions_order_id" ON "payment_transactions"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_payment_transactions_txn_ref_unique" ON "payment_transactions"  ("txn_ref") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payment_transactions_status" ON "payment_transactions"  ("payment_status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" BIGSERIAL NOT NULL, "order_id" bigint NOT NULL, "method" character varying(30) NOT NULL, "amount" numeric(12,2) NOT NULL, "status" character varying(30) NOT NULL DEFAULT 'INITIATED', "gateway_txn_ref" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_8c4e0f5554910541110d10407c" CHECK ("amount" >= 0.00), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_order_id" ON "payments"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_status" ON "payments"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_gateway_txn_ref" ON "payments"  ("gateway_txn_ref") `,
    );
    await queryRunner.query(
      `CREATE TABLE "movie_genres" ("movie_id" bigint NOT NULL, "genre_id" bigint NOT NULL, CONSTRAINT "PK_ec45eae1bc95d1461ad55713ffc" PRIMARY KEY ("movie_id", "genre_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ae967ce58ef99e9ff3933ccea4" ON "movie_genres"  ("movie_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bbbc12542564f7ff56e36f5bbf" ON "movie_genres"  ("genre_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_rules" ADD CONSTRAINT "FK_344fe6a2f1ef3fa63259bf5c220" FOREIGN KEY ("cineplex_id") REFERENCES "cineplexes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtime_seats" ADD CONSTRAINT "FK_45e3e0a137fdd29ea07ec76c045" FOREIGN KEY ("showtime_id") REFERENCES "showtimes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtime_seats" ADD CONSTRAINT "FK_947e54d5a7ffab520095d10410a" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtimes" ADD CONSTRAINT "FK_644ed0d19d5be302a1e00e31a1c" FOREIGN KEY ("auditorium_id") REFERENCES "auditoriums"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtimes" ADD CONSTRAINT "FK_cbe689b0c116fbc866d8ea21759" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtime_seat_prices" ADD CONSTRAINT "FK_038a66cf13f34203ab9b067cd4b" FOREIGN KEY ("showtime_id") REFERENCES "showtimes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtime_seat_prices" ADD CONSTRAINT "FK_e61341575c609f287de05d0c89a" FOREIGN KEY ("seat_type_id") REFERENCES "seat_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cineplexes" ADD CONSTRAINT "FK_e4eb224543c78310a55e5a7fdc5" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cineplexes" ADD CONSTRAINT "FK_9d3f5c2cabf98f5329249ad8cc2" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seats" ADD CONSTRAINT "FK_6318c0a2de3d50b88e0e67a4ee9" FOREIGN KEY ("auditorium_id") REFERENCES "auditoriums"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "seats" ADD CONSTRAINT "FK_9341af3cef5a8be01979fae3d4b" FOREIGN KEY ("seat_type_id") REFERENCES "seat_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoriums" ADD CONSTRAINT "FK_7a653adc802bbd56e54f17bd3ea" FOREIGN KEY ("cineplex_id") REFERENCES "cineplexes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wards" ADD CONSTRAINT "FK_d5d88a978693bfe04cc6d55871d" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "movies" ADD CONSTRAINT "FK_38a7fbcc18383470c01a8581fd9" FOREIGN KEY ("distributor_id") REFERENCES "distributors"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_bd5636236f799b19f132abf8d70" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_cc00614628df6890e74ac420486" FOREIGN KEY ("showtime_id") REFERENCES "showtimes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_ec055dae7b2350f2acf72fcc63c" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_2db7490afacd79a69b3f11578f6" FOREIGN KEY ("checked_in_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_seat_details" ADD CONSTRAINT "FK_dbbebc34e2e956d51a69eec520b" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_seat_details" ADD CONSTRAINT "FK_7f6fe8961a902c72bf61816dffc" FOREIGN KEY ("showtime_id") REFERENCES "showtimes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_seat_details" ADD CONSTRAINT "FK_0cc90eda6f606fcd518b9b379e1" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_40337bbb0e0cc7113dc3037fc60" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_62ec6c06416069dee80d63aeda1" FOREIGN KEY ("showtime_id") REFERENCES "showtimes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_fnb_details" ADD CONSTRAINT "FK_c30f4a4aaf25fb21c57c6c1b774" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_fnb_details" ADD CONSTRAINT "FK_b0c1c909c5c8beaf7fbca524667" FOREIGN KEY ("fnb_item_id") REFERENCES "fnb_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_fnb_details" ADD CONSTRAINT "FK_4139b5106161dd7daef799d0a68" FOREIGN KEY ("fulfilled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_genres" ADD CONSTRAINT "FK_ae967ce58ef99e9ff3933ccea48" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_genres" ADD CONSTRAINT "FK_bbbc12542564f7ff56e36f5bbf6" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "movie_genres" DROP CONSTRAINT "FK_bbbc12542564f7ff56e36f5bbf6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movie_genres" DROP CONSTRAINT "FK_ae967ce58ef99e9ff3933ccea48"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_fnb_details" DROP CONSTRAINT "FK_4139b5106161dd7daef799d0a68"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_fnb_details" DROP CONSTRAINT "FK_b0c1c909c5c8beaf7fbca524667"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_fnb_details" DROP CONSTRAINT "FK_c30f4a4aaf25fb21c57c6c1b774"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_62ec6c06416069dee80d63aeda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_40337bbb0e0cc7113dc3037fc60"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_seat_details" DROP CONSTRAINT "FK_0cc90eda6f606fcd518b9b379e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_seat_details" DROP CONSTRAINT "FK_7f6fe8961a902c72bf61816dffc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_seat_details" DROP CONSTRAINT "FK_dbbebc34e2e956d51a69eec520b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "FK_2db7490afacd79a69b3f11578f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "FK_ec055dae7b2350f2acf72fcc63c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "FK_cc00614628df6890e74ac420486"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "FK_bd5636236f799b19f132abf8d70"`,
    );
    await queryRunner.query(
      `ALTER TABLE "movies" DROP CONSTRAINT "FK_38a7fbcc18383470c01a8581fd9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wards" DROP CONSTRAINT "FK_d5d88a978693bfe04cc6d55871d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoriums" DROP CONSTRAINT "FK_7a653adc802bbd56e54f17bd3ea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seats" DROP CONSTRAINT "FK_9341af3cef5a8be01979fae3d4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "seats" DROP CONSTRAINT "FK_6318c0a2de3d50b88e0e67a4ee9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cineplexes" DROP CONSTRAINT "FK_9d3f5c2cabf98f5329249ad8cc2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cineplexes" DROP CONSTRAINT "FK_e4eb224543c78310a55e5a7fdc5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtime_seat_prices" DROP CONSTRAINT "FK_e61341575c609f287de05d0c89a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtime_seat_prices" DROP CONSTRAINT "FK_038a66cf13f34203ab9b067cd4b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtimes" DROP CONSTRAINT "FK_cbe689b0c116fbc866d8ea21759"`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtimes" DROP CONSTRAINT "FK_644ed0d19d5be302a1e00e31a1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtime_seats" DROP CONSTRAINT "FK_947e54d5a7ffab520095d10410a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "showtime_seats" DROP CONSTRAINT "FK_45e3e0a137fdd29ea07ec76c045"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_rules" DROP CONSTRAINT "FK_344fe6a2f1ef3fa63259bf5c220"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bbbc12542564f7ff56e36f5bbf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ae967ce58ef99e9ff3933ccea4"`,
    );
    await queryRunner.query(`DROP TABLE "movie_genres"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_payments_gateway_txn_ref"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_payments_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payments_order_id"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_payment_transactions_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_payment_transactions_txn_ref_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_payment_transactions_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "payment_transactions"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_order_fnb_details_fulfilled_by"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_order_fnb_details_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_order_fnb_details_fnb_item_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_order_fnb_details_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "order_fnb_details"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_orders_qr_code_token_unique"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_orders_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_showtime_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_staff_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_orders_user_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_orders_order_code_unique"`,
    );
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_order_seat_details_seat_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_order_seat_details_showtime_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_order_seat_details_order_id"`,
    );
    await queryRunner.query(`DROP TABLE "order_seat_details"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_tickets_showtime_seat_active"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_tickets_checked_in_by"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tickets_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_tickets_ticket_code_unique"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_tickets_seat_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tickets_showtime_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tickets_order_id"`);
    await queryRunner.query(`DROP TABLE "tickets"`);
    await queryRunner.query(`DROP TABLE "movies"`);
    await queryRunner.query(`DROP TYPE "public"."movies_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."movies_age_rating_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_genres_name_unique"`);
    await queryRunner.query(`DROP INDEX "public"."idx_genres_code_unique"`);
    await queryRunner.query(`DROP TABLE "genres"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f4b684af62d5cb3aa174f6b9b8"`,
    );
    await queryRunner.query(`DROP TABLE "provinces"`);
    await queryRunner.query(`DROP TYPE "public"."provinces_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24f16d2207b1dcb6ce07d81d20"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d5d88a978693bfe04cc6d55871"`,
    );
    await queryRunner.query(`DROP TABLE "wards"`);
    await queryRunner.query(`DROP TYPE "public"."wards_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_fnb_items_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."idx_fnb_items_category"`);
    await queryRunner.query(`DROP INDEX "public"."idx_fnb_items_type"`);
    await queryRunner.query(`DROP INDEX "public"."idx_fnb_items_name_unique"`);
    await queryRunner.query(`DROP INDEX "public"."idx_fnb_items_sku_unique"`);
    await queryRunner.query(`DROP TABLE "fnb_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a7f2264da9280b0bea6e63bc10"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6e635df081b6c8dad6f7248abc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_82be419c14d6dee6fbdc529169"`,
    );
    await queryRunner.query(`DROP TABLE "distributors"`);
    await queryRunner.query(`DROP INDEX "public"."idx_auditoriums_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_auditoriums_cineplex_id"`,
    );
    await queryRunner.query(`DROP TABLE "auditoriums"`);
    await queryRunner.query(`DROP INDEX "public"."idx_seats_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_seats_seat_type_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_seats_auditorium_id"`);
    await queryRunner.query(`DROP TABLE "seats"`);
    await queryRunner.query(`DROP INDEX "public"."idx_cineplexes_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_cineplexes_ward_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_cineplexes_province_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_cineplexes_code_unique"`);
    await queryRunner.query(`DROP TABLE "cineplexes"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17d1817f241f10a3dbafb169fd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_showtime_seat_prices_seat_type_id"`,
    );
    await queryRunner.query(`DROP TABLE "showtime_seat_prices"`);
    await queryRunner.query(`DROP INDEX "public"."idx_showtimes_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_showtimes_movie_id"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_showtimes_auditorium_id"`,
    );
    await queryRunner.query(`DROP TABLE "showtimes"`);
    await queryRunner.query(`DROP TABLE "showtime_seats"`);
    await queryRunner.query(`DROP INDEX "public"."idx_price_rules_lookup"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_price_rules_cineplex_id"`,
    );
    await queryRunner.query(`DROP TABLE "price_rules"`);
    await queryRunner.query(`DROP INDEX "public"."idx_seat_types_code_unique"`);
    await queryRunner.query(`DROP TABLE "seat_types"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_user_role_cineplex_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_user_role_global_unique"`,
    );
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ab10e580f70c3d2e2e4b31ebf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b768cab9aae627f93319736b8b"`,
    );
    await queryRunner.query(`DROP TABLE "promotions"`);
  }
}
