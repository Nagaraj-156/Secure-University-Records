import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge function for retrieving student data with decryption

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('ENCRYPTION_KEY');
  if (!keyString) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function decrypt(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );
  
  return new TextDecoder().decode(decrypted);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      console.error('Auth failed:', userError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    console.log(`User authenticated: ${userId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const studentId = url.searchParams.get('student_id');
    const dataType = url.searchParams.get('type') || 'all';

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const role = userRole?.role || 'student';
    console.log(`Role: ${role}, Type: ${dataType}`);

    let allowedStudentIds: string[] = [];

    if (role === 'admin' || role === 'exam_cell') {
      if (studentId) {
        allowedStudentIds = [studentId];
      } else {
        const { data: students } = await supabase.from('students').select('id');
        allowedStudentIds = students?.map(s => s.id) || [];
      }
    } else if (role === 'faculty') {
      const { data: assignments } = await supabase
        .from('faculty_assignments')
        .select('department_id')
        .eq('faculty_user_id', userId);
      
      const deptIds = assignments?.map(a => a.department_id) || [];
      
      if (deptIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id')
          .in('department_id', deptIds);
        
        if (studentId && students?.some(s => s.id === studentId)) {
          allowedStudentIds = [studentId];
        } else if (!studentId) {
          allowedStudentIds = students?.map(s => s.id) || [];
        }
      }
    } else {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (student) {
        allowedStudentIds = [student.id];
      }
    }

    if (allowedStudentIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No access' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: Record<string, unknown> = {};

    if (dataType === 'marks' || dataType === 'all') {
      let marksQuery = supabase
        .from('student_marks')
        .select('*, students(full_name, enrollment_number)')
        .in('student_id', allowedStudentIds);
      
      if (role === 'student') {
        marksQuery = marksQuery.eq('is_published', true);
      }

      const { data: marks } = await marksQuery;
      
      if (marks && marks.length > 0) {
        result.marks = await Promise.all(marks.map(async (mark) => {
          try {
            const decrypted = await decrypt(mark.marks_encrypted);
            const { marks: actualMarks } = JSON.parse(decrypted);
            return { ...mark, marks_encrypted: '[ENCRYPTED]', marks: actualMarks };
          } catch {
            return { ...mark, marks_encrypted: '[ENCRYPTED]', marks: null };
          }
        }));
      } else {
        result.marks = [];
      }
    }

    if (dataType === 'attendance' || dataType === 'all') {
      const { data: attendance } = await supabase
        .from('student_attendance')
        .select('*, students(full_name, enrollment_number)')
        .in('student_id', allowedStudentIds);
      
      if (attendance && attendance.length > 0) {
        result.attendance = await Promise.all(attendance.map(async (att) => {
          try {
            const decrypted = await decrypt(att.status_encrypted);
            const { status } = JSON.parse(decrypted);
            return { ...att, status_encrypted: '[ENCRYPTED]', status };
          } catch {
            return { ...att, status_encrypted: '[ENCRYPTED]', status: null };
          }
        }));
      } else {
        result.attendance = [];
      }
    }

    if (dataType === 'certificates' || dataType === 'all') {
      const { data: certificates } = await supabase
        .from('certificates')
        .select('*, students(full_name, enrollment_number)')
        .in('student_id', allowedStudentIds);
      
      if (certificates && certificates.length > 0) {
        result.certificates = await Promise.all(certificates.map(async (cert) => {
          try {
            const decrypted = await decrypt(cert.certificate_data_encrypted);
            return { ...cert, certificate_data_encrypted: '[ENCRYPTED]', certificate_data: JSON.parse(decrypted) };
          } catch {
            return { ...cert, certificate_data_encrypted: '[ENCRYPTED]', certificate_data: null };
          }
        }));
      } else {
        result.certificates = [];
      }
    }

    const totalRecords = 
      (result.marks as unknown[] || []).length + 
      (result.attendance as unknown[] || []).length + 
      (result.certificates as unknown[] || []).length;

    if (totalRecords > 0) {
      await supabase.from('encryption_events').insert({
        user_id: userId,
        event_type: 'decrypt',
        table_name: dataType,
        record_count: totalRecords,
        success: true,
      });
    }

    console.log(`Retrieved ${totalRecords} records`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
