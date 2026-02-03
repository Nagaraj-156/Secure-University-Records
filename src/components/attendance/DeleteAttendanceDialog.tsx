import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteAttendanceDialogProps {
  attendanceId: string;
  studentName: string;
  subjectName: string;
  date: string;
  onAttendanceDeleted: () => void;
}

export function DeleteAttendanceDialog({ 
  attendanceId, 
  studentName, 
  subjectName, 
  date,
  onAttendanceDeleted 
}: DeleteAttendanceDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('student_attendance')
        .delete()
        .eq('id', attendanceId);

      if (error) throw error;

      toast.success('Attendance record deleted successfully');
      onAttendanceDeleted();
    } catch (error) {
      console.error('Failed to delete attendance:', error);
      toast.error('Failed to delete attendance record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Attendance Record</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the attendance record for <strong>{studentName}</strong> in{' '}
            <strong>{subjectName}</strong> on <strong>{date}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
