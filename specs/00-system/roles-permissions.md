# Vai trò và quyền

## Vai trò nền tảng

BKPractice có ba vai trò nền tảng:

- `STUDENT`
- `LECTURER`
- `ADMIN`

Chúng là dữ liệu và chính sách RBAC do Identity sở hữu. Chúng không phải microservice, không phải
thư mục ứng dụng và không phải ranh giới cơ sở dữ liệu.

## Phân chia trách nhiệm

- Identity xác thực người dùng, quản lý vai trò/quyền/trạng thái tài khoản và phát hành claim trong
  token.
- API Gateway xác minh access token và có thể chuyển tiếp metadata định danh/vai trò đã tin cậy.
- Mỗi service nghiệp vụ tự thực thi việc phân quyền nghiệp vụ, kiểm tra quyền sở hữu và chính sách ở
  mức tài nguyên cho thao tác mà nó sở hữu.
- Client không thể tự cấp vai trò cho mình hoặc tự đặt header định danh nội bộ đáng tin cậy.

## Yêu cầu đối với đặc tả tính năng

Mọi `spec.md` có liên quan đều phải nêu rõ:

- các tác nhân được phép và các tác nhân bị từ chối;
- quy tắc sở hữu, chẳng hạn chỉ được sửa tài nguyên do chính mình tạo;
- quyền đó có phạm vi toàn nền tảng, phạm vi khoá học/lớp, hay phạm vi tài nguyên;
- các tác nhân service-to-service đáng tin cậy nếu có liên quan;
- kết quả mong đợi khi chưa xác thực và khi bị từ chối.

Mọi kế hoạch có liên quan phải ánh xạ các quy tắc này vào kiến trúc của service đích và bao gồm cả
kiểm thử phân quyền theo hướng khẳng định lẫn phủ định. Một quyết định phân quyền còn thiếu mà làm
thay đổi khả năng truy cập là một câu hỏi mở và chặn việc phê duyệt đặc tả.
