import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to Supabase Realtime postgres changes on solves and score_events.
 * Automatically invalidates and updates scoreboard queries when solves occur (Section 73).
 */
export function useRealtimeScoreboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for new solves and score events
    const channel = supabase
      .channel('public:scoreboard-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'solves' },
        (payload) => {
          console.log('[Realtime] Solve detected, refreshing scoreboard:', payload);
          queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
          queryClient.invalidateQueries({ queryKey: ['challenges'] });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'score_events' },
        (payload) => {
          console.log('[Realtime] Score event recorded, refreshing ledger:', payload);
          queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
          queryClient.invalidateQueries({ queryKey: ['team-score-history'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
