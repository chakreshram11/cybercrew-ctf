export interface AppConfig {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  corsOrigin: string;
  productionDomain: string;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
    jwtSecret: string;
  };
  security: {
    flagSecretSalt: string;
    throttleTtl: number;
    throttleLimit: number;
    submissionThrottleTtl: number;
    submissionThrottleLimit: number;
  };
  files: {
    maxFileSizeMb: number;
    maxFilesPerChallenge: number;
  };
  redis: {
    url?: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  productionDomain: process.env.PRODUCTION_DOMAIN || 'https://ctf.cybercrew.online',
  supabase: {
    url: process.env.SUPABASE_URL || 'https://placeholder-ctf.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || 'placeholder-jwt-secret-min-32-chars',
  },
  security: {
    flagSecretSalt:
      process.env.FLAG_SECRET_SALT || 'default-salt-for-dev-only-min-32-characters-long',
    throttleTtl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
    submissionThrottleTtl: parseInt(process.env.SUBMISSION_THROTTLE_TTL || '60', 10),
    submissionThrottleLimit: parseInt(process.env.SUBMISSION_THROTTLE_LIMIT || '10', 10),
  },
  files: {
    maxFileSizeMb: parseInt(process.env.MAX_CHALLENGE_FILE_SIZE_MB || '100', 10),
    maxFilesPerChallenge: parseInt(process.env.MAX_CHALLENGE_FILES || '20', 10),
  },
  redis: {
    url: process.env.REDIS_URL,
  },
});
