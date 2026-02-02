-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'faculty', 'student', 'exam_cell');

-- Create user_roles table for RBAC (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    head_of_department TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    enrollment_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    semester INTEGER NOT NULL DEFAULT 1,
    admission_year INTEGER NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    address TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create faculty_assignments table (which students a faculty can access)
CREATE TABLE public.faculty_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
    subject_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(faculty_user_id, department_id, subject_name)
);

-- Create student_marks table with encrypted data
CREATE TABLE public.student_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    subject_name TEXT NOT NULL,
    exam_type TEXT NOT NULL, -- 'internal', 'midterm', 'final'
    semester INTEGER NOT NULL,
    academic_year TEXT NOT NULL,
    marks_encrypted TEXT NOT NULL, -- AES-256 encrypted marks
    max_marks INTEGER NOT NULL DEFAULT 100,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_attendance table with encrypted data
CREATE TABLE public.student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    subject_name TEXT NOT NULL,
    attendance_date DATE NOT NULL,
    status_encrypted TEXT NOT NULL, -- AES-256 encrypted status
    semester INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, subject_name, attendance_date)
);

-- Create certificates table with encrypted data
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    certificate_type TEXT NOT NULL, -- 'bonafide', 'transfer', 'character', 'degree'
    certificate_data_encrypted TEXT NOT NULL, -- AES-256 encrypted certificate content
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    issued_by UUID REFERENCES auth.users(id),
    is_valid BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table for security tracking
CREATE TABLE public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create encryption_events table for tracking encryption/decryption
CREATE TABLE public.encryption_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'encrypt', 'decrypt', 'key_rotation'
    table_name TEXT NOT NULL,
    record_count INTEGER DEFAULT 1,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dashboard_stats view for real-time stats
CREATE TABLE public.dashboard_stats_cache (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_students INTEGER DEFAULT 0,
    total_encrypted_records INTEGER DEFAULT 0,
    total_departments INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    last_key_rotation TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encryption_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_stats_cache ENABLE ROW LEVEL SECURITY;

-- Create helper function to check user role (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create helper function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Helper to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;

-- Helper to check if user is faculty
CREATE OR REPLACE FUNCTION public.is_faculty(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'faculty')
$$;

-- Helper to check if user is student
CREATE OR REPLACE FUNCTION public.is_student_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'student')
$$;

-- Helper to check if user is exam cell
CREATE OR REPLACE FUNCTION public.is_exam_cell(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'exam_cell')
$$;

-- Check if faculty can access a student (through department assignment)
CREATE OR REPLACE FUNCTION public.faculty_can_access_student(_faculty_user_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.faculty_assignments fa
        JOIN public.students s ON s.department_id = fa.department_id
        WHERE fa.faculty_user_id = _faculty_user_id
          AND s.id = _student_id
    )
$$;

-- Check if student owns the record
CREATE OR REPLACE FUNCTION public.is_student_owner(_user_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.students
        WHERE id = _student_id
          AND user_id = _user_id
    )
$$;

-- RLS Policies for user_roles (Admin only)
CREATE POLICY "Admin can manage roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- RLS Policies for departments
CREATE POLICY "All authenticated users can view departments" ON public.departments
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admin can manage departments" ON public.departments
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for students
CREATE POLICY "Students can view own record" ON public.students
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admin can manage all students" ON public.students
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Faculty can view assigned department students" ON public.students
    FOR SELECT TO authenticated
    USING (
        public.is_faculty(auth.uid()) AND
        EXISTS (
            SELECT 1 FROM public.faculty_assignments fa
            WHERE fa.faculty_user_id = auth.uid()
              AND fa.department_id = students.department_id
        )
    );

CREATE POLICY "Exam Cell can view all students" ON public.students
    FOR SELECT TO authenticated
    USING (public.is_exam_cell(auth.uid()));

-- RLS Policies for faculty_assignments
CREATE POLICY "Admin can manage faculty assignments" ON public.faculty_assignments
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Faculty can view own assignments" ON public.faculty_assignments
    FOR SELECT TO authenticated
    USING (faculty_user_id = auth.uid());

-- RLS Policies for student_marks
CREATE POLICY "Students can view own published marks" ON public.student_marks
    FOR SELECT TO authenticated
    USING (
        is_published = true AND
        public.is_student_owner(auth.uid(), student_id)
    );

CREATE POLICY "Admin can manage all marks" ON public.student_marks
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Faculty can view assigned student marks" ON public.student_marks
    FOR SELECT TO authenticated
    USING (
        public.is_faculty(auth.uid()) AND
        public.faculty_can_access_student(auth.uid(), student_id)
    );

CREATE POLICY "Exam Cell can manage marks" ON public.student_marks
    FOR ALL TO authenticated
    USING (public.is_exam_cell(auth.uid()))
    WITH CHECK (public.is_exam_cell(auth.uid()));

-- RLS Policies for student_attendance
CREATE POLICY "Students can view own attendance" ON public.student_attendance
    FOR SELECT TO authenticated
    USING (public.is_student_owner(auth.uid(), student_id));

CREATE POLICY "Admin can manage all attendance" ON public.student_attendance
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Faculty can view assigned student attendance" ON public.student_attendance
    FOR SELECT TO authenticated
    USING (
        public.is_faculty(auth.uid()) AND
        public.faculty_can_access_student(auth.uid(), student_id)
    );

CREATE POLICY "Exam Cell can view all attendance" ON public.student_attendance
    FOR SELECT TO authenticated
    USING (public.is_exam_cell(auth.uid()));

-- RLS Policies for certificates
CREATE POLICY "Students can view own certificates" ON public.certificates
    FOR SELECT TO authenticated
    USING (public.is_student_owner(auth.uid(), student_id));

CREATE POLICY "Admin can manage all certificates" ON public.certificates
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Exam Cell can view all certificates" ON public.certificates
    FOR SELECT TO authenticated
    USING (public.is_exam_cell(auth.uid()));

-- RLS Policies for audit_logs (Admin only, immutable)
CREATE POLICY "Admin can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- RLS Policies for encryption_events (Admin only)
CREATE POLICY "Admin can view encryption events" ON public.encryption_events
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert encryption events" ON public.encryption_events
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- RLS Policies for dashboard_stats_cache
CREATE POLICY "Authenticated users can view stats" ON public.dashboard_stats_cache
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admin can update stats" ON public.dashboard_stats_cache
    FOR UPDATE TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_marks_updated_at
    BEFORE UPDATE ON public.student_marks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create function to update dashboard stats
CREATE OR REPLACE FUNCTION public.refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO public.dashboard_stats_cache (id, total_students, total_encrypted_records, total_departments, updated_at)
    VALUES (
        1,
        (SELECT COUNT(*) FROM public.students WHERE is_active = true),
        (SELECT COUNT(*) FROM public.student_marks) + 
        (SELECT COUNT(*) FROM public.student_attendance) + 
        (SELECT COUNT(*) FROM public.certificates),
        (SELECT COUNT(*) FROM public.departments),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        total_students = EXCLUDED.total_students,
        total_encrypted_records = EXCLUDED.total_encrypted_records,
        total_departments = EXCLUDED.total_departments,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_stats_cache;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.encryption_events;

-- Insert default departments
INSERT INTO public.departments (name, code, head_of_department) VALUES
    ('Computer Science & Engineering', 'CSE', 'Dr. Rajesh Kumar'),
    ('Electronics & Communication', 'ECE', 'Dr. Priya Sharma'),
    ('Mechanical Engineering', 'ME', 'Dr. Anil Verma'),
    ('Civil Engineering', 'CE', 'Dr. Sunita Patel'),
    ('Electrical Engineering', 'EE', 'Dr. Vikram Singh'),
    ('Information Technology', 'IT', 'Dr. Meena Gupta'),
    ('Biotechnology', 'BT', 'Dr. Rahul Joshi'),
    ('Chemical Engineering', 'CHE', 'Dr. Kavita Rao');

-- Initialize dashboard stats
INSERT INTO public.dashboard_stats_cache (id, total_students, total_encrypted_records, total_departments, updated_at)
VALUES (1, 0, 0, 8, now());