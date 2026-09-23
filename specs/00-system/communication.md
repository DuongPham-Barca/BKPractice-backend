# Chiến lược giao tiếp

## Các kiểu giao tiếp được phê duyệt

- Client tới API Gateway: REST và Socket.IO.
- Gateway tới các service nghiệp vụ: chuyển tiếp REST.
- Gọi đồng bộ giữa các service: mặc định dùng REST.
- Công việc bất đồng bộ / thông báo nghiệp vụ: dùng RabbitMQ khi cần tách rời hoặc cần retry.
- Fan-out realtime tạm thời / cache: Redis và Socket.IO.

Các luồng chính hiện tại:

```text
Submission -> REST nội bộ của Learning: gói dữ liệu judge được bảo vệ
Submission -> RabbitMQ -> Judge: judge.request
Judge -> RabbitMQ -> Submission: judge.result
Submission -> RabbitMQ -> Learning: submission.accepted
Submission -> Redis -> Gateway -> client: kết quả realtime
```

## Quy tắc về contract

- Client công khai không bao giờ được cung cấp test ẩn, kết quả mong đợi, harness, lệnh biên dịch
  hay cấu hình Docker.
- Payload xuyên service dùng transport contract có thể đánh phiên bản, đặt trong các thư viện
  contract kỹ thuật.
- Kế hoạch về messaging phải định nghĩa exchange, queue, routing key, bên phát, bên tiêu thụ, tính
  idempotent, hành vi ACK/NACK, retry và DLQ.
- Kế hoạch về REST phải định nghĩa quyền sở hữu, xác thực, timeout, ánh xạ lỗi và tính tương thích.
- Chỉ đưa ra một event khi có nhu cầu bất đồng bộ thật sự, không phải để trang trí kiến trúc.
- Việc truyền tải dữ liệu không cho phép một service truy vấn cơ sở dữ liệu của service khác.

Kế hoạch tính năng đánh dấu N/A kèm lý do cho các mục giao tiếp không liên quan.
