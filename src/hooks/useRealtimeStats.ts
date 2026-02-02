import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  total_students: number;
  total_encrypted_records: number;
  total_departments: number;
  active_users: number;
  last_key_rotation: string | null;
  updated_at: string;
}

export function useRealtimeStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('dashboard_stats_cache')
          .select('*')
          .eq('id', 1)
          .single();

        if (error) throw error;
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up realtime subscription
    const channel = supabase
      .channel('dashboard-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dashboard_stats_cache',
        },
        (payload) => {
          console.log('Dashboard stats updated:', payload);
          if (payload.new) {
            setStats(payload.new as DashboardStats);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { stats, loading, error };
}
