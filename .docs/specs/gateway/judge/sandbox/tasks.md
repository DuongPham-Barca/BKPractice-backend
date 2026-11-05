# GW-016 Công việc Gateway — Sandbox

Đặc tả liên quan: `./spec.md`  
Kế hoạch liên quan: `./plan.md`

> GW-016 đã Approved; checklist theo dõi công việc triển khai Gateway.

## Chuẩn bị

- [ ] Xác nhận spec Approved và đọc lại architecture/SUB/GW dependencies.
- [ ] Kiểm tra worktree, proxy mapping, upstream config, imports và realtime path.
- [ ] Xác nhận phần JDG-005 vẫn không định nghĩa public API Judge.

## Kiểm tra ranh giới

- [ ] Xác nhận không có route/controller/upstream Gateway trực tiếp tới Judge cho sandbox judge.
- [ ] Xác nhận Run/Submit đi tới Submission; không có path/header/query rewrite tới Judge.
- [ ] Xác nhận không có payload/contract sandbox judge nội bộ trong public DTO, Swagger hoặc logs.
- [ ] Xác nhận realtime chỉ chuyển notification allowlist theo GW-011.
- [ ] Xác nhận không có Judge imports/config/database/persistence trong Gateway.

## Xử lý sai lệch và xác minh

- [ ] Nếu phát hiện public exposure, loại bỏ đúng sai lệch và thêm test hồi quy tối thiểu.
- [ ] Nếu không có sai lệch, ghi N/A cho code/test change kèm file/mapping đã rà soát.
- [ ] Chạy các script có sẵn phù hợp nếu có source/config change; không chạy migration.
- [ ] Đối chiếu FR/AC và ghi kết quả thật vào worked entry.

## Không áp dụng

- [x] N/A — Judge API, pipeline implementation, runner/sandbox code, database/migration và RabbitMQ adapter trong Gateway không thuộc kiến trúc.
