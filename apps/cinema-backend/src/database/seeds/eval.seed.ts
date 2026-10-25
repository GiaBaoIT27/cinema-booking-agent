import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { User } from '#modules/users/entities/user.entity.js';
import { Role } from '#modules/rbac/domain/entities/role.entity.js';
import { UserRole } from '#modules/rbac/domain/entities/user-role.entity.js';
import { UserStatus } from '#modules/users/domain/enums/user-status.enum.js';
import { MembershipTier } from '#modules/users/domain/enums/membership-tier.enum.js';
import { RoleCode } from '#modules/rbac/domain/enums/role.enum.js';
import { Showtime } from '#modules/showtimes/domain/entities/showtime.entity.js';
import { ShowtimeSeatPrice } from '#modules/showtimes/domain/entities/showtime-seat-price.entity.js';
import { Auditorium } from '#modules/cinemas/domain/entities/auditorium.entity.js';
import { Seat } from '#modules/cinemas/domain/entities/seat.entity.js';
import { Movie } from '#modules/movies/domain/entities/movie.entity.js';
import { SeatType } from '#src/modules/seat-types/domain/entities/seat-type.entity.js';
import { FnbItem } from '#modules/fnb/domain/entities/fnb-item.entities.js';
import { PromotionEntity } from '#modules/promotions/entities/promotion.entity.js';
import { ProjectionType } from '#src/modules/showtimes/domain/enums/projection-type.enum.js';
import { ShowtimeStatus } from '#src/modules/showtimes/domain/enums/showtime-status.enum.js';
import { ShowtimeSeatPriceSeeder } from './17-showtime-seat-price.seed.js';

/**
 * Seed riêng cho việc ĐÁNH GIÁ AGENT.
 * - Tạo 2 khách hàng cố định.
 * - Tạo suất chiếu ở NGÀY CỐ ĐỊNH, GIỜ CỐ ĐỊNH, PHIM/PHÒNG CỐ ĐỊNH (cụm Bến Nghé).
 * - Xuất eval-fixtures.json để bộ test đọc id thay vì viết cứng.
 * Lũy đẳng: chạy lại nhiều lần không tạo trùng.
 */

export const EVAL_PASSWORD = 'Eval123@Password';
export const EVAL_USERS = [
  {
    key: 'user1',
    email: 'eval.user1@cinema.com',
    fullName: 'Eval Khách 1',
    phoneNumber: '0900000001',
  },
  {
    key: 'user2',
    email: 'eval.user2@cinema.com',
    fullName: 'Eval Khách 2',
    phoneNumber: '0900000002',
  },
] as const;

const CINEPLEX_CODE = 'CPX-HCM-BENNGHE';
const VN_OFFSET = '+07:00';

// Lịch cố định. HALL-01 = STANDARD 120 ghế, HALL-02 = IMAX 80 ghế.
// Không chồng giờ trong cùng phòng (Mai 131', Quật Mộ 134', Dune 166', dọn phòng 15').
const PLAN = [
  { key: 'mai-morning', movie: 'Mai', hall: 'HALL-01', time: '10:00' },
  {
    key: 'quatmo-afternoon',
    movie: 'Quật Mộ Trùng Phùng',
    hall: 'HALL-01',
    time: '14:00',
  },
  { key: 'mai-evening', movie: 'Mai', hall: 'HALL-01', time: '19:30' },
  {
    key: 'dune-afternoon',
    movie: 'Dune: Hành Tinh Cát - Phần Hai',
    hall: 'HALL-02',
    time: '14:00',
  },
  {
    key: 'dune-evening',
    movie: 'Dune: Hành Tinh Cát - Phần Hai',
    hall: 'HALL-02',
    time: '20:00',
  },
] as const;

/** Ngày chiếu YYYY-MM-DD (giờ VN). Đặt EVAL_DATE để cố định suốt đợt đánh giá. */
export function resolveEvalDate(): string {
  if (process.env.EVAL_DATE) return process.env.EVAL_DATE;
  const offset = Number(process.env.EVAL_DAY_OFFSET ?? 4); // sau 3 ngày của seed 16, vẫn trong 7 ngày web hiển thị
  const d = new Date(Date.now() + offset * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(d);
}

export class EvalSeeder {
  async run(ds: DataSource): Promise<void> {
    const evalDate = resolveEvalDate();
    console.log(`[EVAL] Seed dữ liệu đánh giá cho ngày ${evalDate}`);

    const users = await this.seedUsers(ds);
    const showtimes = await this.seedShowtimes(ds, evalDate);
    await new ShowtimeSeatPriceSeeder().run(ds); // lũy đẳng, tạo giá cho suất mới
    await this.exportFixtures(ds, evalDate, users, showtimes);
  }

  private async seedUsers(ds: DataSource) {
    const userRepo = ds.getRepository(User);
    const roleRepo = ds.getRepository(Role);
    const userRoleRepo = ds.getRepository(UserRole);
    const passwordHash = await bcrypt.hash(EVAL_PASSWORD, 10);
    const role = await roleRepo.findOne({ where: { code: RoleCode.CUSTOMER } });
    if (!role)
      throw new Error('Không thấy role CUSTOMER. Chạy RoleSeeder trước.');
    const tier =
      (MembershipTier as any).MEMBER ?? Object.values(MembershipTier as any)[0];

    const out: { key: string; id: string; email: string }[] = [];
    for (const u of EVAL_USERS) {
      let user = await userRepo.findOne({ where: { email: u.email } });
      if (!user) {
        user = await userRepo.save(
          userRepo.create({
            fullName: u.fullName,
            email: u.email,
            phoneNumber: u.phoneNumber,
            passwordHash,
            dateOfBirth: new Date('1999-01-01'),
            membershipTier: tier,
            loyaltyPoints: 0,
            status: UserStatus.ACTIVE,
          } as User),
        );
        console.log(`+ [EVAL] Tạo user ${u.email}`);
      } else {
        user.passwordHash = passwordHash;
        user.status = UserStatus.ACTIVE;
        await userRepo.save(user);
      }
      const hasRole = await userRoleRepo.findOne({
        where: { user: { id: user.id }, role: { id: role.id } },
      });
      if (!hasRole) {
        await userRoleRepo.save(
          userRoleRepo.create({ user, role, cineplexId: null } as any),
        );
      }
      out.push({ key: u.key, id: String(user.id), email: u.email });
    }
    return out;
  }

  private async seedShowtimes(ds: DataSource, evalDate: string) {
    const stRepo = ds.getRepository(Showtime);
    const audRepo = ds.getRepository(Auditorium);
    const movieRepo = ds.getRepository(Movie);

    const result: { key: string; showtime: Showtime }[] = [];
    for (const p of PLAN) {
      const aud = await audRepo.findOne({
        where: { code: `${CINEPLEX_CODE}-${p.hall}` },
      });
      const movie = await movieRepo.findOne({ where: { title: p.movie } });
      if (!aud || !movie)
        throw new Error(
          `Thiếu phòng ${p.hall} hoặc phim "${p.movie}" cho ${p.key}`,
        );

      const start = new Date(`${evalDate}T${p.time}:00${VN_OFFSET}`);
      const end = new Date(start.getTime() + movie.durationMinutes * 60_000);

      let st = await stRepo.findOne({
        where: { auditoriumId: aud.id, startTime: start },
      });
      if (!st) {
        const clash = await stRepo
          .createQueryBuilder('s')
          .where('s.auditoriumId = :a', { a: aud.id })
          .andWhere('s.startTime < :end AND s.endTime > :start', { start, end })
          .getOne();
        if (clash) {
          throw new Error(
            `Suất eval "${p.key}" (${evalDate} ${p.time}) trùng giờ với suất ${clash.id} trong cùng phòng. ` +
              `Đặt EVAL_DATE sang ngày khác chưa có suất.`,
          );
        }
        const audioLanguage = movie.originalLanguage || 'Tiếng Việt';
        const subtitleLanguage =
          movie.country === 'Việt Nam' || audioLanguage === 'Tiếng Việt'
            ? null
            : 'Tiếng Việt';
        const screen = String(aud.screenType ?? '').toUpperCase();
        const projectionType = screen.includes('IMAX')
          ? ProjectionType.IMAX
          : screen.includes('DX')
            ? ProjectionType.FOUR_DX
            : ProjectionType.TWO_D;

        st = await stRepo.save(
          stRepo.create({
            auditoriumId: aud.id,
            movieId: movie.id,
            projectionType: projectionType as any,
            audioLanguage,
            subtitleLanguage,
            startTime: start,
            endTime: end,
            cleaningMinutes: 15,
            status: ShowtimeStatus.SCHEDULED,
          }),
        );
        console.log(
          `+ [EVAL] Tạo suất ${p.key}: ${p.movie} ${evalDate} ${p.time}`,
        );
      }
      result.push({ key: p.key, showtime: st });
    }
    return result;
  }

  private async exportFixtures(
    ds: DataSource,
    evalDate: string,
    users: { key: string; id: string; email: string }[],
    showtimes: { key: string; showtime: Showtime }[],
  ) {
    const seatTypes = await ds.getRepository(SeatType).find();
    const typeCode = new Map(seatTypes.map((t) => [String(t.id), t.code]));

    const outShowtimes: any[] = [];
    const seatsByAuditorium: Record<string, any> = {};
    const prices: Record<string, Record<string, number>> = {};

    for (const { key, showtime } of showtimes) {
      const aud = await ds
        .getRepository(Auditorium)
        .findOneOrFail({ where: { id: showtime.auditoriumId } });
      const movie = await ds
        .getRepository(Movie)
        .findOneOrFail({ where: { id: showtime.movieId } });
      outShowtimes.push({
        key,
        id: String(showtime.id),
        movieId: String(movie.id),
        movieTitle: movie.title,
        startTime: showtime.startTime.toISOString(),
        localStart: PLAN.find((p) => p.key === key)!.time,
        auditoriumId: String(aud.id),
        auditoriumCode: aud.code,
        screenType: String(aud.screenType),
      });

      if (!seatsByAuditorium[aud.code]) {
        const seats = await ds.getRepository(Seat).find({
          where: { auditoriumId: aud.id },
          relations: { seatType: true },
          order: { rowLabel: 'ASC', columnNumber: 'ASC' },
        });
        const grouped: Record<string, { id: string; seatNumber: string }[]> =
          {};
        for (const s of seats) {
          const code = typeCode.get(String(s.seatTypeId)) ?? 'UNKNOWN';
          (grouped[code] ??= []).push({
            id: String(s.id),
            seatNumber: s.seatNumber,
          });
        }
        // chỉ giữ 8 ghế đầu mỗi loại để file gọn
        for (const k of Object.keys(grouped))
          grouped[k] = grouped[k].slice(0, 8);
        seatsByAuditorium[aud.code] = grouped;
      }

      const rows = await ds
        .getRepository(ShowtimeSeatPrice)
        .find({ where: { showtimeId: String(showtime.id) } });
      prices[key] = {};
      for (const r of rows)
        prices[key][typeCode.get(String(r.seatTypeId)) ?? 'UNKNOWN'] = Number(
          r.finalPrice,
        );
    }

    const fnb = (await ds.getRepository(FnbItem).find()).map((f: any) => ({
      id: String(f.id),
      sku: f.sku,
      name: f.name,
      isActive: f.isActive,
    }));
    const promotions = (await ds.getRepository(PromotionEntity).find()).map(
      (p: any) => ({
        code: p.code,
        discountType: p.discountType,
        discountValue: Number(p.discountValue),
        minOrderAmount: Number(p.minOrderAmount),
        usageLimit: p.usageLimit,
        startDate: p.startDate,
        endDate: p.endDate,
      }),
    );

    const fixtures = {
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      evalDate,
      password: EVAL_PASSWORD,
      users,
      showtimes: outShowtimes,
      seatsByAuditorium,
      prices,
      fnb,
      promotions,
    };
    const file = process.env.EVAL_FIXTURES ?? './eval-fixtures.json';
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(fixtures, null, 2), 'utf8');
    console.log(`[EVAL] Đã ghi ${file}`);
  }
}
