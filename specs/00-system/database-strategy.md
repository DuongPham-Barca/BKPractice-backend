# Chiến lược cơ sở dữ liệu

## Quyền sở hữu

| Service    | Cơ sở dữ liệu sở hữu                     |
| ---------- | ---------------------------------------- |
| Identity   | `bkpractice_identity`                    |
| Learning   | `bkpractice_learning`                    |
| Submission | `bkpractice_submission`                  |
| Community  | `bkpractice_community`                   |
| Judge      | Ban đầu không có cơ sở dữ liệu nghiệp vụ |

Môi trường phát triển có thể dùng chung một server/container PostgreSQL, nhưng quyền sở hữu cơ sở
dữ liệu vẫn độc lập.

## Quy tắc bắt buộc

- Không có câu SQL hay truy cập cơ sở dữ liệu trực tiếp xuyên service.
- Không có khoá ngoại hay quan hệ TypeORM xuyên service.
- Không đặt thực thể TypeORM nghiệp vụ thuộc sở hữu của service nào trong `libs/`.
- Quan hệ với dữ liệu bên ngoài được lưu dưới dạng ID và chỉ được phân giải qua REST/event khi cần.
- Thay đổi schema phải dùng migration trong chính service sở hữu.
- `synchronize: true` không phải là một chiến lược schema được chấp nhận.
- Redis không phải là cơ sở dữ liệu nghiệp vụ lâu dài.
- Judge không được cấp cơ sở dữ liệu chỉ để cho cân xứng; việc lưu trữ đòi hỏi một yêu cầu được
  biện minh và phê duyệt riêng.

## Yêu cầu của SDD

Đặc tả mô tả hành vi lưu trữ được yêu cầu mà không quy định bảng, trừ khi hình dạng schema là một
ràng buộc nghiệp vụ hoặc ràng buộc tương thích. Kế hoạch tương ứng phải xác định cơ sở dữ liệu sở
hữu, ảnh hưởng tới entity/repository, index/ràng buộc, migration TypeORM, tính tương thích và chiến
lược hoàn tác. Công việc chỉ bao gồm bước xác minh migration khi thực sự có thay đổi cơ sở dữ liệu.
