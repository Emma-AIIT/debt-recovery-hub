'use client';

import { useState, useEffect } from 'react';
import { api } from '@/trpc/react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const LAST_SYNC_KEY = 'xero_last_sync_timestamp';

export function SyncButton() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [syncStartTime, setSyncStartTime] = useState<Date | null>(null);

  // Query for last sync timestamp
  const { data: syncData } = api.sync.getLastSync.useQuery(undefined, {
    refetchInterval: isPolling ? 10000 : false, // Poll every 10 seconds when syncing
  });

  const triggerSync = api.sync.trigger.useMutation({
    onSuccess: () => {
      const now = new Date();
      setSyncStartTime(now);
      setIsPolling(true);
      
      // Set a timeout for 5 minutes
      setTimeout(() => {
        setIsPolling(false);
        toast.error('Sync is taking longer than expected. Please check back later.', {
          duration: 6000,
        });
      }, 5 * 60 * 1000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start sync. Please try again.');
    },
  });

  // Load last sync timestamp on mount
  useEffect(() => {
    if (syncData?.lastSync) {
      setLastSync(new Date(syncData.lastSync));
      localStorage.setItem(LAST_SYNC_KEY, syncData.lastSync);
    } else {
      // Fallback to localStorage if server doesn't have it
      const stored = localStorage.getItem(LAST_SYNC_KEY);
      if (stored) {
        setLastSync(new Date(stored));
      }
    }
  }, [syncData]);

  // Check if sync completed
  useEffect(() => {
    if (!isPolling || !syncData?.lastSync || !syncStartTime) return;

    const completedTime = new Date(syncData.lastSync);
    if (completedTime > syncStartTime) {
      setIsPolling(false);
      setLastSync(completedTime);
      // Update localStorage for persistence
      localStorage.setItem(LAST_SYNC_KEY, completedTime.toISOString());
      
      toast.success(
        (t) => (
          <div className="flex flex-col gap-2">
            <span>Sync completed! Refresh the page to see updated data.</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
        ),
        {
          duration: 10000,
        }
      );
    }
  }, [syncData, isPolling, syncStartTime]);

  const handleSync = () => {
    triggerSync.mutate();
  };

  const isLoading = triggerSync.isPending || isPolling;

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={handleSync}
          disabled={isLoading}
          className="group relative px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium text-sm transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700"
        >
          <span className="flex items-center gap-2">
            {isLoading ? (
              <>
                <svg
                  className="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:rotate-180 transition-transform duration-500"
                >
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Sync Xero
              </>
            )}
          </span>
        </button>
        {lastSync && (
          <div className="text-xs text-[var(--color-text-faint)]">
            Last sync: {formatDistanceToNow(lastSync, { addSuffix: true })}
          </div>
        )}
      </div>
    </>
  );
}
