import { createTRPCRouter, publicProcedure } from "../trpc";
import { env } from "~/env";

// In-memory store for last sync timestamp (in production, use a database)
// This is a simple solution - for production, consider using a database table
let lastSyncTimestamp: Date | null = null;

export const syncRouter = createTRPCRouter({
  trigger: publicProcedure.mutation(async () => {
    const webhookUrl = env.MAKE_SYNC_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error("MAKE_SYNC_WEBHOOK_URL is not configured");
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Make.com webhook returned status ${response.status}`);
      }

      return {
        success: true,
        message: "Sync started",
      };
    } catch (error) {
      console.error("Error triggering Make.com webhook:", error);
      throw new Error(
        error instanceof Error
          ? `Failed to trigger sync: ${error.message}`
          : "Failed to trigger sync",
      );
    }
  }),

  getLastSync: publicProcedure.query(async () => {
    // Return the last sync timestamp
    // In production, this should query from a database
    return {
      lastSync: lastSyncTimestamp?.toISOString() ?? null,
    };
  }),

  updateLastSync: publicProcedure.mutation(async () => {
    // Update the last sync timestamp
    // This is called by the webhook when sync completes
    lastSyncTimestamp = new Date();
    return {
      success: true,
      lastSync: lastSyncTimestamp.toISOString(),
    };
  }),
});
