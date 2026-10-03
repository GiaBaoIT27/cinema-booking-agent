---
status: accepted
date: 2026-10-02
approved_at: 2026-10-02
scope: M1 Foundation + Home
---

# M1 — Foundation + Home

## 1. Trạng thái và quyết định

Chủ dự án đã duyệt bản spec trong cuộc trao đổi ngày 2026-10-02 bằng xác nhận “tôi duyệt bản spec”. Các hành vi, cấu trúc và khác biệt với Figma dưới đây được chấp nhận cho M1. Bản audit đã hoàn tất; frontend chưa được khởi tạo.

| Quyết định đã được chủ dự án xác nhận | Phạm vi |
| --- | --- |
| Next.js + TypeScript | `apps/cinema-frontend` |
| Tailwind CSS | Styling M1 và semantic theme |
| Giao diện + tương tác bằng dữ liệu mẫu | M1; nối backend API ở M2 |
| Desktop + responsive điện thoại/tablet | Desktop 1440; kiểm tra 375, 768, 1024px |
| Cho phép chỉnh màu tối thiểu để đạt AA | Giữ nhận diện/bố cục; ghi rõ khác biệt với Figma |

Phê duyệt của chủ dự án không tự suy ra mọi quy ước đã được hai thành viên thống nhất. Auth/session, canonical AI generation, các màn hình sau Home và production deployment vẫn cần quyết định riêng.

## 2. Mục tiêu và ranh giới

Tạo trang Home có thể chạy, đổi VI/EN và Light/Dark độc lập, tìm kiếm dữ liệu mẫu, chọn tuple đặt vé nhanh, thao tác bằng bàn phím và thích ứng các viewport đã chọn. Desktop lấy bốn Home Figma làm chuẩn hình ảnh.

**Bao gồm:**

- Font, semantic colors, spacing, radius, layout và các UI primitives cần cho Home.
- Preference utility, guest navigation, hero/search/filter, release-status panel, QuickBooking/helper, AI entry và hai movie sections.
- State ready/loading/empty/error cho demo search, disabled/no-options cho QuickBooking, mobile navigation và demo handoff dialog.
- Dữ liệu fixture có ID ổn định, copy VI/EN và poster placeholder đúng nguồn thiết kế.
- Kiểm chứng hành vi, responsive, hình ảnh và accessibility trong phạm vi Home.

**Phần tiếp nối ngoài M1:** full S02 discovery, cinema directory, movie detail/showtime pages, đăng nhập/tài khoản/vé, chat AI, sơ đồ ghế, hold/order/payment/ticket và backend adapters. CTA tới các phần này có phản hồi demo rõ ràng theo mục 6. Không mô phỏng hold, payment thành công hoặc vé hợp lệ.

## 3. Nguồn và thứ tự đối chiếu

Nguồn canonical, số đo chi tiết, component IDs và các phát hiện ở [audit Foundation/Home](../03-product/figma-m1-audit-2026-10-02.md). Token nguyên bản ở [token snapshot](m1-foundation-home.tokens.json).

| Home canonical | Node | Viewport |
| --- | --- | --- |
| Light / EN | [33:6047](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=33-6047) | 1440 |
| Light / VI | [33:6203](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=33-6203) | 1440 |
| Dark / EN | [33:6362](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=33-6362) | 1440 |
| Dark / VI | [33:6518](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=33-6518) | 1440 |

Áp dụng Foundation hiện hành cho semantic tokens; dùng Home cho copy, thứ tự khối và các role typography/layout riêng. Khi có khác biệt, ghi vào mục 9. Không dùng LegacyDraft, LegacyFailed, Foundation v0.3.3 hoặc CustomerTopNavigation thay guest navigation.

State board `218:6139` chỉ xác định giữ context và recovery; nhãn/viền chú thích không thuộc UI. Prototype Happy/S01 có điểm chuyển Search sang S02; M1 thay điểm chuyển đó bằng preview demo như mục 6, không coi prototype là hợp đồng backend.

## 4. Foundation và cấu trúc frontend

### 4.1. Runtime và styling

- Next.js App Router + TypeScript; Tailwind CSS v4, cài đặt qua PostCSS theo [hướng dẫn Tailwind cho Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs). Chốt phiên bản cụ thể và lockfile trong implementation plan trước khi cài.
- Một semantic namespace cho utility classes: page/surface/text/action/signature/border/status; hai bộ giá trị Light/Dark. Dùng CSS variables và `@theme inline` khi theme alias tham chiếu variable khác. [Tailwind theme variables](https://tailwindcss.com/docs/theme).
- Theme selector `data-theme="light|dark"`; chỉ dùng `dark:` khi có khác biệt cấu trúc cần thiết. [Tailwind dark mode](https://tailwindcss.com/docs/dark-mode).
- Inter 400/500/600/700 và Roboto Slab 600/700, tải font qua cơ chế build của Next.js; không dùng font fallback làm baseline ảnh chụp.
- 66 token nguồn giữ nguyên trong tài liệu. Runtime áp dụng hiệu chỉnh được duyệt từ `proposedM1Overrides`; radius control 12 và QuickBooking 16 cùng typography roles riêng từ `homeRoleExtensions`.
- Primary Light `#278349`, hover/action-text `#267a44`; secondary và tertiary Light `#5b7069`; tertiary Dark `#9ab0a7`. Dark action và signature giữ nguồn. Màu status nền không tự động được dùng làm chữ nhỏ nếu chưa kiểm tra cặp nền/chữ.

Đây là khởi tạo frontend mới; chưa có component framework, state library hoặc test runner mặc định của dự án. Chỉ thêm dependency phục vụ một nhu cầu cụ thể của M1.

### 4.2. Ranh giới trách nhiệm

| Phần | Trách nhiệm | Không phụ thuộc |
| --- | --- | --- |
| Route `/` và root layout | Render Home, khởi tạo preference, truyền fixture serializable | Auth/session backend |
| Preferences | Theme/locale, dictionary, persistence, document language | Catalog/booking selection |
| Home interactions | Search draft/submission, quick selection, menu/dialog | Network/backend availability |
| UI primitives | Button, search, chip, select, dialog và focus | Business fixture internals |
| Fixture adapter | Tìm phim, liệt kê options hợp lệ, demo state scenarios | Components hoặc DOM |
| Navigation intents | Ý định discovery/movie/auth/AI/seat-selection demo | Backend hold/payment |

Route/layout render trên server; phần tương tác nằm ở Client Component boundary. Không tạo bốn bản Home theo theme/locale. Fixture adapter thay thế được khi nối API M2 mà không viết lại các điều khiển.

### 4.3. Preference

- Mặc định: VI + Light. Cookies `mba_locale=vi|en`, `mba_theme=light|dark` là preference không chứa bí mật; chỉ chấp nhận giá trị thuộc enum, fallback mặc định khi thiếu/sai.
- Server đọc preference khi render ban đầu. Client cập nhật state, cookie và thuộc tính theme/lang khi đổi; không có màu/locale khác giữa HTML ban đầu và lần hydrate.
- Preference được nhớ trong 1 năm, Path `/`, SameSite Lax; Secure khi chạy HTTPS. Thao tác vẫn hoạt động trong phiên hiện tại khi cookie không thể lưu. Đây không phải thiết kế auth cookie.
- Đổi theme giữ locale; đổi locale giữ theme và các ID đang chọn. Đổi locale dịch nhãn, genre, status và ngày/giờ, không đổi tên riêng phim. Không reset query/filter/quick selection vì đổi preference.
- `html lang` cập nhật `vi`/`en`; state UI không lưu theo label đã dịch.

## 5. Layout và component

### 5.1. Desktop 1440

Container tối đa 1200px, canh giữa: outer margin thực tế 120px tại viewport 1440. Utility content cao 44px, navigation 72px; Main top padding 48, gap khối 48. Hero hai cột 760 + 48 + 392; SearchField 540px, search row gap 12; AI entry tối đa 760px. QuickBooking rộng theo nội dung EN 1093 / VI 1104, không vượt container.

Hai sections theo thứ tự Now Showing rồi Upcoming, mỗi section 5 cards. Card rộng 220px, padding 14, gap nội dung 12, radius 14; poster 192 × 250, radius 10; gap cards 24. H1 48/54 Slab 700, heading section 32/38 Slab 700, movie title 18/24 Slab 600. Các role nhỏ hơn giữ số đo từ audit.

Chiều cao nội dung theo text thực tế; không đặt page height 2630/2684, không giữ khoảng trống cuối canvas. Không thêm footer hoặc poster ảnh ngoài nguồn baseline.

### 5.2. Responsive bổ sung

Các breakpoint dưới đây được chấp nhận cho phạm vi responsive M1. Breakpoint xét CSS viewport width.

| Quy tắc | Điện thoại <768 | Tablet 768–1023 | 1024–1279 | ≥1280 |
| --- | --- | --- | --- | --- |
| Gutter tối thiểu | 16 | 24 | 32 | 32; container max 1200 |
| Navigation | Menu thu gọn | Menu thu gọn | Đầy đủ | Đầy đủ |
| Hero | Xếp dọc | Xếp dọc | Xếp dọc | Hai cột canonical |
| Search | Input fluid, button xuống hàng | Fluid trong một hàng | Fluid trong một hàng | Số đo desktop |
| QuickBooking | Intro, 4 selects và CTA xếp dọc | Intro, selects 2 × 2, CTA riêng | Intro, selects 2 × 2, CTA riêng | Hàng ngang canonical |
| Movie grid | 2 cột từ 360; 1 cột dưới 360 | 3 cột | 4 cột | 5 cột |
| Card gap | 16 | 24 | 24 | 24 |
| H1 size/line-height | 32/38 | 40/46 | 40/46 | 48/54 |
| Section heading | 28/34 | 32/38 | 32/38 | 32/38 |
| Khoảng cách khối chính | 32 | 48 | 48 | 48 |

- Card width fluid dưới 1280; poster giữ tỉ lệ 192:250. Cho title/metadata xuống dòng và card tăng chiều cao.
- Utility preferences được wrap, chiều cao tự động; không cắt nhãn VI/EN. Mobile controls có vùng tương tác ít nhất 44 × 44px.
- AI entry rộng tối đa 760, thu về 100% container; ở điện thoại CTA xuống hàng. Helper và các đoạn copy wrap theo container.
- Không có horizontal page scroll tại 375/768/1024. Kiểm tra thêm reflow ở 320 và zoom 200% để phát hiện chiều rộng/chiều cao cố định gây mất nội dung.
- Menu mobile giữ mọi destination của desktop; đóng khi chọn action hoặc Escape, trả focus về trigger khi đóng thủ công.

## 6. Hành vi tương tác

### 6.1. Search và filter draft

- Home ban đầu hiển thị đủ 5 Now Showing + 5 Upcoming. Search draft mặc định: query rỗng, release status `now-showing`, không genre. Chip/panel status cùng thay đổi một giá trị draft; chọn genre là toggle một giá trị `sci-fi` hoặc `drama`, chọn lại để bỏ.
- Đổi query/chip/status chưa thay đổi hai curated sections trên Home. Chỉ Submit mở demo search preview; Enter và search button cho cùng kết quả.
- Preview ghi rõ “Kết quả tìm kiếm mẫu / Demo search results”. Tìm theo tên phim đã trim, không phân biệt hoa thường; kết hợp release status và genre theo phép AND. Query rỗng trả toàn bộ fixture thuộc các filter hiện tại.
- Status panel là cách chọn draft release status như hero chips. Không bổ sung control sort trong M1 vì Home không có thiết kế cho nó.
- Loading thay phần results bằng skeleton, giữ query/filter và tiêu đề dialog. Empty có thông báo không có phim phù hợp và action xóa query/genre, giữ release status; lỗi có Retry giữ toàn bộ submitted context.
- Thao tác sửa draft sau khi đóng preview không làm thay đổi snapshot của request đã submit; submit mới dùng draft hiện tại. Đóng preview giữ draft và trả focus về nơi mở.

### 6.2. QuickBooking

Thứ tự: `cinemaId → movieId → date → showtimeId`. Options lấy từ fixture relationships, không suy ra từ tên/label.

| Thay đổi | State phải reset | Điều khiển được bật tiếp |
| --- | --- | --- |
| Cinema | Movie, date, showtime | Movie khi cinema có phim đang chiếu |
| Movie | Date, showtime | Date khi có suất phù hợp |
| Date | Showtime | Showtime khi có suất ngày đó |
| Showtime | Không reset predecessor | CTA khi cả tuple hợp lệ |

- Ban đầu chỉ Cinema enabled; placeholder “Chưa chọn / Not selected”. Upstream chưa chọn thì downstream disabled.
- Không có options: giữ lựa chọn upstream, hiển thị “Chưa có suất phù hợp / No matching showtimes”, downstream/CTA disabled. Không tự chọn option đầu tiên.
- Đổi upstream rồi chọn lại giá trị cũ vẫn cần chọn lại downstream; không phục hồi tuple cũ từ label.
- Cập nhật theo phản hồi của chủ dự án ngày 2026-10-03: dùng select-only combobox tùy biến. Toàn bộ box (nhãn, giá trị, icon và padding) mở danh sách khi enabled. Popup dùng semantic tokens Light/Dark, các option có hover/active, dấu tick cho giá trị đang chọn và target tối thiểu 44px. Enter/Space mở hoặc chọn; Arrow/Home/End điều hướng; gõ chữ tìm lựa chọn; Tab chọn và sang control tiếp theo; Escape hủy thao tác đang duyệt; bấm ngoài đóng popup. Giữ focus trên trigger với `aria-activedescendant`, có accessible label và selected state; upstream reset/downstream disabled giữ như trước. Popup giới hạn trong viewport, có cuộn và mở phía trên khi thiếu chỗ phía dưới.
- Khi Submit, kiểm tra lại tuple tồn tại trong adapter. Hợp lệ mở demo handoff `seat-selection` với movie/cinema/date/time. Tuple sai hiển thị lỗi cục bộ và không chuyển bước. Không ghi server hold/order.

### 6.3. Các CTA khác và phạm vi demo

M1 có route Home `/`; không tạo route giả tới trang chưa xây. Các action khác phát ra typed intent và mở một dialog chung, có nhãn rõ chức năng sẽ nối ở bước sau.

| Action | Kết quả M1 |
| --- | --- |
| Brand / Home | Về đầu trang Home |
| Navigation Now Showing | Cuộn tới `#now-showing`; khi reduced motion dùng cuộn tức thời |
| Navigation Cinemas | Handoff `cinema-directory` |
| My Tickets / Login | Handoff `my-tickets` / `login`; không tạo trạng thái đăng nhập giả |
| AI navigation / AI entry CTA | Handoff `ai-assistant`; không trả lời AI giả |
| View details trên movie card | Handoff `movie-details` kèm ID và thông tin fixture |
| Browse all ở một movie section | Demo search preview với status tương ứng, query/genre rỗng; không đổi hero draft |
| QuickBooking Submit | Handoff `seat-selection` kèm tuple đã kiểm tra |

Dialog handoff nói rõ dữ liệu mẫu và bước kế tiếp chưa nối; có action Close. Không cần hàng loạt auth/detail/AI/booking screens trong M1. Khác biệt này so với prototype được ghi ở mục 9.

### 6.4. State scenarios để kiểm tra

Demo mặc định tải fixture cục bộ ở trạng thái ready. Adapter có các scenario xác định để kiểm tra loading/error/empty/no-options mà không gọi backend:

- Search mặc định: Promise trả fixture phù hợp sau delay cố định 300ms; loading xuất hiện trong preview. Test có thể điều khiển clock thay vì đợi thời gian thực.
- Scenario error-once: request đầu lỗi, Retry cùng context thành công; không tự retry vô hạn.
- Empty: dùng query không khớp, không cần gắn empty kết quả với lỗi.
- Quick no-options: một cinema fixture không có showtime; chọn nó không crash và không bật CTA.

Scenario được chọn qua cấu hình fixture/test harness, không thêm debug toolbar vào Home người dùng. Đổi theme/locale không phát thêm search request. Đóng dialog trong lúc pending không mở lại dialog khi request hoàn thành.

## 7. Fixture contract

Adapter cục bộ có catalog và lịch chiếu giả với các quan hệ tối thiểu:

| Dữ liệu | Trường cần có |
| --- | --- |
| Movie | ID ổn định, title, release status, genre ID, duration minutes, age rating khi có, artwork placeholder color |
| Cinema | ID ổn định, display name; đánh dấu rõ là mẫu trong preview/handoff |
| Showtime | ID, cinemaId, movieId, local date `YYYY-MM-DD`, time `HH:mm` |
| Search input | Query, status, optional genre ID |
| Quick selection | Optional cinemaId/movieId/date/showtimeId; hợp lệ khi cùng một Showtime row |

Baseline lấy tên và metadata từ Figma:

| Now Showing | Genre | Minutes | Placeholder |
| --- | --- | ---: | --- |
| Dune: Part Two | sci-fi | 166 | `#355c4d` |
| Afterlight | drama | 124 | `#6f7d73` |
| Paper Moons | romance | 112 | `#8a6d62` |
| Night Shift | thriller | 118 | `#293c39` |
| Red Horizon | adventure | 132 | `#76534a` |

| Upcoming | Genre | Minutes | Age |
| --- | --- | ---: | --- |
| Orbit Zero | sci-fi | 128 | 13+ |
| Summer Letters | drama | 123 | 13+ |
| Skyward | adventure | 135 | 13+ |
| Quiet City | drama | 107 | 16+ |
| Last Signal | sci-fi | 118 | 13+ |

Upcoming placeholder dùng `#355c4d` như Home, kể cả Dark. Đây là artwork content, không thay tất cả bằng dark artwork token.

Quick fixture gồm hai cinema có lịch cho ít nhất hai phim Now Showing, hai ngày cố định `2026-10-10`/`2026-10-11`, nhiều hơn một giờ để kiểm tra reset, và một cinema không có lịch. Ngày fixture độc lập ngày máy; không tuyên bố lịch còn bán hoặc availability thật. Upcoming không có trong quick options.

Genre/status/age/duration labels lấy từ dictionary; title không dịch. Không gọi backend, database, Redis hoặc AI trong M1. Hợp đồng này là view model/fixture, không khẳng định DTO/response backend đã có các trường tương ứng.

## 8. Accessibility

- Cấu trúc semantic: header/nav/main, một H1, headings sections; button cho action, label cho input và `aria-labelledby` cho combobox; icon search trang trí không đọc lặp. Input tìm kiếm không có outline hình chữ nhật bên trong; dấu hiệu focus nằm trên viền bo tròn của container.
- Theme/locale/chip phản ánh selected state bằng tên và `aria-pressed` phù hợp; visible label không chỉ phụ thuộc màu.
- Mọi control operable bằng bàn phím, focus nhìn thấy trên Light/Dark. Dialog có accessible name, chuyển focus vào dialog, trap focus, Escape, restore focus; không có focusable hidden menu.
- Status loading/error/empty thông báo qua live region thích hợp; Retry và clear filters có tên rõ. Disabled dùng native disabled và helper giải thích khi cần.
- Văn bản thông thường tối thiểu 4.5:1; chữ lớn tối thiểu 3:1; kiểm tra từng cặp foreground/background của trạng thái enabled. Các hiệu chỉnh đề xuất ở audit/token snapshot. [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Focus/control visual indicator được kiểm tra trên nền thực tế; border trang trí không được coi là indicator duy nhất.
- Vùng tương tác mobile mục tiêu 44 × 44; các target khác kiểm tra yêu cầu AA tối thiểu 24 × 24 hoặc spacing exception hợp lệ. [W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Text wrap, zoom và reduced motion hoạt động. Không tuyên bố toàn ứng dụng đạt AA từ phép tính màu hoặc một lần chạy scanner.

## 9. Khác biệt được ghi nhận so với Figma

| Khác biệt M1 | Lý do / trạng thái |
| --- | --- |
| Primary/hover/action-text và tertiary colors theo snapshot | Chủ dự án đã duyệt các mã cụ thể cùng spec ngày 2026-10-02 |
| Responsive breakpoint/layout và mobile menu | Chủ dự án chọn responsive; chưa có frame mobile/tablet |
| Focus, disabled dependency, no-options, loading/error/empty | Bổ sung hành vi có thể kiểm chứng; board chỉ mô tả một phần |
| Typography Home roles và radius 12/16 | Giữ số đo Home đang khác base styles/tokens |
| Genre VI được dịch nhất quán | Sửa UI strings còn tiếng Anh trong Upcoming/VI |
| Trang cao theo nội dung, bỏ blank tail canvas | Tránh fixed-height gây tràn/cắt khi wrap và zoom |
| Search preview và dialog handoff cho màn hình ngoài M1 | Giới hạn Home tương tác với fixture; S02/S08 thật thuộc bước sau |
| Custom combobox popup và mobile target size | Phản hồi chủ dự án 2026-10-03; keyboard/touch, Light/Dark và vị trí popup trong viewport |

Mọi khác biệt mới ngoài bảng phải được giải thích trong review trước khi thay baseline. Không tự thêm movie photo, footer, login state, AI generation hoặc transaction simulation.

## 10. Tiêu chí nghiệm thu

| ID | Quan sát cần đạt |
| --- | --- |
| M1-01 | Route `/` render đủ khối theo thứ tự Figma; 5 Now Showing + 5 Upcoming, đúng fixture titles và poster colors |
| M1-02 | Ảnh desktop 1440 cho Light/VI, Light/EN, Dark/VI, Dark/EN đối chiếu cùng fonts/content; giải thích mọi lệch ngoài mục 9 |
| M1-03 | Viewport 375/768/1024: grid lần lượt 2/3/4 cột, menu collapse theo breakpoint, QuickBooking theo bảng; không horizontal page scroll hoặc nhãn bị cắt |
| M1-04 | Đổi theme/locale độc lập, giữ query/filter/tuple; reload giữ preferences; invalid cookie fallback; không hydration mismatch hoặc flash theme khác |
| M1-05 | Enter/button Search cùng context; query trim/case-insensitive; status và genre kết hợp đúng; initial curated sections không bị ẩn vì default chip |
| M1-06 | Search loading/empty/error-once/Retry: giữ context, clear theo quy tắc, pending không mở lại dialog đã đóng |
| M1-07 | Quick selection theo dependencies; upstream reset downstream; no-options disable; invalid tuple không submit; valid tuple mở handoff không tạo hold |
| M1-08 | Tất cả CTA có phản hồi trong bảng mục 6; không route 404, giả login, chat AI hoặc ticket/payment outcome |
| M1-09 | Mọi UI label/genre/status/date đổi VI/EN; movie title và ID giữ nguyên; không lẫn nhãn genre EN trong VI |
| M1-10 | Keyboard hoàn thành Search, Quick và menu/dialog; focus rõ, Escape/restore focus đúng; target mobile đạt 44; zoom/reflow không mất controls |
| M1-11 | Các enabled text colors thực tế được đo đạt yêu cầu; Dark CTA dùng đúng on-primary tối; source tokens và deviations truy vết được |
| M1-12 | Font đã tải trước visual capture; magnifier SVG local đúng nguồn/18 × 18; placeholder fallback không gây layout shift |
| M1-13 | Lint, typecheck, production build và checks hành vi được định nghĩa trong app, chạy thành công; ghi rõ commands và các kiểm tra manual chưa chạy |

Verification tập trung vào behavior thật: reducer/dependency reset và fixture relations, preference persistence/hydration, search lifecycle, keyboard/dialog, visual tại các viewport. Không viết test chỉ kiểm tra tên class/token giống implementation. Ảnh đối chiếu chụp vùng nội dung tương ứng; không yêu cầu total page height bằng canvas Figma có blank tail. Ngưỡng/tolerance và cách lưu visual evidence được chốt trong implementation plan.

## 11. Thứ tự triển khai

1. Chốt dependency versions, package manager/lockfile, app boundary và commands thật.
2. Foundation: fonts, semantic Tailwind theme, preference SSR/client và UI primitives cần thiết.
3. Home desktop: dictionaries/fixtures, layout và bốn theme/locale combinations.
4. Search demo, QuickBooking dependencies và navigation handoffs.
5. Responsive, focus/keyboard và states; đối chiếu desktop sau mỗi thay đổi ảnh hưởng layout.
6. Chạy tiêu chí nghiệm thu, sửa lệch, lưu bằng chứng và review trước bước tích hợp.

Danh sách này là build sequence đã được duyệt; công việc theo file/task nằm trong [implementation plan](../07-guides/m1-foundation-home-implementation-plan.md). Việc nối API M2 cần đọc controller/DTO/envelope thật theo [HTTP contracts](../02-architecture/http-contracts.md), không suy endpoint từ Figma.
