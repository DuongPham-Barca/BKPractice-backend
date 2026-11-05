# GW-001 / 5 — Kiểm chứng và tài liệu

- Nguồn: [spec](../../../../specs/gateway/identity/spec.md), [plan](../../../../specs/gateway/identity/plan.md), [tasks](../../../../specs/gateway/identity/tasks.md).
- Task: GW-001-T015–T020.
- Phụ thuộc: [phần 4](04-composition-and-imports.md) đã hoàn tất.

## Trình tự thực hiện

1. Chạy quality gates: `pnpm eslint "apps/api-gateway/**/*.ts"`, `pnpm test apps/api-gateway`, `pnpm build:gateway`; với `pnpm typecheck` ghi rõ các lỗi có sẵn ngoài phạm vi (nếu còn).
2. Cập nhật tài liệu kiến trúc: `api-gateway.md` (mô hình ba tầng, cây thư mục, quy tắc phụ thuộc) và `dependency-rules.md` (quy tắc Gateway).
3. Ghi worked entry `.docs/worked/api-gateway/2026-10-31-gateway-layered-restructure.md`.
4. Đối chiếu toàn bộ GW-001-FR-001–FR-008 và GW-001-AC-001–AC-007 với code, test và kết quả; xác nhận không thêm hành vi ngoài phạm vi.

## Bàn giao và kiểm chứng

- Mỗi FR/AC có bằng chứng (test, build, tài liệu) tương ứng.
- Không đánh dấu hoàn thành nếu còn hành vi chưa xác minh; ghi lại phần chưa kiểm chứng.
- Truy vết: Định nghĩa Hoàn thành; toàn bộ GW-001-AC.
