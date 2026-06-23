-- Agent Event Queue: bridges CRM automations with Agent Zero
-- Events are written by CRM, polled and processed by Agent Zero

CREATE TABLE IF NOT EXISTS agent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type text NOT NULL,  -- e.g. 'contact.imported', 'deal.stage_changed', 'automation.webhook'
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority integer NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),  -- 1=highest
  payload jsonb NOT NULL DEFAULT '{}',  -- event data
  result jsonb,  -- processing result from Agent Zero
  error text,  -- error message if failed
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  
  -- Context for tracing
  automation_id uuid,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id uuid,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Indexes for efficient polling
CREATE INDEX idx_agent_events_poll ON agent_events (status, priority, created_at) WHERE status = 'pending';
CREATE INDEX idx_agent_events_account ON agent_events (account_id, created_at DESC);
CREATE INDEX idx_agent_events_contact ON agent_events (contact_id) WHERE contact_id IS NOT NULL;

-- RLS
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by both CRM server and Agent Zero)
CREATE POLICY agent_events_service ON agent_events FOR ALL
  USING (true) WITH CHECK (true);

-- Account members can view their events
CREATE POLICY agent_events_read ON agent_events FOR SELECT
  USING (is_account_member(account_id));

-- RPC: Atomic claim-and-lock for polling (prevents double-processing)
CREATE OR REPLACE FUNCTION claim_agent_events(batch_size integer DEFAULT 10)
RETURNS SETOF agent_events
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT id FROM agent_events
    WHERE status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
      AND retry_count < max_retries
    ORDER BY priority ASC, created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE agent_events e
  SET status = 'processing', started_at = now()
  FROM claimable c
  WHERE e.id = c.id
  RETURNING e.*;
END;
$$;

-- RPC: Complete an event
CREATE OR REPLACE FUNCTION complete_agent_event(
  event_id uuid,
  event_result jsonb DEFAULT NULL,
  event_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE agent_events
  SET
    status = CASE WHEN event_error IS NOT NULL THEN 'failed' ELSE 'completed' END,
    result = event_result,
    error = event_error,
    completed_at = now(),
    retry_count = CASE WHEN event_error IS NOT NULL THEN retry_count + 1 ELSE retry_count END
  WHERE id = event_id;
  
  -- If failed but retries remaining, reset to pending
  UPDATE agent_events
  SET status = 'pending', started_at = NULL
  WHERE id = event_id AND status = 'failed' AND retry_count < max_retries;
END;
$$;

-- Cleanup: auto-expire old completed/failed events after 30 days
-- (run via cron or manual cleanup)
