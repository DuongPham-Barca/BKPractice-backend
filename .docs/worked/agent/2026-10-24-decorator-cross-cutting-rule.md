# 2026-10-24 — Rule dùng decorator cho cross-cutting concern

- Author: OpenCode agent, theo yêu cầu của chủ repo
- Scope: Tài liệu + cấu hình build/test. Thêm rule vào `.docs/agent/working-agreement.md`, thêm path
  alias trong `tsconfig.json` và `jest.config.ts`; không đụng source, dependency hay migration.

## Spec and plan

- Spec: N/A — thay đổi tài liệu quy trình, được người dùng yêu cầu tường minh.
- Plan: N/A — áp dụng mục "Documentation-only work" của working agreement.
- Tasks: N/A.
- Spec status at start: N/A — không có feature spec cho thay đổi quy trình này.

## Questions clarified

| Question                   | Conclusion                                                                                                                     | Source                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Rule yêu cầu điều gì?      | Phải dùng decorator `@...` cho cross-cutting concern lấy từ transport context; không được dùng `../..` để import từ file khác. | Người dùng, 2026-10-24: "lập rule phải dùng decoratot @ không cho import bằng cách ../.." |
| Có cần feature spec không? | Không; đây là thay đổi tài liệu quy trình do người dùng yêu cầu, lý do được ghi tại đây thay cho spec.                         | `.docs/agent/working-agreement.md` step 1 và mục "Documentation-only work"                |
| "Viết vào tsconfig" là gì? | Thêm path alias service trong `tsconfig.json` và mapping tương ứng trong `jest.config.ts` để code import không cần `../..`.    | Người dùng chọn "Thêm path alias vào tsconfig + jest", 2026-10-24                         |

## What was done

Thêm mục "Use decorators for cross-cutting concerns" vào phần "How to write code" của
`.docs/agent/working-agreement.md`. Rule nói rằng khi handler hoặc consumer cần một giá trị
cross-cutting từ transport context (ví dụ trusted principal), phải định nghĩa nó thành decorator
(`@...`) và gắn ở boundary. Không được dùng deep relative import như `../../common/...` để lấy
cross-cutting concern từ file khác; thay vào đó dùng path alias của repo.

Thêm path alias cho từng service vào `tsconfig.json` (`@gateway/*`, `@identity/*`, `@learning/*`,
`@submission/*`, `@judge/*`, `@community/*`) và mapping tương ứng trong `jest.config.ts`, để code có
thể import shared/cross-cutting code bằng alias thay vì `../..`.

## Why these choices

- **Decorator thay vì đọc header thủ công:** plan COM-001-T004 đã định hướng `@TrustedPrincipal()` ở
  `common/auth/trusted-principal.decorator.ts`; rule này biến định hướng đó thành quy tắc chung cho
  mọi cross-cutting concern ở transport boundary.
- **Cấm `../../` cho cross-cutting concern:** deep import buộc handler biết cấu trúc thư mục của module
  khác và dễ vỡ khi file được di chuyển; decorator giữ concern ở boundary và cho phép tái dùng.
- **Chỉ sửa working agreement, không sửa AGENTS.md:** AGENTS.md là bản đồ, còn working agreement là nơi
  chứa quy tắc viết code ("How to write code").
- **Thêm path alias vào tsconfig + jest:** rule cấm `../..` chỉ dùng được nếu có đường import thay
  thế; alias theo service cho phép handler lấy `common/` của chính service mà không phụ thuộc độ sâu
  thư mục. Mapping trong jest giữ test resolve cùng đường dẫn với TypeScript.

## How the feature works

Đây không phải tính năng sản phẩm. Đây là thay đổi quy trình: từ nay, khi viết code TypeScript trong
repo, agent áp dụng rule mới ở bước 4 (Implement) của working agreement. Code dùng `../..` để lấy một
cross-cutting concern từ file khác bị coi là không tuân thủ "How to write code".

## Configuration

- `tsconfig.json`: thêm các key `paths` `@gateway/*` → `apps/api-gateway/src/*`, `@identity/*` →
  `apps/identity-service/src/*`, `@learning/*` → `apps/learning-service/src/*`, `@submission/*` →
  `apps/submission-service/src/*`, `@judge/*` → `apps/judge-service/src/*`, `@community/*` →
  `apps/community-service/src/*`. Ý nghĩa: cho phép import trong service bằng alias, không cần `../..`.
  Thêm `jest.config.ts` vào `include` để lint-staged và `pnpm typecheck` phủ file cấu hình này.
- `jest.config.ts`: thêm các key `moduleNameMapper` tương ứng cho sáu alias trên để jest resolve giống
  TypeScript.

## Verification

- Commands run and their results: `pnpm exec prettier --check tsconfig.json jest.config.ts
.docs/agent/working-agreement.md .docs/worked/agent/2026-10-24-decorator-cross-cutting-rule.md` pass;
  `pnpm typecheck` pass; `pnpm test` pass (2 suites, 2 tests).
- Not verified: rule chưa được áp dụng vào code; các alias chưa được dùng ở source hiện tại nên build
  webpack không đổi hành vi.

## Remaining

- Not done: chưa commit.
- Risks: rule chỉ giới hạn ở cross-cutting concern, không cấm toàn bộ relative import, nên các import
  `../..` hiện có trong entity (quan hệ TypeORM) vẫn hợp lệ.
