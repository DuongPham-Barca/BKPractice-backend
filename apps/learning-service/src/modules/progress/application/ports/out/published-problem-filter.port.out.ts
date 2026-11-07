export interface PublishedProblemFilter {
  findPublishedIds(problemIds: readonly string[]): Promise<ReadonlySet<string>>;
}
