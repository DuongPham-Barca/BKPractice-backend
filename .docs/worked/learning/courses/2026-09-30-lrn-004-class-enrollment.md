# 2026-09-30 — Viết và phê duyệt bộ tài liệu SDD LRN-004 Class & Enrollment

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Tạo `specs/02-learning/enrollments/spec.md`, `plan.md`, `tasks.md`. Không đụng
  source, cấu hình, dependency hay migration. Entry nằm dưới `courses` vì code Class/Enrollment hiện
  ở `apps/learning-service/src/modules/courses/`; kế hoạch chuyển chúng sang module `enrollments` khi
  triển khai.

## Spec and plan

- Spec: `specs/02-learning/enrollments/spec.md` — LRN-004 phiên bản 1.0
- Plan: `specs/02-learning/enrollments/plan.md` — Approved 2026-09-30
- Tasks: `specs/02-learning/enrollments/tasks.md` — Approved 2026-09-30
- Spec status at start: chưa tồn tại; kết thúc là `Approved` 1.0 (phê duyệt gộp)

Lý do không cần feature spec khác: đây là bước viết spec/plan/tasks (bước 1–2 của SDD), do người dùng
yêu cầu. Không có bước triển khai nào.

## Questions clarified

Nguồn chung cho mọi dòng dưới đây: người dùng (chủ sở hữu sản phẩm) nói ngày 2026-09-30: "bro generate
cả luôn đi, tôi approve đó, trừ submission và judge" — tức duyệt trước các phương án đề xuất.

| Question                                  | Conclusion                                                                                                    | Source                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Class gắn với Course nào?                 | Đúng một Course `PUBLISHED` chưa xoá mềm của bất kỳ ai; cố định sau khi tạo                                   | Phê duyệt gộp; brief điều phối    |
| Ai sở hữu Class?                          | Giảng viên tạo (`lecturer_id`), một giảng viên mỗi lớp ở v1                                                   | Phê duyệt gộp                     |
| Mã tham gia?                              | 8 ký tự `A`–`Z`/`0`–`9`, CSPRNG, duy nhất, không phân biệt hoa thường; chủ sở hữu tạo lại, mã cũ mất hiệu lực | Phê duyệt gộp                     |
| Ai tham gia, rời, gỡ?                     | Vai trò `STUDENT` tham gia bằng mã; sinh viên tự rời; chủ sở hữu gỡ; tham gia lại được bằng mã hợp lệ         | Phê duyệt gộp                     |
| Vòng đời Class?                           | `ACTIVE` ⇄ `ARCHIVED`; lưu trữ khoá tham gia và đóng băng danh sách; không xoá hẳn Class                      | Phê duyệt gộp                     |
| Ai xem gì?                                | Chủ sở hữu xem đầy đủ gồm mã và danh sách; sinh viên chỉ xem thông tin lớp, không xem bạn cùng lớp            | Phê duyệt gộp                     |
| Course bị tạm giữ/xoá mềm sau khi mở lớp? | Class không đổi; chỉ ẩn tóm tắt Course với sinh viên                                                          | Phê duyệt gộp                     |
| `ON DELETE CASCADE` và LRN-003-FR-018?    | Course đang được Class tham chiếu không bao giờ bị xoá hẳn; plan đổi khoá ngoại sang `RESTRICT`               | Phê duyệt gộp; khảo sát migration |
| Mã quyền?                                 | Sáu quyền `class:*` cho `LECTURER`, seed bằng migration Identity                                              | Phê duyệt gộp; ID-003-FR-017      |
| Giới hạn?                                 | 500 sinh viên mỗi lớp; trang tối đa 100 mục                                                                   | Phê duyệt gộp                     |
| Import hàng loạt?                         | Không có ở v1                                                                                                 | Brief điều phối                   |
| Module nào?                               | Tách module `enrollments` theo bố cục của `learning-service.md`                                               | Phê duyệt gộp; kiến trúc          |

## What was done

- **Spec LRN-004 1.0 (Approved):** 22 FR, 8 SR, 24 AC. Định nghĩa Class là lớp học phần của một kỳ,
  gắn cố định với một Course đã xuất bản; mã tham gia 8 ký tự; vòng đời `ACTIVE`/`ARCHIVED`;
  Enrollment với tham gia lặp lại không đổi state, tự rời, bị gỡ; giới hạn 500; hai biểu diễn (quản
  lý và thành viên); bảo đảm Course bị xoá không bao giờ kéo theo Class (FR-019); 12 quyết định đã
  chốt.
- **Plan (Approved):** module `enrollments` mới, aggregate `Classroom` và `Enrollment`, domain service
  `EnrollmentPolicy`, 13 use case, 4 port mới, 13 route dưới `/api/classes`, migration Learning
  `Lrn004ClassEnrollment` (trạng thái, mốc thời gian, khoá ngoại `RESTRICT`, index) và migration seed
  quyền Identity `Lrn004ClassPermissions`.
- **Tasks (Approved):** 38 task `LRN-004-T001`–`T038` có phụ thuộc và truy vết, cộng hai mục N/A
  (messaging, realtime) và bảng độ phủ.

Sau thay đổi này, người triển khai có đủ spec/plan/tasks nhất quán để làm LRN-004 ngay sau LRN-001
và LRN-003; chưa có hành vi nào mới trong ứng dụng.

## Why these choices

- **Module `enrollments`:** `learning-service.md` giữ Class trong Courses "cho tới khi hành vi của
  chúng biện minh cho một module rõ hơn", và liệt kê sẵn `modules/enrollments/`. Vòng đời riêng, mã
  tham gia và giới hạn sĩ số là hành vi đó.
- **Enrollment là aggregate riêng:** tới 500 dòng mỗi lớp; kiểm sĩ số dưới khoá dòng `classes` như
  cách LRN-002 tách `TestCase` khỏi `Problem`.
- **Khoá ngoại `RESTRICT`:** migration nền tảng khai báo `classes.course_id ... ON DELETE CASCADE`;
  nếu LRN-003-FR-018 xoá nhầm một Course, CSDL sẽ xoá Class, Enrollment và cả Assignment. `RESTRICT`
  biến FR-019 thành bảo đảm ở tầng CSDL.
- **Rời/gỡ là xoá dòng:** Enrollment là tư cách thành viên hiện tại, không phải nội dung đã công
  khai; tiến độ lưu theo `(user_id, problem_id)` nên không mất.
- **Route dưới `/api/classes`:** Gateway đã chuyển tiền tố này tới Learning, nên không phải đổi
  Gateway.
- **Vai trò `STUDENT` cho việc tham gia, không phải quyền:** theo brief; vai trò đã có trong header
  `x-auth-roles` tin cậy.
- **Không CHECK định dạng `join_code`:** dữ liệu cũ có thể không khớp; domain bảo đảm định dạng mới.

## How the feature works

Chưa triển khai. Luồng dự kiến theo plan:

1. Giảng viên có `class:create` gọi `POST /api/classes` với tên và `courseId`; `CreateClass` kiểm
   Course đang `PUBLISHED`, sinh mã, lưu Class `ACTIVE` và trả biểu diễn quản lý gồm mã.
2. Giảng viên đưa mã cho sinh viên. Sinh viên gọi `POST /api/classes/join`; `JoinClass` kiểm vai trò
   `STUDENT`, chuẩn hoá mã, khoá dòng Class, kiểm `ACTIVE`, trả Enrollment cũ nếu đã là thành viên,
   ngược lại kiểm chủ sở hữu và sĩ số rồi tạo Enrollment (`201`).
3. Sinh viên xem `GET /api/classes/enrolled` và `GET /api/classes/:id`, chỉ thấy thông tin lớp và tóm
   tắt Course nếu Course còn khả dụng.
4. Chủ sở hữu xem `GET /api/classes/managed/:id/members`, gỡ sinh viên, tạo lại mã, đổi tên, lưu trữ
   và khôi phục.
5. Thất bại: mã sai/cũ → `404` chung; lớp `ARCHIVED`, đủ sĩ số, chủ sở hữu tự tham gia → `409`; thiếu
   quyền/vai trò hoặc không phải chủ sở hữu → `403`; người ngoài lớp xem → `404`. Mọi thất bại để
   nguyên state.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `npx --no-install prettier --write` trên ba file spec/plan/tasks và
  file worked này.
- Not verified: không chạy lệnh kiểm chứng code (thay đổi chỉ là tài liệu). Tên ràng buộc
  `classes_course_id_fkey` là tên mặc định PostgreSQL, chưa kiểm trên CSDL (task LRN-004-T004).

## Remaining

- Not done: chưa commit; chưa triển khai; `specs/README.md` do người điều phối cập nhật.
- Risks: danh sách sinh viên chỉ có UUID vì Identity chưa có đường tra hồ sơ hàng loạt cho giảng
  viên; việc chuyển entity sang module `enrollments` chạm file mà LRN-003/LRN-005 cũng dùng. Câu chữ
  ID-003-AC-017/018, khoá ngoại `assignments.class_id` và tên module đã được phối hợp, không còn là
  câu hỏi mở.
