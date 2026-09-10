import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Challenge, Category, TeamProgress } from '../../types';
import { ChallengeCard } from '../../components/challenges/ChallengeCard';
import { ChallengeModal } from '../../components/challenges/ChallengeModal';
import { Flag, Search, Filter, Terminal, ShieldAlert, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeChallenges } from '../../hooks/useRealtimeChallenges';

export const ChallengesPage: React.FC = () => {
  const { user, team } = useAuth();
  const queryClient = useQueryClient();
  useRealtimeChallenges();

  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [solveStatusFilter, setSolveStatusFilter] = useState<'ALL' | 'SOLVED' | 'UNSOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      return res.success && res.data ? res.data : [];
    },
  });

  // Fetch Team Progress
  const {
    data: progressData,
    isLoading: isProgressLoading,
    isError: isProgressError,
    refetch: refetchProgress,
  } = useQuery({
    queryKey: ['team-progress', team?.id],
    queryFn: async () => {
      if (!team) return null;
      const res = await api.get<TeamProgress>('/teams/me/progress');
      return res.success && res.data ? res.data : null;
    },
    enabled: !!team,
  });

  // Fetch Challenges
  const {
    data: challengesData,
    isLoading: isChallengesLoading,
    isError: isChallengesError,
    refetch: refetchChallenges,
  } = useQuery({
    queryKey: ['challenges', team?.id],
    queryFn: async () => {
      const res = await api.get<Challenge[]>('/challenges');
      return res.success && res.data ? res.data : [];
    },
  });

  const categories = categoriesData || [];
  const rawChallenges = challengesData || [];

  // Derived set of team-solved challenge IDs (from progress endpoint or challenge fields)
  const solvedChallengeIds = new Set<string>(
    progressData?.solved_challenge_ids ||
      rawChallenges.filter((c) => c.is_solved).map((c) => c.id)
  );

  // Attach accurate team-specific solve status to challenges
  const challenges: Challenge[] = rawChallenges.map((c) => ({
    ...c,
    is_solved: !!c.is_solved || solvedChallengeIds.has(c.id),
  }));

  // Dynamic calculation of team progress metrics
  const solvedCount = progressData
    ? progressData.solved_count
    : challenges.filter((c) => c.is_solved).length;
  const totalChallenges = progressData
    ? progressData.total_challenges
    : challenges.length;
  const earnedPoints = progressData
    ? progressData.earned_points
    : (team?.score ?? 0);
  const totalPossiblePoints = progressData
    ? progressData.total_possible_points
    : challenges.reduce((acc, c) => acc + (c.base_points || 500), 0);

  // Filter challenges across difficulty, solve status, and search query simultaneously
  const filteredChallenges = challenges.filter((c) => {
    // Difficulty match
    if (selectedDifficulty !== 'ALL' && c.difficulty !== selectedDifficulty) {
      return false;
    }

    // Solve status match for authenticated team
    const isSolved = c.is_solved;
    if (solveStatusFilter === 'SOLVED' && !isSolved) return false;
    if (solveStatusFilter === 'UNSOLVED' && isSolved) return false;

    // Search query match against name, description, category name, or slug
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = c.name.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchCat =
        c.category?.name.toLowerCase().includes(q) ||
        c.challenge_type.toLowerCase().includes(q);
      const matchSlug = c.slug.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchCat && !matchSlug) return false;
    }

    return true;
  });

  // Dynamically group challenges by category
  interface CategoryGroup {
    id: string;
    name: string;
    challenges: Challenge[];
  }

  const categoryGroups: CategoryGroup[] = [];
  const processedChallengeIds = new Set<string>();

  // 1. Group by known categories from database (preserving category display_order)
  categories.forEach((cat) => {
    const matchingChallenges = filteredChallenges.filter((c) => {
      const match =
        c.category_id === cat.id ||
        c.category?.id === cat.id ||
        (c.category?.name && c.category.name.toLowerCase() === cat.name.toLowerCase());
      if (match) {
        processedChallengeIds.add(c.id);
      }
      return match;
    });

    if (matchingChallenges.length > 0) {
      categoryGroups.push({
        id: cat.id,
        name: cat.name,
        challenges: matchingChallenges,
      });
    }
  });

  // 2. Fallback: Group any remaining challenges by category name or challenge_type if not matched above
  const remainingChallenges = filteredChallenges.filter((c) => !processedChallengeIds.has(c.id));

  if (remainingChallenges.length > 0) {
    const fallbackMap = new Map<string, Challenge[]>();
    remainingChallenges.forEach((c) => {
      const typeName = c.category?.name || c.challenge_type || 'MISCELLANEOUS';
      if (!fallbackMap.has(typeName)) {
        fallbackMap.set(typeName, []);
      }
      fallbackMap.get(typeName)!.push(c);
    });

    fallbackMap.forEach((chals, typeName) => {
      categoryGroups.push({
        id: typeName,
        name: typeName,
        challenges: chals,
      });
    });
  }

  const handleResetFilters = () => {
    setSelectedDifficulty('ALL');
    setSolveStatusFilter('ALL');
    setSearchQuery('');
  };

  const handleSolveSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['challenges'] });
    queryClient.invalidateQueries({ queryKey: ['team-progress'] });
    queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
    refetchChallenges();
    refetchProgress();
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flag className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-mono font-bold text-white tracking-wide">CHALLENGE ARENA</h1>
          </div>
          <p className="text-xs font-mono text-slate-400">
            SYSTEM DISCLOSURE PROTOCOL • DISCOVER AND SUBMIT VALID FLAGS
          </p>
        </div>

        {/* User / Team Solve Progress */}
        {team ? (
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">TEAM PROGRESS</span>
              <span className="font-bold text-cyan-400">{team.name}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px]">SOLVED</span>
              {isProgressLoading && !progressData ? (
                <span className="font-bold text-slate-500">— / —</span>
              ) : isProgressError ? (
                <span className="font-bold text-rose-400">Error</span>
              ) : (
                <span className="font-bold text-emerald-400">
                  {solvedCount} / {totalChallenges}
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px]">POINTS</span>
              {isProgressLoading && !progressData ? (
                <span className="font-bold text-slate-500">— / —</span>
              ) : isProgressError ? (
                <span className="font-bold text-rose-400">Error</span>
              ) : (
                <span className="font-bold text-cyan-400">
                  {earnedPoints} / {totalPossiblePoints}
                </span>
              )}
            </div>
          </div>
        ) : (
          !user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
              <ShieldAlert className="w-4 h-4" />
              <span>Login to submit flags and earn points</span>
            </div>
          )
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search challenges by name, topic, or keyword..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Difficulty & Solve Status Controls */}
        <div className="flex items-center gap-2">
          {/* Difficulty Dropdown */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
            <option value="EXPERT">Expert</option>
          </select>

          {/* Solve status buttons */}
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900/80 p-0.5 text-xs font-mono">
            <button
              onClick={() => setSolveStatusFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                solveStatusFilter === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSolveStatusFilter('UNSOLVED')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                solveStatusFilter === 'UNSOLVED'
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unsolved
            </button>
            <button
              onClick={() => setSolveStatusFilter('SOLVED')}
              className={`px-2.5 py-1.5 rounded-md transition-colors ${
                solveStatusFilter === 'SOLVED'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Solved
            </button>
          </div>
        </div>
      </div>

      {/* Challenges Content - Grouped by Category */}
      {isChallengesLoading ? (
        <div className="py-24 text-center font-mono text-cyan-400 text-sm flex items-center justify-center gap-2">
          <Terminal className="w-5 h-5 animate-spin" />
          <span>QUERYING CHALLENGE CATALOG...</span>
        </div>
      ) : isChallengesError ? (
        <div className="py-20 text-center rounded-2xl border border-rose-500/30 bg-[#090e1c] p-8">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-mono font-bold text-rose-300 mb-1">FAILED TO LOAD CHALLENGES</h3>
          <p className="text-xs text-slate-500 font-mono mb-4">
            Unable to connect to the challenge repository.
          </p>
          <button
            onClick={() => refetchChallenges()}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs font-bold transition-colors"
          >
            RETRY QUERY
          </button>
        </div>
      ) : categoryGroups.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-slate-800 bg-[#090e1c] p-8">
          <Filter className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-mono font-bold text-slate-300 mb-1">NO CHALLENGES FOUND</h3>
          <p className="text-xs text-slate-500 font-mono mb-4">
            No challenges match your selected search or filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs font-bold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET FILTERS</span>
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {categoryGroups.map((group) => (
            <section key={group.id} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                  <h2 className="text-lg font-mono font-bold text-white tracking-wider uppercase">
                    {group.name}
                  </h2>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/30">
                  {group.challenges.length} {group.challenges.length === 1 ? 'CHALLENGE' : 'CHALLENGES'}
                </span>
              </div>

              {/* Challenge Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.challenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onClick={() => setActiveChallenge(challenge)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Challenge Modal */}
      {activeChallenge && (
        <ChallengeModal
          challenge={activeChallenge}
          isOpen={!!activeChallenge}
          onClose={() => setActiveChallenge(null)}
          onSolveSuccess={() => {
            handleSolveSuccess();
          }}
        />
      )}
    </div>
  );
};
