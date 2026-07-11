'use client';

import { PasswordForm } from './password-form';
import { SessionsCard } from './sessions-card';
import { TwoFactorSettings } from './two-factor-settings';
import { SettingsPanelHead } from './settings-panel-head';

/**
 * "Login & security" section — groups password management,
 * two-factor authentication, and active sessions.
 */
export function SecurityPanel() {
  return (
    <section className="max-w-2xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Login & security"
        description="Change your password, enable two-factor authentication, and manage your active sessions."
      />
      <div className="space-y-4">
        <PasswordForm />
        <TwoFactorSettings />
        <SessionsCard />
      </div>
    </section>
  );
}
