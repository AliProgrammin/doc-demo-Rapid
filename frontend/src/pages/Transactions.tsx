import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender, createColumnHelper } from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { listTransactions, patchTransaction, listExtractionRuns, type Transaction } from '../api/client'
import { ConfidenceBadge, AmountCell } from '../components/Badge'
import PageHeader from '../components/PageHeader'
import { ArrowUpDown, X, FileText } from 'lucide-react'

const col = createColumnHelper<Transaction>()

function EditableCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  if (editing) return (
    <td className="editable-cell">
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { setEditing(false); if (val !== value) onSave(val) }}
        onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); if (val !== value) onSave(val) } if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
      />
    </td>
  )
  return (
    <td className="editable-cell" onDoubleClick={() => setEditing(true)} title="Double-click to edit">
      {value || <span style={{ color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>—</span>}
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
      {/* Header */}
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
      {/* PDF iframe */}
      <iframe
        src={`/api/documents/${docId}/file`}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title={filename ?? 'PDF viewer'}
      />
    </div>
  )
}

export default function Transactions() {
  const { data: runs = [] } = useQuery({ queryKey: ['extraction-runs'], queryFn: listExtractionRuns })
  const [runId, setRunId] = useState<string>('all')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [selectedFilename, setSelectedFilename] = useState<string | undefined>()

  const { data = [], isLoading } = useQuery({
    queryKey: ['transactions', runId],
    queryFn: () => listTransactions(runId === 'all' ? undefined : runId),
  })

  const qc = useQueryClient()
  const { mutate: patch } = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: string }) =>
      patchTransaction(id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', runId] }),
  })

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = [
    col.accessor('date', {
      header: 'Date',
      cell: info => (
        <EditableCell
          value={info.getValue()}
          onSave={v => patch({ id: info.row.original.id, field: 'date', value: v })}
        />
      ),
    }),
    col.accessor('description', {
      header: 'Description',
      cell: info => (
        <EditableCell
          value={info.getValue()}
          onSave={v => patch({ id: info.row.original.id, field: 'description', value: v })}
        />
      ),
    }),
    col.accessor('reference', {
      header: 'Reference',
      cell: info => (
        <EditableCell
          value={info.getValue() ?? ''}
          onSave={v => patch({ id: info.row.original.id, field: 'reference', value: v })}
        />
      ),
    }),
    col.accessor('amount', {
      header: 'Amount',
      cell: info => <td><AmountCell amount={info.getValue()} type={info.row.original.type} /></td>,
    }),
    col.accessor('type', {
      header: 'Type',
      cell: info => (
        <td>
          <span style={{
            fontSize: '0.72rem', fontWeight: 600, textTransform: 'capitalize',
            padding: '2px 8px', borderRadius: 99,
            background: info.getValue() === 'credit' ? '#22C55E18' : '#EF444418',
            color: info.getValue() === 'credit' ? '#22C55E' : '#EF4444',
          }}>
            {info.getValue()}
          </span>
        </td>
      ),
    }),
    col.accessor('extractionConfidence', {
      header: 'Confidence',
      cell: info => <td><ConfidenceBadge value={info.getValue()} /></td>,
    }),
    col.display({
      id: 'pdf',
      header: 'PDF',
      cell: info => {
        const docId = info.row.original.documentId
        if (!docId) return <td />
        const isOpen = selectedDocId === docId
        return (
          <td>
            <button
              onClick={() => {
                if (isOpen) { setSelectedDocId(null) } else {
                  setSelectedDocId(docId)
                  setSelectedFilename(undefined)
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
        title="Transactions"
        tag="Review"
        subtitle="Extracted bank transactions — double-click cells to edit and track corrections"
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

      {/* Run selector */}
      <div style={{ padding: '10px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Run:</span>
        <select
          className="select-base"
          value={runId}
          onChange={e => setRunId(e.target.value)}
        >
          <option value="all">All Runs</option>
          {runs.map(r => (
            <option key={r.id} value={r.id}>{r.id.slice(0, 12)}… ({r.transactionCount ?? 0} tx)</option>
          ))}
        </select>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          {data.length} transaction{data.length !== 1 ? 's' : ''}
        </span>
        {selectedDocId && (
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--mid)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={12} /> PDF open — click row PDF button to switch
          </span>
        )}
      </div>

      {/* Split view */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
          ) : data.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No transactions found</div>
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
                    {row.getVisibleCells().map(cell => (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PDF panel */}
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
          <span style={{ fontSize: '0.72rem', fontStyle: 'italic' }}>Double-click cell to edit · changes tracked as corrections · click PDF to compare</span>
        </div>
      )}
    </div>
  )
}
