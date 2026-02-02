import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function DashboardHeader() {
  const { role } = useAuth();

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="lg:hidden" />
        <div className="hidden sm:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search students, records..."
            className="pl-9 w-64 lg:w-80"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline" className="hidden sm:flex gap-1.5 items-center encrypted-badge">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          Encryption Active
        </Badge>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
        </Button>
      </div>
    </header>
  );
}
