export type ProblemPublishStatus = 'DRAFT' | 'PUBLISHED' | 'ON_HOLD';

/** Thông tin tối thiểu về một Problem để Course hiển thị, kiểm readiness và chính sách thêm. */
export interface ProblemSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly problemType: string;
  readonly difficulty: string;
  readonly publishStatus: ProblemPublishStatus;
  readonly isDeleted: boolean;
  readonly createdBy: string;
}

/**
 * Port hẹp, chỉ đọc, tới module `problems` (ProblemReferenceReader). Không trả nội dung đề, Test Case
 * hay harness. Problem không tồn tại không có mặt trong kết quả.
 */
export interface CourseProblemCatalog {
  findByIds(ids: readonly string[]): Promise<ReadonlyMap<string, ProblemSummary>>;
}
