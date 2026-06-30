'use client';

import { useState, useMemo } from 'react';
import {
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
  ExternalLink,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { SettingsPanelHead } from './settings-panel-head';

const STATUS_STEPS = [
  { key: 'not_registered', label: 'Not Registered', icon: XCircle, color: 'text-muted-foreground' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-400' },
  { key: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-400' },
  { key: 'active', label: 'Active', icon: Zap, color: 'text-primary' },
] as const;

function validateSenderId(value: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!value) return { valid: false, errors: ['Sender ID is required.'] };
  if (value.length > 11) errors.push('Maximum 11 characters allowed.');
  if (!/^[A-Za-z0-9]+$/.test(value)) errors.push('Only alphanumeric characters (A-Z, 0-9). No spaces or special characters.');
  if (/^\d+$/.test(value)) errors.push('Cannot be purely numeric — must contain at least one letter.');
  if (value.length < 3) errors.push('Minimum 3 characters recommended.');
  return { valid: errors.length === 0, errors };
}

export function SmsSenderIdGuide() {
  const [senderIdInput, setSenderIdInput] = useState('');
  const [currentStatus] = useState<string>('not_registered');

  const validation = useMemo(() => validateSenderId(senderIdInput), [senderIdInput]);

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <section className="max-w-3xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="SMS Sender ID Registration"
        description="Register a branded Sender ID so your SMS messages show your business name instead of a random number."
      />

      <div className="space-y-5">
        {/* What is a Sender ID */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Info className="size-4" />
              What is a Sender ID?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              A <strong className="text-foreground">Sender ID</strong> (also called Sender Name or Alphanumeric Sender ID)
              is the name that appears as the sender when your customers receive an SMS. Instead of seeing a random phone
              number like &quot;+234 800 123 4567&quot;, they see your brand name like &quot;M4E&quot; or &quot;YourBrand&quot;.
            </p>
            <p>
              In Nigeria, the <strong className="text-foreground">Nigerian Communications Commission (NCC)</strong> requires
              all businesses to register their Sender IDs before use. Unregistered Sender IDs will be blocked by carriers.
            </p>
          </CardContent>
        </Card>

        {/* NCC Requirements */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Shield className="size-4" />
              Nigerian NCC Requirements
            </CardTitle>
            <CardDescription>Rules for Sender ID registration in Nigeria.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span>Maximum <strong className="text-foreground">11 characters</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span><strong className="text-foreground">Alphanumeric only</strong> — letters (A-Z) and digits (0-9)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span><strong className="text-foreground">No spaces</strong> or special characters allowed</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span>Cannot be <strong className="text-foreground">purely numeric</strong> — must contain at least one letter</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span>Must be <strong className="text-foreground">registered with your SMS provider</strong> who submits to NCC</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-yellow-400" />
                <span>Approval typically takes <strong className="text-foreground">3-7 business days</strong></span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Sender ID Validator */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Test Your Sender ID</CardTitle>
            <CardDescription>Check if your desired Sender ID meets NCC requirements before registering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sender-id-test" className="text-xs text-muted-foreground">
                Sender ID (max 11 characters)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="sender-id-test"
                  value={senderIdInput}
                  onChange={(e) => setSenderIdInput(e.target.value.slice(0, 11))}
                  placeholder="e.g. M4E or YourBrand"
                  maxLength={11}
                  className="max-w-xs font-mono uppercase"
                />
                {senderIdInput && (
                  <Badge
                    className={validation.valid
                      ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-400'
                      : 'border-red-600/30 bg-red-600/10 text-red-400'
                    }
                  >
                    {validation.valid ? '\u2713 Valid' : '\u2717 Invalid'}
                  </Badge>
                )}
              </div>
              {senderIdInput && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    {senderIdInput.length}/11 characters
                  </p>
                  {validation.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-400">{err}</p>
                  ))}
                  {validation.valid && (
                    <p className="text-xs text-emerald-400">
                      \u2713 &quot;{senderIdInput.toUpperCase()}&quot; meets all NCC requirements and is ready for registration.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registration Process */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Registration Process</CardTitle>
            <CardDescription>Follow these steps to register your Sender ID.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">1</span>
                <span><strong className="text-foreground">Choose your Sender ID</strong> — Pick a name that represents your brand (max 11 chars, alphanumeric, no spaces).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">2</span>
                <span><strong className="text-foreground">Prepare documentation</strong> — You&apos;ll need your CAC registration certificate, a letter of authorization on company letterhead, and a valid ID of the authorized signatory.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">3</span>
                <span><strong className="text-foreground">Submit via your SMS provider</strong> — Your provider (Brevo, Termii, etc.) handles the NCC submission on your behalf. See provider-specific instructions below.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">4</span>
                <span><strong className="text-foreground">Wait for NCC approval</strong> — Typically 3-7 business days. Your provider will notify you once approved.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">5</span>
                <span><strong className="text-foreground">Configure in M4E CRM</strong> — Once approved, enter your Sender ID in the SMS Configuration section above.</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Status Tracker */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Registration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx <= currentStepIndex;
                const isCurrent = step.key === currentStatus;
                return (
                  <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="relative flex items-center w-full justify-center">
                      {idx > 0 && (
                        <div
                          className={`absolute right-1/2 h-0.5 w-full ${
                            idx <= currentStepIndex ? 'bg-primary/50' : 'bg-border'
                          }`}
                        />
                      )}
                      <div
                        className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 ${
                          isCurrent
                            ? 'border-primary bg-primary/20'
                            : isActive
                              ? 'border-emerald-500 bg-emerald-500/20'
                              : 'border-border bg-muted'
                        }`}
                      >
                        <Icon className={`size-4 ${isActive ? step.color : 'text-muted-foreground'}`} />
                      </div>
                    </div>
                    <span className={`text-[11px] font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Provider Instructions */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">Provider-Specific Instructions</CardTitle>
            <CardDescription>How to register your Sender ID with each supported SMS provider.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion>
              <AccordionItem value="brevo">
                <AccordionTrigger className="text-sm font-medium text-foreground">
                  Brevo (Sendinblue)
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Log in to your <a href="https://app.brevo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Brevo dashboard</a>.</li>
                    <li>Navigate to <strong className="text-foreground">Campaigns &rarr; Settings &rarr; Senders, Domains &amp; Dedicated IPs</strong>.</li>
                    <li>Click the <strong className="text-foreground">SMS</strong> tab, then <strong className="text-foreground">Add a new sender</strong>.</li>
                    <li>Enter your desired Sender ID (max 11 chars, alphanumeric).</li>
                    <li>Brevo will submit the registration to NCC on your behalf.</li>
                    <li>You&apos;ll receive an email once the Sender ID is approved (typically 3-7 business days).</li>
                  </ol>
                  <Alert className="mt-3 border-border bg-muted/50">
                    <AlertDescription className="text-xs">
                      Brevo&apos;s free plan includes 300 emails/day but SMS credits must be purchased separately.
                      Nigerian SMS costs approximately \u20A64-6 per message depending on volume.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="termii">
                <AccordionTrigger className="text-sm font-medium text-foreground">
                  Termii
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Log in to your <a href="https://app.termii.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Termii dashboard</a>.</li>
                    <li>Go to <strong className="text-foreground">Sender ID</strong> in the left sidebar.</li>
                    <li>Click <strong className="text-foreground">Request Sender ID</strong>.</li>
                    <li>Fill in your business details and desired Sender ID.</li>
                    <li>Upload required documents: CAC certificate, authorization letter, valid ID.</li>
                    <li>Termii handles the NCC submission. Approval typically takes 3-5 business days.</li>
                  </ol>
                  <Alert className="mt-3 border-border bg-muted/50">
                    <AlertDescription className="text-xs">
                      Termii is a Nigerian-native SMS provider with competitive local rates and
                      direct NCC integration for faster Sender ID approvals.
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
