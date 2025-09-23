# RLS Policy Cleanup Analysis

## Overview
This document outlines the analysis and cleanup of unused Row Level Security (RLS) policies in the Supabase database for the Aircrew Shuffle application.

## Current Database Tables and Usage

### Active Tables (Used by Application)
1. **staff** - User profiles and authentication
2. **shifts** - Shift management and scheduling
3. **swap_requests** - Shift swapping functionality
4. **subscriptions** - Premium feature management
5. **companies** - Company selection during signup
6. **audit_logs** - Security logging (optional feature)

### Policies Analysis

#### Companies Table
- **Current Policies**: 2 identical "Companies are viewable by everyone" policies
- **Action**: Remove duplicate, keep single policy
- **Reason**: Duplicate policies serve no purpose and create confusion

#### Staff Table
- **Current Policies**: 
  - "Users can view staff at same base location" (KEEP)
  - "Users can view all staff for team features" (REMOVE)
- **Action**: Remove overly permissive policy
- **Reason**: Security risk - allows any user to view all staff data

#### Swap Requests Table
- **Current Policies**:
  - "Users can view swap requests at same base" (KEEP)
  - "Users can view all swap requests" (REMOVE)
- **Action**: Remove overly permissive policy
- **Reason**: Security risk - allows any user to view all swap requests

#### Audit Logs Table
- **Current Policies**: 
  - "Users can view their own audit logs"
  - "Admins can view all audit logs" 
  - "System can insert audit logs"
- **Action**: Keep (optional removal available)
- **Reason**: Useful for GDPR compliance and security monitoring

## Security Improvements

### Removed Policies
1. **Duplicate companies policy** - Eliminates redundancy
2. **"Users can view all staff for team features"** - Prevents unauthorized data access
3. **"Users can view all swap requests"** - Prevents unauthorized data access

### Security Benefits
- Reduced attack surface
- Better data privacy compliance
- Cleaner policy structure
- Easier maintenance and debugging

## Application Functionality Impact

### Maintained Features
- ✅ User authentication and profiles
- ✅ Shift management and viewing
- ✅ Shift swapping between colleagues at same base
- ✅ Subscription management
- ✅ Company selection during signup
- ✅ Team view functionality (with proper restrictions)

### Security Enhancements
- 🔒 Users can only view staff at their base location
- 🔒 Users can only view swap requests at their base location
- 🔒 No unauthorized access to all staff data
- 🔒 No unauthorized access to all swap requests

## Migration Strategy

### Files Created
1. `cleanup_unused_rls_policies.sql` - Comprehensive analysis and cleanup script
2. `remove_unused_policies.sql` - Targeted policy removal script
3. `RLS_POLICY_CLEANUP_ANALYSIS.md` - This documentation

### Execution Steps
1. Run `remove_unused_policies.sql` in Supabase SQL Editor
2. Verify application functionality
3. Test security restrictions
4. Commit changes to git

## Testing Checklist

After running the cleanup scripts, verify:

- [ ] User can view their own profile
- [ ] User can view shifts at their base location
- [ ] User can create swap requests
- [ ] User can view swap requests at their base
- [ ] Company selection works during signup
- [ ] Subscription management functions properly
- [ ] No unauthorized access to other base data

## Rollback Plan

If issues arise, restore policies using:
```sql
-- Restore overly permissive policies if needed
CREATE POLICY "Users can view all staff for team features" 
ON public.staff 
FOR SELECT 
USING (true);

CREATE POLICY "Users can view all swap requests" 
ON public.swap_requests 
FOR SELECT 
USING (true);
```

## Conclusion

This cleanup removes unused and overly permissive RLS policies while maintaining all essential application functionality. The changes improve security posture and reduce the attack surface without impacting user experience.
