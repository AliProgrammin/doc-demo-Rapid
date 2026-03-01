import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCorrections } from '../api/client'
import PageHeader from '../components/PageHeader'
import { History, Download } from 'lucide-react'

export default function Corrections() {
  const [entityType, setEntityType] = useState<string>('')
  const { data, isLoading } = useQuery({
    queryKey: ['corrections', entityType],
    queryFn: () => listCorrections(entityType || undefined),
  })

  const corrections = data?.corrections ?? []
  const stats = data?.stats as Record<string, unknown> | undefined

  const handleExport = async () => {
    const res = await fetch('/api/corrections/export')
    const json = await res.json()
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `corrections-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Corrections"
        subtitle="Audit trail of all manual corrections made to extracted data"
        actions={
          <button className="btn btn-ghost" onClick={handleExport}>
            <Download size={14} /> Export JSON
          </button>
        }
      />

      {/* Stats strip */}
      {stats && (
        <div className="fade-up" style={{
          padding: '12px 32px', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 24, fontSize: '0.82rem',
        }}>
          <span>
            <span className="mono" style={{ fontWeight: 700, color: 'var(--dark)' }}>
              {String(stats.totalCorrections ?? 0)}
            </span>
            <span style={{ color: 'var(--mid)' }}> total corrections</span>
          </span>
          <span>
            <span className="mono" style={{ fontWeight: 700, color: 'var(--dark)' }}>
              {String(stats.documentsAffected ?? 0)}
            </span>
            <span style={{ color: 'var(--mid)' }}> documents affected</span>
          </span>
          {Object.entries((stats.fieldBreakdown ?? {}) as Record<string, number>).map(([k, v]) => (
            <span key={k} style={{ color: 'var(--mid)' }}>
              <span style={{ color: 'var(--dark)', fontWeight: 600 }}>{k}</span>{': '}{String(v)}
            </span>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Filter by type:</span>
        {['', 'transaction', 'invoice'].map(t => (
          <button
            key={t}
            onClick={() => setEntityType(t)}
            className={entityType === t ? 'btn btn-yellow' : 'btn btn-ghost'}
            style={{ padding: '5px 14px', fontSize: '0.78rem' }}
          >
            {t || 'All'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--muted)' }}>
          {corrections.length} correction{corrections.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
        ) : corrections.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <History size={32} color="var(--border)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <div style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No corrections yet</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: 4 }}>Edit transaction or invoice fields to start tracking corrections</div>
          </div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Type</th>
                <th>Field</th>
                <th>Original</th>
                <th>Corrected</th>
                <th>Document</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map(c => (
                <tr key={c.id}>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
                      background: c.entityType === 'transaction' ? '#3B82F618' : '#F59E0B18',
                      color: c.entityType === 'transaction' ? '#3B82F6' : '#F59E0B',
                      textTransform: 'capitalize',
                    }}>{c.entityType}</span>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: '0.82rem' }}>{c.fieldName}</td>
                  <td style={{ color: '#EF4444', fontSize: '0.82rem', fontFamily: 'IBM Plex Mono, monospace', textDecoration: 'line-through', opacity: 0.7 }}>
                    {c.originalValue || '—'}
                  </td>
                  <td style={{ color: '#22C55E', fontSize: '0.82rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {c.correctedValue}
                  </td>
                  <td className="mono" style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    {c.documentId?.slice(0, 8)}…
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
