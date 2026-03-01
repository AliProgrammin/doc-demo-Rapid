import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadDocument, extract, listDocuments, listExtractionRuns, reconcile, type MatchedPair, type Transaction, type Invoice } from '../api/client'
import { FileText, Landmark, CheckCircle2, AlertCircle, Play, X, FileCheck2, ArrowLeftRight, Receipt, XCircle, AlertTriangle } from 'lucide-react'
import { ConfidenceBadge, AmountCell, StatusBadge } from '../components/Badge'
import PageHeader from '../components/PageHeader'

type Tab = 'bank' | 'invoice' | 'reconcile'

function Dropzone({ docType, onUploaded }: {
  docType: 'bank_statement' | 'invoice'
  onUploaded: (id: string, name: string) => void
  resetKey?: number
}) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  useState(() => { setStatus('idle'); setFileName(''); setError('') })

  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return
    setStatus('uploading')
    setFileName(files[0].name)
    setError('')
    try {
      const res = await uploadDocument(files[0], docType)
      setStatus('done')
      onUploaded(res.documentId, files[0].name)
    } catch (e: unknown) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Upload failed')
    }
  }, [docType, onUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: status === 'uploading' || status === 'done',
  })

  const label = docType === 'bank_statement' ? 'Drop bank statement PDF' : 'Drop invoice PDF'
  const Icon  = docType === 'bank_statement' ? Landmark : FileText

  const borderColor = status === 'done' ? 'var(--profit)' : status === 'error' ? 'var(--loss)' : isDragActive ? 'var(--dark)' : 'var(--border-light)'
  const bg = isDragActive ? 'var(--yellow-pale)' : status === 'done' ? '#16A34A06' : 'var(--lighter)'

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${borderColor}`,
        padding: '36px 24px',
        textAlign: 'center',
        cursor: status === 'done' ? 'default' : 'pointer',
        background: bg,
        transition: 'all 0.2s',
      }}
    >
      <input {...getInputProps()} />
      <div style={{
        width: 48, height: 48, margin: '0 auto 14px',
        background: status === 'done' ? '#16A34A12' : 'var(--light)',
        border: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {status === 'done'       ? <CheckCircle2 size={24} color="var(--profit)" />
         : status === 'error'    ? <AlertCircle size={24} color="var(--loss)" />
         : status === 'uploading' ? <span className="spinner" />
         : <Icon size={24} color="var(--mid)" strokeWidth={1.6} />}
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 5, color: 'var(--dark)' }}>
        {status === 'done' ? fileName : status === 'error' ? 'Upload failed' : label}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--mid)' }}>
        {status === 'done'       ? '✓ Uploaded — ready to extract'
         : status === 'error'    ? error
         : status === 'uploading' ? 'Uploading…'
         : isDragActive           ? 'Drop it here'
         : 'or click to browse · PDF only'}
      </div>
    </div>
  )
}

function ExtractionResult({ runId, count, label }: { runId: string; count: number; label: string }) {
  return (
    <div style={{
      marginTop: 16, padding: '16px 20px',
      background: '#16A34A08', border: '1px solid #16A34A40',
      display: 'flex', gap: 24, alignItems: 'center',
    }}>
      <div>
        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--profit)' }}>{count}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--mid)' }}>{label} extracted</div>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div className="label" style={{ color: 'var(--mid)' }}>Run ID</div>
        <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--profit)', marginTop: 2 }}>{runId.slice(0, 8)}…</div>
      </div>
    </div>
  )
}

// ── Bank Statement Tab ─────────────────────────────────────────────────────

function BankTab() {
  const qc = useQueryClient()
  const [bankId, setBankId] = useState<string | null>(null)
  const [result, setResult] = useState<{ extractionRunId: string; transactionCount: number } | null>(null)
  const [dropKey, setDropKey] = useState(0)

  const { data: docs = [] } = useQuery({ queryKey: ['documents'], queryFn: () => listDocuments() })
  const bankDocs = docs.filter(d => d.docType === 'bank_statement')

  const { mutate: runExtract, isPending, isError, error, reset } = useMutation({
    mutationFn: () => extract(bankId!, undefined),
    onSuccess: (data) => {
      setResult({ extractionRunId: data.extractionRunId, transactionCount: data.transactionCount })
      qc.invalidateQueries({ queryKey: ['extraction-runs'] })
    },
  })

  const clearSelection = () => { setBankId(null); setResult(null); reset(); setDropKey(k => k + 1) }

  return (
    <div>
      <div className="fade-up-1" style={{ maxWidth: 540 }}>
        <Dropzone
          key={dropKey}
          docType="bank_statement"
          resetKey={dropKey}
          onUploaded={(id) => { setBankId(id); setResult(null); qc.invalidateQueries({ queryKey: ['documents'] }) }}
        />
      </div>

      {bankDocs.length > 0 && (
        <div className="fade-up-2" style={{
          marginTop: 16, maxWidth: 540,
          background: 'var(--lighter)', border: '1px solid var(--border-light)',
          padding: '14px 18px',
        }}>
          <div className="label" style={{ color: 'var(--mid)', marginBottom: 10 }}>
            Previously uploaded
          </div>
          {bankDocs.map(d => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
              <input
                type="radio" name="bank-sel"
                checked={bankId === d.id}
                onChange={() => { setBankId(d.id); setResult(null) }}
                style={{ accentColor: 'var(--dark)' }}
              />
              <Landmark size={13} color="var(--mid)" />
              <span style={{ fontSize: '0.82rem', color: bankId === d.id ? 'var(--dark)' : 'var(--mid)' }}>{d.originalFilename}</span>
            </label>
          ))}
        </div>
      )}

      <div className="fade-up-3" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn btn-primary"
          onClick={() => runExtract()}
          disabled={!bankId || isPending}
        >
          {isPending ? <span className="spinner spinner-light" /> : <Play size={14} strokeWidth={2.5} />}
          {isPending ? 'Extracting…' : 'Extract Transactions'}
        </button>
        {bankId && (
          <button className="btn btn-ghost" onClick={clearSelection}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {isError && (
        <div style={{ marginTop: 10, color: 'var(--loss)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} /> {(error as Error)?.message}
        </div>
      )}

      {result && (
        <ExtractionResult runId={result.extractionRunId} count={result.transactionCount} label="Transactions" />
      )}
    </div>
  )
}

// ── Invoice Tab ────────────────────────────────────────────────────────────

function InvoiceTab() {
  const qc = useQueryClient()
  const [invoiceIds, setInvoiceIds] = useState<string[]>([])
  const [result, setResult] = useState<{ extractionRunId: string; invoiceCount: number } | null>(null)
  const [dropKey, setDropKey] = useState(0)

  const { data: docs = [] } = useQuery({ queryKey: ['documents'], queryFn: () => listDocuments() })
  const invDocs = docs.filter(d => d.docType === 'invoice')

  const { mutate: runExtract, isPending, isError, error, reset } = useMutation({
    mutationFn: () => extract(undefined, invoiceIds),
    onSuccess: (data) => {
      setResult({ extractionRunId: data.extractionRunId, invoiceCount: data.invoiceCount })
      qc.invalidateQueries({ queryKey: ['extraction-runs'] })
    },
  })

  const clearAll = () => { setInvoiceIds([]); setResult(null); reset(); setDropKey(k => k + 1) }

  const toggleDoc = (id: string, checked: boolean) => {
    setInvoiceIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id))
    setResult(null)
  }

  return (
    <div>
      <div className="fade-up-1" style={{ maxWidth: 540 }}>
        <Dropzone
          key={dropKey}
          docType="invoice"
          resetKey={dropKey}
          onUploaded={(id) => { setInvoiceIds(prev => [...prev, id]); setResult(null); qc.invalidateQueries({ queryKey: ['documents'] }) }}
        />
      </div>

      {invDocs.length > 0 && (
        <div className="fade-up-2" style={{
          marginTop: 16, maxWidth: 540,
          background: 'var(--lighter)', border: '1px solid var(--border-light)',
          padding: '14px 18px',
        }}>
          <div className="label" style={{ color: 'var(--mid)', marginBottom: 10 }}>
            Previously uploaded — select to include
          </div>
          {invDocs.map(d => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={invoiceIds.includes(d.id)}
                onChange={e => toggleDoc(d.id, e.target.checked)}
                style={{ accentColor: 'var(--dark)' }}
              />
              <FileText size={13} color="var(--mid)" />
              <span style={{ fontSize: '0.82rem', color: invoiceIds.includes(d.id) ? 'var(--dark)' : 'var(--mid)' }}>{d.originalFilename}</span>
            </label>
          ))}
        </div>
      )}

      {invoiceIds.length > 0 && (
        <div className="fade-up" style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--mid)' }}>
          {invoiceIds.length} invoice{invoiceIds.length > 1 ? 's' : ''} selected
        </div>
      )}

      <div className="fade-up-3" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn btn-yellow"
          onClick={() => runExtract()}
          disabled={invoiceIds.length === 0 || isPending}
        >
          {isPending ? <span className="spinner" /> : <Play size={14} strokeWidth={2.5} />}
          {isPending ? 'Extracting…' : `Extract Invoice${invoiceIds.length > 1 ? 's' : ''}`}
        </button>
        {invoiceIds.length > 0 && (
          <button className="btn btn-ghost" onClick={clearAll}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {isError && (
        <div style={{ marginTop: 10, color: 'var(--loss)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} /> {(error as Error)?.message}
        </div>
      )}

      {result && (
        <ExtractionResult runId={result.extractionRunId} count={result.invoiceCount} label="Invoices" />
      )}
    </div>
  )
}

// ── Reconcile Tab ──────────────────────────────────────────────────────────

function ReconcileTab() {
  const qc = useQueryClient()
  const { data: runs = [] } = useQuery({ queryKey: ['extraction-runs'], queryFn: listExtractionRuns })
  const [bankRunId, setBankRunId]       = useState<string>('')
  const [invoiceRunId, setInvoiceRunId] = useState<string>('')
  const [result, setResult] = useState<{
    reconciliationRunId: string
    matched: MatchedPair[]
    unmatchedTransactions: Transaction[]
    unmatchedInvoices: Invoice[]
    summary: { matchedCount: number; unmatchedTransactionCount: number; unmatchedInvoiceCount: number; totalTransactions: number; totalInvoices: number }
  } | null>(null)

  const { mutate: runReconcile, isPending, isError, error } = useMutation({
    mutationFn: async () => {
      const runId = bankRunId || invoiceRunId
      return reconcile(runId)
    },
    onSuccess: (data) => {
      setResult(data as typeof result)
      qc.invalidateQueries({ queryKey: ['extraction-runs'] })
    },
  })

  const bankRuns    = runs.filter(r => (r.transactionCount ?? 0) > 0)
  const invoiceRuns = runs.filter(r => (r.invoiceCount ?? 0) > 0)
  const canRun = !!(bankRunId || invoiceRunId)

  return (
    <div>
      {/* Run selectors */}
      <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 640, marginBottom: 24 }}>
        <div style={{ background: 'var(--lighter)', border: '1px solid var(--border-light)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <ArrowLeftRight size={13} color="var(--mid)" />
            <span className="label" style={{ color: 'var(--mid)' }}>Bank Statement Run</span>
          </div>
          {bankRuns.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--mid)', fontStyle: 'italic' }}>No runs with transactions yet</div>
          ) : (
            bankRuns.map(r => (
              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                <input type="radio" name="bank-run" checked={bankRunId === r.id} onChange={() => setBankRunId(r.id)} style={{ accentColor: 'var(--dark)' }} />
                <span className="mono" style={{ fontSize: '0.78rem', color: bankRunId === r.id ? 'var(--dark)' : 'var(--mid)' }}>
                  {r.id.slice(0, 10)}…
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--mid)' }}>{r.transactionCount} tx</span>
              </label>
            ))
          )}
        </div>

        <div style={{ background: 'var(--lighter)', border: '1px solid var(--border-light)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <Receipt size={13} color="var(--mid)" />
            <span className="label" style={{ color: 'var(--mid)' }}>Invoice Run</span>
          </div>
          {invoiceRuns.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--mid)', fontStyle: 'italic' }}>No runs with invoices yet</div>
          ) : (
            invoiceRuns.map(r => (
              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                <input type="radio" name="invoice-run" checked={invoiceRunId === r.id} onChange={() => setInvoiceRunId(r.id)} style={{ accentColor: 'var(--dark)' }} />
                <span className="mono" style={{ fontSize: '0.78rem', color: invoiceRunId === r.id ? 'var(--dark)' : 'var(--mid)' }}>
                  {r.id.slice(0, 10)}…
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--mid)' }}>{r.invoiceCount} inv</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Run button */}
      <div className="fade-up-2" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => runReconcile()} disabled={!canRun || isPending}>
          {isPending ? <span className="spinner spinner-light" /> : <Play size={14} strokeWidth={2.5} />}
          {isPending ? 'Reconciling…' : 'Run Reconciliation'}
        </button>
        {result && (
          <button className="btn btn-ghost" onClick={() => setResult(null)}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {isError && (
        <div style={{ marginBottom: 16, color: 'var(--loss)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} /> {(error as Error)?.message}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="fade-up">
          {/* Summary */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[
              { label: 'Matched',       value: result.summary.matchedCount,              color: 'var(--profit)' },
              { label: 'Unmatched Tx',  value: result.summary.unmatchedTransactionCount, color: 'var(--loss)' },
              { label: 'Unmatched Inv', value: result.summary.unmatchedInvoiceCount,     color: 'var(--warn)' },
              { label: 'Total Tx',      value: result.summary.totalTransactions,         color: 'var(--dark)' },
              { label: 'Total Inv',     value: result.summary.totalInvoices,             color: 'var(--dark)' },
            ].map(({ label, value, color }, i) => (
              <div key={label} style={{
                padding: '14px 20px', minWidth: 110,
                borderRight: i < 4 ? '1px solid var(--border-light)' : 'none',
              }}>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
                <div className="label" style={{ color: 'var(--mid)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Matched pairs */}
          {result.matched.length > 0 && (
            <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)', background: 'var(--light)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <CheckCircle2 size={13} color="var(--profit)" />
                <span className="label" style={{ color: 'var(--mid)' }}>Matched Pairs</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--mid)', fontWeight: 400 }}>({result.matched.length})</span>
              </div>
              <table className="table-base">
                <thead><tr><th>Transaction</th><th>Invoice</th><th>Tx Amount</th><th>Inv Amount</th><th>Score</th><th>Level</th></tr></thead>
                <tbody>
                  {result.matched.map((pair, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>{pair.transaction?.description ?? '—'}</div>
                        <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--mid)' }}>{pair.transaction?.date}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>{pair.invoice?.vendorName ?? '—'}</div>
                        <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--mid)' }}>#{pair.invoice?.invoiceNumber}</div>
                      </td>
                      <td><AmountCell amount={pair.transaction?.amount ?? 0} type={pair.transaction?.type} /></td>
                      <td><AmountCell amount={pair.invoice?.totalAmount ?? 0} /></td>
                      <td><ConfidenceBadge value={pair.confidence} /></td>
                      <td><StatusBadge status={pair.confidenceLevel} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Unmatched */}
          {result.unmatchedTransactions.length > 0 && (
            <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)', background: 'var(--light)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <XCircle size={13} color="var(--loss)" />
                <span className="label" style={{ color: 'var(--loss)' }}>Unmatched Transactions</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--mid)', fontWeight: 400 }}>({result.unmatchedTransactions.length})</span>
              </div>
              <table className="table-base">
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Type</th></tr></thead>
                <tbody>
                  {result.unmatchedTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{tx.date}</td>
                      <td style={{ fontSize: '0.82rem' }}>{tx.description}</td>
                      <td><AmountCell amount={tx.amount} type={tx.type} /></td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--mid)', textTransform: 'capitalize' }}>{tx.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.unmatchedInvoices.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-light)', background: 'var(--light)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertTriangle size={13} color="var(--warn)" />
                <span className="label" style={{ color: 'var(--warn)' }}>Unmatched Invoices</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--mid)', fontWeight: 400 }}>({result.unmatchedInvoices.length})</span>
              </div>
              <table className="table-base">
                <thead><tr><th>Invoice #</th><th>Vendor</th><th>Total</th><th>Due Date</th></tr></thead>
                <tbody>
                  {result.unmatchedInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>#{inv.invoiceNumber}</td>
                      <td style={{ fontSize: '0.82rem' }}>{inv.vendorName}</td>
                      <td><AmountCell amount={inv.totalAmount} /></td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--mid)' }}>{inv.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [tab, setTab] = useState<Tab>('bank')

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'bank',      label: 'Bank Statement', icon: Landmark   },
    { key: 'invoice',   label: 'Invoices',        icon: FileText   },
    { key: 'reconcile', label: 'Reconciliation',  icon: FileCheck2 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Upload & Extract"
        tag="Ingest"
        subtitle="Upload documents and run OCR extraction independently per type"
      />

      {/* Tab bar */}
      <div style={{ padding: '0 28px', borderBottom: '2px solid var(--border)', display: 'flex', gap: 0, background: 'var(--white)' }}>
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '13px 20px',
                background: active ? 'var(--yellow)' : 'transparent',
                border: 'none',
                borderRight: '1px solid var(--border-light)',
                color: active ? 'var(--dark)' : 'var(--mid)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.8rem',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        {tab === 'bank'      && <BankTab />}
        {tab === 'invoice'   && <InvoiceTab />}
        {tab === 'reconcile' && <ReconcileTab />}
      </div>
    </div>
  )
}
