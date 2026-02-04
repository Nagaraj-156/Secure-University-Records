import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { student_id } = await req.json();
    
    if (!student_id) {
      return new Response(JSON.stringify({ error: 'student_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, semester')
      .eq('id', student_id)
      .single();

    if (studentError || !student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sample marks data
    const marksData = [
      { subject: 'Mathematics', marks: 85, max: 100, exam: 'midterm' },
      { subject: 'Physics', marks: 78, max: 100, exam: 'midterm' },
      { subject: 'Computer Science', marks: 92, max: 100, exam: 'midterm' },
      { subject: 'English', marks: 88, max: 100, exam: 'final' },
      { subject: 'Chemistry', marks: 75, max: 100, exam: 'final' },
    ];

    // Insert encrypted marks
    const marksInserts = await Promise.all(marksData.map(async (m) => ({
      student_id,
      subject_name: m.subject,
      marks_encrypted: await encrypt(JSON.stringify({ marks: m.marks })),
      max_marks: m.max,
      exam_type: m.exam,
      semester: student.semester,
      academic_year: '2025-2026',
      is_published: true,
    })));

    const { error: marksError } = await supabase.from('student_marks').insert(marksInserts);
    if (marksError) {
      console.error('Marks insert error:', marksError);
      throw marksError;
    }

    // Sample attendance data (last 10 days)
    const attendanceData = [];
    const statuses = ['present', 'present', 'present', 'present', 'absent', 'present', 'late', 'present', 'present', 'present'];
    const subjects = ['Mathematics', 'Physics', 'Computer Science'];
    
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      attendanceData.push({
        student_id,
        subject_name: subjects[i % subjects.length],
        attendance_date: dateStr,
        semester: student.semester,
        status_encrypted: await encrypt(JSON.stringify({ status: statuses[i] })),
      });
    }

    const { error: attendanceError } = await supabase.from('student_attendance').insert(attendanceData);
    if (attendanceError) {
      console.error('Attendance insert error:', attendanceError);
      throw attendanceError;
    }

    console.log(`Seeded ${marksInserts.length} marks and ${attendanceData.length} attendance records for student ${student_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      marks_count: marksInserts.length,
      attendance_count: attendanceData.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Seed error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
