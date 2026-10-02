# Audit Figma — M1 Foundation + Home

- Ngày kiểm tra: 2026-10-02.
- Phạm vi: Foundation hiện hành, các component được Home sử dụng, bốn Home desktop, specimen trạng thái discovery và điểm vào prototype S01.
- Phương pháp: đối chiếu screenshot, design context, thuộc tính node, variable binding, component variants và prototype reactions. Không sửa file Figma.
- Kết quả: đủ nguồn thiết kế để chuẩn bị M1; cần bổ sung quy tắc tương tác, responsive, focus và hiệu chỉnh tương phản trong [spec M1](../05-specs/m1-foundation-home.md). Đây không phải audit chi tiết toàn bộ các màn hình trong file.

## 1. Nguồn thiết kế hiện hành

File: [Movie Booking Agent — UI Design](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=2-2).

| Nguồn | Node | Vai trò |
| --- | --- | --- |
| Foundations & Components | `0:1` | Trang chứa library |
| Locked Hybrid Foundation v0.4.1 | [17:3219](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=17-3219) | Foundation hiện hành, 1280 × 1097 |
| Desktop Components v0.4.1 | `17:3328` | Library nền |
| Preference Controls v0.5.2 | `18:3798` | Theme và locale |
| Quick Booking v0.5.4 | `33:5964` | Shortcut đặt vé |
| Screens | `2:2` | Các màn hình sản phẩm |
| Home Light / EN | [33:6047](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=33-6047) | 1440 × 2630 |
| Home Light / VI | [33:6203](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=33-6203) | 1440 × 2684 |
| Home Dark / EN | [33:6362](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=33-6362) | 1440 × 2630 |
| Home Dark / VI | [33:6518](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=33-6518) | 1440 × 2684 |
| Discovery state specimens v1 | [218:6139](https://www.figma.com/design/8n7jzPDh8S4VuiemeEHUgE?node-id=218-6139) | Mô tả loading và error |
| Prototype Happy / S01 | `168:91` | Điểm vào prototype |

Đã lấy design context và xem screenshot của cả bốn Home, Foundation, Button, SearchField, QuickBooking, SelectField và discovery state board. Bản Foundation preview v0.3.3 (`16:2619`) và các collection `LegacyDraft`/`LegacyFailed` là lịch sử; không dùng làm token nguồn cho M1.

## 2. Foundation và token

Thiết kế dùng xanh cho hành động chính, nâu cho nhận diện/AI, Inter cho nội dung và điều khiển, Roboto Slab cho tiêu đề biểu cảm. Một viewport desktop tham chiếu rộng 1440px, content tối đa 1200px, navigation 72px; ghi chú Foundation đề cập grid 12 cột.

Inventory có 9 local variable collections và 107 variables. Bốn collection MBA hiện hành chứa **66 token**:

| Collection | Số lượng | Nội dung |
| --- | ---: | --- |
| MBA Theme Colors | 44 | 22 semantic colors cho mỗi theme |
| MBA Spacing | 11 | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px |
| MBA Radius | 5 | 6, 10, 14, 18, 999px |
| MBA Layout | 6 | Content 1200; gutter 32; nav 72; control 36/44/48px |

Các collection dùng một mode `Value`, với tên màu `light/...` và `dark/...`. Đây là cách tổ chức của file hiện tại. Code cần ánh xạ hai namespace vào semantic CSS variables; không tạo hai hệ component riêng.

[Bản chụp token](../05-specs/m1-foundation-home.tokens.json) giữ nguyên 66 giá trị nguồn, tách riêng các hiệu chỉnh M1 và các role bổ sung. File JSON này là tài liệu thiết kế, chưa phải cấu hình runtime.

### Typography

Library có 8 MBA Text Styles, không có local Paint Styles:

| Style | Font / weight | Size / line-height |
| --- | --- | --- |
| Display | Roboto Slab 700 | 48 / 52 |
| Heading | Roboto Slab 700 | 32 / 38 |
| Heading | Roboto Slab 600 | 24 / 30 |
| Title | Inter 600 | 18 / 24 |
| Body | Inter 400 | 16 / 25 |
| Body | Inter 400 | 14 / 21 |
| Label | Inter 500 | 13 / 17 |
| Caption | Inter 400 | 12 / 17 |

Home có các role khác library: H1 Slab 700 **48/54**, movie title Slab 600 **18/24**, QuickBooking title Slab 600 **20/25**, intro Inter **11/15**, field label **12/16**, field value **10/14**, button label Inter 600 **13/17**, AI body **13/19**. M1 cần giữ các role đo từ Home, không ép tất cả vào style gần giống trong library.

## 3. Component và binding

Inventory library hiện hành có 46 component sets, tổng 229 variants. Home dùng **9 sets / 46 variants**:

| Component | Node | Variants | Trục hiện có |
| --- | --- | ---: | --- |
| Button | `17:3367` | 18 | Theme × Primary/Secondary/Tertiary × Default/Hover/Disabled |
| SearchField | `17:3398` | 6 | Theme × Default/Focus/Filled |
| FilterChip | `17:3407` | 4 | Theme × Default/Selected |
| AIAssistEntry | `17:3433` | 2 | Theme |
| MovieCard | `17:3446` | 2 | Theme |
| TopNavigation | `17:3504` | 2 | Theme, guest navigation |
| LanguageSwitch | `18:3821` | 4 | Theme × locale selection |
| ThemeSwitch | `24:4375` | 4 | Theme × theme selection |
| QuickBooking | `33:6039` | 4 | Theme × Locale |

SelectField (`189:139`, 8 variants) là nguồn tham khảo cho điều khiển chọn; không mở rộng M1 sang auth. CustomerTopNavigation (`229:212`) thuộc trải nghiệm đã đăng nhập, không thay guest navigation của Home.

Mỗi Home có 164 descendant nodes, trong đó 76 text nodes: **0/76 gắn Text Style**. Có 96 nodes gắn ít nhất một variable, 132 nodes có solid fill, và 38 nodes có ít nhất một solid paint chưa bind variable. Trong số đó có màu artwork cố ý dùng riêng, nên không coi toàn bộ 38 nodes là lỗi.

Các set Home chỉ khai báo variant properties; nội dung VI/EN được ghi đè ở instance. Khi chuyển sang code, dùng content props/dictionaries và một cấu trúc component chung. Button chưa có Focus/Pressed/Loading; chip chưa có focus; QuickBooking chưa mô tả đầy đủ dependency selection, disabled và no-options.

## 4. Layout desktop đã đo

Số liệu dưới đây từ Home Light/VI. Các tọa độ khối là tương đối với `Main content` (`33:6240`), không phải tọa độ toàn trang.

| Khối | Node | Số đo chính |
| --- | --- | --- |
| Preference utility | `33:6204` | Content 1200 × 44 |
| Navigation | `33:6221` | Content 1200 × 72 |
| Main | `33:6240` | 1200 × 1972; top padding 48; vertical gap 48 |
| Hero | `33:6241` | y=48; 1200 × 296; EN cao 242 |
| Hero left / right | `33:6242` / `33:6262` | 760 / 392; gap 48 |
| Search row | `33:6245` | 647 × 44; gap 12; input rộng 540 |
| Filter row | `33:6253` | 351 × 34; gap 8 |
| QuickBooking | `33:6273` | y=392; 1104 × 92; radius 16; horizontal padding 18 |
| Quick helper | `33:6291` | y=532; 900 × 18 |
| AI entry | `33:6292` | y=598; 760 × 104; radius 14; padding 20 |
| Now showing | `33:6298` | y=750; 1200 × 456 |
| Upcoming | `33:6333` | y=1254; 1200 × 456 |
| Movie row | `33:6302` / `33:6337` | 1196 × 398; 5 cards; gap 24 |
| Movie card / poster | MovieCard instances | Card rộng 220, padding 14, radius 14; poster 192 × 250, radius 10 |

QuickBooking EN rộng 1093px, VI 1104px. Search control radius 12 và QuickBooking radius 16 chưa thuộc thang radius cơ sở; bổ sung theo role là hợp lý.

Main có khoảng 262px dư sau section cuối, bên ngoài còn wrapper chiều cao cố định. Không chuyển nguyên canvas height 2630/2684 thành chiều cao trang CSS. Đối chiếu vị trí và kích thước các khối nội dung; để chiều cao cuối trang theo nội dung.

Layout dùng chiều rộng cố định và `NO_WRAP`; inventory Screens không tìm thấy frame tên mobile/tablet/responsive. Quy tắc responsive trong spec là bổ sung được chủ dự án yêu cầu, không phải thiết kế mobile đã có trong Figma.

## 5. Artwork, dữ liệu và hành vi

- Không có IMAGE paint trong các Home đã kiểm tra. Poster là hình chữ nhật màu; M1 giữ placeholder để so sánh đúng nguồn thiết kế. Nguồn artwork thật thuộc bước nối dữ liệu sau.
- Magnifier là SVG 18 × 18, có asset từ design context. Khi triển khai cần lấy asset nguồn và lưu cục bộ; không dùng screenshot hay URL asset tạm thời làm runtime asset.
- Brand là chữ; không có footer trong bốn Home.
- Home ban đầu có cả Now Showing và Upcoming dù chip Now Showing đang selected. Không suy ra rằng chip phải ẩn Upcoming ngay khi vào trang.
- Một số genre ở Upcoming/VI còn tiếng Anh. M1 dùng dictionary để dịch UI, giữ nguyên tên riêng phim.
- Không có prototype reactions trên descendants của bốn Home Screens. Prototype Happy/S01 có một hành động được ghi nhận: Button `168:111` chuyển sang Happy/S02 `168:145`. Chưa đủ chứng cứ để coi toàn bộ CTA Home đã được định nghĩa.
- Ghi chú QuickBooking xác định Cinema → Movie → Date → Showtime → S08. Kết quả thật vẫn phải được Cinema Core xác nhận; fixture M1 chỉ mô phỏng lựa chọn và điểm chuyển tiếp.
- Discovery loading `218:6142` và error `218:6147` yêu cầu giữ query/filter context, Retry khi lỗi. Đây là specimen hướng dẫn, không sao chép nhãn `UI_STATE_*` hay viền chú thích vào giao diện sản phẩm. Chưa có full Home empty-state blueprint.

## 6. Tương phản và hiệu chỉnh đề xuất

Tính từ cặp màu sRGB nguồn bằng relative luminance; không đo pixel anti-alias trên screenshot. WCAG yêu cầu văn bản thông thường 4.5:1, chữ lớn 3:1. [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

| Cặp màu | Tỷ lệ | Xử lý M1 |
| --- | ---: | --- |
| White trên Light primary `#33a15b` | 3.29:1 | Primary đề xuất `#278349`: 4.74:1 |
| White trên Light hover `#2b8a4d` | 4.33:1 | Hover đề xuất `#267a44`: 5.32:1 |
| Light primary link trên page | 3.19:1 | `#278349` trên page: 4.61:1 |
| Light tertiary trên surface-subtle | 3.14:1 | Secondary/tertiary đề xuất `#5b7069`: 4.86:1 |
| Light secondary trên surface-strong | 4.22:1 | `#5b7069`: 4.54:1 |
| Dark tertiary trên surface-subtle | 3.92:1 | Tertiary đề xuất `#9ab0a7`: 6.55:1 |
| Dark on-primary `#07110a` trên primary | 7.93:1 | Giữ nguyên |

Chữ nhỏ action trên surface-subtle/soft dùng role `action/text` Light `#267a44`, thay vì màu background primary; đạt 4.62:1 trên action-soft. Chủ dự án đã cho phép chỉnh màu tối thiểu để đạt AA và duyệt các mã cụ thể cùng spec ngày 2026-10-02; token snapshot vẫn giữ giá trị nguyên bản. Những cặp này chưa chứng minh toàn bộ ứng dụng đạt AA; runtime vẫn cần kiểm tra focus, các nền thực tế và trạng thái.

## 7. Refactor Figma cần thiết đến mức nào?

Không cần thiết kế lại toàn bộ file để bắt đầu M1. Có thể xử lý các khác biệt rõ ràng bằng spec và semantic mapping. Nên cải thiện library theo thứ tự:

1. Bổ sung role typography đúng Home, rồi gắn Text Styles vào text instances; thêm radius 12/16 theo component.
2. Bind semantic text/surface/action colors còn hard-code; giữ màu artwork như dữ liệu nội dung.
3. Bổ sung focus/pressed, QuickBooking disabled/no-options/reset dependency và states dữ liệu.
4. Thêm responsive examples hoặc constraint notes theo spec được duyệt.
5. Chỉnh lại genre VI, component content properties và phân biệt rõ library hiện hành với lịch sử.

Các chỉnh sửa Figma này chưa được thực hiện trong audit. Chủ dự án đã duyệt spec M1 bổ sung ngày 2026-10-02; full discovery, auth, AI và booking cần spec riêng.
