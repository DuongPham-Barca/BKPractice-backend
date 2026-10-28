# 2026-10-28 — Tìm Profile từ ký tự đầu tiên

- Author: Codex
- Scope: ID-005, `modules/profiles` của Identity và contract tìm kiếm cho FE.

## Spec and plan

- Spec: [ID-005 1.1](../../../specs/01-identity/profile-discovery/spec.md)
- Plan: [ID-005 plan](../../../specs/01-identity/profile-discovery/plan.md)
- Tasks: [ID-005 tasks](../../../specs/01-identity/profile-discovery/tasks.md)
- Spec status at start: Approved 1.0; chủ sở hữu yêu cầu trực tiếp đổi ngưỡng tìm kiếm thành một ký tự, ghi nhận thành Approved 1.1 trước khi sửa code.

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| Có cần nhập hết tên mới tìm được không? | Không. FE có thể gọi sau ký tự đầu tiên; `q=D` tìm được `Dũng Dương`. | Yêu cầu trực tiếp của chủ sở hữu ngày 2026-10-28; [spec ID-005 1.1](../../../specs/01-identity/profile-discovery/spec.md), FR-005. |
| Một ký tự khớp ở đâu trong tên? | Giữ quy tắc tìm chuỗi con đã duyệt; thay đổi chỉ là ngưỡng độ dài từ 2 xuống 1. | [Spec ID-005](../../../specs/01-identity/profile-discovery/spec.md), FR-005. |
| Có đổi route, quyền, dữ liệu, cấu hình hoặc schema không? | Không. Route, phân trang, projection, xác thực và TypeORM query hiện có tiếp tục dùng được. | [Spec ID-005](../../../specs/01-identity/profile-discovery/spec.md), FR-002–FR-006; [plan](../../../specs/01-identity/profile-discovery/plan.md). |

## What was done

Cập nhật spec, plan, tasks và [contract FE](../../../pm/plan/identity/profiles/04-profile-discovery.md) sang `q` 1–100 ký tự. Use case Profile chấp nhận một ký tự sau trim; DTO Swagger ghi đúng ngưỡng. Thêm test `q=D` trả kết quả `Dũng Dương`, test HTTP nhận `q=D` và giữ kiểm tra chuỗi rỗng trả lỗi.

## Why these choices

Thay ngưỡng tại use case vì đây là nơi kiểm tra hành vi tìm kiếm trước khi gọi repository. Truy vấn TypeORM đã dùng chuỗi con và phân trang nên không cần đổi SQL hay migration. FE gọi cùng endpoint khi ô nhập thay đổi, giữ quy tắc xác thực và các trường công khai đã được duyệt.

## How the feature works

1. Người dùng nhập `D`; FE gửi `GET /api/profiles/search?q=D` với phiên hợp lệ.
2. Gateway và Identity xác thực; controller truyền `q` cho Profile use case.
3. Use case trim `q`, chấp nhận một ký tự và gọi repository hiện có. Repository tìm chuỗi con trên `Profile.displayName`, lọc User ACTIVE không phải tài khoản hệ thống và phân trang.
4. Response trả kết quả công khai, có thể gồm `Dũng Dương`; FE lấy `userId` để mở route Profile chi tiết.
5. Ô nhập rỗng hoặc chỉ có khoảng trắng vẫn trả `400`; thiếu phiên trả `401`.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `pnpm test` pass (32 suites, 148 tests; 6 suites skip theo điều kiện môi trường); `pnpm build:identity` pass; `pnpm lint --ignore-pattern apps/learning-service/src/database/data-source.ts` pass.
- Not verified: Bài PostgreSQL vẫn skip vì chưa có `PROFILE_TEST_DATABASE_URL` trỏ tới DB test cô lập. `pnpm lint`, `pnpm typecheck` và `pnpm build` toàn repo vẫn lỗi ở dòng `heheh` đã có trong `apps/learning-service/src/database/data-source.ts:14`, ngoài phạm vi ID-005.

## Remaining

- Not done: Chạy bài PostgreSQL và các gate toàn repo khi có DB test và lỗi Learning được sửa; review SDD có thẩm quyền trước khi đổi trạng thái spec.
- Risks: Truy vấn một ký tự có thể khớp nhiều Profile; phân trang giới hạn mỗi trang nhưng cần đo query plan trên dữ liệu thực tế trước khi quyết định index.
