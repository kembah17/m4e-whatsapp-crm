
-- ============================================================
-- 045: System Monitoring & Security Infrastructure
-- ============================================================

-- -------------------------------------------------------
-- 1. system_logs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  level       text NOT NULL CHECK (level IN ('debug','info','warn','error','fatal')),
  category    text NOT NULL,
  message     text NOT NULL,
  metadata    jsonb DEFAULT '{}',
  request_id  text,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id  uuid,
  ip_address  inet,
  user_agent  text,
  duration_ms integer,
  status_code integer
);

CREATE INDEX idx_system_logs_created_at ON system_logs (created_at DESC);
CREATE INDEX idx_system_logs_level ON system_logs (level);
CREATE INDEX idx_system_logs_category ON system_logs (category);
CREATE INDEX idx_system_logs_request_id ON system_logs (request_id);
CREATE INDEX idx_system_logs_level_created ON system_logs (level, created_at DESC);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - system_logs"
  ON system_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------
-- 2. system_alerts
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  severity        text NOT NULL CHECK (severity IN ('info','warning','critical')),
  category        text NOT NULL,
  title           text NOT NULL,
  description     text,
  metadata        jsonb DEFAULT '{}',
  is_resolved     boolean NOT NULL DEFAULT false,
  resolved_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  auto_resolve_at timestamptz
);

CREATE INDEX idx_system_alerts_is_resolved ON system_alerts (is_resolved);
CREATE INDEX idx_system_alerts_severity ON system_alerts (severity);
CREATE INDEX idx_system_alerts_created_at ON system_alerts (created_at DESC);

ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - system_alerts"
  ON system_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------
-- 3. health_snapshots
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_snapshots (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at       timestamptz NOT NULL DEFAULT now(),
  status           text NOT NULL CHECK (status IN ('healthy','degraded','unhealthy')),
  checks           jsonb NOT NULL DEFAULT '{}',
  response_time_ms integer,
  db_pool_total    integer,
  db_pool_active   integer,
  db_pool_idle     integer,
  memory_used_mb   numeric,
  uptime_seconds   integer
);

CREATE INDEX idx_health_snapshots_created_at ON health_snapshots (created_at DESC);
CREATE INDEX idx_health_snapshots_status ON health_snapshots (status);

ALTER TABLE health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - health_snapshots"
  ON health_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------
-- 4. security_events
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  event_type  text NOT NULL,
  severity    text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  ip_address  inet,
  user_agent  text,
  path        text,
  details     jsonb DEFAULT '{}',
  blocked     boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_security_events_created_at ON security_events (created_at DESC);
CREATE INDEX idx_security_events_event_type ON security_events (event_type);
CREATE INDEX idx_security_events_severity ON security_events (severity);
CREATE INDEX idx_security_events_ip ON security_events (ip_address);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - security_events"
  ON security_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------
-- 5. api_metrics_hourly
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_metrics_hourly (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hour             timestamptz NOT NULL,
  endpoint         text NOT NULL,
  method           text NOT NULL,
  total_requests   integer NOT NULL DEFAULT 0,
  error_count      integer NOT NULL DEFAULT 0,
  avg_duration_ms  numeric,
  p95_duration_ms  numeric,
  p99_duration_ms  numeric,
  min_duration_ms  numeric,
  max_duration_ms  numeric,
  UNIQUE (hour, endpoint, method)
);

CREATE INDEX idx_api_metrics_hourly_hour ON api_metrics_hourly (hour DESC);
CREATE INDEX idx_api_metrics_hourly_endpoint ON api_metrics_hourly (endpoint);

ALTER TABLE api_metrics_hourly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - api_metrics_hourly"
  ON api_metrics_hourly
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -------------------------------------------------------
-- RPC: get_system_health_summary
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_system_health_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  latest_health record;
  error_count_1h integer;
  total_count_1h integer;
  active_alerts integer;
  critical_alerts integer;
BEGIN
  -- Latest health snapshot
  SELECT * INTO latest_health
  FROM health_snapshots
  ORDER BY created_at DESC
  LIMIT 1;

  -- Error counts last hour
  SELECT
    count(*) FILTER (WHERE level IN ('error','fatal')),
    count(*)
  INTO error_count_1h, total_count_1h
  FROM system_logs
  WHERE created_at > now() - interval '1 hour';

  -- Active alerts
  SELECT count(*) INTO active_alerts
  FROM system_alerts
  WHERE is_resolved = false;

  SELECT count(*) INTO critical_alerts
  FROM system_alerts
  WHERE is_resolved = false AND severity = 'critical';

  result := jsonb_build_object(
    'status', COALESCE(latest_health.status, 'unknown'),
    'last_check', COALESCE(latest_health.created_at, now()),
    'checks', COALESCE(latest_health.checks, '{}'),
    'response_time_ms', latest_health.response_time_ms,
    'memory_used_mb', latest_health.memory_used_mb,
    'uptime_seconds', latest_health.uptime_seconds,
    'error_count_1h', COALESCE(error_count_1h, 0),
    'total_requests_1h', COALESCE(total_count_1h, 0),
    'error_rate_1h', CASE
      WHEN COALESCE(total_count_1h, 0) > 0
      THEN round((error_count_1h::numeric / total_count_1h) * 100, 2)
      ELSE 0
    END,
    'active_alerts', COALESCE(active_alerts, 0),
    'critical_alerts', COALESCE(critical_alerts, 0)
  );

  RETURN result;
END;
$$;

-- -------------------------------------------------------
-- RPC: get_error_trends(hours_back)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_error_trends(p_hours_back integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(row_to_json(t))
  INTO result
  FROM (
    SELECT
      date_trunc('hour', created_at) AS hour,
      count(*) AS total,
      count(*) FILTER (WHERE level = 'error') AS errors,
      count(*) FILTER (WHERE level = 'fatal') AS fatals,
      count(*) FILTER (WHERE level = 'warn') AS warnings
    FROM system_logs
    WHERE created_at > now() - (p_hours_back || ' hours')::interval
    GROUP BY date_trunc('hour', created_at)
    ORDER BY hour
  ) t;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- -------------------------------------------------------
-- RPC: get_security_summary(hours_back)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION get_security_summary(p_hours_back integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_events integer;
  blocked_count integer;
  unique_ips integer;
  by_severity jsonb;
  by_type jsonb;
  top_ips jsonb;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE blocked = true)
  INTO total_events, blocked_count
  FROM security_events
  WHERE created_at > now() - (p_hours_back || ' hours')::interval;

  SELECT count(DISTINCT ip_address) INTO unique_ips
  FROM security_events
  WHERE created_at > now() - (p_hours_back || ' hours')::interval;

  SELECT jsonb_object_agg(severity, cnt)
  INTO by_severity
  FROM (
    SELECT severity, count(*) AS cnt
    FROM security_events
    WHERE created_at > now() - (p_hours_back || ' hours')::interval
    GROUP BY severity
  ) s;

  SELECT jsonb_object_agg(event_type, cnt)
  INTO by_type
  FROM (
    SELECT event_type, count(*) AS cnt
    FROM security_events
    WHERE created_at > now() - (p_hours_back || ' hours')::interval
    GROUP BY event_type
  ) t;

  SELECT jsonb_agg(row_to_json(i))
  INTO top_ips
  FROM (
    SELECT ip_address::text AS ip, count(*) AS event_count,
           count(*) FILTER (WHERE blocked = true) AS blocked_count
    FROM security_events
    WHERE created_at > now() - (p_hours_back || ' hours')::interval
      AND ip_address IS NOT NULL
    GROUP BY ip_address
    ORDER BY count(*) DESC
    LIMIT 10
  ) i;

  result := jsonb_build_object(
    'total_events', COALESCE(total_events, 0),
    'blocked_count', COALESCE(blocked_count, 0),
    'unique_ips', COALESCE(unique_ips, 0),
    'by_severity', COALESCE(by_severity, '{}'),
    'by_type', COALESCE(by_type, '{}'),
    'top_ips', COALESCE(top_ips, '[]')
  );

  RETURN result;
END;
$$;

-- -------------------------------------------------------
-- RPC: cleanup_monitoring_data
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_monitoring_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  logs_deleted integer;
  snapshots_deleted integer;
  events_deleted integer;
  metrics_deleted integer;
  alerts_resolved integer;
BEGIN
  -- Delete logs older than 30 days
  DELETE FROM system_logs WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS logs_deleted = ROW_COUNT;

  -- Delete health snapshots older than 7 days
  DELETE FROM health_snapshots WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS snapshots_deleted = ROW_COUNT;

  -- Delete security events older than 90 days
  DELETE FROM security_events WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS events_deleted = ROW_COUNT;

  -- Delete metrics older than 90 days
  DELETE FROM api_metrics_hourly WHERE hour < now() - interval '90 days';
  GET DIAGNOSTICS metrics_deleted = ROW_COUNT;

  -- Auto-resolve expired alerts
  UPDATE system_alerts
  SET is_resolved = true, resolved_at = now()
  WHERE is_resolved = false
    AND auto_resolve_at IS NOT NULL
    AND auto_resolve_at < now();
  GET DIAGNOSTICS alerts_resolved = ROW_COUNT;

  RETURN jsonb_build_object(
    'logs_deleted', logs_deleted,
    'snapshots_deleted', snapshots_deleted,
    'events_deleted', events_deleted,
    'metrics_deleted', metrics_deleted,
    'alerts_auto_resolved', alerts_resolved
  );
END;
$$;
