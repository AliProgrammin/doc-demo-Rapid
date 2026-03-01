import { useQuery } from '@tanstack/react-query'
import { listExtractionRuns, listCorrections } from '../api/client'
import { ArrowLeftRight, Receipt, FileCheck2, History, TrendingUp } from 'lucide-react'
import PageHeader from '../components/PageHeader'

function StatCard({ label, value, icon: Icon, color, delay }: {
  label: string; value: string | number; icon: React.ElementType; color: string; delay: string
}) {
  return (
    <div className={`fade-up-${delay}`} style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = color + '60')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '-0.03em' }}>
          {value}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: runs = [] } = useQuery({ queryKey: ['extraction-runs'], queryFn: listExtractionRuns })
  const { data: correctionsData } = useQuery({ queryKey: ['corrections'], queryFn: () => listCorrections() })

  const totalTx = runs.reduce((s, r) => s + (r.transactionCount ?? 0), 0)
  const totalInv = runs.reduce((s, r) => s + (r.invoiceCount ?? 0), 0)
  const totalCorrections = (correctionsData?.stats as Record<string, number>)?.totalCorrections ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Dashboard"
        subtitle="Document OCR & financial reconciliation overview"
      />

      <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard label="Extraction Runs" value={runs.length} icon={TrendingUp} color="#3B82F6" delay="1" />
          <StatCard label="Transactions" value={totalTx} icon={ArrowLeftRight} color="#22C55E" delay="2" />
          <StatCard label="Invoices" value={totalInv} icon={Receipt} color="#F59E0B" delay="3" />
          <StatCard label="Corrections" value={totalCorrections} icon={History} color="#A78BFA" delay="4" />
        </div>

        {/* Recent runs */}
        <div className="fade-up-5" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCheck2 size={16} color="var(--muted)" />
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Recent Extraction Runs</span>
          </div>

          {runs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
              No extraction runs yet — upload documents to get started
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Status</th>
                  <th>Transactions</th>
                  <th>Invoices</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 10).map(run => (
                  <tr key={run.id}>
                    <td className="mono" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                      {run.id.slice(0, 8)}…
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
                        textTransform: 'capitalize',
                        background: run.status === 'completed' ? '#22C55E18' : run.status === 'failed' ? '#EF444418' : '#3B82F618',
                        color: run.status === 'completed' ? '#22C55E' : run.status === 'failed' ? '#EF4444' : '#3B82F6',
                      }}>
                        {run.status}
                      </span>
                    </td>
                    <td className="mono">{run.transactionCount ?? '—'}</td>
                    <td className="mono">{run.invoiceCount ?? '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                      {run.completedAt ? new Date(run.completedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
