# JDG-005 Sandbox

## Trạng thái

Proposed — phiên bản 0.2, ngày 2026-09-30.

## Mục tiêu

Yêu cầu mọi lần compile/execute mã không tin cậy diễn ra trong môi trường cách ly có giới hạn tài
nguyên và được dọn dẹp đáng tin cậy, bảo vệ host, dữ liệu và các service khác.

## Tác nhân và bối cảnh

Judge khởi chạy compiler/runtime thông qua Sandbox boundary; Docker hiện là adapter đang dùng.
Sandbox nhận lệnh do runner tin cậy dựng và dữ liệu source/stdin. Request không được điều khiển
command, image, filename hoặc Docker flags.

### Baseline quan sát từ adapter hiện tại

| Control         | Giá trị/hành vi hiện tại                                                   | Nguồn                        |
| --------------- | -------------------------------------------------------------------------- | ---------------------------- |
| Network         | `none`                                                                     | `docker-sandbox.executor.ts` |
| CPU             | 1 CPU                                                                      | `--cpus 1`                   |
| Memory/swap     | Memory theo request; swap bằng memory limit                                | `--memory`, `--memory-swap`  |
| PID             | 64                                                                         | `--pids-limit 64`            |
| User/capability | UID:GID 1000:1000; drop ALL; no-new-privileges                             | Docker args                  |
| Root/temp       | Root read-only; `/tmp` tmpfs 64 MiB, `noexec,nosuid`                       | Docker args                  |
| Workspace       | Bind mount read-write; cùng workspace được dùng giữa compile và test       | Docker args/engine           |
| Output          | stdout+stderr cộng dồn, ngưỡng từ config; khi vượt thì kill                | executor                     |
| Timeout         | `timeLimitMs` cho execution; compile hiện dùng `max(3 * timeLimitMs, 10s)` | engine/executor              |
| Cleanup         | Docker `--rm`; host workspace bị xóa ở finally                             | executor/engine              |

Đây chỉ là inventory để review. Tính đúng đắn, trần tối đa và quyền file thực tế cần đối chiếu các
SR/AC dưới đây; đặc biệt, workspace hiện được tạo với quyền rộng và mount read-write, nên không được
coi baseline đó là chuẩn an toàn nếu chưa qua security review.

## Yêu cầu chức năng và bảo mật

- **JDG-005-SR-001 — Network:** Mọi container thực thi MUST không có network access.
- **JDG-005-SR-002 — Tài nguyên:** Mọi compile/run MUST áp CPU, memory và wall-clock timeout; memory
  swap MUST không cho phép vượt memory ceiling.
- **JDG-005-SR-003 — Process:** Sandbox MUST giới hạn số process/PID.
- **JDG-005-SR-004 — Output:** Stdout/stderr/compiler output MUST có giới hạn byte; vượt ngưỡng phải
  dừng hoặc cắt theo chính sách được chốt và có kết quả phân loại xác định.
- **JDG-005-SR-005 — Privilege:** Container MUST chạy với đặc quyền tối thiểu, drop capabilities,
  bật no-new-privileges và MUST NOT chạy privileged.
- **JDG-005-SR-006 — Filesystem:** Root filesystem MUST read-only khi có thể; writable temp phải
  giới hạn và không thực thi file tuỳ tiện ngoài workspace được cấp.
- **JDG-005-SR-007 — Commands:** Executable, arguments nền tảng, filename và image MUST do adapter
  tin cậy kiểm soát; dữ liệu payload chỉ truyền qua file/stdin đã quy định.
- **JDG-005-SR-008 — Workspace:** Mỗi execution MUST dùng workspace riêng, không chia sẻ state với
  submission khác; quyền file không được cấp rộng hơn cần thiết.
- **JDG-005-SR-009 — Cleanup:** Workspace và container MUST được dọn cả sau success, timeout, lỗi
  process và lỗi bất thường; cleanup failure phải được phát hiện/ghi nhận an toàn.
- **JDG-005-SR-010 — Output capture:** Sandbox MUST thu stdout/stderr và compiler diagnostics trong
  giới hạn; không ghi raw hidden data vào log vận hành.
- **JDG-005-SR-011 — Timeout termination:** Hết hạn MUST kết thúc process/container kịp thời và
  không để orphan tiếp tục chạy.
- **JDG-005-SR-012 — Failure classification:** Lỗi do giới hạn của submission được phân loại riêng
  lỗi infrastructure; contract verdict hiện có không chứa sandbox-unavailable riêng nên hạ tầng
  không khả dụng MUST map về `INTERNAL_ERROR`.
- **JDG-005-SR-013 — No persistence:** Sandbox artifacts chỉ tồn tại trong thời gian cần cho một
  request; Judge MUST NOT duy trì kho source/test/harness hay lịch sử chấm.
- **JDG-005-SR-014 — CPU quota:** Mỗi sandbox MUST có CPU quota hữu hạn do platform đặt; request
  không thể chọn/nới quota. Nếu đang dùng Docker, quota phải được truyền dưới dạng control cgroup
  tương đương `--cpus`.
- **JDG-005-SR-015 — Disk quota:** Writable workspace và tmpfs MUST có giới hạn dung lượng; đầy
  disk phải kết thúc execution có kiểm soát, không ảnh hưởng host hay workspace khác.
- **JDG-005-SR-016 — File permissions:** Workspace MUST chỉ cấp quyền cần thiết cho UID chạy
  container. Không dùng quyền world-writable nếu không có quyết định security được duyệt.
- **JDG-005-SR-017 — Path isolation:** Mọi đường dẫn do source/harness tạo MUST bị giới hạn trong
  workspace hoặc mount được cho phép; symlink/path traversal không được truy cập host path.
- **JDG-005-SR-018 — Compile/run artifact:** Artifact compile cần tồn tại đủ để chạy testcase nhưng
  không được ghi ra vùng host không cách ly. Test execution chỉ có quyền ghi file nếu policy Problem
  đã cho phép; quyền này phải giới hạn trong workspace.
- **JDG-005-SR-019 — Container identity:** Container name/ID MUST duy nhất cho mỗi process invocation
  và không được tạo collision qua chuỗi ký tự từ payload.
- **JDG-005-SR-020 — Process tree termination:** Timeout/cancel MUST dừng toàn bộ process tree và
  container, không chỉ process Docker client; cleanup phải xác nhận không còn workload mồ côi.
- **JDG-005-SR-021 — Ranh giới adapter:** Sandbox MUST trả kết quả hoặc lỗi kỹ thuật về core và
  MUST NOT phụ thuộc RabbitMQ, quyết định ACK/NACK hay ghi trạng thái Submission. Phân phối result
  thuộc JDG-001.
- **JDG-005-SR-022 — Bằng chứng cạn bộ nhớ:** Sandbox MUST chỉ báo sự kiện chạm giới hạn bộ nhớ khi
  có tín hiệu runtime/cgroup đáng tin; exit code `137` đơn lẻ MUST NOT được coi là bằng chứng đầy đủ,
  vì process có thể bị kill vì lý do khác.

## Đầu vào/đầu ra

Sandbox nhận workspace riêng, image/command tin cậy, stdin và limits đã xác thực. Trả exit status,
stdout/stderr có giới hạn, runtime và cờ timeout/output-limit; memory metric chỉ trả nếu đo tin cậy.
Không chấp nhận bất cứ lệnh/flag nào từ client.

## Lỗi và biên

Docker daemon không sẵn sàng; image thiếu; workspace permission; container không thoát; output flood;
fork bomb; memory/CPU exhaustion; timeout race; trùng execution/container name; dọn dẹp thất bại;
host restart khi container chạy; symlink/path traversal từ source; filesystem đầy.

## Tiêu chí nghiệm thu

- **JDG-005-AC-001:** Mỗi execution tắt network, không privileged, drop capabilities và giới hạn PID.
- **JDG-005-AC-002:** CPU, memory, wall timeout và output ceiling luôn được áp dụng; request không
  thể nới trần nền tảng.
- **JDG-005-AC-003:** Hết giờ kết thúc container/process và không để execution chạy mồ côi.
- **JDG-005-AC-004:** Workspace của hai execution đồng thời không thể đọc/ghi lẫn nhau.
- **JDG-005-AC-005:** Workspace/container được dọn sau success và lỗi; thất bại dọn dẹp được phát
  hiện mà không làm lộ dữ liệu nhạy cảm.
- **JDG-005-AC-006:** Source/stdin không thể thay đổi executable, flags, image hoặc host path.
- **JDG-005-AC-007:** Docker/hạ tầng unavailable tạo `INTERNAL_ERROR`, không gán verdict sai cho
  submission.
- **JDG-005-AC-008:** Không có đường chạy privileged hoặc network-enabled cho code người học.
- **JDG-005-AC-009:** Giới hạn đĩa/workspace/tmpfs ngăn một execution làm cạn filesystem host.
- **JDG-005-AC-010:** File trong workspace không có quyền rộng hơn chính sách đã duyệt; kiểm thử xác
  nhận không thể truy cập đường dẫn host qua `..` hoặc symlink.
- **JDG-005-AC-011:** Timeout giết cả process tree/container, và sau cleanup không còn container/process
  thuộc execution đó.
- **JDG-005-AC-012:** Hai request trùng hoặc gần trùng ID không thể điều khiển/kill container của nhau.
- **JDG-005-AC-013:** Output được tính gộp stdout và stderr theo byte; vượt ngưỡng có hành vi terminal
  xác định và không tiếp tục giữ output vượt giới hạn trong bộ nhớ.
- **JDG-005-AC-014:** Giới hạn compile khác execution được áp rõ ràng; mỗi loại timeout cho verdict
  xác định.
- **JDG-005-AC-015:** Một process tự trả exit code `137` không bị kết luận `MEMORY_LIMIT_EXCEEDED`
  nếu không có tín hiệu OOM xác nhận; lỗi daemon/host được phân loại khác lỗi lời giải.

## Ngoài phạm vi

Chọn công nghệ isolation thay Docker (ví dụ gVisor/Firecracker) nếu chưa có ADR; quản trị cluster,
autoscaling, billing, anti-cheat và host patch management. Các yêu cầu ở đây không cho phép nới
security controls hiện hành.

## Phụ thuộc

[Judge security](../../00-system/judge-security.md), [Judge architecture](../../../architecture/judge-service.md),
[JDG-001](../standard-judge/spec.md), [JDG-002](../language-runners/spec.md), Docker sandbox adapter.

## Câu hỏi mở

1. Trần platform chính xác cho memory, wall timeout, workspace disk, tmpfs, source size và output
   bytes là bao nhiêu? Baseline hiện tại là CPU 1 và PID 64; có giữ nguyên không?
2. Timeout áp riêng compile, container startup, từng testcase hay toàn request? Compile hiện cấp
   `max(3 * timeLimitMs, 10s)`; đây có phải product policy không?
3. Khi output trần vượt: kill toàn request hay testcase; verdict hiện khả dụng `RUNTIME_ERROR` hay
   cần thêm status contract?
4. Compile artifacts có cần writable giữa compile và mỗi testcase không; executable có thể read-only
   khi chạy không; chương trình được phép ghi file không? Hiện các testcase dùng chung writable
   workspace, điều này có thể làm test phụ thuộc thứ tự.
5. Docker host/workspace mapping, quota disk, file descriptors, ulimit và seccomp/apparmor profile
   nào là chuẩn được hỗ trợ?
6. Cần memory metric thực đo không; nếu có thì nguồn đo và độ chính xác tối thiểu là gì? Docker API
   hiện không trả metric này trong `SandboxResult`.
7. Cleanup failure xử lý ACK/result/retry/DLQ ra sao để không che mất kết quả hay để orphan container?
8. Có yêu cầu chống giao trùng message bằng executionId và tránh tên container collision ra sao?
9. Source và stdin có giới hạn byte độc lập nào? LRN-002 quy định testcase/harness, không đặt giới
   hạn cho source của người học.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review | Tóm tắt                                                                |
| ---------- | --------- | -------------------- | ---------------------------------------------------------------------- |
| 2026-09-30 | 0.1       | Codex / chờ review   | SRS đề xuất                                                            |
| 2026-09-30 | 0.2       | Codex / chờ review   | Thêm baseline Docker, disk/path/process controls và nghiệm thu đo được |
