'use client';

import { useMemo, useState } from 'react';
import {
  CHANNEL_MATRIX,
  getCountryChannels,
  getRecommendedChannels,
  type ChannelInfo,
  type CountryChannels,
} from '@/lib/channels/channel-matrix';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Check,
  X,
  Globe,
  Star,
  ArrowLeftRight,
  Info,
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────

function businessUseBadge(level: ChannelInfo['businessUse']) {
  switch (level) {
    case 'high':
      return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">High</Badge>;
    case 'medium':
      return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">Medium</Badge>;
    case 'low':
      return <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30 text-[10px]">Low</Badge>;
  }
}

function costBadge(level: ChannelInfo['costLevel']) {
  const labels: Record<string, { text: string; cls: string }> = {
    free: { text: 'Free', cls: 'text-emerald-500' },
    low: { text: '$', cls: 'text-emerald-400' },
    medium: { text: '$$', cls: 'text-amber-500' },
    high: { text: '$$$', cls: 'text-red-400' },
  };
  const l = labels[level];
  return <span className={`text-xs font-mono font-bold ${l.cls}`}>{l.text}</span>;
}

function penetrationColor(value: number): string {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 50) return 'bg-amber-500';
  if (value >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

// ── Channel Row ─────────────────────────────────────────────

function ChannelRow({ channel, isRecommended }: { channel: ChannelInfo; isRecommended: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
        isRecommended
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border bg-card'
      }`}
    >
      {/* Icon + Name */}
      <div className="flex w-32 shrink-0 items-center gap-2">
        <span className="text-lg">{channel.icon}</span>
        <span className="text-sm font-medium text-foreground">{channel.name}</span>
        {isRecommended && <Star className="h-3 w-3 text-amber-500" />}
      </div>

      {/* Penetration bar */}
      <div className="flex w-36 shrink-0 items-center gap-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${penetrationColor(channel.penetration)}`}
            style={{ width: `${channel.penetration}%` }}
          />
        </div>
        <span className="w-10 text-right text-xs font-mono text-muted-foreground">
          {channel.penetration}%
        </span>
      </div>

      {/* Business use */}
      <div className="w-16 shrink-0">{businessUseBadge(channel.businessUse)}</div>

      {/* Cost */}
      <div className="w-12 shrink-0 text-center">{costBadge(channel.costLevel)}</div>

      {/* API */}
      <div className="w-8 shrink-0 text-center">
        {channel.apiAvailable ? (
          <Check className="mx-auto h-4 w-4 text-emerald-500" />
        ) : (
          <X className="mx-auto h-4 w-4 text-zinc-500" />
        )}
      </div>

      {/* Notes tooltip */}
      <TooltipProvider delay={200}>
        <Tooltip>
          <TooltipTrigger>
            <button type="button" className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs text-xs">
            {channel.notes}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ── Country Panel ───────────────────────────────────────────

function CountryPanel({ country }: { country: CountryChannels }) {
  const recommended = useMemo(
    () => getRecommendedChannels(country.code),
    [country.code],
  );
  const recommendedNames = useMemo(
    () => new Set(recommended.map((r) => r.name)),
    [recommended],
  );

  return (
    <div className="space-y-4">
      {/* Country header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">{country.flag}</span>
        <div>
          <h3 className="text-lg font-medium text-foreground">{country.name}</h3>
          <p className="text-xs text-muted-foreground">
            Pop: {country.population} · Internet: {country.internetPenetration}%
          </p>
        </div>
      </div>

      {/* Recommended section */}
      {recommended.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-500">
            <Star className="h-3.5 w-3.5" />
            Recommended for Business
          </p>
          <div className="flex flex-wrap gap-2">
            {recommended.map((ch) => (
              <Badge key={ch.name} className="bg-amber-500/15 text-amber-500 border-amber-500/30">
                {ch.icon} {ch.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Column headers */}
      <div className="flex items-center gap-3 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <div className="w-32 shrink-0">Channel</div>
        <div className="w-36 shrink-0">Penetration</div>
        <div className="w-16 shrink-0">Biz Use</div>
        <div className="w-12 shrink-0 text-center">Cost</div>
        <div className="w-8 shrink-0 text-center">API</div>
        <div className="shrink-0" />
      </div>

      {/* Channel rows */}
      <div className="space-y-2">
        {country.channels.map((ch) => (
          <ChannelRow
            key={ch.name}
            channel={ch}
            isRecommended={recommendedNames.has(ch.name)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export function ChannelMatrix() {
  const [selectedCountry, setSelectedCountry] = useState('NG');
  const [compareMode, setCompareMode] = useState(false);
  const [compareCountry, setCompareCountry] = useState('GB');

  const primary = getCountryChannels(selectedCountry);
  const secondary = compareMode ? getCountryChannels(compareCountry) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-foreground">International Channel Matrix</h2>
        <p className="text-sm text-muted-foreground">
          Messaging channel penetration and business viability across markets.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Country selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Country:</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          >
            {CHANNEL_MATRIX.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Compare toggle */}
        <Button
          variant={compareMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCompareMode(!compareMode)}
        >
          <ArrowLeftRight className="mr-2 h-3.5 w-3.5" />
          {compareMode ? 'Exit Compare' : 'Compare'}
        </Button>

        {/* Compare country selector */}
        {compareMode && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground">vs:</label>
            <select
              value={compareCountry}
              onChange={(e) => setCompareCountry(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            >
              {CHANNEL_MATRIX.filter((c) => c.code !== selectedCountry).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      {compareMode && secondary ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              {primary && <CountryPanel country={primary} />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <CountryPanel country={secondary} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            {primary && <CountryPanel country={primary} />}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Legend</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-full bg-emerald-500" /> 80%+
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-full bg-amber-500" /> 50-79%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-full bg-orange-500" /> 25-49%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded-full bg-red-500" /> &lt;25%
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="h-3 w-3 text-amber-500" /> Recommended
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-500" /> API Available
            </span>
            <span className="flex items-center gap-1.5">
              <X className="h-3 w-3 text-zinc-500" /> No API
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
