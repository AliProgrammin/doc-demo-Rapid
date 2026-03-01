export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? '#16A34A' : pct >= 60 ? '#D97706' : '#DC2626'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px',
      border: `1px solid ${color}`,
      fontSize: '0.7rem', fontWeight: 700,
      color,
      fontFamily: 'var(--font-mono)',
      background: `${color}12`,
    }}>
      {pct}%
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    completed: { bg: '#F0FDF4', color: '#16A34A', border: '#16A34A' },
    running:   { bg: '#EFF6FF', color: '#2563EB', border: '#2563EB' },
    failed:    { bg: '#FEF2F2', color: '#DC2626', border: '#DC2626' },
    pending:   { bg: 'var(--light)', color: 'var(--mid)', border: '#ccc' },
    high:      { bg: '#F0FDF4', color: '#16A34A', border: '#16A34A' },
    medium:    { bg: '#FFFBEB', color: '#D97706', border: '#D97706' },
    low:       { bg: '#FEF2F2', color: '#DC2626', border: '#DC2626' },
  }
  const s = map[status.toLowerCase()] ?? { bg: 'var(--light)', color: 'var(--mid)', border: '#ccc' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px',
      border: `1px solid ${s.border}`,
      fontSize: '0.65rem', fontWeight: 700,
      color: s.color,
      background: s.bg,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {status}
    </span>
  )
}

export function AmountCell({ amount, type }: { amount: number; type?: string }) {
  const isCredit = type === 'credit' || (type === undefined && amount >= 0)
  const color = isCredit ? '#16A34A' : '#DC2626'
  const sign = isCredit ? '+' : '-'
  return (
    <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 700 }}>
      {sign}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

export {}
