import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

import configuration from './config/configuration';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Core Modules
import { SupabaseModule } from './modules/supabase/supabase.module';
import { CompetitionAccessModule } from './common/services/competition-access.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { HintsModule } from './modules/hints/hints.module';
import { FilesModule } from './modules/files/files.module';
import { ScoreboardModule } from './modules/scoreboard/scoreboard.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { BadgesModule } from './modules/badges/badges.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      load: [configuration],
    }),

    // Rate Limiting (Protects against brute force flag submissions & DoS)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: (configService.get<number>('security.throttleTtl') || 60) * 1000,
          limit: configService.get<number>('security.throttleLimit') || 60,
        },
      ],
    }),

    // Infrastructure & Services
    SupabaseModule,
    CompetitionAccessModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    CategoriesModule,
    ChallengesModule,
    ScoringModule,
    SubmissionsModule,
    HintsModule,
    FilesModule,
    ScoreboardModule,
    AnnouncementsModule,
    BadgesModule,
    AdminModule,
  ],
  providers: [
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT Authentication Guard (respects @Public())
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global RBAC Roles Guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global Response Envelope Interceptor ({ success: true, data: ... })
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global Exception Filter (Zero stack-trace leakage, sanitized messages)
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
