import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GraduationCap, Lock, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AddMarkDialog } from '@/components/marks/AddMarkDialog';
import { DeleteMarkDialog } from '@/components/marks/DeleteMarkDialog';

interface MarkRecord {
  id: string;
  student_id: string;
  subject_name: string;
  exam_type: string;
  semester: number;
  academic_year: string;
  marks: number | null;
  max_marks: number;
  is_published: boolean;
  students?: {
    full_name: string;
    enrollment_number: string;
  };
}

export default function ResultsPage() {
  const { isAdmin, isStudent, isFaculty, isExamCell } = useAuth();
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  const canManageRecords = isAdmin || isFaculty || isExamCell;

  const fetchMarks = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-student-data?type=marks`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await res.json();
      
      if (data.success && data.data?.marks) {
        setMarks(data.data.marks);
      }
    } catch (error) {
      console.error('Failed to fetch marks:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarks();
  }, [fetchMarks]);

  const handleRefresh = () => {
    setLoading(true);
    fetchMarks();
  };

  const filteredMarks = marks.filter((mark) => {
    const matchesSearch = 
      mark.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mark.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mark.students?.enrollment_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = selectedSemester === 'all' || mark.semester.toString() === selectedSemester;
    return matchesSearch && matchesSemester;
  });

  const getGrade = (marks: number | null, maxMarks: number) => {
    if (marks === null) return '-';
    const percentage = (marks / maxMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-success/10 text-success';
      case 'B+':
      case 'B':
        return 'bg-primary/10 text-primary';
      case 'C':
        return 'bg-warning/10 text-warning';
      case 'D':
      case 'F':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Academic Results</h1>
          <p className="text-muted-foreground">
            {isStudent ? 'View your examination results' : 'View and manage student results'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManageRecords && <AddMarkDialog onMarkAdded={handleRefresh} />}
          <Badge variant="outline" className="encrypted-badge">
            <Lock className="w-4 h-4" />
            <span>Marks Encrypted</span>
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject, student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <SelectItem key={sem} value={sem.toString()}>
                    Semester {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Examination Results
          </CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredMarks.length} results found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="shimmer h-14 rounded-lg"></div>
              ))}
            </div>
          ) : filteredMarks.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No results found</p>
              <p className="text-sm text-muted-foreground">
                {isStudent
                  ? 'Your results will appear here once published'
                  : 'Add results using the Add Mark button or Bulk Upload feature'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canManageRecords && (
                      <>
                        <TableHead>Enrollment</TableHead>
                        <TableHead>Student</TableHead>
                      </>
                    )}
                    <TableHead>Subject</TableHead>
                    <TableHead>Exam Type</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageRecords && <TableHead className="w-16">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMarks.map((mark) => {
                    const grade = getGrade(mark.marks, mark.max_marks);
                    return (
                      <TableRow key={mark.id} className="table-row-hover">
                        {canManageRecords && (
                          <>
                            <TableCell className="font-mono text-sm">
                              {mark.students?.enrollment_number || '-'}
                            </TableCell>
                            <TableCell>{mark.students?.full_name || '-'}</TableCell>
                          </>
                        )}
                        <TableCell className="font-medium">{mark.subject_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {mark.exam_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{mark.semester}</TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {mark.marks !== null ? `${mark.marks}/${mark.max_marks}` : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getGradeBadgeColor(grade)}>{grade}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={mark.is_published ? 'default' : 'secondary'}>
                            {mark.is_published ? 'Published' : 'Pending'}
                          </Badge>
                        </TableCell>
                        {canManageRecords && (
                          <TableCell>
                            <DeleteMarkDialog
                              markId={mark.id}
                              studentName={mark.students?.full_name || 'Unknown'}
                              subjectName={mark.subject_name}
                              onMarkDeleted={handleRefresh}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
