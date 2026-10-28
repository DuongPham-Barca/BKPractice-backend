# 2026-10-28 — Tìm kiếm hồ sơ công khai ID-005

- Author: Codex
- Scope: Identity `modules/profiles`, kiểm tra Gateway và tài liệu FE/API.

## Spec and plan

- Spec: [ID-005](../../../specs/01-identity/profile-discovery/spec.md)
- Plan: [ID-005 plan](../../../specs/01-identity/profile-discovery/plan.md)
- Tasks: [ID-005 tasks](../../../specs/01-identity/profile-discovery/tasks.md)
- Spec status at start: Approved 1.0 (chủ sở hữu phê duyệt 2026-10-28).

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| Tìm theo tên nào, quyền nào, dữ liệu nào? | Tìm `Profile.displayName`; chỉ phiên BKPractice hợp lệ của STUDENT/LECTURER/ADMIN; mỗi item chỉ có `userId`, `displayName`, avatar. | [Spec ID-005](../../../specs/01-identity/profile-discovery/spec.md), FR-001–FR-005 và Quy tắc phân quyền. |
| User chưa có Profile hoặc không ACTIVE xử lý sao? | Bỏ qua; không tạo Profile khi search. Tài khoản hệ thống cũng bị loại. | [Spec ID-005](../../../specs/01-identity/profile-discovery/spec.md), FR-004 và Câu hỏi mở. |
| Xoá mềm áp dụng ngay chưa? | ID-005 không phụ thuộc ID-006; entity User hiện chưa có dấu xoá mềm. Bộ lọc cần thêm khi ID-006 đưa cột đó vào schema. | [Spec ID-005](../../../specs/01-identity/profile-discovery/spec.md), Phụ thuộc; `modules/users/infrastructure/persistence/user.entity.ts`. |
| Gateway và route chi tiết thay đổi không? | Gateway đã bảo vệ route `/api` không công khai và proxy `/api/profile` về Identity; route chi tiết ID-002 giữ nguyên. | `apps/api-gateway/src/auth/gateway-auth.middleware.ts`, `apps/api-gateway/src/proxy/gateway-proxy.service.ts`, [spec ID-005](../../../specs/01-identity/profile-discovery/spec.md) FR-006. |
| Cần cấu hình, migration, message mới không? | Không. Dùng TypeORM Profile/User và adapter ký avatar có sẵn; chưa có số liệu PostgreSQL để chọn index mới. | [Plan ID-005](../../../specs/01-identity/profile-discovery/plan.md), Lưu trữ và Messaging. |

## What was done

Thêm port và use case tìm Profile với kiểm tra tên/trang/giới hạn, chỉ dựng ba trường công khai và ký URL avatar. TypeORM truy vấn Profile nối User, lọc ACTIVE và không phải tài khoản hệ thống, escape `%`/`_`, sắp thứ tự ổn định và lấy thêm một hàng để tính `hasMore`. Controller/DTO cung cấp `GET /api/profiles/search`, ghi thời gian xử lý và request ID hợp lệ mà không ghi tên tìm kiếm; route chi tiết ID-002 không đổi. Bổ sung test use case, HTTP, Gateway và bài PostgreSQL; viết [contract cho FE](../../../pm/plan/identity/profiles/04-profile-discovery.md).

## Why these choices

Identity sở hữu User/Profile nên truy vấn nằm trong `modules/profiles`, theo kiến trúc Clean Architecture. Use case ký avatar qua port hiện có để không trả object key và chỉ chọn các cột cần xuất để tránh lộ dữ liệu tài khoản. Gateway đã xác thực và chuyển tiếp tuyến `/api/profile`, nên chỉ cần kiểm tra tính bảo vệ và chuyển tiếp bằng test. Không thêm cột hay index khi chưa có dữ liệu đo truy vấn.

## How the feature works

1. FE gửi tên đã URL-encode tới `GET /api/profiles/search` với cookie hoặc Bearer token; có thể gửi `page`/`limit`.
2. Gateway kiểm tra token và phiên rồi chuyển request đến Identity. Identity xác thực lại phiên và DTO từ chối tham số sai.
3. Use case trim tên, kiểm tra 2–100 ký tự, `page >= 1`, `1 <= limit <= 50`; repository tìm chuỗi con không phân biệt hoa thường nhưng giữ dấu trên `Profile.displayName`.
4. Repository chỉ lấy Profile tồn tại của User ACTIVE không phải tài khoản hệ thống, sắp theo tên viết thường rồi `userId`, lấy `limit + 1` hàng để tính `hasMore`.
5. Use case ký avatar và trả `{ items, page, limit, hasMore }`; mỗi item chỉ có `userId`, `displayName`, `avatar`. FE dùng `userId` gọi route chi tiết công khai ID-002.
6. Thiếu/sai phiên trả `401`, input sai trả `400`, không có kết quả trả danh sách rỗng. Lỗi ký avatar theo cơ chế ID-002.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `pnpm test` pass (32 suites, 147 tests; 6 suites skip theo điều kiện môi trường); `pnpm build:identity` và `pnpm build:gateway` pass; `pnpm lint --ignore-pattern apps/learning-service/src/database/data-source.ts` pass. Test HTTP trực tiếp, use case và Gateway của ID-005 pass.
- Not verified: Bài PostgreSQL `profile.repository.integration.spec.ts` bị skip vì không có `PROFILE_TEST_DATABASE_URL` trỏ tới DB test cô lập. Chưa đo query plan để quyết định index. `pnpm lint`, `pnpm typecheck`, `pnpm build` toàn repo không pass do dòng `heheh` đã tồn tại tại `apps/learning-service/src/database/data-source.ts:14`; file này ngoài phạm vi ID-005 và không được sửa trong công việc này.

## Remaining

- Not done: Chạy lại bài PostgreSQL và các gate toàn repo khi có DB test và sửa lỗi nền ở Learning; review SDD có thẩm quyền trước khi đổi trạng thái spec.
- Risks: Truy vấn chứa chuỗi con (`ILIKE '%...%'`) có thể tốn chi phí trên dữ liệu lớn; cần đo trên PostgreSQL thực tế. Khi ID-006 thêm dấu xoá mềm, truy vấn ID-005 phải lọc dấu đó.
