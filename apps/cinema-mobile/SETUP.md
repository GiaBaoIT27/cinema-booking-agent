# cinema-mobile: hướng dẫn chạy (iOS + Expo Go)

Thư mục này là **lớp phủ (overlay)**: copy đè lên project Expo mới tạo.

## 1. Tạo project

```bash
cd apps
npx create-expo-app@latest cinema-mobile
cd cinema-mobile
```

`create-expo-app@latest` tạo SDK mới nhất; Expo Go trên iPhone (App Store) hỗ trợ SDK này.

## 2. Xoá code mẫu rồi copy overlay

```bash
npm run reset-project        # chọn xoá hẳn thư mục mẫu (hoặc tự xoá app/ components/ hooks/ constants/ scripts/)
```

Copy toàn bộ nội dung thư mục `cinema-mobile-starter` vào `cinema-mobile` (đè lên). Cần có: `app/`, `features/`, `shared/`, `store/`, `lib/`, `theme/`, `types/`.

## 3. Cài thư viện

```bash
npx expo install @tanstack/react-query zustand expo-secure-store expo-image expo-location expo-status-bar @expo/vector-icons
```

## 4. Kiểm tra alias `@/`

Template mới đã có sẵn trong `tsconfig.json`:

```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

Nếu thiếu thì thêm vào. (Template thường đặt code ở gốc project, nên `@/*` trỏ `./*`. Nếu project của bạn dùng `src/`, hãy chuyển các thư mục vào `src/` và đổi thành `./src/*`.)

## 5. Cấu hình API

```bash
cp .env.example .env
```

Sửa `EXPO_PUBLIC_API_URL` thành **IP LAN** của máy chạy backend (Windows: `ipconfig` → IPv4 của Wi-Fi), ví dụ `http://192.168.1.23:3000/api/v1`.
**Không dùng `localhost`** vì điện thoại sẽ trỏ về chính nó.

## 6. Mạng và tường lửa (Windows)

- Điện thoại và máy tính cùng Wi-Fi.
- Mạng Wi-Fi để profile **Private**.
- Cho phép inbound cổng **8081** (Metro) và **3000** (backend) trong Windows Firewall.
- Kiểm tra nhanh: mở Safari trên iPhone vào `http://<IP>:3000/api/v1/cineplexes`. Thấy thông báo lỗi "chỉ hỗ trợ application/json" nghĩa là điện thoại đã tới được backend (chỉ do Safari không gửi header Accept).

## 7. Chạy

```bash
npx expo start -c
```

`-c` bắt buộc mỗi khi đổi `.env` (biến `EXPO_PUBLIC_*` được nhúng lúc bundle). Quét QR bằng Camera iPhone, mở bằng Expo Go. Khi iOS hỏi quyền **Local Network** thì chọn Cho phép.

Lần chạy đầu `typedRoutes` sinh type, các lỗi gạch đỏ liên quan route sẽ biến mất sau đó.

## Đã có

- Tab Phim (tìm kiếm, cuộn vô hạn), chi tiết phim
- Tab Rạp (tìm kiếm, "Rạp gần tôi" bằng GPS, cuộn vô hạn), chi tiết rạp (lịch chiếu 7 ngày, chỉ đường bằng Apple Maps, gọi rạp)
- Đăng nhập (email hoặc số điện thoại), lưu phiên trong SecureStore, tự xoá phiên khi token hết hạn
- Màn đặt vé: khung giữ chỗ (làm tiếp: sơ đồ ghế, VNPay)

## Hợp đồng API đã được xác nhận với backend

| Việc | Endpoint | Ghi chú |
| --- | --- | --- |
| Đăng nhập | `POST /api/v1/auth/login` | Body `{ username, password }` — `username` nhận email **hoặc** số điện thoại; mật khẩu ≥ 8 ký tự. Response: `{ tokenType, accessToken, expiresIn, refreshToken, user }` (access token sống 1800 giây). |
| Hồ sơ | `GET /api/v1/users/me` | Endpoint được bảo vệ, cần header `Authorization: Bearer <accessToken>`. |

Lưu ý quan trọng:

- Backend **không** có `POST /auth/refresh` và **không** có `POST /auth/logout`. Vì vậy app không refresh token: khi gặp 401 hoặc token hết hạn thì xoá phiên cục bộ và bắt đăng nhập lại. Đăng xuất chỉ xoá phiên trên máy.
- Mọi response được bọc trong envelope `{ success, code, message, data, pagination?, meta }` (lỗi: `{ success: false, code, errorCode, message, errors?: [{ field, message }] }`). `api-client` đã bóc sẵn lớp `data`.
- Request có body phải gửi `Content-Type: application/json`.
- `expo-secure-store` **không có implementation cho web** (native module rỗng → `getItemAsync` ném `getValueWithKeyAsync is not a function`). Vì vậy `src/lib/token-storage.ts` tự chọn nơi lưu theo nền tảng: iOS/Android dùng Keychain/Keystore, web dùng `localStorage`. Nếu chạy `npx expo start --web` mà gặp lỗi SecureStore, hãy kiểm tra lại file này.

## Những chỗ tôi ĐOÁN, cần đối chiếu với backend

1. **Movie** (`features/movie/types/movie.types.ts`): tên trường `title`, `posterUrl`, `durationMinutes`, `ageRating`, `status`, `genres`, `description`... và tham số query (`search`, `genre_id`...). Đối chiếu với `movie.type.ts` của web.
2. Lịch chiếu: `normalize-showtimes.ts` xử lý cả dạng nhóm theo phim lẫn dạng phẳng; nếu màn lịch trống dù API có dữ liệu, gửi mình JSON thật.
