-- Migration 074: Messaging provider configuration
-- Supports multiple delivery providers per account (Meta Cloud, BSP, Termii SMS)
-- Part of the Messaging Delivery Abstraction Layer

CREATE TABLE IF NOT EXISTS public.messaging_provider_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'telegram')),
  provider text NOT NULL CHECK (provider IN ('meta-cloud', 'termii-sms', 'bsp-go4whatsup', 'bsp-generic')),
  credentials jsonb NOT NULL DEFAULT '{}',  -- Encrypted API keys, tokens
  is_active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}',  -- Provider-specific settings
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- One active provider per channel per account
  UNIQUE (account_id, channel, provider)
);

-- Index for fast lookups
CREATE INDEX idx_mpc_account_channel
  ON public.messaging_provider_config(account_id, channel)
  WHERE is_active = true;

-- RLS
ALTER TABLE public.messaging_provider_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account members can view their provider config"
  ON public.messaging_provider_config FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "Account admins can manage provider config"
  ON public.messaging_provider_config FOR ALL
  USING (public.is_account_member(account_id, 'admin'::account_role_enum));

-- Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.messaging_provider_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comment
COMMENT ON TABLE public.messaging_provider_config IS
  'Per-account messaging delivery provider configuration. Supports Meta Cloud API (direct), BSP partners, and Termii SMS. Credentials are stored encrypted.';
