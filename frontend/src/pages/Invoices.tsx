import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender, createColumnHelper } from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { listInvoices, patchInvoice, listExtractionRuns, type Invoice } from '../api/client'
import { ConfidenceBadge } from '../components/Badge'
import PageHeader from '../components/PageHeader'
import { ArrowUpDown, X, FileText } from 'lucide-react'

const col = createColumnHelper<Invoice>()

function EditableCell({ value, onSave, mono }: { value: string | number | undefined | null; onSave: (v: string) => void; mono?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value ?? ''))
  if (editing) return (
    <td className="editable-cell">
      <input
        autoFocus value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { setEditing(false); if (val !== String(value ?? '')) onSave(val) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { setEditing(false); if (val !== String(value ?? '')) onSave(val) }
          if (e.key === 'Escape') { setVal(String(value ?? '')); setEditing(false) }
        }}
      />
    </td>
  )
  return (
    <td className={`editable-cell${mono ? ' mono' : ''}`} onDoubleClick={() => setEditing(true)} title="Double-click to edit">
      {value != null && value !== '' ? String(value) : <span style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>—</span>}
    </td>
  )
}

function PdfPanel({ docId, filename, onClose }: { docId: string; filename?: string; onClose: () => void }) {
  return (
    <div style={{
      width: 480,
      flexShrink: 0,
      borderLeft: '2px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--white)',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--light)',
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
      }}>
        <FileText size={13} color="var(--mid)" />
        <span className="label" style={{ color: 'var(--mid)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {filename ?? 'Document'}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--mid)' }}
        >
          <X size={14} />
        </button>
      </div>
      <iframe
        src={`/api/documents/${docId}/file`}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title={filename ?? 'PDF viewer'}
      />
    </div>
  )
}

export default function Invoices() {
  const { data: runs = [] } = useQuery({ queryKey: ['extraction-runs'], queryFn: listExtractionRuns })
  const [runId, setRunId] = useState<string>('all')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [selectedFilename, setSelectedFilename] = useState<string | undefined>()

  const { data = [], isLoading } = useQuery({
    queryKey: ['invoices', runId],
    queryFn: () => listInvoices(runId === 'all' ? undefined : runId),
  })

  const qc = useQueryClient()
  const { mutate: patch } = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: string }) =>
      patchInvoice(id, { [field]: value } as Partial<Invoice>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices', runId] }),
  })

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = [
    col.accessor('invoiceNumber', {
      header: 'Invoice #',
      cell: info => <EditableCell value={info.getValue()} mono onSave={v => patch({ id: info.row.original.id, field: 'invoiceNumber', value: v })} />,
    }),
    col.accessor('vendorName', {
      header: 'Vendor',
      cell: info => <EditableCell value={info.getValue()} onSave={v => patch({ id: info.row.original.id, field: 'vendorName', value: v })} />,
    }),
    col.accessor('invoiceDate', {
      header: 'Invoice Date',
      cell: info => <EditableCell value={info.getValue()} onSave={v => patch({ id: info.row.original.id, field: 'invoiceDate', value: v })} />,
    }),
    col.accessor('dueDate', {
      header: 'Due Date',
      cell: info => <EditableCell value={info.getValue()} onSave={v => patch({ id: info.row.original.id, field: 'dueDate', value: v })} />,
    }),
    col.accessor('totalAmount', {
      header: 'Total',
      cell: info => (
        <td>
          <span className="mono" style={{ color: '#22C55E', fontWeight: 500 }}>
            ${Number(info.getValue() ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </td>
      ),
    }),
    col.accessor('overallConfidence', {
      header: 'Confidence',
      cell: info => <td><ConfidenceBadge value={info.getValue()} /></td>,
    }),
    col.accessor('originalFilename', {
      header: 'File',
      cell: info => (
        <td style={{ color: 'var(--muted)', fontSize: '0.78rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {info.getValue() ?? '—'}
        </td>
      ),
    }),
    col.display({
      id: 'pdf',
      header: 'PDF',
      cell: info => {
        const docId = info.row.original.documentId
        const filename = info.row.original.originalFilename
        if (!docId) return <td />
        const isOpen = selectedDocId === docId
        return (
          <td>
            <button
              onClick={() => {
                if (isOpen) { setSelectedDocId(null) } else {
                  setSelectedDocId(docId)
                  setSelectedFilename(filename)
                }
              }}
              style={{
                background: isOpen ? 'var(--yellow)' : 'var(--light)',
                border: `1px solid ${isOpen ? 'var(--dark)' : 'var(--border-light)'}`,
                cursor: 'pointer', padding: '2px 8px',
                fontSize: '0.7rem', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: 'var(--dark)',
              }}
            >
              <FileText size={11} /> {isOpen ? 'Close' : 'View'}
            </button>
          </td>
        )
      },
    }),
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title="Invoices"
        tag="Review"
        subtitle="Extracted invoices — double-click cells to correct values"
        actions={
          <input
            className="input-base"
            placeholder="Search…"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            style={{ width: 180 }}
          />
        }
      />

      <div style={{ padding: '10px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Run:</span>
        <select
          className="select-base"
          value={runId}
          onChange={e => setRunId(e.target.value)}
        >
          <option value="all">All Runs</option>
          {runs.map(r => (
            <option key={r.id} value={r.id}>{r.id.slice(0, 12)}… ({r.invoiceCount ?? 0} inv)</option>
          ))}
        </select>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{data.length} invoice{data.length !== 1 ? 's' : ''}</span>
        {selectedDocId && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--mid)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={12} /> PDF open — click row PDF button to switch
          </span>
        )}
      </div>

      {/* Split view */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
          ) : data.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No invoices found</div>
          ) : (
            <table className="table-base">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(h => (
                      <th key={h.id} onClick={h.column.getToggleSortingHandler()} style={{ cursor: h.column.getCanSort() ? 'pointer' : 'default' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getCanSort() && <ArrowUpDown size={12} style={{ opacity: 0.4 }} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    style={{ background: selectedDocId === row.original.documentId ? 'var(--yellow-pale)' : undefined }}
                  >
                    {row.getVisibleCells().map(cell => flexRender(cell.column.columnDef.cell, cell.getContext()))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedDocId && (
          <PdfPanel
            docId={selectedDocId}
            filename={selectedFilename}
            onClose={() => setSelectedDocId(null)}
          />
        )}
      </div>

      {data.length > 0 && (
        <div style={{ padding: '10px 28px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--muted)', flexShrink: 0 }}>
          {table.getFilteredRowModel().rows.length} of {data.length} rows
          {' · '}
          <span style={{ fontStyle: 'italic' }}>Double-click cell to edit · changes tracked as corrections · click PDF to compare</span>
        </div>
      )}
    </div>
  )
}
