# Ràng buộc bảo mật của Judge

Judge thực thi mã không tin cậy do sinh viên viết. Các ràng buộc dưới đây là yêu cầu kiến trúc hệ
thống và có hiệu lực cao hơn sự tiện lợi khi triển khai.

## Ranh giới tin cậy

- Submission điều phối Run/Submit nhưng không bao giờ biên dịch hay thực thi mã.
- Judge chỉ chọn các language adapter nằm trong whitelist và các lệnh đáng tin cậy.
- Mã nguồn và stdin của sinh viên là dữ liệu, không bao giờ là mảnh lệnh shell.
- Test case ẩn và các runner luôn ở phía server và không bao giờ xuất hiện trong phản hồi API công
  khai.
- Ban đầu Judge là stateless và không sở hữu cơ sở dữ liệu lịch sử nộp bài.

## Yêu cầu về sandbox

Mọi kế hoạch thực thi BẮT BUỘC phải giữ:

- tắt mạng;
- giới hạn CPU, bộ nhớ và thời gian thực thi;
- giới hạn số tiến trình/PID và giới hạn output;
- đặc quyền tối thiểu, loại bỏ capabilities và bật `no-new-privileges`;
- tên file và tham số lệnh được kiểm soát;
- workspace tạm thời duy nhất và cơ chế dọn dẹp đáng tin cậy;
- thu thập stdout, stderr và thông tin chẩn đoán từ trình biên dịch;
- không có container chạy mã sinh viên ở chế độ privileged.

## Yêu cầu của SDD

Đặc tả của Judge định nghĩa các yêu cầu quan sát được về thực thi/phân loại, chứ không định nghĩa
lệnh runtime do client điều khiển. Kế hoạch của Judge dùng kiến trúc Worker + Pipeline + Adapter và
bao gồm kiểm thử cho các tình huống lạm dụng, timeout, cạn kiệt tài nguyên, payload sai định dạng,
giao trùng message, worker sập và dọn dẹp, khi có liên quan. Bất kỳ nới lỏng nào đối với một biện
pháp kiểm soát sandbox đều cần phê duyệt tường minh về bảo mật và kiến trúc; không được giấu nó
trong một task tính năng.

adanjdjđk
