import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import {
  Shield,
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  Upload,
  Settings,
  Key,
  Activity,
  LogOut,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function DashboardSidebar() {
  const { user, profile, role, signOut, isAdmin, isFaculty, isStudent, isExamCell } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeClass = () => {
    switch (role) {
      case 'admin':
        return 'role-badge-admin';
      case 'faculty':
        return 'role-badge-faculty';
      case 'student':
        return 'role-badge-student';
      case 'exam_cell':
        return 'role-badge-exam_cell';
      default:
        return '';
    }
  };

  return (
    <Sidebar className="sidebar-gradient border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sidebar-foreground">University ERP</h1>
            <p className="text-xs text-sidebar-foreground/60">Secure Records</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard')}>
                  <Link to="/dashboard" className="nav-link">
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {(isAdmin || isFaculty || isExamCell) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard/students')}>
                    <Link to="/dashboard/students" className="nav-link">
                      <Users className="w-5 h-5" />
                      <span>Students</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/results')}>
                  <Link to="/dashboard/results" className="nav-link">
                    <GraduationCap className="w-5 h-5" />
                    <span>Results</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/dashboard/attendance')}>
                  <Link to="/dashboard/attendance" className="nav-link">
                    <BookOpen className="w-5 h-5" />
                    <span>Attendance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard/departments')}>
                    <Link to="/dashboard/departments" className="nav-link">
                      <Building className="w-5 h-5" />
                      <span>Departments</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard/bulk-upload')}>
                    <Link to="/dashboard/bulk-upload" className="nav-link">
                      <Upload className="w-5 h-5" />
                      <span>Bulk Upload</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard/encryption')}>
                    <Link to="/dashboard/encryption" className="nav-link">
                      <Key className="w-5 h-5" />
                      <span>Encryption</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard/audit-logs')}>
                    <Link to="/dashboard/audit-logs" className="nav-link">
                      <Activity className="w-5 h-5" />
                      <span>Audit Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isExamCell && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50">Exam Cell</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/dashboard/publish-results')}>
                    <Link to="/dashboard/publish-results" className="nav-link">
                      <FileText className="w-5 h-5" />
                      <span>Publish Results</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
              {getInitials(profile?.full_name || user?.email || 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || user?.email}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass()}`}>
              {role?.replace('_', ' ').toUpperCase() || 'USER'}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
