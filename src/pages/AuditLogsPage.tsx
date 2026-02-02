import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, AlertTriangle, Clock, User, Database } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogsPage() {
  const { isAdmin } = useAuth();
  const { logs, loading, error } = useAuditLogs(100);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <p className="text-lg font-medium">Admin Access Required</p>
          <p className="text-muted-foreground">Only administrators can view audit logs</p>
        </div>
      </div>
    );
  }

  const getActionBadgeColor = (action: string) => {
    if (action.includes('encrypt') || action.includes('decrypt')) return 'bg-accent/10 text-accent';
    if (action.includes('upload') || action.includes('seed')) return 'bg-primary/10 text-primary';
    if (action.includes('view') || action.includes('read')) return 'bg-info/10 text-info';
    if (action.includes('delete')) return 'bg-destructive/10 text-destructive';
    return 'bg-secondary/10 text-secondary';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Complete history of system activity and access events</p>
        </div>
        <Badge variant="outline" className="w-fit">
          <Activity className="w-4 h-4 mr-1" />
          Real-time updates
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Log
          </CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${logs.length} events recorded`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="shimmer h-14 rounded-lg"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No audit logs yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="table-row-hover">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeColor(log.action)}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.table_name ? (
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{log.table_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.details ? (
                          <pre className="text-xs bg-muted p-2 rounded max-w-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2).slice(0, 100)}
                            {JSON.stringify(log.details).length > 100 && '...'}
                          </pre>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.user_id ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-xs truncate max-w-[100px]">
                              {log.user_id.slice(0, 8)}...
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
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
