import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PublicSettingsController } from './public-settings.controller';

@Module({
  controllers: [AdminController, PublicSettingsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
