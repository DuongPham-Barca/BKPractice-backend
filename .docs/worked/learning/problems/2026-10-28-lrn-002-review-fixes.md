# 2026-10-28 — Sửa 6 lỗi từ review LRN-002

- Author: Claude Code (theo yêu cầu của DuongPham-Barca)
- Scope: `apps/learning-service/src/modules/problems` (source + test); không đổi migration, không
  commit.

## Spec and plan

- Spec: `.docs/specs/02-learning/test-cases/spec.md` — LRN-002 phiên bản 1.1, `Approved`.
- Plan: `.docs/specs/02-learning/test-cases/plan.md` — Approved 2026-09-29.
- Tasks: `.docs/specs/02-learning/test-cases/tasks.md`.
- Spec status at start: `Approved`. **Spec/plan chưa được sửa** (xem mục Spec cross-check).

## Questions clarified

| Question                                                             | Conclusion                                                                                                            | Source                   |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Bài FUNCTION/OOP đã publish thêm ngôn ngữ mới bằng cách nào? (mục 4) | Cho đặt harness trước khi bật ngôn ngữ; sau đó mới bật ngôn ngữ qua PATCH.                                            | Người dùng, 2026-10-28   |
| Response managed có trả `sampleTestCases` thật không? (mục 5)        | Có, nạp `listSamples` ở mọi use case managed trả chi tiết.                                                            | Người dùng, 2026-10-28   |
| Harness của ngôn ngữ bị tắt/đổi sang STANDARD xử lý thế nào? (mục 6) | Không xoá. Chỉ harness của ngôn ngữ đang bật trên Problem không phải STANDARD mới tính vào summary và giới hạn 8 MiB. | Người dùng, 2026-10-28   |
| Judge-package ON_HOLD có phải lỗi không? (mục 2)                     | Không. FR-015 bắt buộc từ chối; chỉ sửa cách map lỗi (404/409 thay vì 500).                                           | LRN-002-FR-015, plan API |

## What was done

1. **Mục 1** — `TestCaseTypeOrmRepository.update()` ghi thêm `display_order`.
2. **Mục 2** — `ProblemsController` (route judge-package) dùng `ProblemExceptionFilter`; lỗi domain và
   application ra 404/409/400 theo plan thay vì 500.
3. **Mục 3** — `TestSuiteSummary.fromStored()` đọc số liệu đã lưu mà không áp trần 100 test case và
   8 MiB; `loadTestSuiteSummary` và các nhánh `withTestCaseRemoved`/`withHarnessRemoved` dùng nó. Trần
   vẫn áp khi thêm dữ liệu.
4. **Mục 4** — `SetHarnessUseCase` không còn đòi ngôn ngữ đã bật (`assertHarnessLanguageIsEnabled`
   thay bằng `hasEnabledLanguage`). Harness của ngôn ngữ chưa bật được lưu mà không đổi summary.
   `UpdateProblemUseCase` kiểm tra readiness và trần dung lượng **sau khi lưu** trên summary tải lại,
   để harness đã đặt trước được tính khi bật ngôn ngữ; lỗi thì transaction rollback.
5. **Mục 5** — `GetManaged`, `Update`, `Publish`, `Republish`, `Hold`, `Restore` nạp `listSamples` và
   truyền cho `ProblemResultMapper.toManagedDetail`. `Create` không đổi (problem mới chưa có test case).
6. **Mục 6** — Truy vấn summary chỉ cộng harness có ngôn ngữ `enabled` trong `problem_languages` và
   `problem_type <> 'STANDARD'`.

## Why these choices

- Mục 4 và 6 cùng một mô hình: harness lưu độc lập theo ngôn ngữ, chỉ phần đang có hiệu lực mới tính.
  Vì summary phụ thuộc tập ngôn ngữ đang bật, `UpdateProblem` phải đánh giá lại sau khi lưu.
- Khi cập nhật Problem, chỉ chặn nếu tổng byte **tăng** và vượt trần, để Problem cũ đã vượt trần vẫn
  sửa được các trường không liên quan.

## Spec cross-check

| Điểm                                                    | Trạng thái                                                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-012 "harness theo từng ngôn ngữ **đang bật**"        | **Code lệch spec** theo quyết định mục 4. Cần chủ sở hữu sản phẩm duyệt đổi spec/plan.                                                     |
| FR-011 trần 8 MiB tính "mọi harness của một Problem"    | **Code lệch spec** theo quyết định mục 6 (chỉ harness đang hiệu lực). Cần duyệt đổi spec/plan (plan mục Lưu trữ định nghĩa `SUM(source)`). |
| FR-015 judge-package từ chối ON_HOLD/DRAFT/ngôn ngữ tắt | Khớp.                                                                                                                                      |
| FR-019 samples ở chi tiết public và preview             | Khớp; response managed trả thêm samples (spec không cấm).                                                                                  |

## Verification

- `pnpm exec jest apps/learning-service/src/modules/problems --runInBand`: 358 passed, 18 skipped
  (integration cần `TEST_DATABASE_URL`).
- `pnpm typecheck`, `pnpm lint`: sạch.
- `pnpm format:check`: chỉ báo `.docs/worked/identity/auth/2026-10-19-identity-authentication.md`
  (không thuộc đợt này).
- Câu SQL summary mới (mục 6) **chưa chạy trên PostgreSQL thật**: không có `TEST_DATABASE_URL`.

## Remaining

- Duyệt và cập nhật spec/plan cho FR-011, FR-012 (hai điểm lệch ở trên), rồi đồng bộ `tasks.md`.
- Chạy câu SQL summary và luồng "đặt harness trước, bật ngôn ngữ sau" trên PostgreSQL cách ly.
- Chưa xử lý các mục review 7–11 (body limit toàn cục, N+1 ở list managed, displayOrder trùng, truy
  vấn thừa ở hold, hợp nhất đường merge ở update test case).
