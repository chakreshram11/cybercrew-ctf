import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Subscribes to Supabase Realtime postgres changes on announcements table.
 * Automatically invalidates announcements queries when broadcasts are published (Section 73).
 */
export function useRealtimeAnnouncements() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('public:announcements-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        (payload) => {
          console.log('[Realtime] Announcement updated, refreshing feed:', payload);
          queryClient.invalidateQueries({ queryKey: ['announcements'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
