
export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 99,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      fontSize: '0.75rem', fontWeight: 500,
      color,
      fontFamily: 'IBM Plex Mono, monospace',
    }}>
      {pct}%
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    completed: { bg: '#22C55E18', color: '#22C55E' },
    running:   { bg: '#3B82F618', color: '#3B82F6' },
    failed:    { bg: '#EF444418', color: '#EF4444' },
    pending:   { bg: '#94A3B818', color: '#94A3B8' },
    high:      { bg: '#22C55E18', color: '#22C55E' },
    medium:    { bg: '#F59E0B18', color: '#F59E0B' },
    low:       { bg: '#EF444418', color: '#EF4444' },
  }
  const s = map[status.toLowerCase()] ?? { bg: '#94A3B818', color: '#94A3B8' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 99,
      background: s.bg, border: `1px solid ${s.color}40`,
      fontSize: '0.72rem', fontWeight: 600,
      color: s.color, textTransform: 'capitalize', letterSpacing: '0.02em',
    }}>
      {status}
    </span>
  )
}

export function AmountCell({ amount, type }: { amount: number; type?: string }) {
  const isCredit = type === 'credit' || amount > 0
  const color = isCredit ? '#22C55E' : '#EF4444'
  const sign = isCredit ? '+' : ''
  return (
    <span style={{ color, fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.875rem', fontWeight: 500 }}>
      {sign}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

export {}

