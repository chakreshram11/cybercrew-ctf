import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Challenge, Category } from '../../types';
import { ChallengeCard } from '../../components/challenges/ChallengeCard';
import { ChallengeModal } from '../../components/challenges/ChallengeModal';
import { Flag, Search, Filter, Terminal, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const ChallengesPage: React.FC = () => {
  const { user, team } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
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

  // Fetch Challenges
  const {
    data: challengesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await api.get<Challenge[]>('/challenges');
      return res.success && res.data ? res.data : [];
    },
  });

  const categories = categoriesData || [];
  const challenges = challengesData || [];

  // Filter challenges
  const filteredChallenges = challenges.filter((c) => {
    // Category match
    if (selectedCategory !== 'ALL' && c.category_id !== selectedCategory && c.challenge_type !== selectedCategory) {
      return false;
    }
    // Difficulty match
    if (selectedDifficulty !== 'ALL' && c.difficulty !== selectedDifficulty) {
      return false;
    }
    // Solve status
    if (solveStatusFilter === 'SOLVED' && !c.is_solved) return false;
    if (solveStatusFilter === 'UNSOLVED' && c.is_solved) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      const matchCat = c.category?.name.toLowerCase().includes(q) || false;
      if (!matchName && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const totalPoints = challenges.reduce((acc, c) => acc + (c.current_points || c.base_points), 0);
  const solvedChallenges = challenges.filter((c) => c.is_solved);
  const solvedPoints = solvedChallenges.reduce((acc, c) => acc + (c.current_points || c.base_points), 0);

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
              <span className="font-bold text-emerald-400">
                {solvedChallenges.length} / {challenges.length}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px]">POINTS</span>
              <span className="font-bold text-cyan-400">
                {solvedPoints} / {totalPoints}
              </span>
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

      {/* Filter and Search Bar */}
      <div className="space-y-4">
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

          {/* Difficulty Dropdown */}
          <div className="flex items-center gap-2">
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
                className={`px-2.5 py-1.5 rounded-md ${
                  solveStatusFilter === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSolveStatusFilter('UNSOLVED')}
                className={`px-2.5 py-1.5 rounded-md ${
                  solveStatusFilter === 'UNSOLVED'
                    ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unsolved
              </button>
              <button
                onClick={() => setSolveStatusFilter('SOLVED')}
                className={`px-2.5 py-1.5 rounded-md ${
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

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-md border transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-cyan-400 text-slate-950 border-cyan-400 font-bold shadow-sm shadow-cyan-500/30'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            All Disciplines
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-md border transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-cyan-400 text-slate-950 border-cyan-400 font-bold shadow-sm shadow-cyan-500/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Challenges Grid */}
      {isLoading ? (
        <div className="py-24 text-center font-mono text-cyan-400 text-sm flex items-center justify-center gap-2">
          <Terminal className="w-5 h-5 animate-spin" />
          <span>QUERYING CHALLENGE CATALOG...</span>
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-slate-800 bg-[#090e1c] p-8">
          <Filter className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-mono font-bold text-slate-300 mb-1">NO CHALLENGES FOUND</h3>
          <p className="text-xs text-slate-500 font-mono">
            Try adjusting your category or difficulty filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onClick={() => setActiveChallenge(challenge)}
            />
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
            refetch();
          }}
        />
      )}
    </div>
  );
};
