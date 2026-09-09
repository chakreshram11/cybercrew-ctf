import { IScoringStrategy } from '../scoring-strategy.interface';

export class StaticScoringStrategy implements IScoringStrategy {
  calculatePoints(
    basePoints: number,
    _minimumPoints: number,
    _solvesCount: number,
  ): number {
    return basePoints;
  }
}
