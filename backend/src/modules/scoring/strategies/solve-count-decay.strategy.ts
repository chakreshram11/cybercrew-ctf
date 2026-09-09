import { IScoringStrategy } from '../scoring-strategy.interface';

export class SolveCountDecayStrategy implements IScoringStrategy {
  /**
   * Logarithmic point decay formula based on solve count.
   * Decreases smoothly from basePoints down to minimumPoints as more squads solve.
   */
  calculatePoints(
    basePoints: number,
    minimumPoints: number,
    solvesCount: number,
    decayThreshold = 30,
  ): number {
    if (solvesCount <= 1) {
      return basePoints;
    }

    if (basePoints <= minimumPoints) {
      return minimumPoints;
    }

    // Parabolic / logarithmic ratio clamped to [0, 1]
    const ratio = Math.min(
      1,
      Math.max(0, (solvesCount - 1) / Math.max(1, decayThreshold - 1)),
    );

    const points = Math.round(
      basePoints - (basePoints - minimumPoints) * Math.sqrt(ratio),
    );

    return Math.max(minimumPoints, points);
  }
}
