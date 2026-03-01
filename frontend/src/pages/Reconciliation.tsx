import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { listExtractionRuns, reconcile, getReconciliationRun, type MatchedPair, type Transaction, type Invoice } from '../api/client'
import { StatusBadge, ConfidenceBadge, AmountCell } from '../components/Badge'
import PageHeader from '../components/PageHeader'
import { Play, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

function MatchRow({ pair, index }: { pair: MatchedPair; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer' }}
      >
        <td className="mono" style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{index + 1}</td>
        <td>
          <div style={{ fontSize: '0.82rem' }}>{pair.transaction?.description ?? '—'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{pair.transaction?.date}</div>
        </td>
        <td>
          <div style={{ fontSize: '0.82rem' }}>{pair.invoice?.vendorName ?? '—'}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>#{pair.invoice?.invoiceNumber}</div>
        </td>
        <td><AmountCell amount={pair.transaction?.amount ?? 0} type={pair.transaction?.type} /></td>
        <td><AmountCell amount={pair.invoice?.totalAmount ?? 0} /></td>
        <td><ConfidenceBadge value={pair.confidence} /></td>
        <td><StatusBadge status={pair.confidenceLevel} /></td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--surface-2)', padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 24, fontSize: '0.8rem' }}>
              {Object.entries(pair.factors ?? {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span>
                  <ConfidenceBadge value={Number(v)} />
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function UnmatchedSection({ title, items, type, icon: Icon }: {
  title: string; items: (Transaction | Invoice)[]; type: 'tx' | 'inv'; icon: React.ElementType
}) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: '0.875rem', fontWeight: 600 }}>
        <Icon size={15} color="#EF4444" />
        <span style={{ color: '#EF4444' }}>{title}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 400 }}>({items.length})</span>
      </div>
      <table className="table-base">
        <thead>
          <tr>
            {type === 'tx' ? <>
              <th>Date</th><th>Description</th><th>Amount</th><th>Type</th>
            </> : <>
              <th>Invoice #</th><th>Vendor</th><th>Total</th><th>Due Date</th>
            </>}
          </tr>
        </thead>
        <tbody>
          {items.map((item: Transaction | Invoice) => (
            <tr key={item.id}>
              {type === 'tx' ? (() => {
                const tx = item as Transaction
                return <>
                  <td className="mono" style={{ fontSize: '0.8rem' }}>{tx.date}</td>
                  <td style={{ fontSize: '0.82rem' }}>{tx.description}</td>
                  <td><AmountCell amount={tx.amount} type={tx.type} /></td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{tx.type}</td>
                </>
              })() : (() => {
                const inv = item as Invoice
                return <>
                  <td className="mono" style={{ fontSize: '0.8rem' }}>#{inv.invoiceNumber}</td>
                  <td style={{ fontSize: '0.82rem' }}>{inv.vendorName}</td>
                  <td><AmountCell amount={inv.totalAmount} /></td>
                  <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{inv.dueDate}</td>
                </>
              })()}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Reconciliation() {
  const { data: runs = [] } = useQuery({ queryKey: ['extraction-runs'], queryFn: listExtractionRuns })
  const [runId, setRunId] = useState<string>('')
  const [recRunId, setRecRunId] = useState<string | null>(null)
  const activeRunId = runId || runs[0]?.id || ''

  const { mutate: doReconcile, isPending } = useMutation({
    mutationFn: () => reconcile(activeRunId),
    onSuccess: (data) => setRecRunId(data.reconciliationRunId),
  })

  const { data: result } = useQuery({
    queryKey: ['reconciliation', recRunId],
    queryFn: () => getReconciliationRun(recRunId!),
    enabled: !!recRunId,
  })

  const s = result?.summary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Reconciliation"
        subtitle="Match bank transactions to invoices using weighted heuristic scoring"
        actions={
          <button
            onClick={() => doReconcile()}
            disabled={!activeRunId || isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 8,
              background: activeRunId && !isPending ? 'var(--accent)' : 'var(--surface-2)',
              color: activeRunId && !isPending ? '#020617' : 'var(--muted)',
              fontWeight: 700, fontSize: '0.82rem', border: 'none',
              cursor: activeRunId && !isPending ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
          >
            {isPending ? <span className="spinner" style={{ borderTopColor: '#020617' }} /> : <Play size={14} strokeWidth={2.5} />}
            {isPending ? 'Reconciling…' : 'Run Reconciliation'}
          </button>
        }
      />

      {/* Run selector */}
      {runs.length > 0 && (
        <div style={{ padding: '12px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Extraction Run:</span>
          <select
            value={activeRunId}
            onChange={e => setRunId(e.target.value)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 10px', color: 'var(--text)',
              fontSize: '0.82rem', fontFamily: 'IBM Plex Mono, monospace', outline: 'none', cursor: 'pointer',
            }}
          >
            {runs.map(r => (
              <option key={r.id} value={r.id}>{r.id.slice(0, 12)}…</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {!result ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 60, fontSize: '0.875rem' }}>
            Select an extraction run and click Run Reconciliation
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
              {[
                { label: 'Matched', value: s?.matchedCount ?? 0, color: '#22C55E', icon: CheckCircle2 },
                { label: 'Unmatched Tx', value: s?.unmatchedTransactionCount ?? 0, color: '#EF4444', icon: XCircle },
                { label: 'Unmatched Inv', value: s?.unmatchedInvoiceCount ?? 0, color: '#F59E0B', icon: AlertTriangle },
                { label: 'Total Tx', value: s?.totalTransactions ?? 0, color: '#3B82F6', icon: null },
                { label: 'Total Inv', value: s?.totalInvoices ?? 0, color: '#A78BFA', icon: null },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '14px 18px',
                }}>
                  <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Matched pairs */}
            {(result.matched?.length ?? 0) > 0 && (
              <div className="fade-up-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={15} color="#22C55E" />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Matched Pairs</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>({result.matched.length}) · click row for factor breakdown</span>
                </div>
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>#</th><th>Transaction</th><th>Invoice</th><th>Tx Amount</th><th>Inv Amount</th><th>Score</th><th>Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matched.map((pair, i) => <MatchRow key={i} pair={pair} index={i} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* Unmatched */}
            <div className="fade-up-2">
              <UnmatchedSection title="Unmatched Transactions" items={result.unmatchedTransactions ?? []} type="tx" icon={XCircle} />
              <UnmatchedSection title="Unmatched Invoices" items={result.unmatchedInvoices ?? []} type="inv" icon={AlertTriangle} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
