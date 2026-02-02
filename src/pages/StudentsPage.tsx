import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudents } from '@/hooks/useStudents';
import { useDepartments } from '@/hooks/useDepartments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Search, Users, Filter, Lock, Eye, Download } from 'lucide-react';

export default function StudentsPage() {
  const { isAdmin, isFaculty, isExamCell } = useAuth();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { departments } = useDepartments();
  const { students, loading, error } = useStudents(
    selectedDepartment !== 'all' ? selectedDepartment : undefined
  );

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.enrollment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Students</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage all student records' : 'View student records in your department'}
          </p>
        </div>
        <Badge variant="outline" className="encrypted-badge w-fit">
          <Lock className="w-4 h-4" />
          <span>Data Encrypted</span>
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, enrollment number, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-64">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Student Records
          </CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${filteredStudents.length} students found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="shimmer h-14 rounded-lg"></div>
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No students found</p>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? 'Upload student data using the Bulk Upload feature' : 'No students in your assigned departments'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enrollment No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="table-row-hover">
                      <TableCell className="font-mono text-sm">
                        {student.enrollment_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {student.departments?.code || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{student.semester}</TableCell>
                      <TableCell>{student.admission_year}</TableCell>
                      <TableCell>
                        <Badge variant={student.is_active ? 'default' : 'secondary'}>
                          {student.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
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
