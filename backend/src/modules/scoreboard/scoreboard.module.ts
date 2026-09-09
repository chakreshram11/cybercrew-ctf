import { Module } from '@nestjs/common';
import { ScoreboardService } from './scoreboard.service';
import { ScoreboardController } from './scoreboard.controller';

@Module({
  controllers: [ScoreboardController],
  providers: [ScoreboardService],
  exports: [ScoreboardService],
})
export class ScoreboardModule {}
