# Data Ownership & RLS

## Table Ownership Model

- **companies**: Public reference data -> no ownership restrictions
- **staff**: User membership -> `user_id`, `company_id`, `is_admin`
- **shifts**: User-owned shifts -> `staff_id` + `company_id` (via staff table)
- **swap_requests**: Multi-user ownership -> `requester_user_id`, `target_user_id` + company scope
- **subscriptions**: Per-user -> `user_id`

## RLS Policies (Target State)

- **End users**: `authenticated` with predicates (user/tenant)
- **Admin/system tasks**: `service_role` 
- **No policies for `public`**

## Migration Phases

### Phase A (Non-Breaking)
- ✅ Move from public to authenticated-only access
- ✅ Add user-scoped policies alongside permissive ones
- ✅ Restrict subscriptions DELETE to service_role only

### Phase B (Harden - Apply Later)
- ⏳ Remove permissive `USING (true)` policies
- ⏳ Add table-specific owner/tenant policies
- ⏳ Test all functionality before applying

## Implementation Checklist

### Environment Security
- ✅ Stop tracking `.env` files
- ✅ Add `.env.example` with placeholders
- ✅ Use environment variables for all secrets

### Supabase Client Split
- ✅ Browser client: `src/integrations/supabase/client.ts` (publishable key)
- ✅ Server client: `api/_supabaseAdmin.ts` (service role key)
- ✅ Remove hardcoded URLs and keys

### Security Headers
- ✅ Add HSTS, X-Frame-Options, etc. in `vercel.json`
- ✅ Add caching headers for assets and API routes

### CI/CD
- ✅ Add GitHub Actions workflow for build/lint/typecheck

### RLS Migrations
- ✅ Phase A: Non-breaking tighten (authenticated-only)
- ✅ Phase B: Harden (remove permissive policies)

### React Query
- ✅ Add React Query provider for caching/deduplication

### Health Monitoring
- ✅ Add health endpoint to verify environment setup

## Post-Deployment Steps

1. **Set Environment Variables in Vercel:**
   - `VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=sb_publishable_...`
   - `SUPABASE_URL=https://<PROJECT_REF>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=sb_secret_...`

2. **Apply Phase A Migration:**
   - Run `supabase/migrations/2025-09-23_rls_phase_a.sql`
   - Verify app functionality

3. **Plan Phase B:**
   - Add table-specific owner/tenant policies
   - Test thoroughly
   - Apply `supabase/migrations/2025-09-23_rls_phase_b.sql`

## Security Benefits

- **Before**: Wide-open access with `USING (true)` policies
- **After**: Proper authentication and authorization
- **Future**: Company-scoped multi-tenant isolation