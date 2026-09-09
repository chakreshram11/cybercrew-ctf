import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to Supabase Realtime postgres_changes on the challenges table.
 * Automatically invalidates challenge catalog, admin inventory, and team progress
 * queries whenever a challenge is created, modified, or deleted (Section 73).
 */
export function useRealtimeChallenges() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('public:challenges-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenges' },
        (payload) => {
          console.log('[Realtime] Challenge catalog change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['challenges'] });
          queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
          queryClient.invalidateQueries({ queryKey: ['team-progress'] });
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
          queryClient.invalidateQueries({ queryKey: ['scoreboard'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
