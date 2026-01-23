import { NextRequest, NextResponse } from "next/server";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * Webhook endpoint to receive sync completion notification from Make.com
 * 
 * Make.com should be configured to call this endpoint when the sync completes.
 * The endpoint updates the last sync timestamp which the frontend polls for.
 * 
 * Configure Make.com to call: POST https://your-domain.com/api/webhooks/sync-complete
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the request (optional: add authentication/authorization here)
    // For now, we'll accept any POST request, but you can add:
    // - API key validation
    // - Signature verification
    // - IP whitelist checking

    const body = await req.json().catch(() => ({}));
    
    // Log the completion
    console.log("Sync completed at:", new Date().toISOString(), body);

    // Update the last sync timestamp via tRPC
    const ctx = await createTRPCContext({
      headers: req.headers,
    });
    const caller = appRouter.createCaller(ctx);
    await caller.sync.updateLastSync();

    // Return success response
    return NextResponse.json(
      { success: true, message: "Sync completion recorded" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing sync completion webhook:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
