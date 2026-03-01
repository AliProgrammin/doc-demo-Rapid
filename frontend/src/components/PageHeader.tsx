interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  tag?: string
}

export default function PageHeader({ title, subtitle, actions, tag }: PageHeaderProps) {
  return (
    <div style={{
      borderBottom: '2px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Yellow top band */}
      <div style={{
        background: 'var(--yellow)',
        padding: '18px 28px 16px',
        borderBottom: '2px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div className="fade-up">
          {tag && (
            <div className="section-tag" style={{ marginBottom: 6 }}>{tag}</div>
          )}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.7rem',
            fontWeight: 400,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--dark)',
            lineHeight: 1.4,
          }}>
            {title}
          </h1>
        </div>
        {actions && (
          <div className="fade-up" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
      {/* Subtitle strip */}
      {subtitle && (
        <div style={{ padding: '8px 28px', background: 'var(--white)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--mid)', fontWeight: 400 }}>{subtitle}</p>
        </div>
      )}
    </div>
  )
}
