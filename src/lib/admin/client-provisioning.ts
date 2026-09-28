// ============================================================
// Client Provisioning Library
// Super-admin operations for onboarding new M4E clients.
// ============================================================

import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { sendTransactionalEmail } from '@/lib/email/brevo-api'
import type { SubscriptionTier, PackageKey } from '@/lib/billing/plans'

// ── Types ────────────────────────────────────────────────────

export interface ProvisionClientParams {
  businessName: string
  ownerName: string
  ownerEmail: string
  ownerPhone?: string
  industry: string
  businessSize?: string
  subscriptionTier: SubscriptionTier
  packageKey?: PackageKey
  industryBundleId?: string
  cacStatus: 'provided' | 'alternative_docs' | 'm4e_provisioned'
  cacDocumentUrl?: string
  clientAddress?: string
  sendWelcomeEmail?: boolean
  temporaryPassword?: string
}

export interface ProvisionResult {
  accountId: string
  userId: string
  temporaryPassword: string
}

export interface OnboardingTaskDef {
  key: string
  title: string
  category: 'setup' | 'data' | 'whatsapp' | 'training' | 'launch'
  sort_order: number
}

// ── Password Generation ─────────────────────────────────────

function generateTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%&*'
  const all = upper + lower + digits + symbols

  // Ensure at least one of each category
  const parts = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]

  for (let i = parts.length; i < length; i++) {
    parts.push(all[Math.floor(Math.random() * all.length)])
  }

  // Shuffle
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]]
  }

  return parts.join('')
}

// ── Default Onboarding Tasks ────────────────────────────────

export function getDefaultOnboardingTasks(
  packageKey?: PackageKey,
  _industry?: string
): OnboardingTaskDef[] {
  const tasks: OnboardingTaskDef[] = [
    { key: 'account_created', title: 'Account Created', category: 'setup', sort_order: 1 },
    { key: 'subscription_set', title: 'Subscription Tier Configured', category: 'setup', sort_order: 2 },
    { key: 'industry_bundle', title: 'Industry Bundle Applied', category: 'setup', sort_order: 3 },
  ]

  if (packageKey) {
    tasks.push({
      key: 'package_assigned',
      title: 'Package Assigned and Campaigns Scheduled',
      category: 'setup',
      sort_order: 4,
    })
  }

  tasks.push(
    { key: 'whatsapp_connected', title: 'WhatsApp Business Connected', category: 'whatsapp', sort_order: 5 },
    { key: 'contacts_imported', title: 'Initial Contacts Imported', category: 'data', sort_order: 6 },
    { key: 'products_imported', title: 'Products or Services Imported', category: 'data', sort_order: 7 },
    { key: 'first_template', title: 'First Message Template Created', category: 'whatsapp', sort_order: 8 },
    { key: 'pipeline_configured', title: 'Sales Pipeline Configured', category: 'setup', sort_order: 9 },
    { key: 'team_trained', title: 'Client Team Trained', category: 'training', sort_order: 10 },
    { key: 'first_campaign', title: 'First Campaign Launched', category: 'launch', sort_order: 11 },
    { key: 'handover_complete', title: 'Handover to Client Complete', category: 'launch', sort_order: 12 },
  )

  return tasks
}

// ── Welcome Email ───────────────────────────────────────────

function buildWelcomeEmailHtml(params: {
  businessName: string
  ownerName: string
  email: string
  temporaryPassword: string
}): string {
  const { businessName, ownerName, email, temporaryPassword } = params
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1a1a2e;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#16213e;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:40px 40px 20px;text-align:center;">
          <h1 style="color:#d4af37;font-size:28px;margin:0 0 8px;">Welcome to M4E</h1>
          <p style="color:#c0c0c0;font-size:14px;margin:0;">Business Growth Engine</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:30px 40px;">
          <p style="color:#e0e0e0;font-size:16px;line-height:1.6;margin:0 0 20px;">
            Hello ${ownerName},
          </p>
          <p style="color:#e0e0e0;font-size:16px;line-height:1.6;margin:0 0 20px;">
            Your Business Growth Engine account for <strong style="color:#d4af37;">${businessName}</strong> is ready.
          </p>
          <!-- Credentials Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f3460;border-radius:8px;border:1px solid #d4af3740;margin:20px 0;">
            <tr><td style="padding:20px;">
              <p style="color:#d4af37;font-size:14px;font-weight:bold;margin:0 0 12px;">Your Login Credentials</p>
              <p style="color:#e0e0e0;font-size:14px;margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
              <p style="color:#e0e0e0;font-size:14px;margin:0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
            </td></tr>
          </table>
          <p style="color:#ff6b6b;font-size:14px;line-height:1.5;margin:0 0 20px;">
            Please change your password immediately after your first login.
          </p>
          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:10px 0 20px;">
              <a href="https://crm.marketing4effect.com/getting-started" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#b8962e);color:#1a1a2e;font-size:16px;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;">Get Started</a>
            </td></tr>
          </table>
          <p style="color:#a0a0a0;font-size:14px;line-height:1.5;margin:0 0 10px;">
            Need help? Contact us at <a href="mailto:support@marketing4effect.com" style="color:#d4af37;">support@marketing4effect.com</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:#0f3460;padding:20px 40px;border-top:1px solid #d4af3720;">
          <p style="color:#808080;font-size:11px;line-height:1.5;margin:0;text-align:center;">
            Marketing4Effect Ltd. | Lagos, Nigeria<br/>
            This email contains your account credentials. If you did not request this, please contact us immediately.<br/>
            Compliant with Nigeria Data Protection Regulation (NDPR).
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendWelcomeEmail(params: {
  businessName: string
  ownerName: string
  email: string
  temporaryPassword: string
}): Promise<{ messageId: string } | null> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('[provisioning] BREVO_API_KEY not set, skipping welcome email')
    return null
  }

  try {
    const result = await sendTransactionalEmail({
      apiKey,
      senderName: 'Marketing4Effect',
      senderEmail: 'noreply@marketing4effect.com',
      toEmail: params.email,
      toName: params.ownerName,
      subject: `Welcome to M4E Business Growth Engine - ${params.businessName}`,
      htmlContent: buildWelcomeEmailHtml(params),
      textContent: `Hello ${params.ownerName}, your M4E Business Growth Engine account for ${params.businessName} is ready. Email: ${params.email} | Temporary Password: ${params.temporaryPassword} | Please change your password after first login. Get started: https://crm.marketing4effect.com/getting-started`,
    })
    return result
  } catch (err) {
    console.error('[provisioning] Failed to send welcome email:', err)
    return null
  }
}

// ── Main Provisioning Function ──────────────────────────────

export async function provisionClient(
  params: ProvisionClientParams,
  performedByUserId: string
): Promise<ProvisionResult> {
  const db = supabaseAdmin()
  const tempPassword = params.temporaryPassword || generateTemporaryPassword()

  // 1. Create Supabase auth user
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: params.ownerEmail,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown error'}`)
  }

  const userId = authData.user.id

  // 2. Wait for the signup trigger to create profile + account
  await new Promise((resolve) => setTimeout(resolve, 500))

  // 3. Find the account created by the trigger
  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileErr || !profile?.account_id) {
    throw new Error(`Profile or account not created by trigger: ${profileErr?.message || 'No account_id found'}`)
  }

  const accountId = profile.account_id

  // 4. Update the account with business details
  const { error: accountErr } = await db
    .from('accounts')
    .update({
      name: params.businessName,
      business_name: params.businessName,
      subscription_tier: params.subscriptionTier,
      subscription_status: 'active',
      industry: params.industry,
      business_size: params.businessSize || null,
      cac_status: params.cacStatus,
      cac_document_url: params.cacDocumentUrl || null,
      provisioned_by: performedByUserId,
      provisioned_at: new Date().toISOString(),
      client_phone: params.ownerPhone || null,
      client_email: params.ownerEmail,
      client_address: params.clientAddress || null,
      assigned_package: params.packageKey || null,
      package_start_date: params.packageKey ? new Date().toISOString().split('T')[0] : null,
      onboarding_completed: false,
      onboarding_step: 0,
    })
    .eq('id', accountId)

  if (accountErr) {
    throw new Error(`Failed to update account: ${accountErr.message}`)
  }

  // 5. Update the profile
  const { error: profUpdateErr } = await db
    .from('profiles')
    .update({
      full_name: params.ownerName,
      account_role: 'owner',
    })
    .eq('user_id', userId)

  if (profUpdateErr) {
    console.error('[provisioning] Failed to update profile:', profUpdateErr)
  }

  // 6. Apply industry bundle if provided
  if (params.industryBundleId) {
    try {
      // Call the bundle apply endpoint internally
      const bundleUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/bundles/apply`
      await fetch(bundleUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleId: params.industryBundleId,
          accountId,
        }),
      })
    } catch (err) {
      console.error('[provisioning] Bundle apply failed (non-fatal):', err)
    }
  }

  // 7. Create default onboarding tasks
  const tasks = getDefaultOnboardingTasks(params.packageKey, params.industry)
  const taskRows = tasks.map((t) => ({
    account_id: accountId,
    task_key: t.key,
    task_title: t.title,
    task_category: t.category,
    sort_order: t.sort_order,
    status: t.key === 'account_created' || t.key === 'subscription_set'
      ? 'completed'
      : 'pending',
    completed_by: t.key === 'account_created' || t.key === 'subscription_set'
      ? performedByUserId
      : null,
    completed_at: t.key === 'account_created' || t.key === 'subscription_set'
      ? new Date().toISOString()
      : null,
  }))

  const { error: tasksErr } = await db
    .from('client_onboarding_tasks')
    .insert(taskRows)

  if (tasksErr) {
    console.error('[provisioning] Failed to create onboarding tasks:', tasksErr)
  }

  // 8. Log the provisioning action
  await db.from('client_provisioning_log').insert({
    account_id: accountId,
    action: 'client_provisioned',
    performed_by: performedByUserId,
    details: {
      business_name: params.businessName,
      owner_email: params.ownerEmail,
      subscription_tier: params.subscriptionTier,
      package_key: params.packageKey || null,
      industry: params.industry,
      cac_status: params.cacStatus,
      industry_bundle_id: params.industryBundleId || null,
    },
  })

  // 9. Send welcome email if requested
  if (params.sendWelcomeEmail !== false) {
    await sendWelcomeEmail({
      businessName: params.businessName,
      ownerName: params.ownerName,
      email: params.ownerEmail,
      temporaryPassword: tempPassword,
    })
  }

  return {
    accountId,
    userId,
    temporaryPassword: tempPassword,
  }
}
