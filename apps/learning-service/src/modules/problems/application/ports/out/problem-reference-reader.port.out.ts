export interface ProblemReferenceInfo {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly problemType: string;
  readonly difficulty: string;
  readonly publishStatus: 'DRAFT' | 'PUBLISHED' | 'ON_HOLD';
  readonly isDeleted: boolean;
  readonly createdBy: string;
}

/**
 * API công khai, chỉ đọc, của module `problems` cho module khác (hiện là `courses`). Không trả nội
 * dung đề, Test Case hay harness. ID không tồn tại không có mặt trong kết quả.
 */
export interface ProblemReferenceReader {
  getProblemReferences(problemIds: readonly string[]): Promise<readonly ProblemReferenceInfo[]>;
}
