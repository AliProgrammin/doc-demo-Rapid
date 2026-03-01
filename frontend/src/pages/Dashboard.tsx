import { useQuery } from '@tanstack/react-query'
import { listExtractionRuns, listCorrections } from '../api/client'
import { ArrowLeftRight, Receipt, FileCheck2, History, TrendingUp } from 'lucide-react'
import PageHeader from '../components/PageHeader'

function StatCard({ label, value, icon: Icon, delay }: {
  label: string; value: string | number; icon: React.ElementType; delay: string
}) {
  return (
    <div className={`card fade-up-${delay}`} style={{
      padding: '20px 22px',
      display: 'flex', alignItems: 'center', gap: 16,
      transition: 'background 0.15s',
      cursor: 'default',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--yellow)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--white)')}
    >
      <Icon size={18} strokeWidth={2} color="var(--dark)" />
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--dark)' }}>
          {value}
        </div>
        <div className="label" style={{ color: 'var(--mid)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: runs = [] } = useQuery({ queryKey: ['extraction-runs'], queryFn: listExtractionRuns })
  const { data: correctionsData } = useQuery({ queryKey: ['corrections'], queryFn: () => listCorrections() })

  const totalTx  = runs.reduce((s, r) => s + (r.transactionCount ?? 0), 0)
  const totalInv = runs.reduce((s, r) => s + (r.invoiceCount ?? 0), 0)
  const totalCorrections = (correctionsData?.stats as Record<string, number>)?.totalCorrections ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="Dashboard" tag="Overview" subtitle="Document OCR and financial reconciliation" />

      <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 0, marginBottom: 28, border: '1px solid var(--border)' }}>
          {[
            { label: 'Extraction Runs', value: runs.length,    icon: TrendingUp,     delay: '1' },
            { label: 'Transactions',    value: totalTx,         icon: ArrowLeftRight, delay: '2' },
            { label: 'Invoices',        value: totalInv,        icon: Receipt,        delay: '3' },
            { label: 'Corrections',     value: totalCorrections, icon: History,       delay: '4' },
          ].map((s, i) => (
            <div key={s.label} style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <StatCard {...s} />
            </div>
          ))}
        </div>

        {/* Recent runs */}
        <div className="card fade-up-5" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px',
            background: 'var(--light)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <FileCheck2 size={13} color="var(--mid)" />
            <span className="label" style={{ color: 'var(--mid)' }}>Recent Extraction Runs</span>
          </div>

          {runs.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--mid)', fontSize: '0.82rem' }}>
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
                {runs.slice(0, 12).map(run => (
                  <tr key={run.id}>
                    <td className="mono" style={{ color: 'var(--mid)', fontSize: '0.75rem' }}>
                      {run.id.slice(0, 8)}…
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        border: `1px solid ${run.status === 'completed' ? '#16A34A' : run.status === 'failed' ? '#DC2626' : '#2563EB'}`,
                        color: run.status === 'completed' ? '#16A34A' : run.status === 'failed' ? '#DC2626' : '#2563EB',
                        background: run.status === 'completed' ? '#F0FDF4' : run.status === 'failed' ? '#FEF2F2' : '#EFF6FF',
                      }}>
                        {run.status}
                      </span>
                    </td>
                    <td className="mono" style={{ fontWeight: 700 }}>{run.transactionCount ?? '—'}</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{run.invoiceCount ?? '—'}</td>
                    <td style={{ color: 'var(--mid)', fontSize: '0.78rem' }}>
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
