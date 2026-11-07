# 2026-11-07 — Bố trí Course theo pattern Problem

- Author: Codex
- Scope: Module Course và cấu hình alias phục vụ build/test.

## Spec and plan

- Spec: [LRN-003](../../../specs/02-learning/courses/spec.md), [LRN-008](../../../specs/02-learning/self-study/spec.md).
- Plan: [Course](../../../specs/02-learning/courses/plan.md), mục bố trí code theo Problem.
- Tasks: [Course](../../../specs/02-learning/courses/tasks.md), checklist refactor.
- Spec status at start: Approved.

## Questions clarified

| Question                          | Conclusion                                                                                                                                         | Source                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Lấy module nào làm mẫu?           | Problem: từng use case và inbound port có file riêng; controller tách phần quản lý/người học; command, mapper và lỗi có chỗ rõ ràng.               | Yêu cầu chủ dự án; `modules/problems`.                                     |
| Có thay đổi hành vi Course không? | Giữ 18 route, response, quyền ADMIN chung, các quy tắc vòng đời và ẩn Problem chưa công khai.                                                      | LRN-003 + LRN-008.                                                         |
| Transaction thuộc đâu?            | Mỗi use case điều phối transaction, nạp aggregate có khoá và lưu; dùng hợp đồng `TransactionRunner` của Problem, context/adapter riêng của Course. | Learning architecture, mục Ports shared between modules; use case Problem. |
| Alias và barrel dùng thế nào?     | Dùng alias cụ thể cho Course trong TypeScript và Jest; mỗi thư mục có barrel, không import qua barrel của chính thư mục nếu tạo vòng phụ thuộc.    | Working agreement, How to write code.                                      |

## What was done

Lần chỉnh port trước vẫn để 18 interface trong một file, nhiều use case trong các file nhóm và toàn bộ route trong `ManagedCoursesController`. Lần này tách đủ 18 use case và 18 inbound port thành các file theo tên thao tác. Command tạo/cập nhật nằm trong `application/command`; lỗi application/domain tách theo tên; repository port mang tên `course.repository.port.out.ts` trong domain.

Bỏ `CourseMutationService`: mỗi use case ghi thể hiện trực tiếp việc kiểm quyền, mở transaction, nạp aggregate có khoá, gọi hành vi domain, lưu và trả kết quả. Xoá bản khai báo `TransactionRunner` trùng với Problem. Giữ `CourseViewAssembler` vì nó thực sự tổng hợp dữ liệu Problem và readiness cho kết quả Course.

HTTP được chia thành `ManagedCoursesController`, `ManagedChaptersController` và `PublicCoursesController`. Request mapper chuyển DTO tạo/cập nhật sang command, filter ở `presentation/http/filters`, DTO chia theo thao tác/query. Các controller quản lý được đăng ký trước controller chứa `:idOrSlug`.

Test integration của module còn assertion Class/quyền sở hữu cũ đã được sửa theo LRN-008. Fixture upsert Problem cập nhật cả slug khi trùng ID, tránh giữ slug từ suite trước. Barrel và import được cập nhật trong toàn module Course.

## Why these choices

Cách chia file và trách nhiệm theo module Problem giúp đọc một workflow ở đúng một use case, tìm hợp đồng ở port tương ứng và theo dõi transaction mà không phải nhảy vào callback dùng chung. Các ranh giới domain/application/infrastructure vẫn tuân ADR 0002. Alias cụ thể cho Course đáp ứng working agreement và giữ việc phân giải alias của các ứng dụng khác.

## How the feature works

1. Nest đăng ký ba controller qua `CoursesModule`; route quản lý cụ thể được nhận trước route động dành cho người học.
2. Controller nhận DTO và principal tin cậy, chuyển đầu vào rồi gọi một inbound port.
3. Use case kiểm quyền; thao tác ghi mở transaction, nạp Course bằng `loadForUpdate`, kiểm quy tắc và thay đổi aggregate.
4. Repository TypeORM lưu Course/Chapter/Problem references; lỗi làm transaction rollback. Các use case có trả dữ liệu dùng assembler để tổng hợp kết quả, HTTP mapper tạo response.
5. Người học vẫn chỉ nhận Course công khai và Problem hiển thị được. Các bài kiểm thử API hiện có kiểm chứng contract sau khi tách controller.

## Configuration

- `tsconfig.json`, `compilerOptions.paths["@/modules/courses/*"]`: phân giải import Course khi typecheck/build hoặc chạy với `tsconfig-paths/register`.
- `jest.config.ts`, `moduleNameMapper`: ánh xạ alias Course trước alias tổng quát của Identity.
- Không thêm biến môi trường hoặc cấu hình triển khai.

## Verification

- `pnpm build`: cả sáu ứng dụng qua; `pnpm build:learning` kiểm tra thêm các barrel hoàn chỉnh.
- `TEST_DATABASE_URL=<isolated test database> pnpm exec jest apps/learning-service/src/modules/courses --runInBand --silent`: 10 suite, 145 test qua, không skip. Bao gồm DI module thật, vòng đời qua HTTP, transaction, concurrency và persistence trên PostgreSQL 15 tạm.
- `pnpm exec eslint apps/learning-service/src/modules/courses jest.config.ts`: qua.
- Prettier trên module Course, cấu hình alias và tài liệu thay đổi: qua.
- `pnpm test --silent`: 132 suite/1.037 test qua, 13 suite/81 test skip; một suite lỗi biên dịch ở `test/account-import.integration.spec.ts` vì `officialName` không còn trong kiểu Identity. Đây cũng là lỗi duy nhất của `pnpm typecheck` và `pnpm lint` toàn repo.
- Entry point trực tiếp với `ts-node/register` + `tsconfig-paths/register` nạp được barrel chứa 18 use case.
- `git diff --check`, `codegraph sync .`: qua.
- Container PostgreSQL tạm đã dừng và tự xoá. Migration chỉ chạy trên database test cách ly.

## Remaining

- Not done: sửa lỗi test Identity nói trên, thuộc ngoài phạm vi refactor Course.
- Risks: các kiểm tra chất lượng toàn repo còn bị chặn bởi lỗi test Identity; các kiểm tra riêng Course đều qua.
