import { describe, expect, it } from 'vitest';
import { parseContactCsv, parseTagCell } from './parse-contact-csv';

describe('parseTagCell', () => {
  it('splits comma-separated tags and trims whitespace', () => {
    expect(parseTagCell(' VIP , Lead ,  ')).toEqual(['VIP', 'Lead']);
  });

  it('splits semicolon-separated tags', () => {
    expect(parseTagCell('VIP; Lead; Customer')).toEqual([
      'VIP',
      'Lead',
      'Customer',
    ]);
  });

  it('de-dupes case-insensitively', () => {
    expect(parseTagCell('vip, VIP, Lead')).toEqual(['vip', 'Lead']);
  });

  it('returns empty for blank values', () => {
    expect(parseTagCell('')).toEqual([]);
    expect(parseTagCell(undefined)).toEqual([]);
  });
});

describe('parseContactCsv', () => {
  it('parses optional tags column', () => {
    const csv = `phone,name,tags
+15551234567,Alice,"VIP, Lead"
+15559876543,Bob,Customer`;

    expect(parseContactCsv(csv)).toEqual({
      hasTagsColumn: true,
      hasCompanyColumn: false,
      hasBranchColumn: false,
      channelBreakdown: { whatsapp: 2, email: 0, skipped: 0 },
      rows: [
        {
          phone: '+15551234567',
          name: 'Alice',
          email: undefined,
          company: undefined,
          tagNames: ['VIP', 'Lead'],
          branchName: undefined,
          primaryChannel: 'whatsapp',
        },
        {
          phone: '+15559876543',
          name: 'Bob',
          email: undefined,
          company: undefined,
          tagNames: ['Customer'],
          branchName: undefined,
          primaryChannel: 'whatsapp',
        },
      ],
    });
  });

  it('returns empty tagNames when tags column is absent', () => {
    const csv = `phone,name
+15551234567,Alice`;

    expect(parseContactCsv(csv)).toEqual({
      hasTagsColumn: false,
      hasCompanyColumn: false,
      hasBranchColumn: false,
      channelBreakdown: { whatsapp: 1, email: 0, skipped: 0 },
      rows: [
        {
          phone: '+15551234567',
          name: 'Alice',
          email: undefined,
          company: undefined,
          tagNames: [],
          branchName: undefined,
          primaryChannel: 'whatsapp',
        },
      ],
    });
  });

  it('classifies email-only rows correctly', () => {
    const csv = `email,name
alice@example.com,Alice`;

    const result = parseContactCsv(csv);
    expect(result.channelBreakdown).toEqual({ whatsapp: 0, email: 1, skipped: 0 });
    expect(result.rows[0].primaryChannel).toBe('email');
    expect(result.rows[0].phone).toBe('');
  });

  it('parses branch column when present', () => {
    const csv = `phone,name,branch
+15551234567,Alice,Lagos`;

    const result = parseContactCsv(csv);
    expect(result.hasBranchColumn).toBe(true);
    expect(result.rows[0].branchName).toBe('Lagos');
  });

  it('returns empty result for header-only CSV', () => {
    const csv = `phone,name`;

    expect(parseContactCsv(csv)).toEqual({
      rows: [],
      hasTagsColumn: false,
      hasCompanyColumn: false,
      hasBranchColumn: false,
      channelBreakdown: { whatsapp: 0, email: 0, skipped: 0 },
    });
  });
});
