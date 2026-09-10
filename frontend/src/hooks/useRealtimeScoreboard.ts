import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to Supabase Realtime postgres changes on solves, score_events, and teams.
 * Automatically invalidates and updates scoreboard queries when solves occur or scores change.
 */
export function useRealtimeScoreboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for changes on solves, score_events, and teams
    const channel = supabase
      .channel('public:scoreboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solves' },
        (payload) => {
          console.log('[Realtime] Solve table change detected, refreshing scoreboard:', payload);
          queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
          queryClient.invalidateQueries({ queryKey: ['challenges'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_events' },
        (payload) => {
          console.log('[Realtime] Score event change detected, refreshing ledger:', payload);
          queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
          queryClient.invalidateQueries({ queryKey: ['team-score-history'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        (payload) => {
          console.log('[Realtime] Team score/data change detected, refreshing scoreboard:', payload);
          queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
