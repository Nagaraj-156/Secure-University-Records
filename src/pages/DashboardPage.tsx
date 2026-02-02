import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeStats } from '@/hooks/useRealtimeStats';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useEncryptionEvents } from '@/hooks/useEncryptionEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Lock,
  Building,
  Activity,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface StatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  trend?: string;
  color: 'primary' | 'secondary' | 'accent' | 'success';
}

function StatCard({ title, value, description, icon, trend, color }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
  };

  return (
    <Card className="stat-card hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-display font-bold animate-count">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3 text-success text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { profile, role, isAdmin, isFaculty, isStudent, isExamCell } = useAuth();
  const { stats, loading: statsLoading } = useRealtimeStats();
  const { logs, loading: logsLoading } = useAuditLogs(10);
  const { events, loading: eventsLoading } = useEncryptionEvents(10);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleDescription = () => {
    switch (role) {
      case 'admin':
        return 'Full system access • Encryption management • Audit logs';
      case 'faculty':
        return 'View assigned students • Access results & attendance';
      case 'student':
        return 'View your results • Check attendance • Download certificates';
      case 'exam_cell':
        return 'Publish results • Manage exams • Access all student data';
      default:
        return 'Welcome to the University ERP';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-1">{getRoleDescription()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="encrypted-badge">
            <Shield className="w-4 h-4" />
            <span>AES-256 Active</span>
          </Badge>
          <Badge variant="outline" className="bg-info/10 text-info border-info/20">
            <Activity className="w-4 h-4 mr-1" />
            <span>Real-time</span>
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={statsLoading ? '...' : stats?.total_students?.toLocaleString() || '0'}
          description="Active enrolled students"
          icon={<Users className="w-6 h-6" />}
          color="primary"
          trend="+12% this month"
        />
        <StatCard
          title="Encrypted Records"
          value={statsLoading ? '...' : stats?.total_encrypted_records?.toLocaleString() || '0'}
          description="Marks, attendance, certificates"
          icon={<Lock className="w-6 h-6" />}
          color="accent"
        />
        <StatCard
          title="Departments"
          value={statsLoading ? '...' : stats?.total_departments || '0'}
          description="Academic departments"
          icon={<Building className="w-6 h-6" />}
          color="secondary"
        />
        <StatCard
          title="System Status"
          value="Secure"
          description="All systems operational"
          icon={<CheckCircle className="w-6 h-6" />}
          color="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Encryption Events */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-accent" />
                Encryption Activity
              </CardTitle>
              <CardDescription>Real-time encryption and decryption events</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="shimmer h-12 rounded-lg"></div>
                  ))}
                </div>
              ) : events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No encryption events yet</p>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            event.event_type === 'encrypt'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {event.event_type} • {event.table_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {event.record_count} records
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.success ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audit Logs */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Audit Logs
              </CardTitle>
              <CardDescription>Recent system activity and access logs</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="shimmer h-12 rounded-lg"></div>
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No audit logs yet</p>
              ) : (
                <div className="space-y-3">
                  {logs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.table_name || 'System'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions for Non-Admin */}
        {!isAdmin && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Access your most used features</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <button className="p-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-left">
                  <Users className="w-6 h-6 text-primary mb-2" />
                  <p className="font-medium">View Results</p>
                  <p className="text-xs text-muted-foreground">Check your marks</p>
                </button>
                <button className="p-4 rounded-xl bg-accent/10 hover:bg-accent/20 transition-colors text-left">
                  <Activity className="w-6 h-6 text-accent mb-2" />
                  <p className="font-medium">Attendance</p>
                  <p className="text-xs text-muted-foreground">View attendance</p>
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Status</CardTitle>
                <CardDescription>Your data protection status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-success" />
                      <span className="font-medium">Data Encrypted</span>
                    </div>
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-success" />
                      <span className="font-medium">AES-256 Active</span>
                    </div>
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-success" />
                      <span className="font-medium">Access Logged</span>
                    </div>
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
