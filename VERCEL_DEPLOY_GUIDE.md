
# 🚀 Customer Reactivation Manager — Vercel Deployment Guide

## Step 1: Import Repository

Click this link to import directly:
👉 **https://vercel.com/new/import?s=https://github.com/kembah17/m4e-whatsapp-crm**

Or manually:
1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Find **m4e-whatsapp-crm** in your GitHub repos
4. Click **"Import"**

## Step 2: Configure Project Settings

Before deploying, set these:
- **Framework Preset**: Next.js (should auto-detect)
- **Root Directory**: `.` (leave default)
- **Build Command**: `next build` (default)
- **Output Directory**: `.next` (default)

## Step 3: Add Environment Variables

Click **"Environment Variables"** and add ALL 8 variables below.
⚠️ Copy each KEY and VALUE exactly.

| # | Key | Value |
|---|-----|-------|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | *(your Supabase project URL)* |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(your Supabase anon key)* |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | *(your Supabase service role key)* |
| 4 | `NEXT_PUBLIC_APP_URL` | `https://crm.marketing4effect.com` |
| 5 | `NEXT_PUBLIC_SITE_URL` | `https://crm.marketing4effect.com` |
| 6 | `ENCRYPTION_KEY` | *(generated key)* |
| 7 | `AUTOMATION_CRON_SECRET` | *(generated key)* |
| 8 | `ALLOWED_INVITE_HOSTS` | `crm.marketing4effect.com,marketing4effect.com` |

## Step 4: Deploy

Click **"Deploy"** and wait ~2 minutes.

## Step 5: Add Custom Domain

After deployment succeeds:
1. Go to **Project Settings** → **Domains**
2. Add: `crm.marketing4effect.com`
3. Vercel will show DNS records to add
4. Add the CNAME record in your domain registrar

## Step 6: Verify

Visit https://crm.marketing4effect.com and confirm:
- ✅ Login page loads with M4E branding
- ✅ Midnight Indigo theme displays
- ✅ "Customer Reactivation Manager" title shows
