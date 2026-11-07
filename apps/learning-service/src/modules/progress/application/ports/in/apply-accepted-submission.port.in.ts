export interface IApplyAcceptedSubmissionPortIn {
  execute(event: unknown): Promise<'APPLIED' | 'DUPLICATE'>;
}

export const APPLY_ACCEPTED_SUBMISSION_PORT_IN = Symbol('APPLY_ACCEPTED_SUBMISSION_PORT_IN');
