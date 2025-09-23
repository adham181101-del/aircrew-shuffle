# Table Operations Matrix

This document provides a comprehensive inventory of all Supabase table access patterns in the codebase.

## Summary of Findings

**Total Tables Used**: 6 (companies, shifts, staff, swap_requests, subscriptions, audit_logs)
**Client-Side Access**: 100% of operations (no service role usage found)
**RPC Functions Used**: 4 custom functions
**Security Risk**: High - all operations currently rely on permissive RLS policies

## Detailed Table Analysis

### 1. Companies Table
**Operations**: SELECT only
**Access Pattern**: Public read-only data
**Files**: `src/lib/auth.ts`
```typescript
// Get all companies (public data)
.from('companies').select('*').order('name')
// Get company by email domain
.from('companies').select('*').eq('email_domain', domain)
// Validate company for signup
.from('companies').select('email_domain').eq('id', companyId)
```
**RLS Risk**: LOW - Public data, no sensitive information

### 2. Staff Table
**Operations**: SELECT, INSERT, UPDATE
**Access Pattern**: User-owned records + company-scoped queries
**Files**: Multiple files across the application
```typescript
// User profile updates
.from('staff').update({ staff_number, ... }).eq('id', userId)
// Get staff by base location (company-scoped)
.from('staff').select('*').eq('base_location', user.base_location)
// Authentication queries
.from('staff').select('email').eq('staff_number', staff_number)
.from('staff').select('id').eq('staff_number', sanitizedStaffNumber)
```
**RLS Risk**: HIGH - Contains sensitive user data, company associations

### 3. Shifts Table
**Operations**: SELECT, INSERT, UPDATE, DELETE
**Access Pattern**: User-owned records + company-scoped queries
**Files**: `src/lib/shifts.ts`, `src/pages/ManageSwaps.tsx`, etc.
```typescript
// User's own shifts
.from('shifts').select('*').eq('staff_id', staffId)
// Create new shift
.from('shifts').insert({ date, time, staff_id })
// Update shift time
.from('shifts').update({ time }).eq('id', shiftId)
// Delete shift
.from('shifts').delete().eq('id', shiftId)
// Company-scoped queries for swaps
.from('shifts').select('*').eq('date', shiftDate)
```
**RLS Risk**: HIGH - Core business data, financial implications

### 4. Swap Requests Table
**Operations**: SELECT, INSERT, UPDATE, DELETE
**Access Pattern**: Multi-user ownership (requester + accepter)
**Files**: `src/pages/ManageSwaps.tsx`, `src/contexts/NotificationContext.tsx`
```typescript
// Incoming requests (user is accepter)
.from('swap_requests').select('*').eq('accepter_id', userId)
// Outgoing requests (user is requester)
.from('swap_requests').select('*').eq('requester_id', userId)
// Create swap request
.from('swap_requests').insert({ requester_id, requester_shift_id, ... })
// Update status
.from('swap_requests').update({ status: 'accepted' }).eq('id', swapId)
// Delete request
.from('swap_requests').delete().eq('id', swapId)
```
**RLS Risk**: CRITICAL - Multi-user data, complex ownership model

### 5. Subscriptions Table
**Operations**: SELECT, INSERT, UPDATE, DELETE
**Access Pattern**: User-owned records
**Files**: `src/lib/subscriptions.ts`
```typescript
// Get user's subscription
.from('subscriptions').select('*').eq('user_id', user.id)
```
**RLS Risk**: HIGH - Financial data, payment information

### 6. Audit Logs Table
**Operations**: SELECT, INSERT
**Access Pattern**: User-owned records + admin access
**Files**: `src/lib/audit.ts`
```typescript
// Insert audit log
.from('audit_logs').insert([auditLog])
// Get user's audit logs
.from('audit_logs').select('*').eq('user_id', user.id)
```
**RLS Risk**: MEDIUM - Security logs, contains user activity data

## RPC Functions Analysis

### 1. get_eligible_staff_for_swap
**File**: `src/pages/CreateSwapRequest.tsx`
**Purpose**: Get staff eligible for shift swaps
**Risk**: MEDIUM - Company-scoped data access

### 2. execute_shift_swap
**File**: `src/lib/shifts.ts`
**Purpose**: Execute approved shift swaps
**Risk**: HIGH - Financial/business logic operations

### 3. get_all_staff_for_team
**File**: `src/lib/auth.ts`
**Purpose**: Get all staff for team view
**Risk**: HIGH - Cross-tenant data access

### 4. verify_data_integrity
**File**: `src/lib/auth.ts`
**Purpose**: Verify database integrity
**Risk**: MEDIUM - Admin function

## Security Concerns

### Critical Issues
1. **All operations are client-side** - No server-side validation
2. **Permissive RLS policies** - Currently using `USING (true)` policies
3. **No service role usage** - All operations use user context
4. **Complex multi-user ownership** - Swap requests have multiple owners

### Required Changes
1. **Implement proper RLS policies** - Replace permissive policies
2. **Add server-side validation** - Move sensitive operations to API routes
3. **Company-scoped access** - Ensure users only see their company's data
4. **Admin privilege handling** - Proper admin override mechanisms

## Migration Strategy

### Phase A (Non-Breaking)
- Add proper RLS policies alongside existing permissive ones
- Implement server-side API routes for sensitive operations
- Add database constraints and triggers

### Phase B (Remove Permissive Policies)
- Remove `USING (true)` policies
- Test all functionality
- Monitor for any access issues

## Files Requiring Changes

### High Priority
- `src/pages/ManageSwaps.tsx` - Complex swap operations
- `src/lib/shifts.ts` - Core business logic
- `src/lib/auth.ts` - Authentication and team operations
- `src/contexts/NotificationContext.tsx` - Cross-user data access

### Medium Priority
- `src/pages/CreateSwapRequest.tsx` - Swap creation logic
- `src/lib/subscriptions.ts` - Payment operations
- `src/lib/audit.ts` - Audit logging

### Low Priority
- `src/components/team/TeamView.tsx` - Team display (read-only)
- `src/components/auth/SignInForm.tsx` - Authentication form
