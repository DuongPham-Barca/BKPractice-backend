# 2026-10-29 — Tên hiển thị người gửi OTP Brevo

- Author: Codex
- Scope: Identity Auth, cấu hình người gửi email OTP ID-007

## Spec and plan

- Spec: [ID-007 spec 1.4](../../../specs/01-identity/password-reset/spec.md)
- Plan: [ID-007 plan 1.4](../../../specs/01-identity/password-reset/plan.md)
- Tasks: [ID-007 tasks](../../../specs/01-identity/password-reset/tasks.md)
- Spec status at start: Approved 1.4 theo yêu cầu của chủ sở hữu đổi tên hiển thị người gửi.

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| Địa chỉ gửi và tên hiển thị có phải hai giá trị riêng? | Có. `BREVO_SENDER_EMAIL` là địa chỉ gửi thật đã xác minh; `BREVO_SENDER_NAME` là tên hiển thị trong trường From. | Yêu cầu của chủ sở hữu và tài liệu sender của Brevo. |
| Tên hiển thị có che được địa chỉ gửi thật không? | Không. Người nhận vẫn có thể xem địa chỉ From; muốn giấu địa chỉ cá nhân cần dùng địa chỉ thương hiệu đã xác minh. | [Brevo: Create a new sender](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email). |
| Nếu chưa đặt tên mới thì sao? | Giữ `BKPractice`, là tên hiện có trong adapter. | Code Brevo adapter trước sửa đổi và spec 1.4. |

## What was done

Thêm `BREVO_SENDER_NAME` vào validation Identity và `.env.example`. Brevo mailer lấy giá trị này cho `sender.name`, trong khi `sender.email` vẫn lấy từ `BREVO_SENDER_EMAIL`. Có thể cấu hình tên như `Toki` mà không đổi API gửi OTP hay use case. Tên rỗng hoặc chỉ khoảng trắng bị từ chối khi khởi động.

## Why these choices

Brevo nhận hai trường `sender.name` và `sender.email`; tách chúng đúng với nhu cầu đổi tên hiển thị. Mặc định `BKPractice` giữ hành vi hiện tại nếu chưa thêm cấu hình. Địa chỉ gửi tiếp tục phải được Brevo xác minh; tên hiển thị không làm địa chỉ đó biến mất khỏi email.

## How the feature works

1. Người vận hành đặt `BREVO_SENDER_NAME` và `BREVO_SENDER_EMAIL` trong môi trường Identity.
2. Identity kiểm tra tên không rỗng và dùng mặc định `BKPractice` khi thiếu.
3. Khi người dùng gọi send-otp, use case phát OTP rồi gọi Brevo mailer.
4. Mailer gửi payload Brevo với `sender.name` là tên cấu hình và `sender.email` là địa chỉ đã xác minh. Caller vẫn thấy `202` chung; lỗi gửi được xử lý như trước.

## Configuration

- `.env.example`: thêm `BREVO_SENDER_NAME`, tên hiển thị email; giá trị mẫu `BKPractice`.
- `libs/config/src/environment.ts`: kiểm tra tên không rỗng, tối đa 100 ký tự, mặc định `BKPractice`.
- Không mở hoặc thay đổi `.env` thật trong phiên này.

## Verification

- `pnpm exec jest --runInBand` cho Brevo mailer và environment: 12 test pass.
- `pnpm exec tsc --noEmit -p apps/identity-service/tsconfig.app.json`, ESLint các file liên quan, `pnpm build:identity`, `git diff --check`: pass.
- Bộ test toàn repo đã pass 184 test, 38 skip trước sửa đổi nhỏ này; chưa chạy lại toàn bộ sau sửa đổi.
- Not verified: email Brevo thật tới hộp thư trường; chưa có sender/API key được cấp trong phiên làm việc.

## Remaining

- Not done: cấu hình giá trị mong muốn trong môi trường chạy, xác minh địa chỉ gửi ở Brevo và smoke gửi thật.
- Risks: tên hiển thị `Toki` không che được địa chỉ gửi cá nhân trong chi tiết thư. Nếu muốn địa chỉ cá nhân không xuất hiện, cần dùng địa chỉ gửi thương hiệu đã xác minh.
