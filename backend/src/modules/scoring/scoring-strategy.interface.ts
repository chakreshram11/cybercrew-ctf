export interface IScoringStrategy {
  calculatePoints(
    basePoints: number,
    minimumPoints: number,
    solvesCount: number,
    decayThreshold?: number,
  ): number;
}
