export interface Principal {
  readonly userId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}
