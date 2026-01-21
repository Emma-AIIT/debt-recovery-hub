'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ClientTable } from '@/components/dashboard/ClientTable';
import { ClientDetailDrawer } from '@/components/dashboard/ClientDetailDrawer';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { format } from 'date-fns';

export default function HomePage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = api.clients.getStats.useQuery();
  const { data: clients, isLoading: clientsLoading } = api.clients.getAll.useQuery({});

  if (statsLoading || clientsLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          {/* Animated loader */}
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-card)]" />
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-blue-500/50 animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--color-text-muted)] tracking-wide">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentDate = format(new Date(), "'Week of' d MMMM yyyy");

  return (
    <>
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        {/* Decorative background elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
          {/* Gradient orbs */}
          <div className="absolute -top-[400px] -left-[200px] w-[800px] h-[800px] rounded-full bg-blue-500/5 blur-[120px]" />
          <div className="absolute -bottom-[200px] -right-[200px] w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[100px]" />
        </div>

        <div className="relative z-10 p-6 md:p-8 lg:p-10">
          <div className="max-w-[1400px] mx-auto space-y-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#headerGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <defs>
                        <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-[0.2em]">Debt Recovery Hub</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] tracking-tight">
                  Debt Collection
                </h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-2 tracking-wide flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  {currentDate}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Last sync indicator */}
                <div className="hidden md:flex items-center gap-2 text-xs text-[var(--color-text-faint)]">
                  <span>Last sync: Today, 9:00 AM</span>
                </div>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Sync Button */}
                <button className="group relative px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium text-sm transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500">
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                    Sync Xero
                  </span>
                </button>
              </div>
            </header>

            {/* Stats Grid */}
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
                <StatsCard
                  title="Total Outstanding"
                  value={new Intl.NumberFormat('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                    maximumFractionDigits: 0,
                  }).format(stats?.totalOutstanding ?? 0)}
                  subtitle="Across all clients"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Total Clients"
                  value={stats?.totalClients ?? 0}
                  subtitle="With balances"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  }
                />
                <StatsCard
                  title="At Risk"
                  value={stats?.atRisk ?? 0}
                  subtitle="1-2 weeks overdue"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Suspended"
                  value={stats?.suspended ?? 0}
                  subtitle="3+ weeks overdue"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  }
                />
                <StatsCard
                  title="Collection Rate"
                  value={`${stats?.collectionRate.toFixed(1) ?? 0}%`}
                  subtitle="This month"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  }
                  trend={{ value: '+5.2%', positive: true }}
                />
              </div>
            </section>

            {/* Client Table Section */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Clients</h2>
                  <p className="text-xs text-[var(--color-text-faint)] mt-0.5">Manage and track client balances</p>
                </div>
              </div>
              <ClientTable
                clients={clients ?? []}
                onClientClick={setSelectedClientId}
              />
            </section>
          </div>
        </div>
      </div>

      {/* Client Detail Drawer */}
      <ClientDetailDrawer
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
      />
    </>
  );
}
