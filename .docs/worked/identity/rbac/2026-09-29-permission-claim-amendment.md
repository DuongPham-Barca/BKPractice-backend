# 2026-09-29 — Sửa đổi ID-003 0.4 và ID-001 1.1: claim quyền trong access token

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Thêm và phê duyệt bản sửa đổi trong `specs/01-identity/rbac/spec.md` và
  `specs/01-identity/authentication/spec.md`. Không đụng source, cấu hình, dependency hay migration.

## Spec and plan

- Spec: ID-003 RBAC (0.3 → 0.4 Approved); ID-001 Authentication (1.0 → 1.1 Approved)
- Plan: `rbac/plan.md`, `authentication/plan.md` thêm mục "Bổ sung cho bản sửa đổi"
- Tasks: `rbac/tasks.md` thêm ID-003-T045 tới T050; `authentication/tasks.md` thêm ID-001-T045 tới
  T047; LRN-001-T002/T029/T030 và LRN-002-T002 ghi kết quả seam
- Spec status at start: cả hai Approved

## Questions clarified

| Question                                       | Conclusion                                                                                                                           | Source                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Làm gì tiếp?                                   | Gỡ phụ thuộc chặn LRN-001-T002 trước JDG-001 và SUB-001                                                                              | Người dùng: "cứ chọn cái nào bro muốn", 2026-09-29                        |
| Truyền quyền bằng claim token hay REST nội bộ? | Dùng claim `permissions`; không thêm REST nội bộ                                                                                     | ID-003 0.4, quyết định đã phê duyệt                                       |
| Sửa spec đã Approved có được không?            | Chỉ ở dạng bản sửa đổi Proposed; phiên bản Approved giữ hiệu lực cho tới khi được duyệt                                              | Working agreement: không sửa spec Approved khi chưa có chỉ đạo tường minh |
| 5 quyết định của bản sửa đổi                   | Claim trong token; `problem:*` chỉ cho `LECTURER`; token cũ không có quyền; ID-001 thêm claim; quyền đổi chỉ có hiệu lực ở token mới | Người dùng: "approve", 2026-09-29                                         |

## What was done

- ID-003: thêm và phê duyệt bản sửa đổi 0.4 gồm FR-017 tới FR-023, SR-010, SR-011, AC-017 tới AC-022
  và phần Ngoài phạm vi. Ngày 2026-09-30, AC-017/018 được làm rõ để các đặc tả Approved có thể seed
  thêm quyền cho `LECTURER`/`ADMIN` mà không đổi chính sách ban đầu của `problem:*`.
- ID-001: thêm và phê duyệt bản sửa đổi 1.1 sửa FR-012, SR-010, AC-011 và phần Đầu ra để claim tối
  thiểu có `permissions`.
- Thêm dòng lịch sử sửa đổi cho cả hai.

## Why these choices

- Claim trong token dùng lại đúng đường đi của vai trò (Identity phát hành → Gateway xác minh, làm
  sạch header, chuyển tiếp) nên không thêm phụ thuộc runtime giữa Learning và Identity.
- Chỉ gán `problem:*` cho `LECTURER`, vì LRN-001 quyết định `ADMIN` không có thẩm quyền ngầm với
  Problem.
- Token cũ không có claim thì coi như không có quyền, để thất bại theo hướng đóng (ID-003-FR-007).

## How the feature works

Chưa triển khai. Luồng dự kiến: khi đăng nhập hoặc làm mới, Identity tính hợp các quyền của mọi vai
trò hiện tại và đưa vào claim `permissions` → Gateway xác minh token, xoá `x-auth-permissions` do
client gửi và đặt lại từ claim → Learning đọc header đó để đánh giá `problem:*`, rồi vẫn tự kiểm tra
quyền sở hữu.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `prettier --write` trên hai file spec.
- Not verified: không chạy kiểm chứng code vì đây là thay đổi chỉ tài liệu.

## Remaining

- Not done: chưa commit; chưa triển khai.
- Risks: quyền thay đổi chỉ có hiệu lực ở token mới; token lớn thêm theo số quyền. Thứ tự code bây
  giờ là ID-001/ID-003 (gồm ID-003-T045–T050 và ID-001-T045–T047) trước, rồi các feature tiêu thụ
  quyền.
