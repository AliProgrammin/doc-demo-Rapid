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

  // reset when resetKey changes
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

  const accent = docType === 'bank_statement' ? '#3B82F6' : '#F59E0B'
  const label  = docType === 'bank_statement' ? 'Drop bank statement PDF' : 'Drop invoice PDF'
  const Icon   = docType === 'bank_statement' ? Landmark : FileText

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${status === 'done' ? '#22C55E' : status === 'error' ? '#EF4444' : isDragActive ? accent : 'var(--border)'}`,
        borderRadius: 12,
        padding: '36px 24px',
        textAlign: 'center',
        cursor: status === 'done' ? 'default' : 'pointer',
        background: isDragActive ? `${accent}08` : status === 'done' ? '#22C55E06' : 'var(--surface)',
        transition: 'all 0.2s',
      }}
    >
      <input {...getInputProps()} />
      <div style={{
        width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
        background: `${accent}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {status === 'done'    ? <CheckCircle2 size={26} color="#22C55E" />
         : status === 'error' ? <AlertCircle size={26} color="#EF4444" />
         : status === 'uploading' ? <span className="spinner" />
         : <Icon size={26} color={accent} strokeWidth={1.6} />}
      </div>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 5 }}>
        {status === 'done' ? fileName : status === 'error' ? 'Upload failed' : label}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
        {status === 'done'    ? '✓ Uploaded — ready to extract'
         : status === 'error' ? error
         : status === 'uploading' ? 'Uploading…'
         : isDragActive ? 'Drop it here'
         : 'or click to browse · PDF only'}
      </div>
    </div>
  )
}

function ExtractionResult({ runId, count, label, color }: { runId: string; count: number; label: string; color: string }) {
  return (
    <div style={{
      marginTop: 16, padding: '16px 20px',
      background: '#22C55E10', border: '1px solid #22C55E30', borderRadius: 10,
      display: 'flex', gap: 24, alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color, fontFamily: 'IBM Plex Mono, monospace' }}>{count}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{label} extracted</div>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Run ID</div>
        <div style={{ fontSize: '0.75rem', color: '#22C55E', fontFamily: 'IBM Plex Mono, monospace' }}>{runId.slice(0, 8)}…</div>
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

      {/* Existing bank docs */}
      {bankDocs.length > 0 && (
        <div className="fade-up-2" style={{
          marginTop: 16, maxWidth: 540,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 18px',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Previously uploaded
          </div>
          {bankDocs.map(d => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
              <input
                type="radio" name="bank-sel"
                checked={bankId === d.id}
                onChange={() => { setBankId(d.id); setResult(null) }}
                style={{ accentColor: '#3B82F6' }}
              />
              <Landmark size={13} color="#3B82F6" />
              <span style={{ fontSize: '0.82rem', color: bankId === d.id ? 'var(--text)' : 'var(--muted)' }}>{d.originalFilename}</span>
            </label>
          ))}
        </div>
      )}

      {/* Action row */}
      <div className="fade-up-3" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => runExtract()}
          disabled={!bankId || isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 8,
            background: bankId && !isPending ? '#3B82F6' : 'var(--surface-2)',
            color: bankId && !isPending ? '#fff' : 'var(--muted)',
            fontWeight: 700, fontSize: '0.875rem', border: 'none',
            cursor: bankId && !isPending ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          {isPending ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : <Play size={15} strokeWidth={2.5} />}
          {isPending ? 'Extracting…' : 'Extract Transactions'}
        </button>
        {bankId && (
          <button onClick={clearSelection} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '9px 14px', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer',
          }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {isError && (
        <div style={{ marginTop: 10, color: '#EF4444', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} /> {(error as Error)?.message}
        </div>
      )}

      {result && (
        <ExtractionResult
          runId={result.extractionRunId}
          count={result.transactionCount}
          label="Transactions"
          color="#3B82F6"
        />
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

      {/* Existing invoice docs */}
      {invDocs.length > 0 && (
        <div className="fade-up-2" style={{
          marginTop: 16, maxWidth: 540,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 18px',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Previously uploaded — select to include
          </div>
          {invDocs.map(d => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={invoiceIds.includes(d.id)}
                onChange={e => toggleDoc(d.id, e.target.checked)}
                style={{ accentColor: '#F59E0B' }}
              />
              <FileText size={13} color="#F59E0B" />
              <span style={{ fontSize: '0.82rem', color: invoiceIds.includes(d.id) ? 'var(--text)' : 'var(--muted)' }}>{d.originalFilename}</span>
            </label>
          ))}
        </div>
      )}

      {/* Selected count */}
      {invoiceIds.length > 0 && (
        <div className="fade-up" style={{ marginTop: 10, fontSize: '0.8rem', color: '#F59E0B' }}>
          {invoiceIds.length} invoice{invoiceIds.length > 1 ? 's' : ''} selected
        </div>
      )}

      {/* Action row */}
      <div className="fade-up-3" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => runExtract()}
          disabled={invoiceIds.length === 0 || isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 8,
            background: invoiceIds.length > 0 && !isPending ? '#F59E0B' : 'var(--surface-2)',
            color: invoiceIds.length > 0 && !isPending ? '#020617' : 'var(--muted)',
            fontWeight: 700, fontSize: '0.875rem', border: 'none',
            cursor: invoiceIds.length > 0 && !isPending ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          {isPending ? <span className="spinner" style={{ borderTopColor: '#020617' }} /> : <Play size={15} strokeWidth={2.5} />}
          {isPending ? 'Extracting…' : `Extract Invoice${invoiceIds.length > 1 ? 's' : ''}`}
        </button>
        {(invoiceIds.length > 0) && (
          <button onClick={clearAll} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '9px 14px', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer',
          }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {isError && (
        <div style={{ marginTop: 10, color: '#EF4444', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} /> {(error as Error)?.message}
        </div>
      )}

      {result && (
        <ExtractionResult
          runId={result.extractionRunId}
          count={result.invoiceCount}
          label="Invoices"
          color="#F59E0B"
        />
      )}
    </div>
  )
}

// ── Reconcile Tab ──────────────────────────────────────────────────────────

function ReconcileTab() {
  const qc = useQueryClient()
  const { data: runs = [] } = useQuery({ queryKey: ['extraction-runs'], queryFn: listExtractionRuns })
  const [bankRunId, setBankRunId]     = useState<string>('')
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
      // extract from both runs into a combined run if different, or use same run
      const runId = bankRunId || invoiceRunId
      return reconcile(runId)
    },
    onSuccess: (data) => {
      setResult(data as typeof result)
      qc.invalidateQueries({ queryKey: ['extraction-runs'] })
    },
  })

  // runs that have transactions (bank) vs invoices
  const bankRuns    = runs.filter(r => (r.transactionCount ?? 0) > 0)
  const invoiceRuns = runs.filter(r => (r.invoiceCount ?? 0) > 0)

  const canRun = !!(bankRunId || invoiceRunId)

  return (
    <div>
      {/* Run selectors */}
      <div className="fade-up-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 640, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <ArrowLeftRight size={14} color="#3B82F6" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3B82F6', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Bank Statement Run
            </span>
          </div>
          {bankRuns.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>No runs with transactions yet</div>
          ) : (
            bankRuns.map(r => (
              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                <input type="radio" name="bank-run" checked={bankRunId === r.id} onChange={() => setBankRunId(r.id)} style={{ accentColor: '#3B82F6' }} />
                <span style={{ fontSize: '0.8rem', fontFamily: 'IBM Plex Mono, monospace', color: bankRunId === r.id ? 'var(--text)' : 'var(--muted)' }}>
                  {r.id.slice(0, 10)}…
                </span>
                <span style={{ fontSize: '0.72rem', color: '#3B82F6' }}>{r.transactionCount} tx</span>
              </label>
            ))
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <Receipt size={14} color="#F59E0B" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F59E0B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Invoice Run
            </span>
          </div>
          {invoiceRuns.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>No runs with invoices yet</div>
          ) : (
            invoiceRuns.map(r => (
              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}>
                <input type="radio" name="invoice-run" checked={invoiceRunId === r.id} onChange={() => setInvoiceRunId(r.id)} style={{ accentColor: '#F59E0B' }} />
                <span style={{ fontSize: '0.8rem', fontFamily: 'IBM Plex Mono, monospace', color: invoiceRunId === r.id ? 'var(--text)' : 'var(--muted)' }}>
                  {r.id.slice(0, 10)}…
                </span>
                <span style={{ fontSize: '0.72rem', color: '#F59E0B' }}>{r.invoiceCount} inv</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Run button */}
      <div className="fade-up-2" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => runReconcile()}
          disabled={!canRun || isPending}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 22px', borderRadius: 8,
            background: canRun && !isPending ? '#22C55E' : 'var(--surface-2)',
            color: canRun && !isPending ? '#020617' : 'var(--muted)',
            fontWeight: 700, fontSize: '0.875rem', border: 'none',
            cursor: canRun && !isPending ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          {isPending ? <span className="spinner" style={{ borderTopColor: '#020617' }} /> : <Play size={15} strokeWidth={2.5} />}
          {isPending ? 'Reconciling…' : 'Run Reconciliation'}
        </button>
        {result && (
          <button onClick={() => setResult(null)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '9px 14px', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer',
          }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {isError && (
        <div style={{ marginBottom: 16, color: '#EF4444', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} /> {(error as Error)?.message}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="fade-up">
          {/* Summary */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Matched',       value: result.summary.matchedCount,              color: '#22C55E' },
              { label: 'Unmatched Tx',  value: result.summary.unmatchedTransactionCount, color: '#EF4444' },
              { label: 'Unmatched Inv', value: result.summary.unmatchedInvoiceCount,     color: '#F59E0B' },
              { label: 'Total Tx',      value: result.summary.totalTransactions,         color: '#3B82F6' },
              { label: 'Total Inv',     value: result.summary.totalInvoices,             color: '#A78BFA' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 16px', minWidth: 100,
              }}>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Matched pairs */}
          {result.matched.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <CheckCircle2 size={14} color="#22C55E" />
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Matched Pairs</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>({result.matched.length})</span>
              </div>
              <table className="table-base">
                <thead><tr><th>Transaction</th><th>Invoice</th><th>Tx Amount</th><th>Inv Amount</th><th>Score</th><th>Level</th></tr></thead>
                <tbody>
                  {result.matched.map((pair, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>{pair.transaction?.description ?? '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace' }}>{pair.transaction?.date}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>{pair.invoice?.vendorName ?? '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace' }}>#{pair.invoice?.invoiceNumber}</div>
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
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <XCircle size={14} color="#EF4444" />
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#EF4444' }}>Unmatched Transactions</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>({result.unmatchedTransactions.length})</span>
              </div>
              <table className="table-base">
                <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Type</th></tr></thead>
                <tbody>
                  {result.unmatchedTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{tx.date}</td>
                      <td style={{ fontSize: '0.82rem' }}>{tx.description}</td>
                      <td><AmountCell amount={tx.amount} type={tx.type} /></td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{tx.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.unmatchedInvoices.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <AlertTriangle size={14} color="#F59E0B" />
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#F59E0B' }}>Unmatched Invoices</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>({result.unmatchedInvoices.length})</span>
              </div>
              <table className="table-base">
                <thead><tr><th>Invoice #</th><th>Vendor</th><th>Total</th><th>Due Date</th></tr></thead>
                <tbody>
                  {result.unmatchedInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>#{inv.invoiceNumber}</td>
                      <td style={{ fontSize: '0.82rem' }}>{inv.vendorName}</td>
                      <td><AmountCell amount={inv.totalAmount} /></td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{inv.dueDate}</td>
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

  const tabs: { key: Tab; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'bank',      label: 'Bank Statement', icon: Landmark,   color: '#3B82F6' },
    { key: 'invoice',   label: 'Invoices',        icon: FileText,   color: '#F59E0B' },
    { key: 'reconcile', label: 'Reconciliation',  icon: FileCheck2, color: '#22C55E' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Upload & Extract"
        subtitle="Upload documents and run OCR extraction independently per type"
      />

      {/* Tab bar */}
      <div style={{ padding: '0 32px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 0 }}>
        {tabs.map(({ key, label, icon: Icon, color }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '13px 20px',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${active ? color : 'transparent'}`,
                color: active ? color : 'var(--muted)',
                fontWeight: active ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                marginBottom: -1,
                fontFamily: 'inherit',
              }}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
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
