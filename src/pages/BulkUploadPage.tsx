import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Users, GraduationCap, BookOpen, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function BulkUploadPage() {
  const { isAdmin } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [seedCount, setSeedCount] = useState('100');
  const [seeding, setSeeding] = useState(false);
  const [results, setResults] = useState<{
    successCount: number;
    errorCount: number;
    errors: string[];
  } | null>(null);

  const handleSeedData = async () => {
    setSeeding(true);
    setProgress(0);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in again');
        return;
      }

      toast.info(`Seeding ${seedCount} student records with encrypted data...`);

      const response = await supabase.functions.invoke('seed-data', {
        body: { count: parseInt(seedCount) },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      setResults({
        successCount: data.studentsCreated + data.marksCreated + data.attendanceCreated,
        errorCount: 0,
        errors: [],
      });

      toast.success(
        `Successfully seeded: ${data.studentsCreated} students, ${data.marksCreated} marks, ${data.attendanceCreated} attendance records`
      );
      setProgress(100);
    } catch (error) {
      console.error('Seed error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to seed data');
    } finally {
      setSeeding(false);
    }
  };

  const handleFileUpload = async (file: File, operation: 'students' | 'marks' | 'attendance') => {
    setUploading(true);
    setProgress(0);
    setResults(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const record: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        return record;
      });

      setProgress(30);
      toast.info(`Processing ${records.length} records...`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in again');
        return;
      }

      const response = await supabase.functions.invoke('bulk-upload', {
        body: { records, operation },
      });

      setProgress(90);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      setResults({
        successCount: data.successCount,
        errorCount: data.errorCount,
        errors: data.errors || [],
      });

      if (data.successCount > 0) {
        toast.success(`Successfully uploaded ${data.successCount} records`);
      }
      if (data.errorCount > 0) {
        toast.warning(`${data.errorCount} records failed`);
      }
      setProgress(100);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <p className="text-lg font-medium">Admin Access Required</p>
          <p className="text-muted-foreground">Only administrators can access bulk upload</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Bulk Upload</h1>
        <p className="text-muted-foreground">Upload and encrypt large batches of student records</p>
      </div>

      {/* Quick Seed */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Quick Seed - Generate Test Data
          </CardTitle>
          <CardDescription>
            Generate realistic Indian student records with encrypted marks and attendance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="seed-count">Number of Students</Label>
              <Input
                id="seed-count"
                type="number"
                value={seedCount}
                onChange={(e) => setSeedCount(e.target.value)}
                min="10"
                max="10000"
                placeholder="100"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Each student will have 3-5 subjects with marks and 30 days of attendance
              </p>
            </div>
            <Button onClick={handleSeedData} disabled={seeding} className="btn-primary-gradient">
              {seeding ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Seeding...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Generate & Encrypt Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Tabs */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Students
          </TabsTrigger>
          <TabsTrigger value="marks" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Marks
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <UploadCard
            title="Upload Student Data"
            description="Upload a CSV file with student information"
            icon={<Users className="w-8 h-8 text-primary" />}
            onUpload={(file) => handleFileUpload(file, 'students')}
            uploading={uploading}
            sampleHeaders={['enrollment_number', 'full_name', 'email', 'phone', 'department_code', 'semester', 'admission_year', 'date_of_birth', 'gender', 'address', 'guardian_name', 'guardian_phone']}
          />
        </TabsContent>

        <TabsContent value="marks">
          <UploadCard
            title="Upload Marks Data"
            description="Upload encrypted marks for students"
            icon={<GraduationCap className="w-8 h-8 text-accent" />}
            onUpload={(file) => handleFileUpload(file, 'marks')}
            uploading={uploading}
            sampleHeaders={['enrollment_number', 'subject_name', 'exam_type', 'marks', 'max_marks', 'academic_year']}
          />
        </TabsContent>

        <TabsContent value="attendance">
          <UploadCard
            title="Upload Attendance Data"
            description="Upload encrypted attendance records"
            icon={<BookOpen className="w-8 h-8 text-secondary" />}
            onUpload={(file) => handleFileUpload(file, 'attendance')}
            uploading={uploading}
            sampleHeaders={['enrollment_number', 'subject_name', 'date', 'status']}
          />
        </TabsContent>
      </Tabs>

      {/* Progress & Results */}
      {(uploading || seeding) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.errorCount === 0 ? (
                <CheckCircle className="w-5 h-5 text-success" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-warning" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-success/10">
                <p className="text-2xl font-bold text-success">{results.successCount}</p>
                <p className="text-sm text-muted-foreground">Records encrypted & saved</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">{results.errorCount}</p>
                <p className="text-sm text-muted-foreground">Failed records</p>
              </div>
            </div>
            {results.errors.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-muted">
                <p className="font-medium mb-2">Errors:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {results.errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface UploadCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onUpload: (file: File) => void;
  uploading: boolean;
  sampleHeaders: string[];
}

function UploadCard({ title, description, icon, onUpload, uploading, sampleHeaders }: UploadCardProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Drop your CSV file here</p>
          <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleChange}
            disabled={uploading}
            className="hidden"
            id={`file-upload-${title}`}
          />
          <label htmlFor={`file-upload-${title}`}>
            <Button variant="outline" asChild disabled={uploading}>
              <span>
                <FileText className="w-4 h-4 mr-2" />
                Select CSV File
              </span>
            </Button>
          </label>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">
        <p className="text-sm font-medium">Required CSV Headers:</p>
        <div className="flex flex-wrap gap-1">
          {sampleHeaders.map((header) => (
            <Badge key={header} variant="secondary" className="font-mono text-xs">
              {header}
            </Badge>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
