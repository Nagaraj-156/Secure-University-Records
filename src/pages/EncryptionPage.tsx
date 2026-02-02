import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEncryptionEvents } from '@/hooks/useEncryptionEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Lock, Key, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EncryptionPage() {
  const { isAdmin } = useAuth();
  const { events, loading, error } = useEncryptionEvents(100);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <p className="text-lg font-medium">Admin Access Required</p>
          <p className="text-muted-foreground">Only administrators can manage encryption</p>
        </div>
      </div>
    );
  }

  const encryptCount = events.filter(e => e.event_type === 'encrypt').reduce((sum, e) => sum + e.record_count, 0);
  const decryptCount = events.filter(e => e.event_type === 'decrypt').reduce((sum, e) => sum + e.record_count, 0);
  const successRate = events.length > 0 
    ? Math.round((events.filter(e => e.success).length / events.length) * 100) 
    : 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Encryption Management</h1>
          <p className="text-muted-foreground">Monitor and manage AES-256 encryption operations</p>
        </div>
        <Badge variant="outline" className="encrypted-badge w-fit">
          <Shield className="w-4 h-4" />
          <span>AES-256-GCM Active</span>
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{encryptCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Records Encrypted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Key className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{decryptCount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Decryption Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Encryption Configuration
          </CardTitle>
          <CardDescription>Current encryption settings and key information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-1">Algorithm</p>
                <p className="text-lg font-mono">AES-256-GCM</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-1">Key Length</p>
                <p className="text-lg font-mono">256 bits</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-1">Mode</p>
                <p className="text-lg font-mono">Galois/Counter Mode</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium mb-1">IV Length</p>
                <p className="text-lg font-mono">96 bits (12 bytes)</p>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">Key Rotation Recommended</p>
                <p className="text-sm text-muted-foreground mt-1">
                  For enhanced security, rotate encryption keys periodically. This requires re-encrypting all stored data.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Encryption Events
          </CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${events.length} events recorded`}
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
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No encryption events yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id} className="table-row-hover">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {format(new Date(event.created_at), 'MMM dd, HH:mm:ss')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            event.event_type === 'encrypt'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-primary/10 text-primary'
                          }
                        >
                          {event.event_type === 'encrypt' ? (
                            <Lock className="w-3 h-3 mr-1" />
                          ) : (
                            <Key className="w-3 h-3 mr-1" />
                          )}
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{event.table_name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{event.record_count.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        {event.success ? (
                          <div className="flex items-center gap-2 text-success">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Success</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-destructive">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm" title={event.error_message || ''}>
                              Failed
                            </span>
                          </div>
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
