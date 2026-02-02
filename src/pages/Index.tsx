import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Users, BookOpen, Activity, Database, CheckCircle, ArrowRight } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="hero-gradient min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white">University ERP</h1>
              <p className="text-xs text-white/60">Secure Academic Records</p>
            </div>
          </div>
          <Link to="/auth">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Sign In
            </Button>
          </Link>
        </header>

        {/* Hero Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <Badge className="mb-6 bg-primary/20 text-primary border-primary/30">
              <Lock className="w-3 h-3 mr-1" />
              AES-256 Encryption
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
              Enterprise-Grade <br />
              <span className="text-primary">Academic Records</span> <br />
              Management
            </h1>
            
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-8">
              Secure, real-time management of 10,000+ student records with military-grade 
              encryption, role-based access control, and complete audit logging.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="btn-primary-gradient text-lg px-8">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <Database className="w-5 h-5" />, value: '10,000+', label: 'Records Encrypted' },
              { icon: <Users className="w-5 h-5" />, value: '4', label: 'Role Types' },
              { icon: <Lock className="w-5 h-5" />, value: 'AES-256', label: 'Encryption' },
              { icon: <Activity className="w-5 h-5" />, value: 'Real-time', label: 'Updates' },
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-xl p-4 text-center bg-white/5 backdrop-blur-sm">
                <div className="text-primary mb-2 flex justify-center">{stat.icon}</div>
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Built for Indian Universities
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive ERP solution designed specifically for the unique needs of Indian academic institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Lock className="w-8 h-8" />,
                title: 'AES-256 Encryption',
                description: 'Military-grade encryption for all sensitive academic records including marks, attendance, and certificates.',
                color: 'bg-accent/10 text-accent',
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: 'Role-Based Access',
                description: 'Four distinct roles: Admin, Faculty, Student, and Exam Cell with granular permission controls.',
                color: 'bg-primary/10 text-primary',
              },
              {
                icon: <Activity className="w-8 h-8" />,
                title: 'Real-time Dashboard',
                description: 'Live statistics, encryption events, and audit logs updated in real-time via WebSocket connections.',
                color: 'bg-secondary/10 text-secondary',
              },
              {
                icon: <Database className="w-8 h-8" />,
                title: 'Bulk Operations',
                description: 'Upload and encrypt 10,000+ records in batches with automatic encryption and validation.',
                color: 'bg-success/10 text-success',
              },
              {
                icon: <BookOpen className="w-8 h-8" />,
                title: 'Complete Audit Trail',
                description: 'Every encryption, decryption, and access event is logged with timestamps and user details.',
                color: 'bg-warning/10 text-warning',
              },
              {
                icon: <CheckCircle className="w-8 h-8" />,
                title: 'RLS Security',
                description: 'Row-Level Security policies ensure data isolation between departments and users.',
                color: 'bg-info/10 text-info',
              },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-card border shadow-sm hover:shadow-lg transition-all duration-300">
                <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-secondary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Ready to Secure Your Academic Records?
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Get started with enterprise-grade encryption for your institution today.
          </p>
          <Link to="/auth">
            <Button size="lg" className="btn-primary-gradient text-lg px-8">
              Create Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-background border-t">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold">University ERP</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 University ERP. Secure Academic Records Management.
          </p>
        </div>
      </footer>
    </div>
  );
}
