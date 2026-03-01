import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender, createColumnHelper } from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { listInvoices, patchInvoice, listExtractionRuns, type Invoice } from '../api/client'
import { ConfidenceBadge } from '../components/Badge'
import PageHeader from '../components/PageHeader'
import { ArrowUpDown } from 'lucide-react'

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

export default function Invoices() {
  const { data: runs = [] } = useQuery({ queryKey: ['extraction-runs'], queryFn: listExtractionRuns })
  const [runId, setRunId] = useState<string>('')
  const activeRunId = runId || runs[0]?.id || ''

  const { data = [], isLoading } = useQuery({
    queryKey: ['invoices', activeRunId],
    queryFn: () => listInvoices(activeRunId),
    enabled: !!activeRunId,
  })

  const qc = useQueryClient()
  const { mutate: patch } = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: string }) =>
      patchInvoice(id, { [field]: value } as Partial<Invoice>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices', activeRunId] }),
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
        <td style={{ color: 'var(--muted)', fontSize: '0.78rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {info.getValue() ?? '—'}
        </td>
      ),
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
        subtitle="Extracted invoices — double-click cells to correct values"
        actions={
          <input
            placeholder="Search…"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 12px', color: 'var(--text)',
              fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', width: 180,
            }}
          />
        }
      />

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
              <option key={r.id} value={r.id}>{r.id.slice(0, 12)}… ({r.invoiceCount ?? 0} inv)</option>
            ))}
          </select>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{data.length} invoice{data.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
        ) : !activeRunId ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No extraction runs yet</div>
        ) : data.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No invoices in this run</div>
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
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => flexRender(cell.column.columnDef.cell, cell.getContext()))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.length > 0 && (
        <div style={{ padding: '10px 32px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--muted)' }}>
          {table.getFilteredRowModel().rows.length} of {data.length} rows
          {' · '}
          <span style={{ fontStyle: 'italic' }}>Double-click any cell to edit · changes are tracked as corrections</span>
        </div>
      )}
    </div>
  )
}
