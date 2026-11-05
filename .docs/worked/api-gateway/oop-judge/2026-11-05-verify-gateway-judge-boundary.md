# 2026-11-05 — Xác minh ranh giới Gateway: OOP Judge

- Author: Codex
- Scope: GW-015, áp dụng ponytail ultra; hoàn tất kiểm tra boundary theo plan, không cần thay đổi runtime.

## Spec and plan

- Spec: `.docs/specs/gateway/judge/oop-judge/spec.md`, Approved 0.1.
- Plan: `plan.md` cùng thư mục; Layered Architecture theo ADR 0002.
- Tasks: `tasks.md` cùng thư mục, đã cập nhật bằng chứng và N/A có lý do.
- Spec status at start: Approved. Không sửa spec hoặc tự chuyển trạng thái; JDG-004 vẫn Proposed.

## Questions clarified

| Question                                                                        | Conclusion                                                                                | Source                                                      |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Có triển khai OOP class/method/harness và chẩn đoán nội bộ trong Gateway không? | Không; chỉ xác minh Gateway không expose chức năng Judge này.                             | GW-015 FR-001–005, Ngoài phạm vi; Judge/System architecture |
| Có cần Judge controller/client, RabbitMQ adapter, config hoặc migration không?  | Không; Run/Submit qua Submission, Judge là worker nội bộ.                                 | GW-015 FR-002/005/007; ADR 0002; plan                       |
| Có lọc trường điều khiển Judge trong body Run/Submit ở Gateway không?           | Không diễn giải body; Submission sở hữu DTO validation. Đích proxy vẫn cố định.           | GW-015, Tình huống lỗi; GW-008/GW-009 FR-004                |
| Có cần sửa runtime/thêm test hồi quy không?                                     | Không phát hiện sai lệch boundary; dùng test hiện có và kiểm tra bổ sung trong bộ nhớ.    | plan, Ảnh hưởng tới mã nguồn và Chiến lược kiểm thử         |
| Có giải quyết vòng đời session GW-011 ở đây không?                              | Không; chỉ kiểm tra payload allowlist/owner, không thay authentication hoặc notification. | GW-015, Ngoài phạm vi; GW-011                               |

## What was done

Rà soát boundary GW-015 và hoàn tất checklist. Code hiện tại đã đáp ứng: client không có đường gọi Judge trực tiếp cho chấm oop; API Run/Submit vẫn thuộc Submission. Không thêm source, test file, dependency, DTO hay API. Thay đổi chỉ gồm tasks và worked entry này.

## Why these choices

Plan yêu cầu chỉ sửa code khi phát hiện public exposure. `apps/api-gateway/src/application/proxy/gateway-proxy.constants.ts` đã giới hạn method/path Submission; `gateway-proxy.service.ts` chỉ cấu hình bốn upstream business service và ghép URL từ cấu hình, không dùng target do client chọn. `maxRedirects: 0` không cho response redirect kéo proxy sang Judge. Thêm denylist, Judge client hoặc controller sẽ không giải quyết thiếu sót nào đã tìm thấy.

`api-gateway.module.ts`, `presentation/controllers/gateway-proxy.controller.ts`, `main.ts` và schema Gateway trong `libs/config/src/environment.ts` không đăng ký API, cấu hình hay persistence của Judge. Gateway không import Judge internals, runner/sandbox hoặc RabbitMQ adapter. Shared transport contracts không biến thành public Judge DTO/Swagger.

## How the feature works

1. Client gọi Run/Submit; middleware xác thực và thay metadata định danh giả mạo.
2. Proxy kiểm tra method/path và đường dẫn an toàn, rồi chuyển request nguyên dạng tới Submission. Query/header/body không được dùng để chọn upstream.
3. Submission sở hữu validation, job và kết quả. Luồng kiến trúc là Submission → RabbitMQ → Judge → RabbitMQ → Submission; Gateway không làm hop trên message flow.
4. Gateway trả status/body do Submission tạo; khi upstream lỗi kết nối, dùng lỗi Gateway chung. Path Judge không có mapping giữ `BadGatewayException('No upstream route is configured')` tại proxy; auth/rate limit vẫn có thể từ chối request trước proxy.
5. Với realtime, Redis subscriber nhận message Submission; `application/realtime/submission-result.parser.ts` dựng lại notification chỉ có `submissionId/kind/status/ready`. `presentation/realtime/submission-realtime.gateway.ts` chỉ emit notification tới socket đúng owner, không emit raw JudgeResult/envelope.
6. Log proxy chỉ ghi request ID/status; parser/subscriber dùng thông báo log chung, không ghi nội dung judge. Không có client-to-server handler gọi Judge trên Socket.IO.

## Verification

| Requirements                          | Evidence / result                                                                                                                                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GW-015 FR-001/007, SR-001, AC-001/003 | Route/controller/composition root không có Judge target. 84 request trực tiếp (14 path × 6 method) bị route miss, không gọi HTTP client; 3 traversal/encoded paths bị chặn.                                                                                                                                     |
| GW-015 FR-002/006, AC-002             | Test proxy hiện có xác minh bốn route Submission và status/body. Kiểm tra riêng POST Run/Submit với target giả trong header/query/body vẫn tới `http://submission`, không follow redirect.                                                                                                                      |
| GW-015 FR-003/004, SR-002/003         | Không có public contract cho OOP class/method/harness và chẩn đoán nội bộ. Body giả không được diễn giải; validation thuộc Submission. Kiểm tra parser RUN/SUBMIT loại hidden harness/Test Case/expected output/output/source/command/sandbox và từ chối raw result. Rà soát các logger không ghi body/message. |
| GW-015 FR-005, SR-004, AC-005         | Không có Judge imports, business database/entity/repository, compiler/sandbox adapter hoặc config được Gateway sử dụng. Rà soát source Gateway và schema config; không đọc file môi trường thật.                                                                                                                |
| GW-015 AC-004                         | Test parser kiểm tra dựng allowlist; test realtime kiểm tra chỉ emit notification cho owner. Không thay contract realtime.                                                                                                                                                                                      |

- Commands run and their results:
  - `pnpm test --runTestsByPath apps/api-gateway/src/application/proxy/gateway-proxy.service.spec.ts apps/api-gateway/src/presentation/middleware/gateway-auth.middleware.spec.ts apps/api-gateway/src/application/realtime/submission-result.parser.spec.ts apps/api-gateway/src/presentation/realtime/submission-realtime.gateway.spec.ts`: 4 suites pass, exit 0.
  - `pnpm exec node -r ts-node/register -r tsconfig-paths/register` với kiểm tra assert qua stdin, HTTP client giả và ConfigService dùng giá trị tổng hợp: pass các trường hợp nêu trên; không mở kết nối mạng, không tạo test file trong repo.
  - `git diff --check`: pass, exit 0. Kiểm tra liên kết worked và đủ các mục bắt buộc trong cả 5 checklist/worked entry: pass.
  - `pnpm exec prettier --write` trên đúng 10 file tasks/worked thay đổi: pass.
- N/A: lint/typecheck/build và full test suite — không đổi source/config/dependency. Không chạy migration hoặc CodeGraph sync (repo không có `.codegraph/`).
- Not verified: deployment/network thật, RabbitMQ/Redis/Judge thật hoặc pipeline chấm. Không kết luận toàn bộ GW-011 đạt spec; xung đột vòng đời session đã được ghi ở worked Submission trước đó, ngoài phạm vi này.

## Configuration

No configuration change.

## Remaining

- Not done: không còn task boundary GW-015 ở mức rà soát source và kiểm tra trong bộ nhớ; không triển khai JDG-004 còn Proposed.
- Risks: test chạy bằng Node 20.19.6 trong khi package yêu cầu Node >=22; kết quả trên không thay thế kiểm thử hệ thống triển khai thật.
