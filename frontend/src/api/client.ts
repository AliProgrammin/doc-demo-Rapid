const BASE = ''  // proxied via vite to localhost:8000

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init)
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Documents ──────────────────────────────────────────────────────────────

export interface Document {
  id: string
  originalFilename: string
  docType: 'bank_statement' | 'invoice'
  blobUrl: string
  uploadDate?: string
  fileSize?: number
}

export async function uploadDocument(file: File, docType: 'bank_statement' | 'invoice') {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('docType', docType)
  return req<{ success: boolean; documentId: string; originalFilename: string; docType: string }>(
    '/api/upload',
    { method: 'POST', body: fd }
  )
}

export async function listDocuments(type?: string): Promise<Document[]> {
  const qs = type ? `?type=${type}` : ''
  const data = await req<{ documents: Document[] }>(`/api/documents${qs}`)
  return data.documents
}

// ── Extraction ─────────────────────────────────────────────────────────────

export interface ExtractionRun {
  id: string
  status: string
  startedAt?: string
  completedAt?: string
  transactionCount?: number
  invoiceCount?: number
  bankDocumentId?: string
}

export async function extract(bankStatementDocId?: string, invoiceDocIds?: string[]) {
  return req<{ success: boolean; extractionRunId: string; transactionCount: number; invoiceCount: number }>(
    '/api/extract',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankStatementDocId, invoiceDocIds }) }
  )
}

export async function listExtractionRuns(): Promise<ExtractionRun[]> {
  const data = await req<{ runs: ExtractionRun[] }>('/api/extraction-runs')
  return data.runs ?? []
}

// ── Transactions ───────────────────────────────────────────────────────────

export interface Transaction {
  id: string
  documentId: string
  date: string
  description: string
  reference: string
  amount: number
  type: string
  extractionConfidence: number
}

export async function listTransactions(extractionRunId?: string): Promise<Transaction[]> {
  const qs = extractionRunId ? `?extractionRunId=${extractionRunId}` : ''
  const data = await req<{ transactions: Transaction[] }>(`/api/transactions${qs}`)
  return data.transactions
}

export async function patchTransaction(id: string, patch: Partial<Transaction>) {
  return req<{ success: boolean; transaction: Transaction }>(
    `/api/transactions/${id}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }
  )
}

// ── Invoices ───────────────────────────────────────────────────────────────

export interface Invoice {
  id: string
  documentId: string
  invoiceNumber: string
  vendorName: string
  invoiceDate: string
  dueDate: string
  totalAmount: number
  subtotal?: number
  tax?: number
  purchaseOrder?: string
  overallConfidence: number
  originalFilename?: string
}

export async function listInvoices(extractionRunId?: string): Promise<Invoice[]> {
  const qs = extractionRunId ? `?extractionRunId=${extractionRunId}` : ''
  const data = await req<{ invoices: Invoice[] }>(`/api/invoices${qs}`)
  return data.invoices
}

export async function patchInvoice(id: string, patch: Partial<Invoice>) {
  return req<{ success: boolean; invoice: Invoice }>(
    `/api/invoices/${id}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }
  )
}

// ── Reconciliation ─────────────────────────────────────────────────────────

export interface MatchedPair {
  transaction: Transaction
  invoice: Invoice
  confidence: number
  confidenceLevel: string
  factors: Record<string, number>
}

export interface ReconciliationResult {
  success: boolean
  reconciliationRunId: string
  matched: MatchedPair[]
  unmatchedTransactions: Transaction[]
  unmatchedInvoices: Invoice[]
  summary: {
    totalTransactions: number
    totalInvoices: number
    matchedCount: number
    unmatchedTransactionCount: number
    unmatchedInvoiceCount: number
  }
}

export async function reconcile(extractionRunId: string) {
  return req<ReconciliationResult>(
    '/api/reconcile',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extractionRunId }) }
  )
}

export async function getReconciliationRun(runId: string) {
  return req<ReconciliationResult>(`/api/reconciliation-runs/${runId}`)
}

// ── Corrections ────────────────────────────────────────────────────────────

export interface Correction {
  id: string
  entityType: string
  entityId: string
  documentId: string
  fieldName: string
  originalValue: string
  correctedValue: string
  createdAt: string
}

export async function listCorrections(entityType?: string): Promise<{ corrections: Correction[]; stats: Record<string, unknown> }> {
  const qs = entityType ? `?entityType=${entityType}` : ''
  return req(`/api/corrections${qs}`)
}
