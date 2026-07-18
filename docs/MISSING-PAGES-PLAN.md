# KẾ HOẠCH CÁC TRANG CÒN THIẾU

Tài liệu này liệt kê các trang **chưa được dựng chi tiết** trên `frontend/` nhưng cần thiết cho nghiệp vụ của AIV, dựa theo `README.md` (đặc biệt mục 17 — Phạm vi phiên bản đầu tiên) và các use case ở mục 3–12.

Đã dựng chi tiết (không liệt kê lại ở đây): **Đăng nhập** (`/login`), **Chương trình / Projects Overview** (`/projects`, `/projects/:id`), **Hỏi AIV** (`/assistant`).

Mỗi trang bên dưới có: **Nghiệp vụ phục vụ** (vì sao cần, tham chiếu mục README) và **Nội dung / hành động chính**.

---

## P0 — Bắt buộc cho MVP (nên làm trước)

### Nhóm "Trang chủ"

#### 1. Bảng thông tin của tôi — `/`
- **Nghiệp vụ:** điểm vào chính sau đăng nhập, cá nhân hoá theo vai trò (mục 1–2). Thay vì trang trắng, mỗi vai trò thấy ngay việc cần xử lý.
- **Nội dung theo vai trò:**
  - Nhân viên/TNV: nhiệm vụ ưu tiên hôm nay, cập nhật tuần chưa gửi, thông báo mới
  - Trưởng nhóm: số báo cáo nhóm chưa nhận, khó khăn cần xác nhận, quyết định chờ duyệt
  - Lãnh đạo: widget tóm tắt tổ chức, link sang Bảng thông tin lãnh đạo
  - Điều phối: nhóm chưa cập nhật, việc cần tổng hợp tuần này
- **Thành phần UI:** 4 khối — "Việc cần làm hôm nay", "Cập nhật của tôi", "Thông báo mới nhất", "Lối tắt" (Hỏi AIV, chương trình của tôi)

#### 2. Nhiệm vụ của tôi — `/my-tasks`
- **Nghiệp vụ:** mục 2.4 — nhân viên/TNV biết việc được giao, mức ưu tiên, hạn.
- **Nội dung:** danh sách nhiệm vụ (chương trình, hạn, ưu tiên, trạng thái); nhiệm vụ quá hạn nổi bật màu đỏ; filter theo trạng thái/chương trình.
- **Hành động:** đổi trạng thái, cập nhật %, báo khó khăn ngay từ nhiệm vụ, bình luận, đính kèm tài liệu, xem quyết định liên quan.

#### 3. Cập nhật của tôi — `/my-updates`
- **Nghiệp vụ:** nền tảng của use case 1 (mục 3) — nếu thiếu trang này thì chuỗi tự động tổng hợp báo cáo tuần không có điểm bắt đầu.
- **Nội dung:** tuần hiện tại; bản nháp hệ thống tự tổng hợp từ hoạt động thu thập được; ô nhập tay bổ sung; chọn chương trình; đánh dấu việc hoàn thành/đang làm; khó khăn; bước tiếp theo; nhu cầu hỗ trợ.
- **Hành động:** Lưu nháp / Gửi cho trưởng nhóm / xem lại tuần trước.

#### 4. Thông báo — `/notifications`
- **Nghiệp vụ:** mục 14 — trung tâm cảnh báo, giảm bỏ sót việc/khó khăn/quyết định.
- **Nội dung:** danh sách thông báo (loại, thời gian, đã đọc/chưa); lọc theo loại; cấu hình tần suất nhận (ngày/tuần/chỉ nghiêm trọng).
- **Hành động:** đánh dấu đã đọc, click đi thẳng tới nội dung gốc.

### Nhóm "Điều phối công việc"

#### 5. Nhiệm vụ — `/tasks` (toàn nhóm/chương trình)
- **Nghiệp vụ:** mục 10.3 — trưởng nhóm/điều phối quản lý & phát hiện nghẽn công việc.
- **Nội dung:** bảng nhiệm vụ toàn nhóm; filter quá hạn / chưa có người phụ trách / chưa có hạn / đang bị cản trở; công việc phụ thuộc giữa nhiệm vụ.
- **Hành động:** giao việc, đặt hạn, đánh dấu phụ thuộc, xem lịch sử thay đổi.

#### 6. Cập nhật hằng tuần — `/weekly-updates` (cấp nhóm & tổ chức)
- **Nghiệp vụ:** lõi use case 1 (mục 3.3) — nơi diễn ra quy trình 6 bước: hệ thống thu thập → AI phân loại → tạo nháp → thành viên bổ sung → trưởng nhóm duyệt → báo cáo nhóm → điều phối tổng hợp toàn tổ chức.
- **Nội dung:** tab "Báo cáo nhóm" (ai đã/chưa gửi, tổng hợp nổi bật + khó khăn, ưu tiên tuần sau) và tab "Báo cáo toàn tổ chức" (điều phối kiểm tra trước khi công bố).
- **Hành động:** gửi nhắc nhở, chỉnh sửa, phê duyệt & công bố, tải file.

#### 7. Khó khăn — `/issues`
- **Nghiệp vụ:** use case 2 (mục 4) — phát hiện sớm thay vì chỉ biết khi đã quá hạn hoặc họp tuần mới lộ ra.
- **Nội dung:** danh sách (mức ảnh hưởng: Thấp/TB/Cao/Nghiêm trọng, trạng thái, người chịu trách nhiệm, hạn xử lý); tab riêng **"Khó khăn do hệ thống đề xuất"** — AI phát hiện từ các câu kiểu "đang chờ phê duyệt", kèm nội dung căn cứ + nguồn để người dùng xác nhận/từ chối; cơ chế gộp trùng lặp; báo động leo thang theo mục 4.3.
- **Hành động:** xác nhận, phân công, cập nhật kế hoạch giải quyết, đóng.

#### 8. Quyết định — `/decisions`
- **Nghiệp vụ:** use case 3 (mục 5) — tránh việc "nhớ kết quả nhưng quên lý do", có căn cứ tra cứu lại.
- **Nội dung:** danh sách + filter (nhóm, chương trình, người duyệt, thời gian, trạng thái); trang chi tiết đủ field mục 5.2 (lý do, phương án đã cân nhắc, ảnh hưởng dự kiến, quyết định bị thay thế...).
- **Hành động:** AI đề xuất bản nháp → người chịu trách nhiệm kiểm tra → người có thẩm quyền duyệt → chính thức (đúng nguyên tắc mục 16.1: AI không tự chốt quyết định).

#### 9. Cuộc họp — `/meetings`
- **Nghiệp vụ:** use case 5 (mục 7) — không để lọt việc/quyết định sau họp.
- **Nội dung:** danh sách cuộc họp; chi tiết gồm tóm tắt tự động, vấn đề chính đã thảo luận, quyết định đề xuất, việc cần làm, câu hỏi chưa trả lời.
- **Hành động:** xác nhận/từ chối nhiệm vụ đề xuất, gán người thực hiện, xác nhận quyết định/khó khăn, gửi tóm tắt cho người tham gia.

### Nhóm "Con người và bàn giao"

#### 10. Các nhóm — `/teams`
- **Nghiệp vụ:** một trong các chức năng bắt buộc MVP ("Danh sách nhóm và chương trình", mục 17).
- **Nội dung:** danh sách nhóm — mục tiêu, thành viên, chương trình phụ trách, tình trạng hoạt động, báo cáo gần nhất.

### Nhóm "Kho kiến thức"

#### 11. Thư viện tài liệu — `/knowledge`
- **Nghiệp vụ:** mục 12 — nơi lưu/tìm tài liệu tổ chức; là nền cho trợ lý AI trả lời có nguồn (không có trang này, "Hỏi AIV" không có gì thật để trích dẫn).
- **Nội dung:** danh sách tài liệu (nhóm, chương trình, loại, người sở hữu, phiên bản, trạng thái: đang dùng/bản nháp/có thể cũ/đã lưu trữ); cảnh báo AI phát hiện trùng lặp/mâu thuẫn/lâu không cập nhật.
- **Hành động:** gán người chịu trách nhiệm, đánh dấu lỗi thời, chỉ định tài liệu thay thế.

### Nhóm "Báo cáo" & "Quản trị"

#### 12. Bảng thông tin của nhóm — `/reports/team`
- **Nghiệp vụ:** trưởng nhóm nhìn nhanh sức khoẻ nhóm mình (thu nhỏ của mục 11 theo phạm vi nhóm).
- **Nội dung:** tổng hợp báo cáo thành viên, kết quả nổi bật, khó khăn, ưu tiên tuần tới.

#### 13. Nhật ký hoạt động — `/admin/activity-log`
- **Nghiệp vụ:** mục 15.4 — **bắt buộc MVP**, minh bạch & audit: ai xem/sửa/duyệt gì, AI dùng nguồn nào để trả lời, ai đổi quyền.
- **Nội dung:** bảng log — người dùng, hành động, đối tượng tác động, thời gian, nguồn dữ liệu AI đã dùng (nếu có).

---

## P1 — Nên có sau MVP

| Trang | Nghiệp vụ | Nội dung chính |
|---|---|---|
| Lịch sử trao đổi — `/assistant/history` | Tra lại câu hỏi cũ đã hỏi AIV | Danh sách phiên chat, đổi tên, xoá khi được phép |
| Câu trả lời đã lưu — `/assistant/saved` | Lưu tri thức quan trọng để dùng lại/chia sẻ nhóm | Danh sách câu trả lời đã lưu kèm nguồn gốc |
| Tìm kiếm kiến thức — `/assistant/search` | Tìm nâng cao xuyên kho tài liệu | Bộ lọc nhóm/chương trình/thời gian/loại tài liệu, chỉ hiện thông tin đã xác nhận |
| Hướng dẫn người mới — `/onboarding` | Use case 6 (mục 8) — người mới tự tìm hiểu, giảm phụ thuộc người hướng dẫn | Giới thiệu nhóm/chương trình, người liên hệ, tài liệu bắt buộc, checklist làm quen |
| Bàn giao — `/handoff` | Use case 7 (mục 9) — không mất bối cảnh khi người rời dự án | Form bàn giao (trách nhiệm hiện tại, việc dở dang, rủi ro), quy trình xác nhận 4 bước |
| Kết thúc tham gia — `/offboarding` | Thu hồi quyền đúng hạn cho TNV | Danh sách người sắp hết hạn, quyền cần thu hồi, xác nhận hoàn tất bàn giao |
| Bảng thông tin lãnh đạo — `/reports/leadership` | Mục 11 — toàn cảnh tổ chức cho ban lãnh đạo | Chương trình nguy cơ/chậm, khó khăn nghiêm trọng, quyết định chờ duyệt, tóm tắt AI hằng tuần |
| Kho quyết định — `/knowledge/decisions` | Tra cứu nhanh quyết định đã chính thức (lọc từ trang Quyết định) | View chỉ-đọc các quyết định trạng thái "Đã xác nhận" |
| Người dùng — `/admin/users` | Hỗ trợ "đăng nhập và phân quyền" (MVP) | Tạo/khoá tài khoản, gán nhóm/vai trò/chương trình, ngày bắt đầu-kết thúc TNV |
| Vai trò và quyền — `/admin/roles` | Kiểm soát ai xem/sửa/duyệt/xuất dữ liệu gì | Ma trận quyền theo vai trò × hành động |
| Danh sách thành viên — `/members` | Quản lý nhân sự/TNV theo nhóm | Bảng thành viên, lọc theo nhóm/chương trình/loại NV-TNV |

---

## P2 — Nâng cao / hạ tầng nội bộ (làm sau cùng)

| Trang | Nghiệp vụ |
|---|---|
| Báo cáo đã xuất — `/reports/exported` | Kho file báo cáo đã xuất các kỳ trước |
| Kiểm tra kiến thức — `/knowledge/check` | Rà soát định kỳ, đánh dấu tài liệu lỗi thời |
| Nguồn dữ liệu — `/admin/data-sources` | Kết nối email/nhắn tin/kho tài liệu/lịch họp |
| Đồng bộ dữ liệu — `/admin/sync` | Theo dõi lịch đồng bộ, lỗi, đồng bộ thủ công |
| Cấu hình trí tuệ nhân tạo — `/admin/ai-config` | Giới hạn phạm vi trả lời/nguồn của AI |
| Theo dõi hệ thống — `/admin/system-monitor` | Giám sát vận hành chung, tài khoản bị khoá |

---

## Đề xuất thứ tự triển khai

13 trang P0 ở trên là bộ khung tối thiểu để hệ thống "chạy được" đúng nghiệp vụ. Trong đó, **Cập nhật của tôi → Cập nhật hằng tuần** và **Khó khăn / Quyết định** nên ưu tiên cao nhất vì các trang khác đều tham chiếu tới.

Gợi ý điểm bắt đầu:
1. **Nhiệm vụ của tôi + Cập nhật của tôi** — màn nhân viên dùng hằng ngày.
2. **Khó khăn + Quyết định** — đã có sẵn dữ liệu mock liên kết từ trang Assistant.
3. Phần còn lại của P0, sau đó P1, cuối cùng P2.
