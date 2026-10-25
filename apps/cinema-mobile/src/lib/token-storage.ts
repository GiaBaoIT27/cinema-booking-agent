import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "authSession";

/** Phiên đăng nhập được lưu cục bộ (Keychain iOS / Keystore Android). */
export interface StoredSession {
  accessToken: string;
  /** Backend vẫn trả refresh token nhưng KHÔNG có endpoint `/auth/refresh`. */
  refreshToken: string | null;
  /** Thời điểm hết hạn của access token (ms epoch). */
  expiresAt: number | null;
}

/**
 * `expo-secure-store` KHÔNG có implementation cho web (native module rỗng →
 * `getItemAsync` ném "not a function"). Nên trên web ta dùng `localStorage`.
 * Trên iOS/Android vẫn dùng Keychain/Keystore như thiết kế.
 */
const isWeb = Platform.OS === "web";

function getWebItem(key: string): string | null {
  try {
    // `localStorage` có thể không tồn tại khi render ở server (expo web output "server").
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setWebItem(key: string, value: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    // Safari private mode / quota → coi như không lưu được, phiên sẽ không sống qua restart.
  }
}

function deleteWebItem(key: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  } catch {
    // Bỏ qua.
  }
}

async function readRaw(key: string): Promise<string | null> {
  try {
    return isWeb ? getWebItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    // SecureStore có thể lỗi (không có keychain, simulator, v.v.) → coi như chưa lưu.
    return null;
  }
}

async function writeRaw(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      setWebItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Không lưu được phiên (vd. thiếu entitlement) → vẫn cho user đăng nhập,
    // chỉ mất khả năng khôi phục phiên sau khi restart app.
  }
}

async function removeRaw(key: string): Promise<void> {
  try {
    if (isWeb) {
      deleteWebItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Bỏ qua.
  }
}

/** Token lưu trong Keychain (iOS) / Keystore (Android), khác localStorage của web. */
export const tokenStorage = {
  /** Đọc phiên đã lưu. Trả null nếu dữ liệu hỏng hoặc access token đã hết hạn. */
  async getSession(): Promise<StoredSession | null> {
    const raw = await readRaw(SESSION_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (!parsed.accessToken) {
        await removeRaw(SESSION_KEY);
        return null;
      }
      const expiresAt = parsed.expiresAt ?? null;
      if (expiresAt !== null && expiresAt <= Date.now()) {
        // Token hết hạn và backend không có endpoint refresh → coi như chưa đăng nhập.
        await removeRaw(SESSION_KEY);
        return null;
      }
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken ?? null,
        expiresAt,
      };
    } catch {
      // JSON hỏng → xoá luôn để tránh kẹt trạng thái "đã đăng nhập" giả.
      await removeRaw(SESSION_KEY);
      return null;
    }
  },

  /**
   * Access token còn hiệu lực (dùng để gắn header Bearer).
   * Trả null nếu chưa đăng nhập hoặc token đã hết hạn.
   */
  async getAccess(): Promise<string | null> {
    const session = await tokenStorage.getSession();
    return session?.accessToken ?? null;
  },

  /** Lưu phiên sau khi đăng nhập thành công. */
  async set(tokens: {
    accessToken: string;
    refreshToken?: string | null;
    /** Số giây còn lại của access token (backend trả 1800 = 30 phút). */
    expiresIn?: number;
  }): Promise<void> {
    const session: StoredSession = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      expiresAt:
        typeof tokens.expiresIn === "number" && tokens.expiresIn > 0
          ? Date.now() + tokens.expiresIn * 1000
          : null,
    };
    await writeRaw(SESSION_KEY, JSON.stringify(session));
  },

  /** Xoá phiên cục bộ (dùng cho đăng xuất và khi token hết hạn/hỏng). */
  async clear(): Promise<void> {
    await removeRaw(SESSION_KEY);
  },
};
