export type UserRole =
  | 'PARTICIPANT'
  | 'TEAM_CAPTAIN'
  | 'CHALLENGE_AUTHOR'
  | 'MODERATOR'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export type ChallengeType =
  | 'STATIC'
  | 'WEB'
  | 'NETWORK'
  | 'PWN'
  | 'REVERSE'
  | 'CRYPTO'
  | 'FORENSICS'
  | 'OSINT'
  | 'LINUX'
  | 'WINDOWS'
  | 'MOBILE'
  | 'CLOUD'
  | 'AI_SECURITY'
  | 'MISC';

export type ChallengeStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ACTIVE'
  | 'DISABLED'
  | 'ARCHIVED';

export type EventState =
  | 'DRAFT'
  | 'REGISTRATION_OPEN'
  | 'UPCOMING'
  | 'LIVE'
  | 'ENDED'
  | 'ARCHIVED';

export type ScoreEventType =
  | 'CHALLENGE_SOLVE'
  | 'HINT_PURCHASE'
  | 'FIRST_BLOOD'
  | 'ADMIN_ADJUSTMENT'
  | 'BONUS'
  | 'PENALTY';

export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url?: string | null;
  role: UserRole;
  is_active: boolean;
  team_id?: string | null;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'CAPTAIN' | 'MEMBER';
  joined_at: string;
  user?: User;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  invite_code?: string;
  captain_id: string;
  score: number;
  rank?: number;
  solves_count?: number;
  members?: TeamMember[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  challenges_count?: number;
}

export interface ChallengeFile {
  id: string;
  challenge_id: string;
  file_name: string;
  file_size: number;
  file_path: string;
  mime_type: string;
  created_at: string;
}

export interface ChallengeTarget {
  id: string;
  challenge_id: string;
  target_url?: string | null;
  target_host?: string | null;
  target_port?: number | null;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'UDP' | 'SSH';
}

export interface ChallengeHint {
  id: string;
  challenge_id: string;
  title: string;
  cost: number;
  display_order: number;
  is_active: boolean;
  is_unlocked?: boolean;
  content?: string; // Content is null/undefined until unlocked
}

export interface Challenge {
  id: string;
  category_id: string;
  category?: Category;
  name: string;
  slug: string;
  description: string;
  difficulty: ChallengeDifficulty;
  challenge_type: ChallengeType;
  base_points: number;
  current_points: number;
  minimum_points: number;
  first_blood_bonus: number;
  author_id?: string;
  author_name?: string;
  status: ChallengeStatus;
  is_published: boolean;
  is_active: boolean;
  max_attempts: number;
  submission_cooldown_seconds: number;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  container_enabled: boolean;
  solves_count: number;
  is_solved?: boolean;
  has_first_blood?: boolean;
  first_blood_team?: {
    id: string;
    name: string;
  } | null;
  hints?: ChallengeHint[];
  files?: ChallengeFile[];
  target?: ChallengeTarget | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  challenge_id: string;
  challenge_name?: string;
  team_id: string;
  team_name?: string;
  user_id: string;
  user_name?: string;
  is_correct: boolean;
  submitted_at: string;
}

export interface Solve {
  id: string;
  challenge_id: string;
  challenge?: Challenge;
  team_id: string;
  team?: Team;
  user_id: string;
  points_awarded: number;
  is_first_blood: boolean;
  solved_at: string;
}

export interface ScoreEvent {
  id: string;
  team_id: string;
  event_type: ScoreEventType;
  points: number;
  challenge_id?: string | null;
  challenge_name?: string;
  hint_id?: string | null;
  description: string;
  created_at: string;
}

export interface ScoreboardEntry {
  rank: number;
  team_id: string;
  team_name: string;
  team_slug: string;
  score: number;
  solves_count: number;
  first_bloods_count: number;
  last_solve_at?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  is_published: boolean;
  published_at: string;
  created_at: string;
}

export interface CompetitionSettings {
  ctf_name: string;
  description: string;
  start_date: string;
  end_date: string;
  timezone: string;
  state: EventState;
  registration_open: boolean;
  max_team_size: number;
  min_team_size: number;
  allow_negative_scores: boolean;
  dynamic_scoring_enabled: boolean;
  first_blood_enabled: boolean;
  hints_enabled: boolean;
  scoreboard_frozen: boolean;
  freeze_time?: string | null;
  submission_rate_limit: number;
}
