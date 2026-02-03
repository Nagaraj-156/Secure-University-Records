import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookOpen, Lock, Search, Filter, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AddAttendanceDialog } from '@/components/attendance/AddAttendanceDialog';
import { DeleteAttendanceDialog } from '@/components/attendance/DeleteAttendanceDialog';

interface AttendanceRecord {
  id: string;
  student_id: string;
  subject_name: string;
  attendance_date: string;
  status: string | null;
  semester: number;
  students?: {
    full_name: string;
    enrollment_number: string;
  };
}

export default function AttendancePage() {
  const { isStudent, isAdmin, isFaculty, isExamCell } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const canManageRecords = isAdmin || isFaculty;

  const fetchAttendance = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-student-data?type=attendance`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await res.json();
      
      if (data.success && data.data?.attendance) {
        setAttendance(data.data.attendance);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleRefresh = () => {
    setLoading(true);
    fetchAttendance();
  };

  const subjects = [...new Set(attendance.map((a) => a.subject_name))];

  const filteredAttendance = attendance.filter((record) => {
    const matchesSearch =
      record.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || record.subject_name === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // Calculate attendance stats
  const presentCount = filteredAttendance.filter((a) => a.status === 'present').length;
  const absentCount = filteredAttendance.filter((a) => a.status === 'absent').length;
  const totalCount = filteredAttendance.length;
  const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-success/10 text-success">Present</Badge>;
      case 'absent':
        return <Badge className="bg-destructive/10 text-destructive">Absent</Badge>;
      case 'late':
        return <Badge className="bg-warning/10 text-warning">Late</Badge>;
      case 'excused':
        return <Badge className="bg-primary/10 text-primary">Excused</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Attendance Records</h1>
          <p className="text-muted-foreground">
            {isStudent ? 'View your attendance history' : 'View and manage student attendance records'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManageRecords && <AddAttendanceDialog onAttendanceAdded={handleRefresh} />}
          <Badge variant="outline" className="encrypted-badge">
            <Lock className="w-4 h-4" />
            <span>Data Encrypted</span>
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{presentCount}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{absentCount}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{attendancePercentage}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject or student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full sm:w-64">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Attendance Log
          </CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredAttendance.length} records found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="shimmer h-14 rounded-lg"></div>
              ))}
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No attendance records found</p>
              <p className="text-sm text-muted-foreground">
                {isStudent
                  ? 'Your attendance will appear here once recorded'
                  : 'Add attendance using the Add Attendance button'}
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
                    <TableHead>Date</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageRecords && <TableHead className="w-16">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((record) => (
                    <TableRow key={record.id} className="table-row-hover">
                      {canManageRecords && (
                        <>
                          <TableCell className="font-mono text-sm">
                            {record.students?.enrollment_number || '-'}
                          </TableCell>
                          <TableCell>{record.students?.full_name || '-'}</TableCell>
                        </>
                      )}
                      <TableCell className="font-medium">{record.subject_name}</TableCell>
                      <TableCell>
                        {format(new Date(record.attendance_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{record.semester}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      {canManageRecords && (
                        <TableCell>
                          <DeleteAttendanceDialog
                            attendanceId={record.id}
                            studentName={record.students?.full_name || 'Unknown'}
                            subjectName={record.subject_name}
                            date={format(new Date(record.attendance_date), 'dd MMM yyyy')}
                            onAttendanceDeleted={handleRefresh}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
