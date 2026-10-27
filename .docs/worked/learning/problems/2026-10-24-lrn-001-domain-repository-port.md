# 2026-10-24 — LRN-001: chuyển repository port sang domain

- Author: opencode
- Scope: Chỉ tài liệu. Cập nhật kiến trúc Learning, plan/tasks của LRN-001 và review plan. Không đụng
  source, cấu hình, dependency hay migration.

## Spec and plan

- Spec: LRN-001 Quản lý Problem `1.1` (Approved) — không đổi.
- Plan: `.docs/specs/02-learning/problems/plan.md` — bản sửa đổi `2026-10-24`.
- Tasks: `.docs/specs/02-learning/problems/tasks.md` — T011, T021, T023, T038 được cập nhật.
- Review: `review/LRN-001-implementation-plan.md` — mục 6, 7, 8 và 10 được cập nhật theo cùng layout.
- Architecture: `.docs/architecture/learning-service.md` — làm rõ vị trí repository port.

## Questions clarified

| Question                                             | Conclusion                                                                                        | Source                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Có áp dụng layout của `uc-talent-backend` không?     | Có: interface repository ở domain, implementation ở infrastructure, application gọi qua interface | Người dùng: "vay ap dung ddi", 2026-10-24                 |
| `ProblemRepository` nằm ở đâu?                       | `domain/repositories/problem.repository.ts`; adapter TypeORM ở `infrastructure/persistence/`      | Người dùng và mẫu `uc-talent-backend/architecture.md`     |
| Các port còn lại nằm ở đâu?                          | `TopicTagReader`, `PrincipalProvider`, `TransactionRunner` ở `application/ports/out/`             | Learning Service Architecture, mục Ports                  |
| Có thêm interface `...UseCase` cho input side không? | Không trong LRN-001; use case class là contract vào, giữ đúng sáu port/ranh giới của T011         | T011 và phạm vi LRN-001                                   |
| Có đổi `spec.md` không?                              | Không; đây là thay đổi cách tổ chức code, không đổi hành vi nghiệp vụ                             | Working agreement: spec chỉ đổi khi có yêu cầu tường minh |

## What was done

- `ProblemRepository` được mô tả là domain repository port, khai báo tại `domain/repositories/` và
  được adapter TypeORM hiện thực ở `infrastructure/persistence/`.
- Các application out port còn lại được đặt tại `application/ports/out/`.
- `PublishValidator` là domain service tại `domain/services/`; `ProblemAuthorizationService` là
  application service tại `application/services/`.
- Application trả result model tại `application/results/`; response DTO mapper nằm ở
  `presentation/http/mappers/`.
- T011 được viết lại để mô tả sáu port/ranh giới theo layout mới, không thêm input interface.
- T021 được cập nhật để tách result model khỏi HTTP response mapper.
- T023 và T038 được cập nhật để adapter hiện thực domain repository port và composition root gắn
  đúng port; thứ tự triển khai bước 3 cũng được sửa để không còn gọi toàn bộ port là port application.
- `review/LRN-001-implementation-plan.md` được cập nhật đồng bộ: sơ đồ tầng, bảng port, luồng
  request, thứ tự bắt đầu và danh sách task.

## Why these choices

- Repository là khái niệm domain: nó nạp/lưu aggregate và dùng ngôn ngữ của domain, nên interface
  thuộc domain để application phụ thuộc vào phía trong.
- Infrastructure hiện thực interface domain; application không biết TypeORM/DataSource.
- Các out port còn lại là nhu cầu của application (principal, transaction, đọc Topic/Tag), nên đặt ở
  `application/ports/out/`.
- Không thêm interface input để tránh mở rộng phạm vi T011 và giữ số abstraction đúng nhu cầu.
- HTTP DTO mapping thuộc presentation để application không import HTTP/Swagger.

## How the feature works

Controller nhận request, validate DTO và gọi một use case. Use case lấy principal qua
`PrincipalProvider`, kiểm tra quyền/ownership qua `ProblemAuthorizationService`, mở transaction qua
`TransactionRunner`, rồi dùng `ProblemRepository` (domain port) và `TopicTagReader` để đọc/ghi.
`PublishValidator` (domain service) kiểm tra readiness từ state và các fact đã kiểm tra, bao gồm
`slugAvailable` do use case lấy từ `ProblemRepository.existsBySlug`. Kết quả use case là result model;
presentation mapper chuyển result model thành response DTO.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `pnpm exec prettier --write` và `pnpm exec prettier --check` trên
  các file tài liệu đã sửa.
- Not verified: không chạy lint/typecheck/test vì không đổi source code.

## Remaining

- Not done: chưa triển khai code; các task LRN-001 vẫn chưa được tick; chưa commit.
- Risks: T011 vẫn giới hạn sáu port/ranh giới, nên input side dùng use case class thay vì interface
  riêng. Nếu muốn strict hexagonal cho input side, cần một bản sửa đổi phạm vi riêng.
