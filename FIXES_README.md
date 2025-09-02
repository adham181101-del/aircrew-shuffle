# Fixes for Staff Visibility and Swap Request Issues

## Problem Summary

The application was experiencing HTTP 500 server errors when trying to:
1. Find eligible staff for swap requests
2. Display staff information in the team view
3. Load swap request details

## Root Causes

1. **Missing Database Function**: The `get_all_staff_for_team()` function referenced in the code didn't exist in the database
2. **Restrictive RLS Policies**: Row Level Security policies were too restrictive, preventing staff from viewing each other
3. **Inefficient Queries**: The swap request logic was making multiple database calls instead of using optimized functions

## Solutions Applied

### 1. Database Function Creation

Created two new database functions:

#### `get_all_staff_for_team()`
- Returns all staff from the same company as the current user
- Used by the team view to display staff members
- Includes proper security checks

#### `get_eligible_staff_for_swap(base_location, date, requester_id)`
- Returns staff who are OFF on a specific date at the same base location
- Optimized for swap request functionality
- Excludes the requester from the results

### 2. RLS Policy Updates

Updated Row Level Security policies to:
- Allow staff to view other staff at the same base location
- Enable team functionality while maintaining security
- Allow swap request viewing for team members

### 3. Frontend Improvements

#### CreateSwapRequest Component
- Now uses the optimized database function as primary method
- Falls back to manual query if function fails
- Better error handling and debugging

#### TeamView Component
- Staff are now grouped by base location with clear headers
- Better visual organization of team members
- Improved working status display

## Files Modified

### Database Scripts
- `scripts/fix_staff_rls_for_swaps.sql` - Main fix script
- `scripts/test_database_functions.sql` - Verification script

### Frontend Components
- `src/pages/CreateSwapRequest.tsx` - Updated to use database function
- `src/components/team/TeamView.tsx` - Improved staff grouping and display

## How to Apply the Fixes

### Step 1: Run the Database Fix Script

```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d postgres -f scripts/fix_staff_rls_for_swaps.sql
```

### Step 2: Verify the Fixes

```bash
# Run the test script to verify everything is working:
psql -h your-supabase-host -U postgres -d postgres -f scripts/test_database_functions.sql
```

### Step 3: Test the Application

1. **Create Swap Request**: Should now find eligible staff members
2. **Team View**: Should display staff grouped by base location
3. **Manage Swaps**: Should load without HTTP 500 errors

## Expected Results

After applying these fixes:

1. ✅ **No more HTTP 500 errors** when fetching staff data
2. ✅ **Eligible staff found** for swap requests
3. ✅ **Staff properly grouped** by base location in team view
4. ✅ **Working status clearly displayed** for each team member
5. ✅ **Improved performance** with optimized database queries

## Troubleshooting

### If functions still don't exist:
```sql
-- Check if functions were created
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('get_all_staff_for_team', 'get_eligible_staff_for_swap');
```

### If RLS policies are still restrictive:
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'staff';
```

### If staff still not visible:
```sql
-- Test staff access directly
SELECT COUNT(*) FROM public.staff;
```

## Security Notes

- All functions include authentication checks
- Staff can only view other staff at the same base location
- Company isolation is maintained through RLS policies
- Functions use `SECURITY DEFINER` for proper permission handling

## Performance Improvements

- Reduced database round trips for swap requests
- Added database indexes for better query performance
- Optimized staff queries with dedicated functions
- Better caching of staff data in frontend components
