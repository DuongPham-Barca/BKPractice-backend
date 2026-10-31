# 2026-10-28 — Làm rõ xử lý lỗi gửi OTP

- Author: Codex
- Scope: ID-007, Identity Auth

## Spec and plan

- Spec: `.docs/specs/01-identity/password-reset/spec.md` v1.0
- Plan: `.docs/specs/01-identity/password-reset/plan.md`
- Tasks: `.docs/specs/01-identity/password-reset/tasks.md`
- Spec status at start: Approved

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| Lỗi gửi mail qua Graph có đổi phản hồi public không? | Không; send vẫn trả 202 chung và adapter ghi log an toàn. | ID-007 FR-003, phần đầu vào/đầu ra và tình huống lỗi. |
| `catch` trong send use case nên xử lý lỗi nào? | Chỉ lỗi gửi mail đã được adapter nhận diện; lỗi không thuộc loại đó được ném tiếp để không che lỗi bất thường. | Yêu cầu người dùng về line 26; ID-007 FR-009 và plan xử lý lỗi. |

## What was done

Thêm `PasswordResetMailDeliveryFailure` vào port gửi mail. Graph adapter tiếp tục ghi log chung khi token Graph, request hoặc phản hồi gửi mail thất bại, rồi ném lỗi loại này mà không kèm email, OTP hoặc token. `SendPasswordResetOtp` bắt rõ loại lỗi đó để giữ response 202; lỗi khác được ném tiếp. Bổ sung test cho cả lỗi gửi mail dự kiến và lỗi mailer bất thường.

## Why these choices

Application chỉ biết lỗi của port, không phụ thuộc Graph hay NestJS. Loại lỗi riêng làm rõ điều kiện được phép bỏ qua theo spec; adapter vẫn chịu trách nhiệm chuyển lỗi Graph và ghi log không chứa dữ liệu nhạy cảm.

## How the feature works

1. Send use case tạo và lưu OTP rồi gọi mailer với email đã lưu của User.
2. Graph adapter xin app token, gọi `sendMail`; nếu thành công, send kết thúc với 202.
3. Nếu Graph gửi thất bại, adapter ghi log chung và ném `PasswordResetMailDeliveryFailure`; use case bắt lỗi này và kết thúc để caller vẫn nhận 202.
4. Nếu một mailer ném lỗi ngoài loại trên, use case ném tiếp để lỗi bất thường không bị che. Không có thay đổi đối với OTP đã lưu hoặc ba API.

## Configuration

No configuration change.

## Verification

- `pnpm test`: pass 40 suite, 177 test; 7 suite và 32 test skip như trước.
- Typecheck Identity, eslint các file thay đổi và `git diff --check`: pass.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` toàn repo: fail vì dòng `heheh` có sẵn trong HEAD tại `apps/learning-service/src/database/data-source.ts:14`; bước build Identity trong `pnpm build` pass.
- Not verified: Graph/Redis thật và mailbox tenant chưa sẵn sàng trong môi trường test.

## Remaining

- Not done: smoke test Graph trên tenant có quyền `Mail.Send` và mailbox cấu hình.
- Risks: nếu app chưa được cấp quyền đúng, Graph gửi thất bại nhưng send vẫn trả 202 theo contract; log vận hành chỉ báo lỗi chung.
