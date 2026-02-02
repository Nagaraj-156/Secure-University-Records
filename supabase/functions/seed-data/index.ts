import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// AES-256 encryption
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

// Indian name generators
const firstNames = ['Aarav', 'Aditi', 'Aisha', 'Akash', 'Amit', 'Ananya', 'Anish', 'Anjali', 'Arjun', 'Ayush', 'Bhavya', 'Deepak', 'Diya', 'Gaurav', 'Harsha', 'Isha', 'Ishaan', 'Kavya', 'Krishna', 'Lakshmi', 'Manish', 'Meera', 'Neha', 'Nikhil', 'Pooja', 'Priya', 'Rahul', 'Raj', 'Riya', 'Rohan', 'Sakshi', 'Sanjay', 'Shreya', 'Siddharth', 'Simran', 'Sneha', 'Tanvi', 'Varun', 'Vikram', 'Vivek'];
const lastNames = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Rao', 'Joshi', 'Shah', 'Mehta', 'Agarwal', 'Iyer', 'Nair', 'Menon', 'Pillai', 'Mukherjee', 'Chatterjee', 'Banerjee', 'Das', 'Bose', 'Ghosh', 'Sinha', 'Mishra', 'Pandey', 'Tiwari', 'Dubey', 'Saxena', 'Kapoor', 'Malhotra'];
const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Electronics', 'Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Networks'];
const examTypes = ['internal', 'midterm', 'final'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  return `+91${randomInt(7000000000, 9999999999)}`;
}

function generateDOB(): string {
  const year = randomInt(1998, 2005);
  const month = randomInt(1, 12).toString().padStart(2, '0');
  const day = randomInt(1, 28).toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
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

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { count = 100 } = await req.json();
    const recordCount = Math.min(count, 10000); // Max 10000 per call

    console.log(`Seeding ${recordCount} student records...`);

    // Get departments
    const { data: departments } = await supabase.from('departments').select('id, code');
    if (!departments || departments.length === 0) {
      throw new Error('No departments found');
    }

    const BATCH_SIZE = 100;
    let studentsCreated = 0;
    let marksCreated = 0;
    let attendanceCreated = 0;

    for (let batch = 0; batch < recordCount; batch += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, recordCount - batch);
      const students = [];

      for (let i = 0; i < batchSize; i++) {
        const firstName = randomElement(firstNames);
        const lastName = randomElement(lastNames);
        const dept = randomElement(departments);
        const admissionYear = randomInt(2020, 2024);
        const semester = Math.min((2024 - admissionYear) * 2 + 1, 8);

        students.push({
          enrollment_number: `${dept.code}${admissionYear}${(batch + i + 1).toString().padStart(5, '0')}`,
          full_name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${batch + i + 1}@university.edu.in`,
          phone: generatePhone(),
          department_id: dept.id,
          semester,
          admission_year: admissionYear,
          date_of_birth: generateDOB(),
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          address: `${randomInt(1, 999)}, Street ${randomInt(1, 50)}, ${randomElement(['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'])}`,
          guardian_name: `${randomElement(firstNames)} ${lastName}`,
          guardian_phone: generatePhone(),
          is_active: true,
        });
      }

      // Insert students
      const { data: insertedStudents, error: studentsError } = await supabase
        .from('students')
        .upsert(students, { onConflict: 'enrollment_number' })
        .select('id, semester');

      if (studentsError) {
        console.error('Students insert error:', studentsError);
        continue;
      }

      studentsCreated += insertedStudents?.length || 0;

      // Generate marks for each student (3-5 subjects, 2-3 exam types)
      const marksRecords = [];
      const attendanceRecords = [];

      for (const student of insertedStudents || []) {
        const numSubjects = randomInt(3, 5);
        const studentSubjects = [...subjects].sort(() => Math.random() - 0.5).slice(0, numSubjects);

        for (const subject of studentSubjects) {
          const numExams = randomInt(2, 3);
          const studentExams = [...examTypes].slice(0, numExams);

          for (const examType of studentExams) {
            const marks = randomInt(30, 100);
            marksRecords.push({
              student_id: student.id,
              subject_name: subject,
              exam_type: examType,
              semester: student.semester,
              academic_year: '2024-25',
              marks_encrypted: await encrypt(JSON.stringify({ marks })),
              max_marks: 100,
              is_published: Math.random() > 0.3,
              published_at: Math.random() > 0.3 ? new Date().toISOString() : null,
            });
          }

          // Generate attendance (last 30 days)
          for (let d = 0; d < 30; d++) {
            const date = new Date();
            date.setDate(date.getDate() - d);
            if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

            const status = Math.random() > 0.15 ? 'present' : 'absent';
            attendanceRecords.push({
              student_id: student.id,
              subject_name: subject,
              attendance_date: date.toISOString().split('T')[0],
              status_encrypted: await encrypt(JSON.stringify({ status })),
              semester: student.semester,
            });
          }
        }
      }

      // Insert marks in batches
      for (let m = 0; m < marksRecords.length; m += 500) {
        const marksBatch = marksRecords.slice(m, m + 500);
        const { error: marksError } = await supabase.from('student_marks').insert(marksBatch);
        if (!marksError) {
          marksCreated += marksBatch.length;
        }
      }

      // Insert attendance in batches
      for (let a = 0; a < attendanceRecords.length; a += 500) {
        const attBatch = attendanceRecords.slice(a, a + 500);
        const { error: attError } = await supabase
          .from('student_attendance')
          .upsert(attBatch, { onConflict: 'student_id,subject_name,attendance_date' });
        if (!attError) {
          attendanceCreated += attBatch.length;
        }
      }

      console.log(`Batch ${batch / BATCH_SIZE + 1} complete: ${studentsCreated} students, ${marksCreated} marks, ${attendanceCreated} attendance`);
    }

    // Log encryption events
    await supabase.from('encryption_events').insert({
      user_id: user.id,
      event_type: 'encrypt',
      table_name: 'seed_data',
      record_count: marksCreated + attendanceCreated,
      success: true,
    });

    // Refresh dashboard stats
    await supabase.rpc('refresh_dashboard_stats');

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'seed_database',
      details: {
        students_created: studentsCreated,
        marks_created: marksCreated,
        attendance_created: attendanceCreated,
      },
    });

    console.log(`Seeding complete: ${studentsCreated} students, ${marksCreated} marks, ${attendanceCreated} attendance`);

    return new Response(JSON.stringify({ 
      success: true,
      studentsCreated,
      marksCreated,
      attendanceCreated,
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
