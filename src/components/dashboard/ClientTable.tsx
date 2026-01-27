'use client';

import { type FC, useState } from 'react';
import { type Client } from '@/types/database';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

interface ClientTableProps {
  clients: Client[];
  onClientClick?: (clientId: string) => void;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export const ClientTable: FC<ClientTableProps> = ({ clients, onClientClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      client.name.toLowerCase().includes(searchLower) ||
      (client.company?.toLowerCase().includes(searchLower) ?? false) ||
      client.email.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  const getBalanceChange = (current: number, previous: number) => {
    const change = current - previous;
    if (change === 0) return { text: 'No change', color: 'text-[var(--color-text-faint)]', icon: '—' };
    if (change < 0) return { text: formatCurrency(Math.abs(change)), color: 'text-emerald-400', icon: '↓' };
    return { text: formatCurrency(change), color: 'text-rose-400', icon: '↑' };
  };

  return (
    <div className="space-y-5">
      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-faint)]">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search clients, companies, emails..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-[var(--color-input-bg)] border border-[var(--color-border-default)] rounded-xl pl-11 pr-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-border-strong)] focus:ring-1 focus:ring-[var(--color-border-strong)] transition-all duration-200"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="appearance-none bg-[var(--color-input-bg)] border border-[var(--color-border-default)] rounded-xl pl-4 pr-10 py-3 text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-border-strong)] focus:ring-1 focus:ring-[var(--color-border-strong)] transition-all duration-200 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="current">Current</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="suspended">Suspended</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-faint)]">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-gradient-to-b from-[var(--color-bg-card)] to-[var(--color-bg-secondary)]">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-border-strong)] to-transparent" />

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
                <th className="px-6 py-4 text-left">
                  <span className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-[0.15em]">Client</span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-[0.15em]">Outstanding</span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-[0.15em]">Week Change</span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-[0.15em]">Streak</span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-[0.15em]">Status</span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-[0.15em]">Last Contact</span>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-[0.15em]">Last Call</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client, index) => {
                const balanceChange = getBalanceChange(client.current_balance, client.previous_balance);

                return (
                  <tr
                    key={client.id}
                    onClick={() => onClientClick?.(client.id)}
                    className={`
                      group border-b border-[var(--color-border-subtle)] last:border-b-0
                      transition-all duration-200 ease-out
                      ${onClientClick ? 'cursor-pointer hover:bg-[var(--color-bg-hover)]' : ''}
                    `}
                    style={{
                      animationDelay: `${index * 30}ms`
                    }}
                    role={onClientClick ? 'button' : undefined}
                    tabIndex={onClientClick ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (onClientClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onClientClick(client.id);
                      }
                    }}
                    aria-label={onClientClick ? `View details for ${client.name}` : undefined}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-card)] border border-[var(--color-border-default)] flex items-center justify-center text-xs font-medium text-[var(--color-text-muted)] group-hover:border-[var(--color-border-strong)] transition-colors">
                          {client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                            {client.name}
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors">
                            {client.company ?? '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-mono text-[var(--color-text-primary)] tracking-tight">
                        {formatCurrency(client.current_balance)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium flex items-center gap-1.5 ${balanceChange.color}`}>
                        <span className="text-xs opacity-70">{balanceChange.icon}</span>
                        <span className="font-mono tracking-tight">{balanceChange.text}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-semibold ${
                          client.streak_days === 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : client.streak_days <= 14
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {client.streak_days}
                        </span>
                        {client.streak_days > 0 && (
                          <span className="text-[10px] text-[var(--color-text-faint)] uppercase tracking-wide">days</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {client.last_contact_date
                          ? formatDistanceToNow(new Date(client.last_contact_date), { addSuffix: true })
                          : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        client.last_call_outcome === 'Answered'
                          ? 'text-emerald-400'
                          : client.last_call_outcome === 'Voicemail'
                            ? 'text-amber-400'
                            : client.last_call_outcome === 'No Answer'
                              ? 'text-rose-400'
                              : 'text-[var(--color-text-faint)]'
                      }`}>
                        {client.last_call_outcome ?? '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {paginatedClients.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-faint)]">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">No clients match your search</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-3 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors underline underline-offset-2"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <p className="text-xs text-[var(--color-text-faint)]">
            Showing <span className="text-[var(--color-text-muted)] font-medium">{startIndex + 1}</span>–
            <span className="text-[var(--color-text-muted)] font-medium">{Math.min(endIndex, filteredClients.length)}</span> of{' '}
            <span className="text-[var(--color-text-muted)] font-medium">{filteredClients.length}</span> clients
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-faint)]">Per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="appearance-none bg-[var(--color-input-bg)] border border-[var(--color-border-default)] rounded-lg px-2 py-1 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-border-strong)] cursor-pointer"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-input-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-input-bg)] disabled:hover:text-[var(--color-text-muted)] transition-all"
            aria-label="First page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </button>

          {/* Previous page */}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-input-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-input-bg)] disabled:hover:text-[var(--color-text-muted)] transition-all"
            aria-label="Previous page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          {/* Page indicator */}
          <div className="px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text-secondary)] font-medium">{currentPage}</span>
            <span className="mx-1">/</span>
            <span>{totalPages || 1}</span>
          </div>

          {/* Next page */}
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-input-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-input-bg)] disabled:hover:text-[var(--color-text-muted)] transition-all"
            aria-label="Next page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          {/* Last page */}
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-input-bg)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-secondary)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-input-bg)] disabled:hover:text-[var(--color-text-muted)] transition-all"
            aria-label="Last page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
