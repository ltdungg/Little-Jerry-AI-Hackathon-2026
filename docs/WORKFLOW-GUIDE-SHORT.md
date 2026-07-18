LinkSTITCH: https://stitch.withgoogle.com/projects/1557291788320707128
LinkFIGMA: https://www.figma.com/design/dcAbu0Tl0QLkYKvZBGiN4T/Untitled?node-id=0-1&t=26Nlhbe7g7c90uof-1
LinkCHATBOT: https://chatgpt.com/g/g-6a5a9fb0c7d88191b1d43784cbfbd538-npo-ux-ui-prompt-architect

 At
# 04 — QUY TRÌNH LÀM UX/UI TỪ CHATBOT ĐẾN FIGMA

## 1. Bộ tài liệu dùng chung

Chatbot sử dụng 4 file:

```text
web-user-flows.md
01-DESIGN-SYSTEM.md
02-SCREEN-REGISTRY.md
03-OUTPUT-SCHEMA.md
```

Vai trò:

- `web-user-flows.md`: logic sản phẩm, route, quyền, flow, state.
- `01-DESIGN-SYSTEM.md`: màu sắc, typography, spacing, component, bố cục.
- `02-SCREEN-REGISTRY.md`: ID màn, overlay, responsive, state.
- `03-OUTPUT-SCHEMA.md`: cấu trúc JSON prompt đầu ra.

Nguyên tắc:

```text
Logic theo web-user-flows.md
Style theo 01-DESIGN-SYSTEM.md
Tên và ID theo 02-SCREEN-REGISTRY.md
JSON theo 03-OUTPUT-SCHEMA.md
```

---

## 2. Quy trình chung

```text
Yêu cầu từ Dev/Design
→ Chatbot tạo JSON prompt
→ Dán JSON vào Google Stitch
→ Tạo layout
→ Kiểm tra và refine
→ Chuyển sang Figma
→ Chuẩn hóa component
→ Bàn giao Dev code
```

---

## 3. Cách yêu cầu chatbot

### Tạo một màn

```text
Tạo SCR-03 / RSP-D / STA-DEFAULT
```

### Tạo màn có overlay

```text
Tạo SCR-02 / RSP-D / STA-PARTIAL / OVL-01
```

### Tạo nhiều màn

```text
Tạo group:
SCR-03 / RSP-D / STA-DEFAULT
SCR-04 / RSP-D / STA-DEFAULT
SCR-05 / RSP-D / STA-DEFAULT / OVL-02
```

Mỗi màn phải là một frame riêng.

### Tạo mobile

```text
Tạo RSP-M cho SCR-02 từ bản desktop
```

### Refine màn

```text
Refine SCR-03
Giữ nguyên shell, màu, typography và nội dung
Chỉ cải thiện hierarchy và chất lượng đồ họa
```

### Refine component

```text
Refine CMP-PROJECT-CARD trong SCR-03
Không thay đổi phần còn lại
```

### Audit

```text
Audit SCR-06 / RSP-D / STA-PARTIAL
```

Audit chỉ trả:

```text
PASS
PASS_WITH_FIXES
FAIL
```

---

## 4. ID sử dụng

### Screen

```text
SCR-01 Login
SCR-02 AI Assistant
SCR-03 Projects Overview
SCR-04 Project Command Center
SCR-05 Tasks and Risks
SCR-06 Report Intelligence
SCR-07 Workflow Control Center
SCR-08 Data Connectors
```

### Overlay

```text
OVL-01 Evidence Drawer
OVL-02 Create Task Drawer
OVL-03 Action Preview Modal
OVL-04 Slack Final Confirmation
```

### Responsive

```text
RSP-D Desktop 1440×900
RSP-T Tablet 1024×768
RSP-M Mobile 390×844
```

### State

```text
STA-DEFAULT
STA-LOAD
STA-EMPTY
STA-ERROR
STA-FORBIDDEN
STA-OFFLINE
STA-SUCCESS
STA-PARTIAL
STA-WAITING
STA-RUNNING
```

Tên frame:

```text
[SCREEN_ID] / [RESPONSIVE] / [STATE] / [OVERLAY]
```

---

## 5. Quy trình trong Stitch

1. Tạo project mới.
2. Upload:
   - `web-user-flows.md`
   - `01-DESIGN-SYSTEM.md`
   - moodboard đã duyệt
3. Dán JSON prompt do chatbot tạo.
4. Tạo đúng màn được yêu cầu.
5. Không tạo thêm màn ngoài danh sách.
6. Kiểm tra bằng mắt.
7. Audit bằng chatbot.
8. Refine nếu cần.
9. Chỉ chuyển sang màn tiếp theo khi layout đạt yêu cầu.

Thứ tự nên làm:

```text
SCR-01
→ SCR-02
→ SCR-03
→ SCR-04
→ SCR-05
→ SCR-06
→ SCR-07
→ SCR-08
```

Ba màn đầu dùng để khóa style chung.

---

## 6. Checklist kiểm tra layout

```text
[ ] Đúng tên frame
[ ] Đúng kích thước
[ ] Đúng sidebar và header
[ ] Đúng màu, font, spacing, radius
[ ] Có primary action rõ
[ ] Không thêm feature ngoài tài liệu
[ ] Không placeholder
[ ] Không generic template
[ ] Gradient không bị lạm dụng
[ ] Text đọc được ở 100%
[ ] Status có icon và text
[ ] Component có thể edit
```

---

## 7. Khi layout chưa đạt

Không tạo lại toàn bộ ngay.

Quy trình:

```text
Audit
→ lấy danh sách lỗi
→ refine đúng màn hoặc component
→ audit lại
```

Ví dụ:

```text
Audit SCR-03 / RSP-D / STA-DEFAULT
```

Sau đó:

```text
Refine CMP-PROJECT-CARD trong SCR-03 theo required_fixes
Giữ nguyên shell và style
```

---

## 8. Chuyển sang Figma

Cấu trúc file Figma:

```text
00 — Foundations
01 — Components
02 — Desktop
03 — Tablet
04 — Mobile
05 — Prototype
06 — Dev Handoff
```

Khi đưa layout từ Stitch sang Figma:

1. Đổi đúng tên frame.
2. Gắn Auto Layout.
3. Map màu sang Variables.
4. Map font sang Text Styles.
5. Thay thành phần lặp lại bằng Component.
6. Tạo variants cho state.
7. Kiểm tra responsive.
8. Nối prototype.

---

## 9. Bàn giao Dev

Mỗi màn cần có:

- Frame ID
- Route
- Responsive
- State
- Primary action
- Component sử dụng
- Interaction
- Permission
- Loading/empty/error
- Accessibility note
- Prototype link

Dev code theo Figma, không tự đổi style.

---

## 10. Quy tắc quan trọng

```text
web-user-flows.md khóa logic
01-DESIGN-SYSTEM.md khóa style
02-SCREEN-REGISTRY.md khóa ID
03-OUTPUT-SCHEMA.md khóa JSON
Figma là bản thiết kế cuối
```

Không thay global style nếu không có:

```text
OVERRIDE_STYLE=true
```

---

## 11. Definition of Done

Một màn hoàn thành khi:

```text
[ ] Đúng logic
[ ] Đúng ID
[ ] Đúng style
[ ] Audit PASS
[ ] Đã chuẩn hóa trong Figma
[ ] Prototype hoạt động
[ ] Dev đọc được handoff
```

