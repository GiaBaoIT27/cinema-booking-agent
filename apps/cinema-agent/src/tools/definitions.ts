import { z } from "zod";
import { BackendError, type BackendClient } from "../lib/backend-client.js";
import { resolveSeats, type ApiSeat } from "../lib/seat-resolver.js";
import { vnDate, vnTime } from "../lib/time.js";

/** Bối cảnh mỗi lượt chạy: backend + JWT của người đang chat */
export interface ToolContext {
  backend: BackendClient;
  token?: string;
  signal?: AbortSignal;
}

/**
 * data: nội dung gọn gửi cho mô hình đọc.
 * ui: dữ liệu đầy đủ để dựng widget trên giao diện (không gửi cho mô hình).
 */
export type ToolResult =
  | { ok: true; data: unknown; ui?: unknown }
  | { ok: false; errorCode: string; message: string };

  // = any: với S = ZodTypeAny (mặc định) thì z.infer trả unknown → handler
  // không đọc được input. Runtime vẫn an toàn vì runner schema.parse() trước khi gọi handler.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ToolDefinition<S extends z.ZodTypeAny = any> {
  name: string;
  description: string;
  schema: S;
  /** true: cần người dùng đã đăng nhập */
  requiresAuth: boolean;
  handler: (input: z.infer<S>, ctx: ToolContext) => Promise<ToolResult>;
}

const fail = (errorCode: string, message: string): ToolResult => ({
  ok: false,
  errorCode,
  message,
});

/** Chuyển lỗi bất kỳ thành kết quả có cấu trúc để mô hình đọc; không bao giờ ném lỗi ra ngoài */
export function toToolError(e: unknown): ToolResult {
  if (e instanceof BackendError) {
    if (e.status === 401)
      return fail(
        "AUTH_REQUIRED",
        "Phiên đăng nhập đã hết hạn, cần đăng nhập lại.",
      );
    return fail(e.code, e.message);
  }
  if ((e as { name?: string })?.name === "AbortError")
    return fail("CANCELLED", "Yêu cầu đã bị hủy.");
  return fail(
    "TOOL_ERROR",
    e instanceof Error ? e.message : "Lỗi không xác định",
  );
}

const asArray = <T>(v: unknown): T[] => {
  if (Array.isArray(v)) return v as T[];
  const inner = (v as { data?: unknown } | null | undefined)?.data;
  return Array.isArray(inner) ? (inner as T[]) : [];
};

const AUTH_REQUIRED = fail(
  "AUTH_REQUIRED",
  "Người dùng chưa đăng nhập. Hãy yêu cầu họ đăng nhập trước khi tiếp tục.",
);

/** Lấy sơ đồ ghế của suất chiếu */
async function loadSeatMatrix(ctx: ToolContext, showtimeId: number) {
  return ctx.backend.get<{
    showtimeId: number;
    auditoriumName: string;
    totalSeats: number;
    availableSeats: number;
    seatMatrix: ApiSeat[];
  }>(`/showtimes/${showtimeId}/seats`, { signal: ctx.signal });
}

/** Đổi nhãn ghế sang ghế thật, trả lỗi dễ hiểu nếu có ghế sai/đã bán */
async function seatsFromLabels(
  ctx: ToolContext,
  showtimeId: number,
  labels: string[],
  checkTaken: boolean,
) {
  const matrix = await loadSeatMatrix(ctx, showtimeId);
  const r = resolveSeats(labels, matrix.seatMatrix);
  if (r.unknown.length > 0) {
    return {
      error: fail(
        "SEAT_NOT_FOUND",
        `Không có ghế ${r.unknown.join(", ")} trong suất chiếu này.`,
      ),
    };
  }
  if (checkTaken && r.taken.length > 0) {
    return {
      error: fail("SEAT_TAKEN", `Ghế ${r.taken.join(", ")} đã có người đặt.`),
    };
  }
  // Khi không kiểm tra, ghế đang do chính khách giữ (có thể hiện là "đã đặt") vẫn được dùng
  return {
    seats: checkTaken ? r.seats : [...r.seats, ...r.takenSeats],
    matrix,
  };
}

const seatLabels = z
  .array(z.string().min(1))
  .min(1)
  .max(8)
  .describe("Danh sách số ghế khách chọn, ví dụ ['H7','H8']. Tối đa 8 ghế");

/* ───────────── Công cụ tra cứu (không cần đăng nhập) ───────────── */

export const searchMovies: ToolDefinition = {
  name: "search_movies",
  description:
    "Tìm phim theo tên hoặc liệt kê phim đang chiếu / sắp chiếu. Dùng đầu tiên để lấy movieId.",
  requiresAuth: false,
  schema: z.object({
    search: z.string().optional().describe("Tên phim hoặc từ khóa"),
    status: z
      .enum(["SHOWING", "UPCOMING"])
      .optional()
      .describe("Mặc định SHOWING (đang chiếu)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Số phim tối đa, mặc định 6"),
  }),
  async handler(input, ctx) {
    try {
      const raw = await ctx.backend.get<unknown>("/movies", {
        params: {
          search: input.search,
          status: input.status ?? "SHOWING",
          limit: input.limit ?? 6,
        },
        signal: ctx.signal,
      });
      const movies = asArray<Record<string, unknown>>(raw).map((m) => ({
        movieId: Number(m.id),
        title: m.title,
        originalTitle: m.originalTitle ?? null,
        durationMinutes: m.durationMinutes,
        ageRating: m.ageRating,
        releaseDate: m.releaseDate ?? null,
        status: m.status,
        posterUrl: m.posterUrl ?? null,
      }));
      if (movies.length === 0)
        return {
          ok: true,
          data: { movies: [], note: "Không tìm thấy phim phù hợp." },
        };
      return { ok: true, data: { movies } };
    } catch (e) {
      return toToolError(e);
    }
  },
};

export const getMovieDetails: ToolDefinition = {
  name: "get_movie_details",
  description:
    "Xem chi tiết một phim: nội dung, đạo diễn, diễn viên, thời lượng, độ tuổi, thể loại.",
  requiresAuth: false,
  schema: z.object({ movieId: z.number().min(1, "ID phải từ 1 trở lên") }),
  async handler(input, ctx) {
    try {
      const m = await ctx.backend.get<Record<string, unknown>>(
        `/movies/${input.movieId}`,
        { signal: ctx.signal },
      );
      const genres = Array.isArray(m.genres)
        ? (m.genres as Array<{ name?: string }>).map((g) => g.name)
        : [];
      return {
        ok: true,
        data: {
          movieId: Number(m.id),
          title: m.title,
          description: m.description ?? null,
          director: m.director ?? null,
          cast: m.cast ?? null,
          durationMinutes: m.durationMinutes,
          ageRating: m.ageRating,
          country: m.country ?? null,
          releaseDate: m.releaseDate ?? null,
          genres,
        },
      };
    } catch (e) {
      return toToolError(e);
    }
  },
};

export const getShowtimes: ToolDefinition = {
  name: "get_showtimes",
  description:
    "Lấy lịch chiếu của một phim trong một ngày, gom theo rạp. Trả về showtimeId dùng cho các bước sau. Cũng dùng để biết phim chiếu ở những rạp nào.",
  requiresAuth: false,
  schema: z.object({
    movieId: z.number().int().min(1, "movieId phải từ 1 trở lên"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Ngày YYYY-MM-DD, mặc định hôm nay"),
    cineplexId: z.number().int().min(1).optional().describe("Chỉ lấy một rạp"),
  }),
  async handler(input, ctx) {
    try {
      const date = input.date ?? vnDate();
      const r = await ctx.backend.get<{
        movieId: number;
        movieTitle: string;
        showtimesByCinema: Array<{
          cineplexId: number;
          cineplexName: string;
          showtimes: Array<{
            showtimeId: number;
            auditoriumName: string;
            projectionType: string;
            startTime: string;
            endTime: string;
          }>;
        }>;
      }>(`/movies/${input.movieId}/showtimes`, {
        params: { date, cineplexId: input.cineplexId },
        signal: ctx.signal,
      });
      const cinemas = (r.showtimesByCinema ?? []).map((c) => ({
        cineplexId: c.cineplexId,
        cineplexName: c.cineplexName,
        showtimes: c.showtimes.map((s) => ({
          showtimeId: s.showtimeId,
          auditorium: s.auditoriumName,
          projectionType: s.projectionType,
          startTime: vnTime(s.startTime),
          endTime: vnTime(s.endTime),
        })),
      }));
      const data = {
        movieId: r.movieId,
        movieTitle: r.movieTitle,
        date,
        cinemas,
      };
      if (cinemas.every((c) => c.showtimes.length === 0)) {
        return {
          ok: true,
          data: { ...data, note: "Không có suất chiếu trong ngày này." },
        };
      }
      return { ok: true, data };
    } catch (e) {
      return toToolError(e);
    }
  },
};

export const getAvailableSeats: ToolDefinition = {
  name: "get_available_seats",
  description:
    "Xem ghế còn trống của một suất chiếu (theo hàng, kèm loại ghế và giá). Dùng trước khi giữ ghế.",
  requiresAuth: false,
  schema: z.object({
    showtimeId: z.number().int().min(1, "showtimeId phải từ 1 trở lên"),
  }),
  async handler(input, ctx) {
    try {
      const m = await loadSeatMatrix(ctx, input.showtimeId);
      const rows: Record<
        string,
        Array<{ seat: string; type: string; price: number }>
      > = {};
      for (const s of m.seatMatrix) {
        if (s.status.toUpperCase() !== "AVAILABLE") continue;
        (rows[s.rowLabel] ??= []).push({
          seat: s.seatNumber,
          type: s.seatType,
          price: s.price,
        });
      }
      return {
        ok: true,
        data: {
          showtimeId: m.showtimeId,
          auditorium: m.auditoriumName,
          totalSeats: m.totalSeats,
          availableSeats: m.availableSeats,
          availableByRow: rows,
        },
        ui: m,
      };
    } catch (e) {
      return toToolError(e);
    }
  },
};

export const getFnbItems: ToolDefinition = {
  name: "get_fnb_items",
  description:
    "Lấy danh sách bắp nước đang bán (combo, bắp, nước uống) kèm giá để gợi ý cho khách.",
  requiresAuth: false,
  schema: z.object({
    category: z
      .string()
      .optional()
      .describe("Lọc theo nhóm, ví dụ COMBO, POPCORN, BEVERAGE"),
  }),
  async handler(input, ctx) {
    try {
      const raw = await ctx.backend.get<unknown>("/fnb-items", {
        params: { active: true },
        signal: ctx.signal,
      });
      const wanted = input.category?.toUpperCase();
      const all = asArray<Record<string, unknown>>(raw)
        .filter((i) => !wanted || String(i.category).toUpperCase() === wanted)
        .map((i) => ({
          fnbItemId: Number(i.id),
          name: i.name,
          category: i.category,
          price: Number(i.basePrice),
          description: i.description ?? null,
          imageUrl: i.imageUrl ?? null,
        }));
      const llm = all.map(({ imageUrl: _omit, ...rest }) => rest);
      return { ok: true, data: { items: llm }, ui: { items: all } };
    } catch (e) {
      return toToolError(e);
    }
  },
};

/* ───────────── Công cụ giao dịch (cần đăng nhập) ───────────── */

export const holdSeats: ToolDefinition = {
  name: "hold_seats",
  description:
    "Giữ ghế cho khách trong thời gian ngắn (hạn giữ do hệ thống trả về). Chỉ gọi khi khách đã chọn rõ suất chiếu và số ghế.",
  requiresAuth: true,
  schema: z.object({
    showtimeId: z.number().int().min(1, "showtimeId phải từ 1 trở lên"),
    seatLabels,
  }),
  async handler(input, ctx) {
    if (!ctx.token) return AUTH_REQUIRED;
    try {
      const resolved = await seatsFromLabels(
        ctx,
        input.showtimeId,
        input.seatLabels,
        true,
      );
      if (resolved.error) return resolved.error;
      const held = await ctx.backend.post<{
        showtimeId: number;
        heldSeats: Array<{
          seatId: number;
          rowLabel: string;
          seatNumber: string;
        }>;
        holdExpiresAt: string;
        holdDurationMs: number;
      }>("/bookings/hold", {
        token: ctx.token,
        body: {
          showtimeId: input.showtimeId,
          seatIds: resolved.seats.map((s) => s.seatId),
        },
        signal: ctx.signal,
      });
      const totalPrice = resolved.seats.reduce((sum, s) => sum + s.price, 0);
      return {
        ok: true,
        data: {
          showtimeId: input.showtimeId,
          heldSeats: resolved.seats.map((s) => ({
            seatId: s.seatId,
            seat: s.seatNumber,
            type: s.seatType,
            price: s.price,
          })),
          holdExpiresAt: held.holdExpiresAt,
          holdMinutes: Math.round((held.holdDurationMs ?? 0) / 60000),
          totalSeatPrice: totalPrice,
        },
        ui: { matrix: resolved.matrix, held },
      };
    } catch (e) {
      return toToolError(e);
    }
  },
};

export const releaseSeats: ToolDefinition = {
  name: "release_seats",
  description: "Trả lại ghế đang giữ khi khách đổi ý.",
  requiresAuth: true,
  schema: z.object({
    showtimeId: z.number().int().min(1, "showtimeId phải từ 1 trở lên"),
    seatLabels,
  }),
  async handler(input, ctx) {
    if (!ctx.token) return AUTH_REQUIRED;
    try {
      const resolved = await seatsFromLabels(
        ctx,
        input.showtimeId,
        input.seatLabels,
        false,
      );
      if (resolved.error) return resolved.error;
      const r = await ctx.backend.post<{ releasedSeatIds: number[] }>(
        "/bookings/release",
        {
          token: ctx.token,
          body: {
            showtimeId: input.showtimeId,
            seatIds: resolved.seats.map((s) => s.seatId),
          },
          signal: ctx.signal,
        },
      );
      return {
        ok: true,
        data: {
          showtimeId: input.showtimeId,
          releasedSeatIds: r.releasedSeatIds,
        },
      };
    } catch (e) {
      return toToolError(e);
    }
  },
};

export const createOrderAndPayment: ToolDefinition = {
  name: "create_order_and_payment",
  description:
    "Tạo đơn hàng từ ghế ĐÃ GIỮ (kèm bắp nước/voucher nếu có) và tạo link thanh toán VNPay. Chỉ gọi sau khi khách xác nhận rõ ràng tổng tiền. Khách phải tự bấm link để thanh toán; kết quả cuối cùng do hệ thống xác nhận.",
  requiresAuth: true,
  schema: z.object({
    showtimeId: z.number().int().min(1, "showtimeId phải từ 1 trở lên"),
    seatLabels,
    fnbItems: z
      .array(
        z.object({
          fnbItemId: z.number().int().min(1, "fnbItemId phải từ 1 trở lên"),
          quantity: z.number().int().min(1).max(20),
        }),
      )
      .optional(),
    voucherCode: z.string().optional(),
  }),
  async handler(input, ctx) {
    if (!ctx.token) return AUTH_REQUIRED;
    try {
      // Ghế phải đang do chính khách giữ; backend kiểm tra việc này khi tạo đơn
      const resolved = await seatsFromLabels(
        ctx,
        input.showtimeId,
        input.seatLabels,
        false,
      );
      if (resolved.error) return resolved.error;

      const order = await ctx.backend.post<{
        orderId: number;
        orderCode: string;
        pricing: {
          subtotalTickets: number;
          subtotalFnb: number;
          discountAmount: number;
          finalAmount: number;
        };
        expiresAt: string;
      }>("/orders", {
        token: ctx.token,
        body: {
          showtimeId: input.showtimeId,
          seatIds: resolved.seats.map((s) => s.seatId),
          ...(input.fnbItems && input.fnbItems.length > 0
            ? { fnbItems: input.fnbItems }
            : {}),
          ...(input.voucherCode
            ? { voucherCode: input.voucherCode.trim().toUpperCase() }
            : {}),
          channel: "ONLINE_WEB",
        },
        signal: ctx.signal,
      });

      try {
        const pay = await ctx.backend.post<{
          paymentUrl: string;
          amount: number;
        }>("/payments/initiate", {
          token: ctx.token,
          body: { orderId: order.orderId, method: "VNPAY" },
          signal: ctx.signal,
        });
        const data = {
          orderId: order.orderId,
          orderCode: order.orderCode,
          pricing: order.pricing,
          expiresAt: order.expiresAt,
          paymentUrl: pay.paymentUrl,
          seats: resolved.seats.map((s) => s.seatNumber),
        };
        return { ok: true, data, ui: data };
      } catch (payErr) {
        // Không để đơn PENDING mồ côi: hủy đơn và nhả ghế rồi báo lỗi
        await ctx.backend
          .post(`/orders/${order.orderId}/cancel`, {
            token: ctx.token,
            body: {},
            signal: ctx.signal,
          })
          .catch(() => undefined);
        return toToolError(payErr);
      }
    } catch (e) {
      return toToolError(e);
    }
  },
};

export const getMyOrders: ToolDefinition = {
  name: "get_my_orders",
  description:
    "Xem các đơn hàng gần đây của khách đang đăng nhập (mã đơn, trạng thái, tổng tiền).",
  requiresAuth: true,
  schema: z.object({}),
  async handler(_input, ctx) {
    if (!ctx.token) return AUTH_REQUIRED;
    try {
      const raw = await ctx.backend.get<unknown>("/orders/my", {
        token: ctx.token,
        signal: ctx.signal,
      });
      const orders = asArray<{
        orderId: number;
        orderCode: string;
        status: string;
        showtimeId: number;
        pricing: { finalAmount: number };
        createdAt: string;
      }>(raw)
        .slice(0, 10)
        .map((o) => ({
          orderId: o.orderId,
          orderCode: o.orderCode,
          status: o.status,
          showtimeId: o.showtimeId,
          finalAmount: o.pricing?.finalAmount,
          createdAt: o.createdAt,
        }));
      return { ok: true, data: { orders } };
    } catch (e) {
      return toToolError(e);
    }
  },
};

export const getOrderStatus: ToolDefinition = {
  name: "get_order_status",
  description:
    "Xem trạng thái và vé của một đơn hàng. Dùng để xác nhận đơn đã thanh toán chưa; không tự suy đoán.",
  requiresAuth: true,
  schema: z.object({
    orderId: z.number().int().min(1, "oderId phải từ 1 trở lên"),
  }),
  async handler(input, ctx) {
    if (!ctx.token) return AUTH_REQUIRED;
    try {
      const o = await ctx.backend.get<{
        orderId: number;
        orderCode: string;
        status: string;
        pricing: { finalAmount: number };
        tickets: Array<{ ticketCode: string; price: number; status: string }>;
      }>(`/orders/${input.orderId}`, { token: ctx.token, signal: ctx.signal });
      return {
        ok: true,
        data: {
          orderId: o.orderId,
          orderCode: o.orderCode,
          status: o.status,
          finalAmount: o.pricing?.finalAmount,
          tickets: (o.tickets ?? []).map((t) => ({
            ticketCode: t.ticketCode,
            price: t.price,
            status: t.status,
          })),
        },
      };
    } catch (e) {
      return toToolError(e);
    }
  },
};

export const toolDefinitions: ToolDefinition[] = [
  searchMovies,
  getMovieDetails,
  getShowtimes,
  getAvailableSeats,
  getFnbItems,
  holdSeats,
  releaseSeats,
  createOrderAndPayment,
  getMyOrders,
  getOrderStatus,
];

/** Chạy tool theo tên; tên lạ hoặc dữ liệu sai schema trả về lỗi có cấu trúc thay vì ném lỗi */
export async function runTool(
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<ToolResult> {
  const def = toolDefinitions.find((t) => t.name === name);
  if (!def) return fail("UNKNOWN_TOOL", `Không có công cụ tên ${name}.`);
  const parsed = def.schema.safeParse(args ?? {});
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i: z.ZodIssue) => `${i.path.join(".") || "input"}: ${i.message}`)
      .join("; ");
    return fail("INVALID_ARGUMENTS", `Tham số không hợp lệ (${detail}).`);
  }
  if (def.requiresAuth && !ctx.token) return AUTH_REQUIRED;
  return def.handler(parsed.data, ctx);
}
