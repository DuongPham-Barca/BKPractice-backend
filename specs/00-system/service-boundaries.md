# Ranh giới service

Việc đặt tính năng và xác định quyền sở hữu tuân theo
[kiến trúc hệ thống](../../docs/architecture/system-architecture.md) có thẩm quyền.

## API Gateway

Sở hữu định tuyến ở biên, xác minh access token, metadata phân quyền thô, giới hạn tần suất,
correlation ID, ghi log request an toàn, chuẩn hoá lỗi và các kết nối realtime tới client. Nó không
sở hữu bất kỳ thực thể nghiệp vụ hay cơ sở dữ liệu nghiệp vụ nào.

## Identity

Sở hữu người dùng, hồ sơ, xác thực, thông tin mật khẩu, refresh token, vai trò, quyền, RBAC và
trạng thái tài khoản. `STUDENT`, `LECTURER` và `ADMIN` vẫn là vai trò, không phải service.

## Learning

Sở hữu problem, test case, topic, tag, starter code, các ngôn ngữ được hỗ trợ cho problem, khoá học,
chương, lớp, đăng ký học, bài tập, tiến độ và gợi ý theo luật. Tất cả nằm trong một bounded context
Learning duy nhất; không tách thành service Problem hay Recommendation riêng.

## Submission

Sở hữu việc điều phối Run, vòng đời Submit chính thức, lịch sử nộp bài, lưu trữ kết quả và luồng
phát/gửi kết quả realtime. Nó có thể yêu cầu gói dữ liệu judge được bảo vệ từ Learning và gửi việc
sang Judge, nhưng không bao giờ tự thực thi mã không tin cậy.

## Judge

Sở hữu việc biên dịch, thực thi, tích hợp Docker sandbox, các language runner, các chiến lược thực
thi `STANDARD`/`FUNCTION`/`OOP`, thông tin chẩn đoán và phân loại kết quả. Nó không sở hữu lịch sử
nộp bài chính thức hay tiến độ học tập.

## Community

Sở hữu bài viết, bình luận, trả lời, phản ứng, bookmark, báo cáo và kiểm duyệt. `authorId`,
`problemId` và `courseId` là định danh bên ngoài, không phải quan hệ lưu trữ xuyên service.

## Quy tắc ranh giới cho spec và plan

- Đặt đặc tả tính năng dưới service sở hữu state và policy của nó.
- Một luồng nghiệp vụ trải nhiều service phải chỉ định một chủ sở hữu điều phối duy nhất cùng các
  phụ thuộc REST/event tường minh; nó không dùng chung repository.
- Kế hoạch không được chuyển một trách nhiệm hiện có sang service khác nếu chưa có quyết định kiến
  trúc được phê duyệt riêng.
- Việc dùng chung message contract không chuyển giao quyền sở hữu nghiệp vụ.
- Nếu quyền sở hữu thực sự mơ hồ, hãy giải quyết trong lúc review đặc tả ở trạng thái Proposed,
  trước khi phê duyệt.
