'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ClientTable } from '@/components/dashboard/ClientTable';
import { ClientDetailDrawer } from '@/components/dashboard/ClientDetailDrawer';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SyncButton } from '@/components/dashboard/SyncButton';
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

        <div className="relative z-10 p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8 lg:space-y-10">
            {/* Header */}
            <header className="flex flex-col gap-4 sm:gap-6">
              {/* Top row - Logo and actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#headerGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <defs>
                        <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <span className="hidden sm:block text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-[0.2em]">Debt Recovery Hub</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <ThemeToggle />
                  <SyncButton />
                </div>
              </div>

              {/* Title row */}
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] tracking-tight">
                  Debt Collection
                </h1>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1 sm:mt-2 tracking-wide flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden sm:block">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  {currentDate}
                </p>
              </div>
            </header>

            {/* Stats Grid */}
            <section>
              {/* Mobile: Hero card + 2x2 grid */}
              <div className="sm:hidden space-y-3">
                {/* Hero stat - Total Outstanding */}
                <div className="rounded-2xl bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/15 to-purple-500/10 border border-blue-500/10 flex items-center justify-center text-blue-400">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-[0.1em]">Total Outstanding</span>
                      </div>
                      <p className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
                        {new Intl.NumberFormat('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                          maximumFractionDigits: 0,
                        }).format(stats?.totalOutstanding ?? 0)}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-faint)] mt-1">Across all clients</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/5 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400/60">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 2x2 Grid for other stats */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Clients */}
                  <div className="rounded-xl bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </div>
                      <span className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Clients</span>
                    </div>
                    <p className="text-xl font-bold text-[var(--color-text-primary)]">{stats?.totalClients ?? 0}</p>
                    <p className="text-[10px] text-[var(--color-text-faint)]">With balances</p>
                  </div>

                  {/* At Risk */}
                  <div className="rounded-xl bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </div>
                      <span className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">At Risk</span>
                    </div>
                    <p className="text-xl font-bold text-[var(--color-text-primary)]">{stats?.atRisk ?? 0}</p>
                    <p className="text-[10px] text-[var(--color-text-faint)]">1-2 weeks</p>
                  </div>

                  {/* Suspended */}
                  <div className="rounded-xl bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                      </div>
                      <span className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Suspended</span>
                    </div>
                    <p className="text-xl font-bold text-[var(--color-text-primary)]">{stats?.suspended ?? 0}</p>
                    <p className="text-[10px] text-[var(--color-text-faint)]">3+ weeks</p>
                  </div>

                  {/* Collection Rate */}
                  <div className="rounded-xl bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                      </div>
                      <span className="text-[9px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Collection</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-xl font-bold text-[var(--color-text-primary)]">{stats?.collectionRate.toFixed(1) ?? 0}%</p>
                      <span className="text-[9px] font-medium text-emerald-400">+5.2%</span>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-faint)]">This month</p>
                  </div>
                </div>
              </div>

              {/* Desktop: Grid layout */}
              <div className="hidden sm:grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
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
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text-primary)]">Clients</h2>
                  <p className="text-[10px] sm:text-xs text-[var(--color-text-faint)] mt-0.5">Manage and track client balances</p>
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
