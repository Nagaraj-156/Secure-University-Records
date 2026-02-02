import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EncryptionEvent {
  id: number;
  user_id: string | null;
  event_type: string;
  table_name: string;
  record_count: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export function useEncryptionEvents(limit = 50) {
  const [events, setEvents] = useState<EncryptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('encryption_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    // Set up realtime subscription
    const channel = supabase
      .channel('encryption-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'encryption_events',
        },
        (payload) => {
          console.log('New encryption event:', payload);
          setEvents((prev) => [payload.new as EncryptionEvent, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { events, loading, error };
}
