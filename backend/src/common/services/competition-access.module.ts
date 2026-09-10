import { Module, Global } from '@nestjs/common';
import { CompetitionAccessService } from './competition-access.service';

@Global()
@Module({
  providers: [CompetitionAccessService],
  exports: [CompetitionAccessService],
})
export class CompetitionAccessModule {}
