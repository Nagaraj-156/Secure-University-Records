import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// AES-256 encryption using Web Crypto API
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

async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

interface StudentRecord {
  enrollment_number: string;
  full_name: string;
  email: string;
  phone?: string;
  department_code: string;
  semester: number;
  admission_year: number;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  marks?: {
    subject_name: string;
    exam_type: string;
    marks: number;
    max_marks: number;
    academic_year: string;
  }[];
  attendance?: {
    subject_name: string;
    date: string;
    status: string;
  }[];
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

    // Check if user is admin or exam_cell
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || (userRole.role !== 'admin' && userRole.role !== 'exam_cell')) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { records, operation } = await req.json() as { 
      records: StudentRecord[]; 
      operation: 'students' | 'marks' | 'attendance' 
    };

    console.log(`Bulk upload: ${operation}, ${records.length} records, user=${user.id}`);

    // Get departments for mapping
    const { data: departments } = await supabase.from('departments').select('id, code');
    const deptMap = new Map(departments?.map(d => [d.code, d.id]) || []);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const BATCH_SIZE = 100;

    if (operation === 'students') {
      // Process students in batches
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const studentRecords = batch.map(record => ({
          enrollment_number: record.enrollment_number,
          full_name: record.full_name,
          email: record.email,
          phone: record.phone || null,
          department_id: deptMap.get(record.department_code) || null,
          semester: record.semester || 1,
          admission_year: record.admission_year || new Date().getFullYear(),
          date_of_birth: record.date_of_birth || null,
          gender: record.gender || null,
          address: record.address || null,
          guardian_name: record.guardian_name || null,
          guardian_phone: record.guardian_phone || null,
          is_active: true,
        }));

        const { error } = await supabase.from('students').upsert(studentRecords, {
          onConflict: 'enrollment_number',
          ignoreDuplicates: false,
        });

        if (error) {
          errorCount += batch.length;
          errors.push(`Batch ${i / BATCH_SIZE + 1}: ${error.message}`);
        } else {
          successCount += batch.length;
        }
      }
    } else if (operation === 'marks') {
      // Get student IDs first
      const enrollments = [...new Set(records.map(r => r.enrollment_number))];
      const { data: students } = await supabase
        .from('students')
        .select('id, enrollment_number')
        .in('enrollment_number', enrollments);
      
      const studentMap = new Map(students?.map(s => [s.enrollment_number, s.id]) || []);

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        
        const marksRecords = await Promise.all(batch.flatMap(async (record) => {
          const studentId = studentMap.get(record.enrollment_number);
          if (!studentId || !record.marks) return [];
          
          return Promise.all(record.marks.map(async (mark) => ({
            student_id: studentId,
            subject_name: mark.subject_name,
            exam_type: mark.exam_type,
            semester: record.semester,
            academic_year: mark.academic_year,
            marks_encrypted: await encrypt(JSON.stringify({ marks: mark.marks })),
            max_marks: mark.max_marks || 100,
            is_published: false,
          })));
        }));

        const flatRecords = marksRecords.flat();
        if (flatRecords.length > 0) {
          const { error } = await supabase.from('student_marks').insert(flatRecords);
          if (error) {
            errorCount += flatRecords.length;
            errors.push(`Marks batch ${i / BATCH_SIZE + 1}: ${error.message}`);
          } else {
            successCount += flatRecords.length;
          }
        }
      }
    } else if (operation === 'attendance') {
      // Similar logic for attendance
      const enrollments = [...new Set(records.map(r => r.enrollment_number))];
      const { data: students } = await supabase
        .from('students')
        .select('id, enrollment_number')
        .in('enrollment_number', enrollments);
      
      const studentMap = new Map(students?.map(s => [s.enrollment_number, s.id]) || []);

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        
        const attendanceRecords = await Promise.all(batch.flatMap(async (record) => {
          const studentId = studentMap.get(record.enrollment_number);
          if (!studentId || !record.attendance) return [];
          
          return Promise.all(record.attendance.map(async (att) => ({
            student_id: studentId,
            subject_name: att.subject_name,
            attendance_date: att.date,
            status_encrypted: await encrypt(JSON.stringify({ status: att.status })),
            semester: record.semester,
          })));
        }));

        const flatRecords = attendanceRecords.flat();
        if (flatRecords.length > 0) {
          const { error } = await supabase.from('student_attendance').upsert(flatRecords, {
            onConflict: 'student_id,subject_name,attendance_date',
          });
          if (error) {
            errorCount += flatRecords.length;
            errors.push(`Attendance batch ${i / BATCH_SIZE + 1}: ${error.message}`);
          } else {
            successCount += flatRecords.length;
          }
        }
      }
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: `bulk_upload_${operation}`,
      details: { 
        total_records: records.length,
        success_count: successCount,
        error_count: errorCount,
        errors: errors.slice(0, 10),
      },
    });

    // Log encryption event
    await supabase.from('encryption_events').insert({
      user_id: user.id,
      event_type: 'encrypt',
      table_name: operation === 'marks' ? 'student_marks' : operation === 'attendance' ? 'student_attendance' : 'students',
      record_count: successCount,
      success: errorCount === 0,
      error_message: errors.length > 0 ? errors.join('; ') : null,
    });

    // Refresh dashboard stats
    await supabase.rpc('refresh_dashboard_stats');

    console.log(`Bulk upload completed: ${successCount} success, ${errorCount} errors`);

    return new Response(JSON.stringify({ 
      success: true, 
      successCount, 
      errorCount,
      errors: errors.slice(0, 10),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
