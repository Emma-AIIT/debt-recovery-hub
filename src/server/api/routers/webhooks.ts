import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { createClient } from "@/lib/supabase/server";

export const webhooksRouter = createTRPCRouter({
  syncXero: publicProcedure
    .input(
      z.object({
        clients: z.array(
          z.object({
            xeroContactId: z.string(),
            name: z.string(),
            email: z.string(),
            phone: z.string().optional(),
            company: z.string().optional(),
            currentBalance: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      
      for (const client of input.clients) {
        // Upsert client
        await supabase
          .from('clients')
          .upsert({
            xero_contact_id: client.xeroContactId,
            name: client.name,
            email: client.email,
            phone: client.phone,
            company: client.company,
            current_balance: client.currentBalance,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'xero_contact_id'
          });
      }
      
      return { success: true, count: input.clients.length };
    }),

  updatePayment: publicProcedure
    .input(
      z.object({
        xeroContactId: z.string(),
        newBalance: z.number(),
        paymentAmount: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      
      // Get current client
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('xero_contact_id', input.xeroContactId)
        .single();
      
      if (!client) throw new Error("Client not found");
      
      // Reset streak if payment reduces balance
      const newStreak = input.newBalance < client.current_balance ? 0 : client.streak_days;
      // Calculate status based on day-based thresholds
      const newStatus = newStreak === 0 ? 'current'
        : newStreak <= 14 ? 'warning'
        : newStreak <= 21 ? 'critical'
        : 'suspended';
      
      // Calculate week change (balance difference)
      const weekChange = input.newBalance - client.current_balance;

      // Update client
      await supabase
        .from('clients')
        .update({
          previous_balance: client.current_balance,
          current_balance: input.newBalance,
          streak_days: newStreak,
          week_change: weekChange,
          last_balance_check_date: new Date().toISOString(),
          status: newStatus,
          last_payment_date: new Date().toISOString(),
        })
        .eq('xero_contact_id', input.xeroContactId);
      
      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          client_id: client.id,
          activity_type: 'payment',
          outcome: `Payment of $${input.paymentAmount.toFixed(2)} received`,
        });
      
      return { success: true };
    }),

  logActivity: publicProcedure
    .input(
      z.object({
        xeroContactId: z.string(),
        activityType: z.enum(['call', 'sms', 'email', 'suspension']),
        outcome: z.string().optional(),
        recordingUrl: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = await createClient();
      
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('xero_contact_id', input.xeroContactId)
        .single();
      
      if (!client) throw new Error("Client not found");
      
      await supabase
        .from('activity_log')
        .insert({
          client_id: client.id,
          activity_type: input.activityType,
          outcome: input.outcome,
          recording_url: input.recordingUrl,
          notes: input.notes,
        });
      
      // Update last contact date
      await supabase
        .from('clients')
        .update({
          last_contact_date: new Date().toISOString(),
          last_call_outcome: input.outcome,
        })
        .eq('id', client.id);
      
      return { success: true };
    }),
});
