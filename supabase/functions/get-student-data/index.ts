import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// AES-256 decryption using Web Crypto API
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
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const studentId = url.searchParams.get('student_id');
    const dataType = url.searchParams.get('type') || 'all'; // 'marks', 'attendance', 'certificates', 'all'

    // Get user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const role = userRole?.role || 'student';
    console.log(`Get student data: user=${user.id}, role=${role}, student=${studentId}, type=${dataType}`);

    // Determine which student(s) the user can access
    let allowedStudentIds: string[] = [];

    if (role === 'admin' || role === 'exam_cell') {
      // Admin and exam_cell can access all students
      if (studentId) {
        allowedStudentIds = [studentId];
      } else {
        const { data: students } = await supabase.from('students').select('id');
        allowedStudentIds = students?.map(s => s.id) || [];
      }
    } else if (role === 'faculty') {
      // Faculty can access students in their assigned departments
      const { data: assignments } = await supabase
        .from('faculty_assignments')
        .select('department_id')
        .eq('faculty_user_id', user.id);
      
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
    } else if (role === 'student') {
      // Students can only access their own data
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (student) {
        allowedStudentIds = [student.id];
      }
    }

    if (allowedStudentIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No access to student data' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: Record<string, unknown> = {};

    // Fetch and decrypt marks
    if (dataType === 'marks' || dataType === 'all') {
      let marksQuery = supabase
        .from('student_marks')
        .select('*, students(full_name, enrollment_number)')
        .in('student_id', allowedStudentIds);
      
      // Students can only see published marks
      if (role === 'student') {
        marksQuery = marksQuery.eq('is_published', true);
      }

      const { data: marks } = await marksQuery;
      
      if (marks && marks.length > 0) {
        result.marks = await Promise.all(marks.map(async (mark) => {
          try {
            const decrypted = await decrypt(mark.marks_encrypted);
            const { marks: actualMarks } = JSON.parse(decrypted);
            return {
              ...mark,
              marks_encrypted: '[ENCRYPTED]', // Don't expose encrypted data
              marks: actualMarks,
            };
          } catch {
            return { ...mark, marks_encrypted: '[ENCRYPTED]', marks: null, decryption_error: true };
          }
        }));
      } else {
        result.marks = [];
      }
    }

    // Fetch and decrypt attendance
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
            return {
              ...att,
              status_encrypted: '[ENCRYPTED]',
              status,
            };
          } catch {
            return { ...att, status_encrypted: '[ENCRYPTED]', status: null, decryption_error: true };
          }
        }));
      } else {
        result.attendance = [];
      }
    }

    // Fetch and decrypt certificates
    if (dataType === 'certificates' || dataType === 'all') {
      const { data: certificates } = await supabase
        .from('certificates')
        .select('*, students(full_name, enrollment_number)')
        .in('student_id', allowedStudentIds);
      
      if (certificates && certificates.length > 0) {
        result.certificates = await Promise.all(certificates.map(async (cert) => {
          try {
            const decrypted = await decrypt(cert.certificate_data_encrypted);
            return {
              ...cert,
              certificate_data_encrypted: '[ENCRYPTED]',
              certificate_data: JSON.parse(decrypted),
            };
          } catch {
            return { ...cert, certificate_data_encrypted: '[ENCRYPTED]', certificate_data: null, decryption_error: true };
          }
        }));
      } else {
        result.certificates = [];
      }
    }

    // Log decryption event
    const totalRecords = 
      (result.marks as unknown[] || []).length + 
      (result.attendance as unknown[] || []).length + 
      (result.certificates as unknown[] || []).length;

    if (totalRecords > 0) {
      await supabase.from('encryption_events').insert({
        user_id: user.id,
        event_type: 'decrypt',
        table_name: dataType,
        record_count: totalRecords,
        success: true,
      });

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'view_student_data',
        table_name: dataType,
        details: { 
          student_ids: allowedStudentIds,
          record_count: totalRecords,
        },
      });
    }

    console.log(`Retrieved ${totalRecords} decrypted records for user ${user.id}`);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Get student data error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
