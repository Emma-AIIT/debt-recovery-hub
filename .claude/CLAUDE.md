# Debt Recovery Hub - Claude Project Instructions

## Project Identity

**Project Name**: Debt Recovery Hub  
**Live URL**: https://debt-recovery-hub-rho.vercel.app/  
**Owner**: Zimraan @ All In IT Solutions  
**Project Type**: Internal Tool → Future SaaS Product

## What This Is

Debt Recovery Hub is a **frontend dashboard** that replaces Google Sheets tracking for managing client debt collection. It displays real-time data about debtors from Xero accounting software, showing:

- How much each client owes (current balance)
- Their payment history and trends
- Streak tracking: consecutive weeks/days without payment reduction
- Status indicators (Current → Warning → Critical → Suspended)
- Contact history (calls, SMS, emails)

**Key Principle**: The dashboard is a **viewing layer only**. All automation, outreach, and data processing happens in Make.com workflows running in the background.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    XERO ACCOUNTING                          │
│              (Source of Truth for Invoices)                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─── Daily Sync (Make.com @ 6am)
                   └─── Payment Watcher (Make.com monitors)
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   MAKE.COM WORKFLOWS                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │ 1. Daily Xero Sync (Scheduled @ 6am)               │    │
│  │ 2. Manual Sync Now (Webhook trigger)               │    │
│  │ 3. Monday Outreach (Every Monday @ 9am)            │    │
│  │ 4. Payment Watcher (Monitors payments)             │    │
│  │ 5. Suspension Tracker (21 days/3 weeks check)      │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─── UPSERT operations
                   ├─── Activity logging
                   └─── Webhook calls
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Tables:                                            │    │
│  │  • clients (main table)                             │    │
│  │  • weekly_snapshots (historical tracking)           │    │
│  │  • activity_log (contact history)                   │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─── Real-time subscriptions
                   └─── tRPC queries
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS DASHBOARD (Frontend)                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • Client table with search/filter                  │    │
│  │  • Stats cards (total outstanding, at-risk, etc)    │    │
│  │  • Status badges (visual indicators)                │    │
│  │  • Contact history timeline                         │    │
│  │  • "Sync Now" button (triggers webhook)             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                   │
                   ├─── VAPI (AI voice calls)
                   ├─── Twilio (SMS)
                   └─── Outlook (Email)
```

## Core Make.com Workflows

### Workflow 1: Daily Xero Sync (Scheduled @ 6am)

**Trigger**: Timer/Schedule module (every day at 6:00 AM)

**Process**:
1. GET request to Xero API: `/Invoices?where=Status=="AUTHORISED"&Statuses=PAID,UNPAID` (get all invoices from last 24h)
2. Iterator: Loop through each invoice
3. For each invoice:
   - Extract: `ContactID`, `ContactName`, `AmountDue`, `Total`, `InvoiceNumber`
   - GET contact details from Xero: `/Contacts/{ContactID}`
4. Edge Function: `POST /api/sync-xero` (webhook endpoint)
   - Payload: Contact details + balance information
5. Edge Function logic:
   - UPSERT into Supabase `clients` table:
     - If `xero_contact_id` exists: UPDATE contact info from Xero (name, email, phone)
     - If `xero_contact_id` doesn't exist: INSERT new client record
   - **CRITICAL**: Preserve internally-managed fields during UPDATE:
     - `streak_weeks` (calculated by streak tracker)
     - `previous_balance` (set by weekly snapshot)
     - `last_contact_date` (set by outreach workflows)
     - `last_call_outcome` (set by VAPI)
     - `status` (calculated by business logic)
   - Only update from Xero: `first_name`, `last_name`, `email`, `phone_number`, `business_name`, `current_balance`

### Workflow 2: Manual "Sync Now" Button

**Trigger**: Webhook from Dashboard (user clicks "Sync Now" button)

**Process**: 
- Identical to Daily Xero Sync workflow
- Provides immediate sync on-demand
- Webhook URL: `https://hook.us1.make.com/[unique-id]`
- Button in dashboard calls this webhook → Make.com pulls all Xero contacts → UPSERT to Supabase

### Workflow 3: Monday Outreach Automation (Every Monday @ 9am)

**Trigger**: Timer/Schedule module (every Monday at 9:00 AM)

**Process**:
1. Edge Function: `GET /api/clients-to-contact` 
   - Query Supabase for clients where:
     - `current_balance > 0` (they owe money)
     - `status IN ('warning', 'critical')` (at risk)
2. Iterator: Loop through each client
3. For each client:
   - **Step A: VAPI Call**
     - HTTP Module: POST to VAPI API
     - Payload: `{ phone_number: client.phone_number, context: { name, balance, business_name } }`
     - VAPI makes AI-powered call
     - Webhook response: `{ call_id, outcome, recording_url }`
   - **Step B: Twilio SMS**
     - HTTP Module: POST to Twilio API
     - Message template: "Hi {name}, this is a friendly reminder about your outstanding balance of ${balance}. Please contact us at [number]."
   - **Step C: Outlook Email**
     - Microsoft Graph Module: POST `/me/sendMail`
     - Email template: Professional payment reminder with balance details
   - **Step D: Log Activity**
     - Edge Function: `POST /api/log-activity`
     - Insert into `activity_log` table:
       - `client_id`, `activity_type: 'outreach_monday'`, `outcome`, `recording_url`, `notes`, `created_at`
   - **Step E: Update Last Contact**
     - Edge Function: `POST /api/update-client`
     - Update `clients.last_contact_date` to current timestamp

### Workflow 4: Payment Watcher (Continuous Monitoring)

**Trigger**: Webhook from Xero (payment received) OR Scheduled check (hourly/daily - TBD)

**Process**:
1. GET `/Invoices?where=Status=="PAID"&DateFrom={last_24_hours}` (recently paid invoices)
2. Iterator: Loop through each payment
3. For each payment:
   - Find client by `xero_contact_id`
   - Calculate new `current_balance` (sum of all unpaid invoices for this contact)
   - Edge Function: `POST /api/update-payment`
     - Compare `current_balance` with `previous_balance`
     - **IF balance decreased** (`current_balance < previous_balance`):
       - Set `streak_weeks = 0` (payment made, reset streak)
       - Update `status = 'current'` (back to good standing)
       - Log activity: `activity_type: 'payment_received'`
     - **IF balance unchanged or increased**:
       - Keep `streak_weeks` as-is (no payment made)
     - Update `current_balance` in database
     - Insert into `activity_log`: `{ activity_type: 'payment_update', notes: 'Balance updated from Xero' }`

### Workflow 5: Suspension Tracker (21 Days / 3 Weeks Check)

**Trigger**: Timer/Schedule (daily check @ 7am) OR Weekly check on Mondays

**Process**:
1. Edge Function: `GET /api/clients-at-risk`
   - Query clients where:
     - `streak_weeks >= 3` (3 consecutive weeks without payment reduction)
     - `status = 'critical'` (not yet suspended)
     - Calculate: `days_since_last_payment = today - last_payment_date`
2. Iterator: Loop through at-risk clients
3. For each client:
   - **Check suspension criteria**:
     - IF `streak_weeks >= 3` AND `days_since_last_payment >= 21`:
       - **Suspension Triggered**
   - **Step A: Send Suspension Warning Email**
     - Microsoft Graph Module: POST `/me/sendMail`
     - Email template: "FINAL NOTICE: Your services will be suspended in 48 hours unless payment is received"
   - **Step B: Update Status**
     - Edge Function: `POST /api/update-client`
     - Set `status = 'suspended'`
   - **Step C: Add Xero Note**
     - HTTP Module: PUT `/Contacts/{ContactID}`
     - Add to contact notes: "SUSPENDED: {date} - No payment for 21 days/3 weeks"
   - **Step D: Log Activity**
     - Edge Function: `POST /api/log-activity`
     - Insert: `{ activity_type: 'suspension_warning', notes: 'Suspension email sent' }`

## Database Schema (Supabase / Prisma)

### Table: clients

```sql
CREATE TABLE clients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  xero_contact_id TEXT UNIQUE NOT NULL,          -- Links to Xero
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  business_name TEXT,
  
  -- Financial tracking
  current_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,    -- Current amount owed
  previous_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,   -- Balance from last snapshot
  
  -- Streak tracking
  streak_weeks INTEGER DEFAULT 0,                -- Consecutive weeks without payment reduction
  last_payment_date TIMESTAMP,                   -- Last time balance decreased
  
  -- Status management
  status TEXT DEFAULT 'current',                 -- current | warning | critical | suspended
  
  -- Contact tracking
  last_contact_date TIMESTAMP,                   -- Last outreach attempt
  last_call_outcome TEXT,                        -- answered | voicemail | no_answer | failed
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_xero_contact_id ON clients(xero_contact_id);
CREATE INDEX idx_status ON clients(status);
CREATE INDEX idx_streak_weeks ON clients(streak_weeks);
```

### Table: weekly_snapshots

```sql
CREATE TABLE weekly_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES clients(id),
  week_start DATE NOT NULL,                      -- Start of week (Monday)
  balance NUMERIC(10, 2) NOT NULL,               -- Balance at start of week
  payment_made BOOLEAN DEFAULT FALSE,            -- Did payment reduce balance?
  created_at TIMESTAMP DEFAULT NOW()
);

-- Composite index for querying
CREATE INDEX idx_client_week ON weekly_snapshots(client_id, week_start);
```

### Table: activity_log

```sql
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES clients(id),
  activity_type TEXT NOT NULL,                   -- call | sms | email | payment | suspension
  outcome TEXT,                                  -- For calls: answered | voicemail | no_answer
  recording_url TEXT,                            -- VAPI call recording (if applicable)
  notes TEXT,                                    -- Additional context
  metadata JSONB,                                -- Flexible field for extra data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for recent activity queries
CREATE INDEX idx_activity_recent ON activity_log(client_id, created_at DESC);
CREATE INDEX idx_activity_type ON activity_log(activity_type);
```

## Business Logic Rules

### Status Calculation

Status is calculated based on `streak_weeks`:

```javascript
function calculateStatus(streakWeeks, daysSinceLastPayment) {
  if (streakWeeks === 0 || streakWeeks === 1) {
    return 'current';  // Green - Good standing
  }
  if (streakWeeks === 2) {
    return 'warning';  // Amber - Needs attention
  }
  if (streakWeeks >= 3 && daysSinceLastPayment < 21) {
    return 'critical'; // Red - Urgent
  }
  if (streakWeeks >= 3 && daysSinceLastPayment >= 21) {
    return 'suspended'; // Gray - Services suspended
  }
  return 'current'; // Default fallback
}
```

### Streak Tracking Logic (Weekly Snapshot)

**When**: Every Monday at 6:00 AM (after Daily Xero Sync completes)

**Process**:
1. For each client with `current_balance > 0`:
   - Compare `current_balance` vs `previous_balance`
   - **IF** `current_balance >= previous_balance` (no payment or balance increased):
     - `streak_weeks += 1` (increment streak)
   - **ELSE** `current_balance < previous_balance` (payment made):
     - `streak_weeks = 0` (reset streak)
   - Create `weekly_snapshots` record:
     - `client_id`, `week_start`, `balance: current_balance`, `payment_made: (balance decreased)`
   - Update `previous_balance = current_balance` (prepare for next week)
   - Recalculate `status` based on new `streak_weeks`

### Payment Detection

**When**: Payment Watcher detects new paid invoice in Xero

**Process**:
1. Fetch all unpaid invoices for contact
2. Sum `AmountDue` to get new `current_balance`
3. Compare with database `previous_balance`:
   - **IF decreased**: Payment made
     - Reset `streak_weeks = 0`
     - Update `status = 'current'`
     - Log activity: `payment_received`
   - **IF unchanged or increased**: No effective payment
     - Keep `streak_weeks` unchanged

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS (dark theme)
- **Data Fetching**: tRPC (type-safe APIs)
- **UI Components**: shadcn/ui, Lucide icons
- **Hosting**: Vercel

### Backend
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **API**: Next.js API Routes + tRPC
- **Auth**: NextAuth.js (future)

### Integrations
- **Xero**: OAuth 2.0 for accounting data
- **VAPI**: AI voice calling
- **Twilio**: SMS messaging
- **Microsoft Graph**: Outlook email sending
- **Make.com**: Automation orchestration

### File Structure

```
debt-recovery-hub/
├── prisma/
│   └── schema.prisma                    # Database schema
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Main dashboard
│   │   ├── layout.tsx                   # Root layout
│   │   └── api/
│   │       ├── sync-xero/route.ts       # Webhook: Xero → Supabase
│   │       ├── update-payment/route.ts  # Webhook: Payment watcher
│   │       ├── log-activity/route.ts    # Webhook: Activity logging
│   │       └── trpc/[trpc]/route.ts     # tRPC handler
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   │   ├── clients.ts           # Client queries
│   │   │   │   ├── stats.ts             # Dashboard metrics
│   │   │   │   └── activity.ts          # Activity log queries
│   │   │   └── root.ts
│   │   └── db.ts                        # Prisma client
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx           # Metrics display
│   │   │   ├── ClientTable.tsx          # Main data table
│   │   │   ├── ClientDrawer.tsx         # Client detail view
│   │   │   └── StatusBadge.tsx          # Visual status indicator
│   │   └── ui/                          # shadcn/ui components
│   └── lib/
│       ├── utils.ts                     # Helper functions
│       └── calculations.ts              # Business logic
├── .env.local                           # Environment variables
└── package.json
```

## Key Decision Points & Open Questions

### ✅ RESOLVED: UPSERT Strategy
**Decision**: Use UPSERT in Make.com Edge Function calls
- UPDATE contact info from Xero (name, email, phone, business_name, current_balance)
- PRESERVE automation-managed fields (streak_weeks, previous_balance, status, last_contact_date)
- This prevents race conditions and data loss

### ⚠️ OPEN QUESTION: Sync Frequency for Balance Updates

**Current State**: 
- Daily sync @ 6am gets all contacts
- Payment Watcher monitors for new payments (TBD: hourly? daily? webhook?)

**Question from User**: "should we check every day / sync everybody's figures every day in make.com?"

**Options**:

**Option A: Daily Full Sync (Current)**
- ✅ Simple, reliable
- ✅ One scheduled workflow
- ❌ Miss payments during the day (could be 24h delay)
- ❌ Not real-time

**Option B: Hourly Payment Checks**
- ✅ More responsive (max 1 hour delay)
- ✅ Still scheduled, predictable
- ⚠️ More Make.com operations
- ⚠️ Still not real-time

**Option C: Xero Webhooks (Best Practice)**
- ✅ Real-time updates when payments occur
- ✅ Most efficient (only run when needed)
- ⚠️ Requires webhook setup in Xero
- ⚠️ Need to handle webhook reliability

**Option D: Hybrid Approach** (RECOMMENDED)
- Daily full sync @ 6am (catchall, ensures consistency)
- Xero webhooks for payment events (real-time)
- Fallback: If webhook fails, daily sync catches it
- ✅ Best of both worlds
- ✅ Reliable + responsive

**Recommendation**: Implement Option D - hybrid approach
- Keep daily sync as baseline
- Add Xero webhook for invoice.PAID events
- Payment Watcher workflow triggered by webhook
- Daily sync acts as safety net

### ⚠️ OPEN QUESTION: Streak Reset Logic

**Current Implementation**: 
- Streak resets when `current_balance < previous_balance`

**Edge Cases to Consider**:
1. Client makes partial payment (balance decreases, but still owes money)
   - Should streak reset to 0? **YES** (current logic)
2. Client makes payment but adds new invoice same day (balance increases)
   - Should streak reset? **DEBATABLE**
   - Suggestion: Reset only if balance decreased from previous snapshot
3. Client pays full amount (balance = 0)
   - Should they remain in system? **YES** (for historical tracking)
   - Auto-update status to 'current' with streak_weeks = 0

### Dashboard Feature Gaps (Nice-to-Have)

Current implementation has:
- ✅ Client table with search/filter
- ✅ Stats cards (total outstanding, client count, at-risk, suspended)
- ✅ Status badges
- ✅ Last contact tracking

Missing/Future:
- ⏳ Client detail drawer (payment history, activity timeline)
- ⏳ Manual action buttons (call now, email now, suspend now)
- ⏳ Payment history charts (trend over time)
- ⏳ Export to CSV/PDF
- ⏳ Real-time updates via Supabase subscriptions

## API Routes Required (Next.js)

### Webhook Endpoints (Called by Make.com)

**POST /api/sync-xero**
- Receives: Contact details from Xero
- Action: UPSERT into `clients` table
- Returns: `{ success: true, client_id }`

**POST /api/update-payment**
- Receives: `{ xero_contact_id, new_balance, payment_amount }`
- Action: Update balance, check for payment, reset streak if needed
- Returns: `{ success: true, streak_reset: boolean }`

**POST /api/log-activity**
- Receives: `{ client_id, activity_type, outcome, recording_url, notes }`
- Action: Insert into `activity_log`
- Returns: `{ success: true, activity_id }`

**POST /api/update-client**
- Receives: `{ client_id, updates: {...} }`
- Action: Update client record
- Returns: `{ success: true }`

### Query Endpoints (Called by Make.com or Dashboard)

**GET /api/clients-to-contact**
- Returns: Clients with `status IN ('warning', 'critical')` and `current_balance > 0`
- Used by: Monday Outreach workflow

**GET /api/clients-at-risk**
- Returns: Clients with `streak_weeks >= 3` and pending suspension
- Used by: Suspension Tracker workflow

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Xero OAuth
XERO_CLIENT_ID=""
XERO_CLIENT_SECRET=""
XERO_TENANT_ID=""

# VAPI
VAPI_API_KEY=""
VAPI_PHONE_NUMBER_ID=""

# Twilio
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

# Microsoft Graph
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_TENANT_ID=""
SENDER_EMAIL="noreply@allinitsolutions.com.au"

# Make.com Webhooks
MAKE_SYNC_WEBHOOK_URL="https://hook.us1.make.com/..."

# NextAuth (future)
NEXTAUTH_SECRET=""
NEXTAUTH_URL="https://debt-recovery-hub-rho.vercel.app"
```

## Coding Standards

### TypeScript
- **Strict mode**: Always enabled
- **No `any` types**: Use `unknown` if type is truly unknown
- **Interfaces**: Define for all data structures
- **Zod validation**: All API inputs validated

### React/Next.js
- **App Router**: Use server components by default
- **Client components**: Only when needed (`'use client'` directive)
- **Hooks**: Extract reusable logic into custom hooks
- **Small components**: Single responsibility principle

### Styling
- **Tailwind utility classes**: Prefer over custom CSS
- **Dark theme**: Default color palette
- **Mobile-first**: Responsive design
- **Accessibility**: Proper contrast, labels, ARIA attributes

### API Design
- **tRPC**: Type-safe APIs
- **Zod schemas**: Input validation
- **Consistent responses**: `{ success: boolean, data?: T, error?: string }`
- **Error handling**: Try/catch with user-friendly messages

## Testing Strategy

### Manual Testing Checklist
- [ ] Sync Now button pulls Xero contacts correctly
- [ ] Client table displays all clients with correct balances
- [ ] Status badges show correct colors (current=green, warning=amber, critical=red, suspended=gray)
- [ ] Search/filter works for client names and business names
- [ ] Stats cards calculate totals correctly
- [ ] Payment detection resets streak_weeks correctly
- [ ] Monday Outreach workflow triggers calls/SMS/emails
- [ ] Suspension workflow sends emails after 21 days
- [ ] Activity log records all contact attempts

### Edge Cases to Test
1. New client added to Xero (should appear after sync)
2. Client makes payment (streak should reset)
3. Client makes multiple payments in one week (streak = 0)
4. Client goes 3 weeks without payment (status → critical)
5. Client suspended, then makes payment (status → current, streak = 0)
6. Multiple clients with same name (ensure unique by xero_contact_id)

## Development Workflow

### Phase 1: Core Dashboard ✅ COMPLETE
- [x] Next.js project setup with T3 stack
- [x] Prisma schema designed
- [x] Dashboard layout with mock data
- [x] Client table with sorting/filtering
- [x] Stats cards component
- [x] Status badges

### Phase 2: Backend Integration (IN PROGRESS)
- [ ] Implement Xero OAuth flow
- [ ] Build webhook API routes (/api/sync-xero, /api/update-payment, etc.)
- [ ] Connect Supabase to frontend via tRPC
- [ ] Test with real Xero data
- [ ] Implement streak calculation logic

### Phase 3: Make.com Workflows
- [ ] Build Daily Xero Sync automation
- [ ] Build Manual Sync Now webhook
- [ ] Build Monday Outreach workflow (VAPI + Twilio + Outlook)
- [ ] Build Payment Watcher workflow
- [ ] Build Suspension Tracker workflow

### Phase 4: Polish & Production
- [ ] Client detail drawer with activity timeline
- [ ] Manual action buttons (call/email/SMS from dashboard)
- [ ] Real-time updates via Supabase subscriptions
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] Deploy to production (Vercel)

## What Claude Should Focus On

### High Priority
1. **API route implementation** - Webhook endpoints for Make.com
2. **Business logic** - Streak calculation, status updates
3. **Error handling** - Graceful failures, user-friendly messages
4. **Type safety** - Comprehensive TypeScript interfaces

### Medium Priority
1. **UI components** - Client drawer, activity timeline
2. **Data visualization** - Payment charts, trend analysis
3. **Search/filter logic** - Advanced filtering options

### Low Priority (Post-MVP)
1. **Authentication** - NextAuth.js for multi-user access
2. **Role-based permissions** - Admin vs. viewer roles
3. **Email templates** - Rich HTML email designs
4. **Reporting** - PDF exports, CSV downloads

## Key Principles for Claude

1. **Dashboard = Viewing Layer Only**: Never implement business logic in frontend. All automation happens in Make.com.

2. **UPSERT is Critical**: Always preserve internally-managed fields when syncing from Xero. Update only contact info and balance.

3. **Streak Logic is Sacred**: Streak tracking is the core of the system. Never reset streaks incorrectly.

4. **Type Safety First**: All data flows must be type-safe. Use Zod + TypeScript everywhere.

5. **Real Users, Real Money**: This affects real businesses. Error handling and data integrity are paramount.

6. **Make.com is the Brain**: The dashboard shows what Make.com decides. The dashboard doesn't make decisions.

## Common Patterns & Examples

### Example: tRPC Query for Clients

```typescript
// src/server/api/routers/clients.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const clientsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      status: z.enum(['all', 'current', 'warning', 'critical', 'suspended']).optional(),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {};
      
      if (input.status && input.status !== 'all') {
        where.status = input.status;
      }
      
      if (input.search) {
        where.OR = [
          { firstName: { contains: input.search, mode: 'insensitive' } },
          { lastName: { contains: input.search, mode: 'insensitive' } },
          { businessName: { contains: input.search, mode: 'insensitive' } },
        ];
      }
      
      return await ctx.db.client.findMany({
        where,
        orderBy: { streakWeeks: 'desc' },
        include: {
          _count: {
            select: { activities: true }
          }
        }
      });
    }),
});
```

### Example: Webhook Handler (Sync Xero)

```typescript
// src/app/api/sync-xero/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { z } from 'zod';

const SyncSchema = z.object({
  xero_contact_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  business_name: z.string(),
  current_balance: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = SyncSchema.parse(body);
    
    // UPSERT: Update contact info, preserve automation fields
    const client = await db.client.upsert({
      where: { xeroContactId: data.xero_contact_id },
      update: {
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phoneNumber: data.phone_number,
        businessName: data.business_name,
        currentBalance: data.current_balance,
        // DO NOT update: streakWeeks, previousBalance, status, lastContactDate
      },
      create: {
        xeroContactId: data.xero_contact_id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phoneNumber: data.phone_number,
        businessName: data.business_name,
        currentBalance: data.current_balance,
        previousBalance: data.current_balance, // Initialize
        streakWeeks: 0,
        status: 'current',
      },
    });
    
    return NextResponse.json({ success: true, client_id: client.id });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync client' },
      { status: 500 }
    );
  }
}
```

### Example: Calculate Dashboard Stats

```typescript
// src/server/api/routers/stats.ts
import { createTRPCRouter, publicProcedure } from "../trpc";

export const statsRouter = createTRPCRouter({
  getDashboardStats: publicProcedure
    .query(async ({ ctx }) => {
      const clients = await ctx.db.client.findMany({
        where: { currentBalance: { gt: 0 } }
      });
      
      const totalOutstanding = clients.reduce(
        (sum, c) => sum + Number(c.currentBalance), 
        0
      );
      
      const totalClients = clients.length;
      
      const atRisk = clients.filter(
        c => c.status === 'warning' || c.status === 'critical'
      ).length;
      
      const suspended = clients.filter(
        c => c.status === 'suspended'
      ).length;
      
      // Calculate collection rate (clients who've made payments this month)
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const paymentsThisMonth = await ctx.db.activityLog.count({
        where: {
          activityType: 'payment_received',
          createdAt: { gte: thisMonth }
        }
      });
      
      const collectionRate = totalClients > 0 
        ? (paymentsThisMonth / totalClients) * 100 
        : 0;
      
      return {
        totalOutstanding,
        totalClients,
        atRisk,
        suspended,
        collectionRate: collectionRate.toFixed(1),
      };
    }),
});
```

## Success Criteria

### MVP Must-Haves
- [ ] Dashboard displays all clients from Supabase
- [ ] Stats cards show accurate totals
- [ ] Client table with search/filter/sort
- [ ] Status badges with correct colors
- [ ] Sync Now button triggers Make.com webhook
- [ ] Xero sync UPSERT works correctly
- [ ] Streak calculation logic correct
- [ ] Payment detection resets streaks

### Post-MVP Nice-to-Haves
- [ ] Client detail drawer with activity timeline
- [ ] Manual action buttons (call/email/SMS)
- [ ] Payment history charts
- [ ] Real-time updates via Supabase subscriptions
- [ ] Export to CSV/PDF
- [ ] Multi-user authentication
- [ ] Email templates customization

## Final Notes

This is a **production system** managing real debt collection for real businesses. Every design decision prioritizes:
1. **Data integrity** - Never lose or corrupt financial data
2. **Reliability** - System must work consistently
3. **Clarity** - Status and actions must be obvious
4. **Maintainability** - Code must be understandable in 6 months

When in doubt, ask clarifying questions. When suggesting solutions, explain trade-offs. When writing code, prioritize correctness over cleverness.

**Remember**: Make.com is the automation engine. The dashboard is the window. Keep them separate, keep them clear.