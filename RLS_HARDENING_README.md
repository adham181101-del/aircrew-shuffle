# RLS Hardening Implementation Guide

This document provides a comprehensive guide for implementing Row Level Security (RLS) hardening in the Aircrew Shuffle application.

## Overview

The application currently uses permissive RLS policies (`USING (true)`) that allow wide-open access to data. This implementation provides a secure, multi-tenant solution while maintaining all existing functionality.

## Architecture

### Current State
- **Client-side operations**: All database operations happen in the browser
- **Permissive RLS**: Policies allow all authenticated users to access all data
- **No service role usage**: All operations use user context
- **Security risk**: High - users can access other companies' data

### Target State
- **Secure RLS**: Proper policies enforce data isolation
- **Server-side validation**: Sensitive operations moved to API routes
- **Multi-tenant isolation**: Users can only access their company's data
- **Admin overrides**: Proper admin access controls

## Implementation Plan

### Phase A: Non-Breaking Implementation
1. ✅ **Scan & Inventory** - Analyze all database access patterns
2. ✅ **Data Ownership Model** - Define ownership for each table
3. ✅ **Phase A Migration** - Add secure policies alongside permissive ones
4. ✅ **API Routes** - Create serverless functions for sensitive operations
5. ✅ **Client Refactoring** - Update client code to use API routes
6. ✅ **Tests** - Add RLS isolation tests

### Phase B: Remove Permissive Policies
1. **Remove Permissive Policies** - Drop `USING (true)` policies
2. **Final Testing** - Verify all functionality works
3. **Monitor** - Watch for any access issues

## File Structure

```
├── docs/
│   ├── ownership.md                    # Data ownership model
│   └── table_operations_matrix.md      # Database access inventory
├── supabase/migrations/
│   ├── 20250123000000_rls_phase_a.sql  # Phase A: Add secure policies
│   └── 20250123000001_rls_phase_b.sql  # Phase B: Remove permissive policies
├── api/
│   ├── admin/
│   │   └── get-all-staff.ts           # Admin: Get all staff
│   ├── team/
│   │   └── get-company-staff.ts       # Team: Get company staff
│   └── swaps/
│       ├── execute-swap.ts            # Execute shift swaps
│       └── get-eligible-staff.ts      # Get eligible staff for swaps
├── src/lib/
│   └── api-client.ts                  # Client for API calls
└── tests/
    └── rls-isolation.test.ts          # RLS isolation tests
```

## Data Ownership Model

| Table | Owner Field | Scope | Access Pattern |
|-------|-------------|-------|----------------|
| **companies** | N/A | Public | Read-only reference data |
| **staff** | `id` | User | Own record + same company |
| **shifts** | `staff_id` | User | Own shifts + same company |
| **swap_requests** | `requester_id`, `accepter_id` | Multi-user | Involved parties + same company |
| **subscriptions** | `user_id` | User | Own subscription only |
| **audit_logs** | `user_id` | User + Admin | Own logs + admin override |

## Security Policies

### Per-User Tables (staff, subscriptions, audit_logs)
```sql
-- Users can access their own records
USING (auth.uid() = owner_field)

-- Admin override
USING (public.is_admin(auth.uid()))
```

### Company-Scoped Tables (shifts, swap_requests)
```sql
-- Users can access records from same company
USING (EXISTS (
  SELECT 1 FROM public.staff s1
  JOIN public.staff s2 ON s1.company_id = s2.company_id
  WHERE s1.id = auth.uid() AND s2.id = target_staff_id
))
```

### Multi-User Ownership (swap_requests)
```sql
-- Users involved in the swap
USING (auth.uid() = requester_id OR auth.uid() = accepter_id)

-- Company-scoped access
USING (EXISTS (company membership check))
```

## API Routes

### Authentication Pattern
```typescript
// Verify user authentication
const userSupabase = createClient(url, anonKey, {
  global: { headers: { Authorization: req.headers.authorization } }
})
const { data: { user } } = await userSupabase.auth.getUser()

// Check permissions with service role
const adminSupabase = createClient(url, serviceKey)
const { data: staff } = await adminSupabase
  .from('staff')
  .select('company_id, is_admin')
  .eq('user_id', user.id)
  .single()
```

### Authorization Patterns
```typescript
// Company membership check
if (staff.company_id !== requiredCompanyId) {
  return res.status(403).json({ error: 'Forbidden' })
}

// Admin check
const adminStaffNumbers = ['ADMIN001', 'ADMIN002', '254575']
if (!adminStaffNumbers.includes(staff.staff_number)) {
  return res.status(403).json({ error: 'Admin access required' })
}
```

## Client Migration

### Before (Direct Supabase)
```typescript
// Direct database access - security risk
const { data } = await supabase
  .from('staff')
  .select('*')
  .eq('base_location', location)
```

### After (API Routes)
```typescript
// Secure API access
const { data } = await apiClient.getCompanyStaff()
```

## Testing Strategy

### Unit Tests
- Test RLS policies in isolation
- Verify policy logic with different user scenarios
- Test admin override functionality

### Integration Tests
- Test end-to-end user flows
- Verify company isolation
- Test cross-tenant access prevention

### Security Tests
- Attempt unauthorized data access
- Test privilege escalation prevention
- Verify audit logging

## Deployment Checklist

### Phase A Deployment
- [ ] Run Phase A migration
- [ ] Deploy API routes
- [ ] Update client code
- [ ] Run integration tests
- [ ] Monitor for issues

### Phase B Deployment
- [ ] Run Phase B migration
- [ ] Verify all functionality works
- [ ] Monitor application logs
- [ ] Have rollback plan ready

## Rollback Plan

### Emergency Rollback
```sql
-- Restore permissive policies if needed
CREATE POLICY "Staff viewable by all" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Shifts viewable by all" ON public.shifts FOR SELECT USING (true);
-- ... etc for other tables
```

### Gradual Rollback
1. Remove secure policies one table at a time
2. Test functionality after each removal
3. Identify and fix issues before proceeding

## Monitoring

### Key Metrics
- Authentication failures
- Authorization denials
- API route errors
- Database query performance

### Alerts
- Unusual access patterns
- Failed authentication spikes
- Performance degradation
- Error rate increases

## Security Benefits

### Before
- ❌ Users can access all data
- ❌ No company isolation
- ❌ No admin controls
- ❌ Client-side security only

### After
- ✅ Users can only access their data
- ✅ Company-level isolation
- ✅ Proper admin controls
- ✅ Server-side validation
- ✅ Audit logging
- ✅ Immutable ownership

## Performance Considerations

### Indexes Added
- `idx_staff_user_id` - Fast user lookups
- `idx_staff_company_id` - Company membership checks
- `idx_shifts_staff_id` - User shift queries
- `idx_swap_requests_requester_id` - Swap request lookups

### Query Optimization
- RLS policies use indexed columns
- EXISTS clauses optimized with proper indexes
- Minimal performance impact expected

## Troubleshooting

### Common Issues

#### 500 Errors
- Check RLS policies are correct
- Verify user authentication
- Check API route permissions

#### Permission Denied
- Verify user has proper company membership
- Check admin privileges if needed
- Review policy conditions

#### Performance Issues
- Check index usage
- Review complex policy conditions
- Monitor query execution plans

### Debug Queries
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check user permissions
SELECT public.is_admin('user-id');
SELECT public.get_user_company_id('user-id');

-- Test policy conditions
SELECT auth.uid() as current_user;
```

## Next Steps

1. **Review Implementation** - Ensure all requirements are met
2. **Run Tests** - Execute RLS isolation tests
3. **Deploy Phase A** - Add secure policies
4. **Monitor & Test** - Verify functionality works
5. **Deploy Phase B** - Remove permissive policies
6. **Final Verification** - Confirm security goals achieved

## Support

For questions or issues with this implementation:
1. Check the troubleshooting section
2. Review the test files for examples
3. Consult the Supabase RLS documentation
4. Create an issue in the project repository
