# GW-006 Công việc triển khai Gateway — Định tuyến Progress qua API Gateway

> **Cập nhật LRN-008 (2026-11-07):** Chỉ giữ route tiến độ cá nhân theo Problem/Course; các route điểm Assignment và tiến độ Class bên dưới đã ngừng áp dụng. Xem [Learning tự học](../../../02-learning/self-study/spec.md).

Đặc tả liên quan: `./spec.md`  
Kế hoạch liên quan: `./plan.md`

> Spec đã Approved; checklist này theo dõi triển khai và xác minh.

## Chuẩn bị

- [ ] Xác nhận spec chuyển sang Approved và plan/tasks không mở rộng phạm vi.
- [ ] Kiểm tra `git status` và bảo toàn thay đổi có sẵn.
- [ ] Kiểm tra proxy, cấu hình route, auth, response handling và tests hiện tại.
- [ ] Xác nhận `LEARNING_SERVICE_URL` cùng prefix trong spec, không đọc file `.env`.

## Định tuyến và transport

- [ ] Xác nhận mọi method/path trong spec được chuyển tới đúng Learning upstream.
- [ ] Bảo toàn method, path, query, body và status/body upstream.
- [ ] Xác nhận route boundary theo segment; route nội bộ/traversal không thể lách tới upstream.
- [ ] Chỉ sửa transport cần thiết; không thêm DTO hoặc logic nghiệp vụ Learning.

## Bảo mật và lỗi

- [ ] Xác minh xác thực/session từ chối trước upstream và metadata chỉ lấy từ token đã xác minh.
- [ ] Xác minh header giả mạo/nội bộ bị loại bỏ và cookie/CSRF theo spec.
- [ ] Xác minh response header allowlist, request ID, logging và rate limit mặc định.
- [ ] Xác minh upstream timeout/unavailability và lỗi upstream theo spec.

## Kiểm thử và xác minh

- [ ] Thêm/điều chỉnh test map tới từng FR/AC; kiểm thử cả upstream được gọi và không được gọi.
- [ ] Chạy test Gateway mục tiêu qua script có sẵn.
- [ ] Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test` và build Gateway nếu script tồn tại.
- [ ] Đối chiếu triển khai với spec/plan và xác nhận không có quyền/state/persistence nghiệp vụ trong Gateway.
- [ ] Ghi kết quả thật, phần chưa kiểm chứng và sai lệch vào worked entry; chỉ đánh dấu task hoàn thành khi có bằng chứng.

## Không áp dụng

- [x] N/A — domain, database, migration, messaging và realtime: không thuộc phạm vi Gateway route proxy này.
