import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Student {
  id: string;
  enrollment_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  semester: number;
  admission_year: number;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  is_active: boolean;
  created_at: string;
  departments?: Department | null;
}

export function useStudents(departmentId?: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        let query = supabase
          .from('students')
          .select('*, departments(id, name, code)')
          .order('full_name');

        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }

        const { data, error } = await query;

        if (error) throw error;
        setStudents((data as Student[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [departmentId]);

  return { students, loading, error, refetch: () => setLoading(true) };
}
