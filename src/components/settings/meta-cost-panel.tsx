'use client';

import { useState, useMemo } from 'react';
import { ExternalLink, Info, Coins, Calculator, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SettingsPanelHead } from './settings-panel-head';
import {
  META_RATES_NGN,
  META_RATES_USD,
  estimateMonthlyCost,
  estimateBroadcastCost,
} from '@/lib/whatsapp/cost-calculator';

const RATE_ROWS = [
  {
    category: 'Marketing',
    description: 'Promotional messages, offers, product launches',
    rateNgn: META_RATES_NGN.marketing.per_message,
    rateUsd: META_RATES_USD.marketing.per_message,
    unit: 'per message',
  },
  {
    category: 'Utility',
    description: 'Order updates, receipts, delivery notifications',
    rateNgn: META_RATES_NGN.utility.per_message,
    rateUsd: META_RATES_USD.utility.per_message,
    unit: 'per message',
  },
  {
    category: 'Authentication',
    description: 'OTP codes, login verification',
    rateNgn: META_RATES_NGN.authentication.per_message,
    rateUsd: META_RATES_USD.authentication.per_message,
    unit: 'per message',
  },
  {
    category: 'Service',
    description: 'Customer-initiated conversations',
    rateNgn: META_RATES_NGN.service.per_conversation,
    rateUsd: META_RATES_USD.service.per_conversation,
    unit: 'per conversation',
  },
];

const CATEGORY_OPTIONS = ['Marketing', 'Utility', 'Authentication', 'Service'] as const;

export function MetaCostPanel() {
  // Monthly estimator state
  const [mktMessages, setMktMessages] = useState(0);
  const [utilMessages, setUtilMessages] = useState(0);
  const [authMessages, setAuthMessages] = useState(0);
  const [svcConversations, setSvcConversations] = useState(0);

  // Broadcast estimator state
  const [broadcastRecipients, setBroadcastRecipients] = useState(0);
  const [broadcastCategory, setBroadcastCategory] = useState<string>('Marketing');

  const monthlyEstimate = useMemo(
    () =>
      estimateMonthlyCost({
        marketing_messages: mktMessages,
        utility_messages: utilMessages,
        authentication_messages: authMessages,
        service_conversations: svcConversations,
      }),
    [mktMessages, utilMessages, authMessages, svcConversations],
  );

  const broadcastEstimate = useMemo(
    () => estimateBroadcastCost(broadcastRecipients, broadcastCategory),
    [broadcastRecipients, broadcastCategory],
  );

  return (
    <section className="max-w-3xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="WhatsApp Costs"
        description="Understand Meta's WhatsApp Business API pricing for Nigeria. All messaging costs are charged directly by Meta — not by M4E."
      />

      <div className="space-y-5">
        {/* Rate Card Table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Receipt className="size-4" />
              Nigeria Rate Card (2025)
            </CardTitle>
            <CardDescription>Per-message and per-conversation rates charged by Meta.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Category</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Description</th>
                    <th className="pb-2 pr-4 text-right font-medium text-muted-foreground">NGN</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_ROWS.map((row) => (
                    <tr key={row.category} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4">
                        <span className="font-medium text-foreground">{row.category}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">({row.unit})</span>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{row.description}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-foreground">
                        \u20A6{row.rateNgn.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-foreground">
                        ${row.rateUsd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-600/30 bg-emerald-600/10 text-emerald-400">
                Free Tier
              </Badge>
              <span className="text-xs text-muted-foreground">
                First {META_RATES_NGN.free_tier.conversations_per_month.toLocaleString()} service conversations/month are free
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Cost Estimator */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Calculator className="size-4" />
              Monthly Cost Estimator
            </CardTitle>
            <CardDescription>Enter your expected monthly volumes to estimate costs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mkt-msgs" className="text-xs text-muted-foreground">
                  Marketing messages
                </Label>
                <Input
                  id="mkt-msgs"
                  type="number"
                  min={0}
                  value={mktMessages || ''}
                  onChange={(e) => setMktMessages(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="util-msgs" className="text-xs text-muted-foreground">
                  Utility messages
                </Label>
                <Input
                  id="util-msgs"
                  type="number"
                  min={0}
                  value={utilMessages || ''}
                  onChange={(e) => setUtilMessages(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auth-msgs" className="text-xs text-muted-foreground">
                  Authentication messages
                </Label>
                <Input
                  id="auth-msgs"
                  type="number"
                  min={0}
                  value={authMessages || ''}
                  onChange={(e) => setAuthMessages(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-convos" className="text-xs text-muted-foreground">
                  Service conversations
                </Label>
                <Input
                  id="svc-convos"
                  type="number"
                  min={0}
                  value={svcConversations || ''}
                  onChange={(e) => setSvcConversations(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Results */}
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated monthly cost</span>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">
                    \u20A6{monthlyEstimate.total_cost_ngn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${monthlyEstimate.total_cost_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              {monthlyEstimate.free_tier_savings_ngn > 0 && (
                <p className="mt-2 text-xs text-emerald-400">
                  You save \u20A6{monthlyEstimate.free_tier_savings_ngn.toLocaleString(undefined, { maximumFractionDigits: 0 })} from the free tier ({META_RATES_NGN.free_tier.conversations_per_month.toLocaleString()} free service conversations)
                </p>
              )}
              {monthlyEstimate.breakdown.length > 0 && (mktMessages > 0 || utilMessages > 0 || authMessages > 0 || svcConversations > 0) && (
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  {monthlyEstimate.breakdown.map((item) => (
                    item.quantity > 0 && (
                      <div key={item.category} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {item.category}: {item.quantity.toLocaleString()} \u00D7 \u20A6{item.rate_ngn.toFixed(2)}
                        </span>
                        <span className="font-mono text-foreground">
                          \u20A6{item.subtotal_ngn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Broadcast Cost Preview */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Coins className="size-4 text-yellow-500" />
              Broadcast Cost Preview
            </CardTitle>
            <CardDescription>Estimate the cost of a single broadcast campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bc-recipients" className="text-xs text-muted-foreground">
                  Number of recipients
                </Label>
                <Input
                  id="bc-recipients"
                  type="number"
                  min={0}
                  value={broadcastRecipients || ''}
                  onChange={(e) => setBroadcastRecipients(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bc-category" className="text-xs text-muted-foreground">
                  Template category
                </Label>
                <select
                  id="bc-category"
                  value={broadcastCategory}
                  onChange={(e) => setBroadcastCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {broadcastRecipients > 0 && (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated broadcast cost</span>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-foreground">
                      \u20A6{broadcastEstimate.cost_ngn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${broadcastEstimate.cost_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {broadcastRecipients.toLocaleString()} recipients \u00D7 \u20A6{broadcastEstimate.per_recipient_ngn.toFixed(2)} per {broadcastCategory.toLowerCase()} message
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How Meta Billing Works */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Info className="size-4" />
              How Meta Billing Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Charged by Meta, not M4E.</strong> WhatsApp messaging costs are billed directly to your Meta Business account. M4E does not add any markup.
              </li>
              <li>
                <strong className="text-foreground">Conversation-based pricing.</strong> Meta charges per message for business-initiated conversations (Marketing, Utility, Authentication) and per conversation for customer-initiated (Service) chats.
              </li>
              <li>
                <strong className="text-foreground">Free tier.</strong> The first {META_RATES_NGN.free_tier.conversations_per_month.toLocaleString()} service conversations each month are free across all phone numbers in your WhatsApp Business Account.
              </li>
              <li>
                <strong className="text-foreground">24-hour window.</strong> After a customer messages you, you have 24 hours to reply with free-form messages. After that, you must use an approved template.
              </li>
              <li>
                <strong className="text-foreground">Rates vary by country.</strong> The rates shown above are for Nigeria. If you message contacts in other countries, different rates apply.
              </li>
            </ul>

            <Alert className="border-border bg-muted/50">
              <AlertDescription className="text-xs">
                Rates are based on Meta&apos;s published pricing as of 2025. Meta may update rates periodically.
                Always check the official Meta WhatsApp Manager for the latest pricing.
              </AlertDescription>
            </Alert>

            <a
              href="https://business.facebook.com/wa/manage/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open Meta WhatsApp Manager
              <ExternalLink className="size-3.5" />
            </a>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
