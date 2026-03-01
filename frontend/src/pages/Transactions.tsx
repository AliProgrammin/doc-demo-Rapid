import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender, createColumnHelper } from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { listTransactions, patchTransaction, listExtractionRuns, type Transaction } from '../api/client'
import { ConfidenceBadge, AmountCell } from '../components/Badge'
import PageHeader from '../components/PageHeader'
import { ArrowUpDown } from 'lucide-react'

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

export default function Transactions() {
  const { data: runs = [] } = useQuery({ queryKey: ['extraction-runs'], queryFn: listExtractionRuns })
  const [runId, setRunId] = useState<string>('')
  const activeRunId = runId || runs[0]?.id || ''

  const { data = [], isLoading } = useQuery({
    queryKey: ['transactions', activeRunId],
    queryFn: () => listTransactions(activeRunId),
    enabled: !!activeRunId,
  })

  const qc = useQueryClient()
  const { mutate: patch } = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: string }) =>
      patchTransaction(id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', activeRunId] }),
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
        subtitle="Extracted bank transactions — double-click cells to edit and track corrections"
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
              <option key={r.id} value={r.id}>{r.id.slice(0, 12)}… ({r.transactionCount ?? 0} tx)</option>
            ))}
          </select>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {data.length} transaction{data.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner" /></div>
        ) : !activeRunId ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No extraction runs yet</div>
        ) : data.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No transactions in this run</div>
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
                  {row.getVisibleCells().map(cell => (
                    flexRender(cell.column.columnDef.cell, cell.getContext())
                  ))}
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
          <span style={{ fontSize: '0.72rem', fontStyle: 'italic' }}>Double-click any cell to edit · changes are tracked as corrections</span>
        </div>
      )}
    </div>
  )
}
