# 2026-11-05 — LRN-003: sửa header quyền rỗng, reference check trong transaction, dựng view trong transaction

- Author: opencode
- Scope: `learning-service/modules/courses` và decorator principal dùng chung của Learning. Không đổi
  Identity, Gateway, schema DB hay policy quyền hiện tại.

## Spec and plan

- Spec: `.docs/specs/01-identity/rbac/spec.md` ID-003-FR-022/AC-021 (tiêu thụ header quyền an toàn);
  `.docs/specs/02-learning/courses/spec.md` LRN-003 FR-016/FR-018.
- Plan: `.docs/specs/02-learning/courses/plan.md` (dòng 177: reference check trong cùng transaction;
  bảng route 204 ở dòng 222–230); `.docs/specs/gateway/learning/courses/plan.md` (Gateway luôn đặt
  `x-auth-permissions`).
- Tasks: `.docs/specs/02-learning/courses/tasks.md` — không đổi, chưa tick task nào trong lần này.
- Spec status at start: Approved.

## Questions clarified

| Question                                                                              | Conclusion                                                                                | Source                                |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| Có đổi policy ADMIN/`course:*` hoặc bỏ hard role `LECTURER` không?                    | Không. Giữ nguyên catalog và hard role như hiện tại; chỉ sửa lỗi contract và transaction. | Người dùng, 2026-11-05 ("giữ vậy đi") |
| Gateway gửi `x-auth-permissions: ''` khi token không có claim thì Learning xử lý sao? | Coi là tập rỗng hợp lệ; hành động cần quyền bị từ chối bằng 403, không phải 401.          | ID-003-FR-022, ID-003-AC-021          |
| Dựng managed view ở đâu?                                                              | Trong transaction, sau `save`; route 204 dùng đường không dựng view.                      | LRN-003 FR-016; plan dòng 177         |

## What was done

- **Header quyền rỗng không còn gây 401.** `parseList` trong
  `trusted-principal.decorator.ts` bỏ các phần tử rỗng thay vì ném `UnauthorizedError`; `''` trở
  thành `[]`. Nhờ vậy token cũ không có claim `permissions` đi qua Gateway vẫn đọc được dữ liệu công
  khai và bị 403 ở route cần quyền, đúng ID-003-FR-022/AC-021.
- **Test hồi quy đúng header Gateway sinh ra.** Unit test của decorator kiểm `'',` và `''`; e2e
  `managed-courses.api.e2e.spec.ts` thêm ca gửi `x-auth-permissions: ''`: list/detail published trả
  200, `/managed` trả 403.
- **Reference check dùng transaction hiện hành.** `CourseTypeOrmReferenceChecker` nhận
  `CourseTypeOrmTransactionContext` và gọi `requireManager().query(...)` thay vì `DataSource.query`.
  Vì `DeleteCourseUseCase` đã mở transaction, kiểm tra tham chiếu và `hardDelete` giờ nằm trên cùng
  một connection/transaction. Integration test gọi checker qua `runner.run`.
- **Managed view dựng trong transaction.** `CourseMutationService.mutate` trả view từ bên trong
  `transactionRunner.run`, nên lỗi đọc catalog/readiness rollback thay vì commit rồi trả 500. Thêm
  `mutateVoid` cho route 204; `RemoveChapterUseCase` và `DetachProblemUseCase` dùng nó để không dựng
  view mà client không nhận.

## Why these choices

- Header rỗng là trạng thái hợp lệ của token thiếu claim, không phải request sai định dạng. Xử lý ở
  decorator dùng chung giữ một nguồn hành vi cho mọi module Learning.
- `requireManager()` thay vì fallback về `DataSource` để không âm thầm chạy ngoài transaction; lỗi
  "no active transaction" là tín hiệu lập trình sai, không phải trạng thái nghiệp vụ.
- Dựng view trong transaction đổi đánh đổi: giữ khoá lâu hơn một chút, nhưng đảm bảo FR-016 (thất bại
  để nguyên state). `mutateVoid` tách đường 204 để không trả giá query vô ích.
- Không đụng policy quyền vì người dùng chốt giữ nguyên; các lệch spec/LRN-003 về ADMIN và hard role
  vẫn được ghi ở phần Remaining.

## How the feature works

1. Client gọi Gateway; Gateway xác minh token và luôn đặt `x-auth-user-id`, `x-auth-roles`,
   `x-auth-permissions` (chuỗi rỗng nếu token không có claim).
2. Learning đọc header qua `readTrustedPrincipal`: chuỗi rỗng hoặc phần tử rỗng bị bỏ, còn lại được
   trim, khử trùng, kiểm pattern và giới hạn số lượng.
3. Guard/use case kiểm quyền trên tập đã chuẩn hoá. Không có quyền cần thiết → 403.
4. Thao tác ghi mở transaction, `loadForUpdate`, kiểm sở hữu, áp thay đổi, `save`, rồi dựng managed
   view ngay trong transaction và commit. Route 204 bỏ bước dựng view.
5. Xoá hẳn Course nháp: trong transaction, `CourseReferenceChecker` chạy `EXISTS` trên `classes` và
   `assignments` bằng chính manager của transaction; có tham chiếu → 409, không có → xoá hẳn.
6. Lỗi ở bất kỳ bước nào (kể cả đọc catalog khi dựng view) rollback toàn bộ thay đổi.

## Configuration

No configuration change.

## Verification

- `pnpm exec jest --runInBand apps/learning-service/src/modules/courses`: 2 suite skip (integration
  cần DB), 8 suite pass; 126 test pass, 24 skip.
- `pnpm exec jest --runInBand <decorator spec> <managed-courses e2e>`: 2 suite, 42 test pass.
- `pnpm test`: 130 suite pass, 1 suite fail (`test/account-import.integration.spec.ts`), 1058 test
  pass, 81 skip. Lỗi duy nhất là `officialName` có sẵn trên `origin/main`, không liên quan thay đổi
  này.
- `pnpm typecheck`: chỉ còn 5 lỗi `officialName` của test account-import có sẵn trên main.
- `eslint` và `prettier --check` trên các file đã sửa: pass.
- Not verified: integration test repository/checker (thiếu `TEST_DATABASE_URL`); smoke test thật
  Gateway + Identity + Learning.

## Remaining

- Not done: N+1 khi list (`listPublished`/`listManaged` gọi `loadAggregate` từng Course); query
  catalog hai lần trong `toManaged`; publish/republish kiểm readiness trước khi kiểm trạng thái
  (400 thay vì 409); dead code (`ConcurrentModificationError`, `expectedUpdatedAt`, port
  `findById*`, `TITLE_REQUIRED`); TOCTOU `findPublishedByIdOrSlug`; slug `managed` che route detail.
- Not done: thêm bước `pnpm seed:identity:rbac` vào README/runbook và đối chiếu LRN-003-T003.
- Not done: tick tasks GW-003, cập nhật trạng thái spec/worked entry của Gateway.
- Risks: view dựng trong transaction giữ khoá lâu hơn; chưa có test rollback thật vì integration
  test cần PostgreSQL. Policy ADMIN/`course:*` và hard role `LECTURER` vẫn lệch LRN-003 spec:153.

## Follow-up (same day, round 2)

- Double query in `toManaged` removed: `CourseViewAssembler.toManaged` passes the already loaded catalog
  map to `CoursePublishReadinessService.check` (`course-view.assembler.ts:65-66`, `course-publish-readiness.service.ts:17`).
- Publish/Republish now check course state before readiness, so a wrong-state course returns 409
  (`InvalidCourseState`) instead of 400 (`CourseNotReadyError`) (`course-lifecycle.use-cases.ts:25-28, 50-54`).
- README documents `pnpm seed:identity:rbac` after migrations (`README.md:130-136`).
- LRN-003-T003 wording updated to the seed script instead of a dedicated migration
  (`tasks.md:32-38`).

Verification: courses 8 suites / 126 pass, 24 skip; typecheck only the pre-existing `officialName` errors.
