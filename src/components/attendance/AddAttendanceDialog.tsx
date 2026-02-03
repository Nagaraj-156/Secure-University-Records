import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Student {
  id: string;
  full_name: string;
  enrollment_number: string;
  semester: number;
}

interface AddAttendanceDialogProps {
  onAttendanceAdded: () => void;
}

export function AddAttendanceDialog({ onAttendanceAdded }: AddAttendanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState({
    student_id: '',
    subject_name: '',
    attendance_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'present',
    semester: '1',
  });

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase
        .from('students')
        .select('id, full_name, enrollment_number, semester')
        .eq('is_active', true)
        .order('full_name');
      if (data) setStudents(data);
    };
    if (open) fetchStudents();
  }, [open]);

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setFormData({
      ...formData,
      student_id: studentId,
      semester: student?.semester?.toString() || '1',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Encrypt status using the encryption edge function
      const encryptRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/encryption`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'encrypt',
            data: { status: formData.status },
            table_name: 'student_attendance',
          }),
        }
      );

      const encryptData = await encryptRes.json();
      if (!encryptData.success) throw new Error('Encryption failed');

      // Insert the encrypted attendance record
      const { error } = await supabase.from('student_attendance').insert({
        student_id: formData.student_id,
        subject_name: formData.subject_name,
        attendance_date: formData.attendance_date,
        status_encrypted: encryptData.result,
        semester: parseInt(formData.semester),
      });

      if (error) throw error;

      toast.success('Attendance record added successfully');
      setOpen(false);
      setFormData({
        student_id: '',
        subject_name: '',
        attendance_date: format(new Date(), 'yyyy-MM-dd'),
        status: 'present',
        semester: '1',
      });
      onAttendanceAdded();
    } catch (error) {
      console.error('Failed to add attendance:', error);
      toast.error('Failed to add attendance record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Attendance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Attendance Record</DialogTitle>
          <DialogDescription>
            Record student attendance. The status will be encrypted before storage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="student">Student</Label>
              <Select
                value={formData.student_id}
                onValueChange={handleStudentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name} ({student.enrollment_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject Name</Label>
              <Input
                id="subject"
                value={formData.subject_name}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                placeholder="e.g., Mathematics"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.attendance_date}
                  onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="excused">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={formData.semester}
                onValueChange={(value) => setFormData({ ...formData, semester: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.student_id}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Attendance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
