# [FEATURE-ID] Công việc triển khai

Đặc tả liên quan: `./spec.md`  
Kế hoạch liên quan: `./plan.md`

Đánh dấu các mục không áp dụng là `- [x] N/A — lý do`. Giữ danh sách này đồng bộ với bản triển khai
thực tế; tích một mục nghĩa là mục đó đã hoàn thành và đã được xác minh nếu có liên quan.

## Chuẩn bị

- [ ] Khảo sát mã nguồn hiện có và trạng thái repository.
- [ ] Xác nhận `spec.md` tồn tại và Status là `Approved`.
- [ ] Xác nhận kiến trúc của service đích trong `docs/architecture/`.
- [ ] Xác nhận `plan.md` khớp với đặc tả đã Approved và không mở rộng phạm vi.
- [ ] Xác nhận các câu hỏi mở không chặn việc triển khai.

## Domain

- [ ] Triển khai các quy tắc nghiệp vụ, bất biến và chuyển trạng thái có liên quan.
- [ ] Bổ sung các kiểm thử domain tập trung.

## Application

- [ ] Triển khai các use case/luồng nghiệp vụ đã lập kế hoạch.
- [ ] Chỉ triển khai các port được kế hoạch biện minh.

## Infrastructure

- [ ] Triển khai các adapter kỹ thuật đã lập kế hoạch.
- [ ] Gắn các adapter tại composition root của service.

## Lưu trữ

- [ ] Triển khai hành vi repository/truy vấn bên trong service sở hữu.
- [ ] Xác minh không phát sinh truy cập cơ sở dữ liệu xuyên service hay thực thể nghiệp vụ dùng chung.

## Cơ sở dữ liệu / Migration

- [ ] Bổ sung migration TypeORM đã lập kế hoạch.
- [ ] Xác minh hành vi áp dụng/hoàn tác migration và `synchronize` vẫn đang tắt.

## API

- [ ] Chỉ triển khai các route/contract đã lập kế hoạch.
- [ ] Bổ sung kiểm tra/biến đổi dữ liệu ở DTO.
- [ ] Cập nhật Swagger khi API công khai/nội bộ thay đổi.

## Messaging

- [ ] Triển khai các message contract và adapter đã lập kế hoạch.
- [ ] Xác minh hành vi ACK/NACK, retry, idempotent và DLQ nếu có liên quan.

## Realtime

- [ ] Triển khai việc phát/gửi realtime đã lập kế hoạch.
- [ ] Xác minh trạng thái lưu bền vẫn là nguồn chân lý.

## Phân quyền

- [ ] Triển khai các kiểm tra vai trò, quyền, quyền sở hữu và service tin cậy theo đặc tả.
- [ ] Kiểm thử cả tác nhân được phép lẫn tác nhân bị từ chối.

## Kiểm thử

- [ ] Ánh xạ các kiểm thử tới yêu cầu chức năng và tiêu chí nghiệm thu.
- [ ] Bổ sung các kiểm thử unit, integration, contract và end-to-end có liên quan.
- [ ] Chạy `pnpm lint`.
- [ ] Chạy `pnpm typecheck`.
- [ ] Chạy `pnpm test`.
- [ ] Chạy `pnpm build`.

## Tài liệu

- [ ] Cập nhật tài liệu API, sự kiện, vận hành và kiến trúc có liên quan.
- [ ] Ghi lại các sai lệch đã được phê duyệt và ghi chú về migration/triển khai.

## Xác minh

- [ ] Đối chiếu bản triển khai với từng `FR-*` và `AC-*`.
- [ ] Xác nhận không có hành vi Ngoài phạm vi nào được thêm vào.
- [ ] Chỉ cập nhật trạng thái đặc tả sang `Implemented` thông qua quy trình review đã được phê duyệt.
- [ ] Ghi lại kết quả kiểm chứng và các hành vi chưa được xác minh.

## Tuân thủ kiến trúc

- [ ] Xác minh chiều phụ thuộc theo kiến trúc đã chọn của service.
- [ ] Xác minh các ranh giới sở hữu service và cơ sở dữ liệu.
- [ ] Xác minh các thư viện dùng chung không chứa mô hình nghiệp vụ thuộc sở hữu của service.
- [ ] Xác minh bản triển khai khớp với mục Tuân thủ kiến trúc của `plan.md`.
