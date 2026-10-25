import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import type { GenerativeUIWidget, HeldSeatRef } from "./session.js";

export type { GenerativeUIWidget, WidgetType } from "./session.js";

/** Giữ giá trị mới nếu có (kể cả null để xóa), bỏ qua khi undefined */
function latest<T>(initial: T) {
  return Annotation<T>({
    reducer: (prev: T, next: T) => (next === undefined ? prev : next),
    default: () => initial,
  });
}

export const MovieAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  movieId: latest<number | null>(null),
  movieTitle: latest<string | null>(null),
  showtimeId: latest<number | null>(null),
  selectedSeats: latest<HeldSeatRef[]>([]),
  holdExpiresAt: latest<string | null>(null),
  orderId: latest<number | null>(null),
  activeWidget: latest<GenerativeUIWidget | null>(null),
});

export type MovieAgentStateType = typeof MovieAgentState.State;
