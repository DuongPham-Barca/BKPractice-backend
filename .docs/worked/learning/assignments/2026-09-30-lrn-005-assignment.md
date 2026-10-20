# 2026-09-30 — Viết và phê duyệt spec, plan, tasks LRN-005 Quản lý Assignment

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Tạo `specs/02-learning/assignments/spec.md`, `plan.md`, `tasks.md` và worked
  entry này. Không đụng source, cấu hình, dependency, migration, `specs/README.md` hay tài liệu của
  tính năng khác.

## Spec and plan

- Spec: `specs/02-learning/assignments/spec.md` — LRN-005 phiên bản 1.0
- Plan: `specs/02-learning/assignments/plan.md` — Approved 2026-09-30
- Tasks: `specs/02-learning/assignments/tasks.md` — Approved 2026-09-30
- Spec status at start: chưa tồn tại (thư mục chỉ có `.gitkeep`); kết thúc là `Approved` 1.0 (phê
  duyệt gộp)

Lý do không cần feature spec khác: đây là bước viết spec/plan/tasks (bước 1 và 2 của SDD), do người
dùng yêu cầu. Không có bước triển khai.

## Questions clarified

| Question                                      | Conclusion                                                                                                                                     | Source                                                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Có được tự chọn phương án và đặt Approved?    | Có, cho mọi phần trừ Submission và Judge; ghi rõ là phê duyệt gộp                                                                              | Người dùng, 2026-09-30: "bro generate cả luôn đi, tôi approve đó, trừ submission và judge"                                     |
| Assignment thuộc gì?                          | Đúng một Class của LRN-004, bắt buộc, do chủ sở hữu Class tạo                                                                                  | Quyết định nền cho LRN-005 trong brief điều phối, được uỷ quyền trên                                                           |
| Chấm điểm dựa vào đâu?                        | `progress.solved_at` ≤ `deadlineAt` là đạt, kể cả giải trước khi giao; điểm = `maxScore` hoặc 0; tổng; không nộp trễ                           | Như trên                                                                                                                       |
| `occurredAt` không phải lúc nộp?              | Chấp nhận ở v1, ghi rủi ro, đề xuất đội Submission thêm `submittedAt`; không đổi contract                                                      | Như trên; `submission.accepted` thuộc Submission                                                                               |
| Vòng đời?                                     | `DRAFT` → `PUBLISHED`; xoá hẳn nháp; xoá mềm và khôi phục bản đã xuất bản                                                                      | Brief + quy tắc hệ thống "không xoá cứng nội dung đã từng công khai"                                                           |
| Quyền mới?                                    | Sáu quyền `assignment:*` cho `LECTURER`, seed bằng migration ở Identity                                                                        | Brief; ID-003-FR-017                                                                                                           |
| Sửa sau khi xuất bản, giới hạn, Class lưu trữ | Chọn phương án đề xuất (bảng Quy tắc chỉnh sửa; 50 Problem; `maxScore` 1..1.000; Assignment chỉ đọc khi Class `ARCHIVED`)                      | Phê duyệt gộp của người dùng                                                                                                   |
| Xử lý `course_id` và `class_id` rỗng cũ?      | Giữ `course_id` (không dùng), `class_id` NOT NULL, khoá ngoại `RESTRICT`; dọn `course_id` ở migration riêng sau khi LRN-003 chỉ kiểm qua Class | Quyết định "thuộc đúng một Class"; migration `1700000003000-InitialLearningSchema.ts`; plan LRN-003 (`CourseReferenceChecker`) |
| Ai tính và hiển thị điểm Assignment?          | LRN-006 (`AssignmentScoreCalculator`, route `/api/progress/...`, `class:read-managed`); LRN-005 chỉ định nghĩa quy tắc và dữ liệu chấm         | Brief (LRN-006 tổng hợp theo Assignment); spec LRN-006-FR-013, FR-016 và plan LRN-006 trong working tree                       |

## What was done

- **Spec LRN-005 1.0**: 21 FR, 9 SR, 24 AC, 13 quyết định. Định nghĩa Assignment thuộc một Class, danh
  sách Problem `PUBLISHED` có thứ tự và `maxScore`, lịch `startsAt`/`deadlineAt`, vòng đời, bảng quy
  tắc chỉnh sửa theo thời gian, quy tắc hiển thị với sinh viên, chỉ đọc khi Class `ARCHIVED`, và
  **quy tắc chấm** dựa trên `solved_at`. Việc tính và hiển thị điểm được giao cho LRN-006
  (LRN-005-FR-011), LRN-005 chỉ bảo đảm dữ liệu chấm (LRN-005-FR-012).
- **Plan**: module `assignments` phân tầng đủ theo DDD + Hexagonal; aggregate `Assignment`, value
  object, `AssignmentPublishValidator`; 10 use case; port `AssignmentRepository`, `ClassAccessReader`,
  `ProblemCatalogReader`, `Clock` (tái dùng `PrincipalProvider`, `TransactionRunner` của LRN-001);
  migration `Lrn005AssignmentManagement` up/down; migration seed quyền ở Identity; 10 route; rủi ro và
  ba quyết định phối hợp đã chốt.
- **Tasks**: 36 task LRN-005-T001 tới T036 kèm Phụ thuộc/Truy vết, ba mục N/A (Messaging, Realtime,
  Cấu hình) và bảng độ phủ.

Bản nháp đầu có grader và route bảng điểm riêng trong LRN-005. Khi đối chiếu với spec/plan LRN-006 đã
xuất hiện trong working tree (LRN-006-FR-013, FR-016, `AssignmentScoreCalculator`, quyền
`class:read-managed`) và plan LRN-003 (`CourseReferenceChecker` đếm `assignments.course_id`), bản cuối
bỏ grader/bảng điểm khỏi LRN-005 và giữ cột `course_id`, để không có hai cài đặt quy tắc chấm và không
làm vỡ plan LRN-003. Không sửa file nào của LRN-003/LRN-004/LRN-006.

Người đọc giờ có đủ tài liệu để triển khai LRN-005 sau khi LRN-001 và LRN-004 sẵn sàng; LRN-006 triển
khai sau vì đọc bảng Assignment.

## Why these choices

- **Quy tắc chấm ở LRN-005, cài đặt ở LRN-006:** brief giao cho LRN-005 định nghĩa quy tắc và cho
  LRN-006 tổng hợp theo Assignment với `class:read-managed`; một cài đặt duy nhất tránh lệch điểm.
- **Tính điểm khi đọc, không lưu điểm:** tiến độ là nguồn chân lý duy nhất; gia hạn hay tạm giữ
  Problem tự phản ánh mà không cần đồng bộ bản sao.
- **Port đọc hẹp tới Class/Problem:** giữ ranh giới module rõ trong cùng bounded context, như
  `learning-service.md` yêu cầu ("keep internal cross-module interaction explicit").
- **`Clock` port:** mọi quy tắc hiển thị và khoá chỉnh sửa phụ thuộc thời gian; đây là seam kiểm thử
  thật.
- **`class_id` bắt buộc, `RESTRICT`:** schema ban đầu cho phép Assignment không có Class và cho phép
  xoá Class kéo theo Assignment; cả hai trái với quyết định "thuộc đúng một Class" và quy tắc không xoá
  cứng nội dung đã công khai. Khớp LRN-004-FR-020 (không xoá hẳn Class).
- **Giữ `course_id` không dùng:** bỏ cột làm vỡ `CourseReferenceChecker` của plan LRN-003; việc dọn cột
  được đề xuất như một thay đổi riêng.
- **Khoá danh sách Problem và `startsAt` sau khi mở, chỉ cho gia hạn hạn chót:** tránh đổi đề hay rút
  điểm sau khi sinh viên đã bắt đầu làm.
- **Lỗi thêm Problem dùng mã chung:** không lộ Problem nháp/tạm giữ của giảng viên khác (như LRN-003).

## How the feature works

Chưa triển khai. Luồng dự kiến:

1. Chủ sở hữu Class gọi `POST /api/classes/:classId/assignments` qua Gateway; Gateway đặt header định
   danh và quyền tin cậy.
2. Controller của module `assignments` gọi `CreateAssignment`; use case kiểm `assignment:create`, sở
   hữu Class, Class `ACTIVE`, rồi lưu Assignment `DRAFT`.
3. Giảng viên thiết lập danh sách Problem (`PUT /api/assignments/:id/problems`), đặt lịch, rồi xuất
   bản; `AssignmentPublishValidator` kiểm đủ điều kiện trên state đã lưu.
4. Sinh viên đang đăng ký gọi `GET /api/assignments/:id` sau `startsAt`; `GetStudentAssignment` trả
   Problem đang hiển thị theo thứ tự cùng `maxScore`.
5. Sinh viên làm bài qua Submission như bình thường; `submission.accepted` được LRN-006 ghi thành
   `progress.solved_at`. Điểm của sinh viên và bảng điểm của lớp được LRN-006 tính theo quy tắc LRN-005
   (đạt nếu `solved_at ≤ deadlineAt`) từ bảng `assignments`/`assignment_problems`.
6. Lỗi: chưa xác thực `401`; thiếu quyền hay không sở hữu `403`; chưa mở, nháp, đã xoá, không phải
   thành viên `404`; Class `ARCHIVED` hay sửa phần đã khoá `409`; dữ liệu sai hay chưa đủ điều kiện
   xuất bản `400`.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `npx --no-install prettier --write` trên bốn file markdown đã tạo.
- Not verified: không chạy lệnh kiểm chứng code vì đây là thay đổi chỉ tài liệu; đã đối chiếu các
  điểm phối hợp với plan LRN-003/LRN-004/LRN-006.

## Remaining

- Not done: chưa commit; chưa cập nhật `specs/README.md` (người điều phối sửa).
- Risks:
  - `occurredAt` của `submission.accepted` là lúc có kết quả chấm, không phải lúc nộp; bài nộp sát hạn
    chót có thể bị tính không đạt. Đề xuất đội Submission thêm `submittedAt` sau.
  - Phép tính điểm đặt ở LRN-006; giữ `assignments.course_id` không dùng cho tới khi LRN-003 chỉ kiểm
    qua `classes`; khoá ngoại `class_id` đổi sang `RESTRICT`. Đây là các quyết định đã chốt, không còn
    là câu hỏi mở.
  - Cần migration seed sáu quyền `assignment:*` ở Identity (LRN-005-T004).
