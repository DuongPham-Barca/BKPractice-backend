export interface ProblemReferenceInfo {
  readonly publishStatus: 'DRAFT' | 'PUBLISHED' | 'ON_HOLD' | undefined;
  readonly isDeleted: boolean | undefined;
  readonly createdBy: string | undefined;
}

export interface ProblemReferenceReader {
  getProblemReference(problemId: string): Promise<ProblemReferenceInfo>;
}
