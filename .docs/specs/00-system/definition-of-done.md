# Định nghĩa Hoàn thành

Một tính năng chỉ được coi là Hoàn thành khi mọi điều kiện có liên quan dưới đây đều được thoả mãn.
Một mục không liên quan có thể được đánh dấu N/A kèm lý do cụ thể; N/A không phải cách thay thế cho
công việc còn dang dở.

## Đặc tả và lập kế hoạch

- [ ] `spec.md` tồn tại và có Status `Approved` trước khi bắt đầu triển khai.
- [ ] `plan.md` tồn tại và không mở rộng đặc tả đã Approved.
- [ ] `tasks.md` tồn tại và phản ánh đúng kế hoạch.
- [ ] Kiến trúc bắt buộc của service đã được chọn từ `.docs/architecture/`.
- [ ] Các câu hỏi mở làm ảnh hưởng đến hành vi đã được giải quyết.

## Triển khai

- [ ] Toàn bộ yêu cầu chức năng đã được triển khai.
- [ ] Toàn bộ tiêu chí nghiệm thu đã được thoả mãn.
- [ ] Các quy tắc phân quyền và sở hữu đã được triển khai nếu có liên quan.
- [ ] Việc kiểm tra dữ liệu đầu vào và hành vi lỗi đã được triển khai nếu có liên quan.
- [ ] Các migration TypeORM cần thiết đã được tạo và xác minh.
- [ ] Swagger đã được cập nhật khi contract của API thay đổi.
- [ ] Contract messaging/realtime và hành vi phân phối đã được triển khai nếu có liên quan.
- [ ] Không có chức năng Ngoài phạm vi nào được thêm vào mà chưa được phê duyệt.

## Chất lượng và xác minh

- [ ] Các kiểm thử cần thiết đã được bổ sung và các kiểm thử liên quan đều pass.
- [ ] `pnpm lint` pass.
- [ ] `pnpm typecheck` pass.
- [ ] `pnpm test` pass.
- [ ] `pnpm build` pass.
- [ ] `tasks.md` phản ánh đúng công việc đã hoàn thành và các mục N/A đã được biện minh.
- [ ] Bản triển khai đã được đối chiếu với mọi yêu cầu và tiêu chí nghiệm thu trong `spec.md`.
- [ ] Bản triển khai đã được đối chiếu với kiến trúc của service đích và các quy tắc phụ thuộc.
- [ ] Đã rà soát bảo mật nếu có liên quan, đặc biệt là xác thực, phân quyền, dữ liệu ẩn và việc thực
      thi mã không tin cậy.
- [ ] Các sai lệch, hành vi chưa được xác minh và rủi ro còn lại đã được báo cáo.

Sau bước xác minh triển khai, quy trình có thẩm quyền có thể chuyển đặc tả qua `Implemented` rồi tới
`Verified`. Agent triển khai không được âm thầm viết lại một đặc tả đã Approved để kết quả trông có
vẻ tuân thủ.
