import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Student {
  id: string;
  full_name: string;
  enrollment_number: string;
}

interface AddMarkDialogProps {
  onMarkAdded: () => void;
}

export function AddMarkDialog({ onMarkAdded }: AddMarkDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [formData, setFormData] = useState({
    student_id: '',
    subject_name: '',
    exam_type: 'midterm',
    semester: '1',
    academic_year: '2025-26',
    marks: '',
    max_marks: '100',
  });

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase
        .from('students')
        .select('id, full_name, enrollment_number')
        .eq('is_active', true)
        .order('full_name');
      if (data) setStudents(data);
    };
    if (open) fetchStudents();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Encrypt marks using the encryption edge function
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
            data: { marks: parseInt(formData.marks) },
            table_name: 'student_marks',
          }),
        }
      );

      const encryptData = await encryptRes.json();
      if (!encryptData.success) throw new Error('Encryption failed');

      // Insert the encrypted mark
      const { error } = await supabase.from('student_marks').insert({
        student_id: formData.student_id,
        subject_name: formData.subject_name,
        exam_type: formData.exam_type,
        semester: parseInt(formData.semester),
        academic_year: formData.academic_year,
        marks_encrypted: encryptData.result,
        max_marks: parseInt(formData.max_marks),
        is_published: false,
      });

      if (error) throw error;

      toast.success('Mark record added successfully');
      setOpen(false);
      setFormData({
        student_id: '',
        subject_name: '',
        exam_type: 'midterm',
        semester: '1',
        academic_year: '2025-26',
        marks: '',
        max_marks: '100',
      });
      onMarkAdded();
    } catch (error) {
      console.error('Failed to add mark:', error);
      toast.error('Failed to add mark record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Mark
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Mark Record</DialogTitle>
          <DialogDescription>
            Enter the mark details. The marks will be encrypted before storage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="student">Student</Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => setFormData({ ...formData, student_id: value })}
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
                <Label htmlFor="exam_type">Exam Type</Label>
                <Select
                  value={formData.exam_type}
                  onValueChange={(value) => setFormData({ ...formData, exam_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="marks">Marks Obtained</Label>
                <Input
                  id="marks"
                  type="number"
                  min="0"
                  max={formData.max_marks}
                  value={formData.marks}
                  onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max_marks">Maximum Marks</Label>
                <Input
                  id="max_marks"
                  type="number"
                  min="1"
                  value={formData.max_marks}
                  onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input
                id="academic_year"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                placeholder="2025-26"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.student_id}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Mark
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
