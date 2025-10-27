# 🚨 SECURITY ROTATION GUIDE

## ⚠️ CRITICAL: Secrets Exposed in Git History

Your secrets were committed to Git and need immediate rotation.

## 🔄 Step 1: Rotate Supabase Keys

### 1.1 Go to Supabase Dashboard
1. Navigate to: https://supabase.com/dashboard/project/htlwfdoxsfjehiblsjed
2. Go to **Settings** → **API**
3. **REGENERATE** both keys:
   - Click "Regenerate" on **anon public** key
   - Click "Regenerate" on **service_role secret** key

### 1.2 Update Your Local .env
After regenerating, update your local `.env` file with new keys:
```bash
VITE_SUPABASE_URL=https://htlwfdoxsfjehiblsjed.supabase.co
VITE_SUPABASE_ANON_KEY=<NEW_ANON_KEY_FROM_DASHBOARD>
SUPABASE_URL=https://htlwfdoxsfjehiblsjed.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_KEY_FROM_DASHBOARD>
```

## 🔄 Step 2: Rotate Stripe Keys

### 2.1 Go to Stripe Dashboard
1. Navigate to: https://dashboard.stripe.com/test/apikeys
2. **REGENERATE** both keys:
   - Click "Reveal test key token" → "Reveal live key token" → "Reveal test key token" (this rotates it)
   - Do the same for publishable key

### 2.2 Update Your Local .env
```bash
VITE_STRIPE_PUBLISHABLE_KEY=<NEW_PUBLISHABLE_KEY>
STRIPE_SECRET_KEY=<NEW_SECRET_KEY>
STRIPE_WEBHOOK_SECRET=<UPDATE_WEBHOOK_SECRET_IF_NEEDED>
```

## 🔄 Step 3: Update Vercel Environment Variables

### 3.1 Go to Vercel Dashboard
1. Navigate to: https://vercel.com/dashboard
2. Select your project: `aircrew-shuffle`
3. Go to **Settings** → **Environment Variables**
4. Update these variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`

### 3.2 Redeploy
After updating environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or trigger a new deployment by pushing to main

## 🔄 Step 4: Clean Git History (Optional but Recommended)

### 4.1 Remove .env from Git History
```bash
# Create a backup branch first
git checkout -b backup-before-history-cleanup
git checkout main

# Remove .env from all history (this rewrites history)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push to update remote
git push origin --force --all
```

⚠️ **WARNING**: This rewrites Git history. Coordinate with team members.

## ✅ Step 5: Verify Security

### 5.1 Test Application
1. Ensure app still works with new keys
2. Test login/signup functionality
3. Test Stripe integration
4. Verify Supabase queries work

### 5.2 Check Environment Variables
```bash
# Verify .env is in .gitignore
cat .gitignore | grep -E "^\.env"

# Verify no secrets in current commit
git show HEAD --name-only | grep -v .env
```

## 🎯 Priority Order:
1. **IMMEDIATE**: Rotate Supabase keys (5 minutes)
2. **IMMEDIATE**: Rotate Stripe keys (5 minutes)  
3. **HIGH**: Update Vercel environment variables (10 minutes)
4. **MEDIUM**: Clean Git history (30 minutes)
5. **LOW**: Verify everything works (15 minutes)

## 📞 Need Help?
- Supabase: https://supabase.com/docs/guides/platform/api-keys
- Stripe: https://stripe.com/docs/keys
- Vercel: https://vercel.com/docs/concepts/projects/environment-variables

