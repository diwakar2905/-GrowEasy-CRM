import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Eye, X, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from './ui/card';

interface CRMTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  searchPlaceholder?: string;
  searchKey?: string;
  onRowClick?: (row: TData) => void;
}

export function CRMTable<TData>({
  data,
  columns,
  searchPlaceholder = "Search records...",
  searchKey,
  onRowClick,
}: CRMTableProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState('');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Configure TanStack Table
  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // Standard client filtering
    globalFilterFn: (row, columnId, filterValue) => {
      const val = row.getValue(columnId);
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(String(filterValue).toLowerCase());
    },
  });

  const { rows } = table.getRowModel();

  // Configure TanStack Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 48, // 48px row height
    getScrollElement: () => tableContainerRef.current,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full flex flex-col space-y-4"
    >
      {/* Search Bar */}
      <div className="relative flex items-center max-w-sm">
        <Search className="absolute left-3 h-4 w-4 text-zinc-550" />
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-4 text-sm text-zinc-200 placeholder-zinc-550 outline-none transition-colors focus:border-zinc-700"
        />
        {globalFilter && (
          <button
            onClick={() => setGlobalFilter('')}
            className="absolute right-3 text-zinc-400 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 shadow-inner overflow-hidden">
        <div
          ref={tableContainerRef}
          className="max-h-[500px] overflow-auto relative"
          style={{ contain: 'nested' }}
        >
          <table className="w-full border-collapse text-left text-sm text-zinc-300">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 bg-zinc-950 z-20 border-b border-zinc-800">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3.5 font-medium text-zinc-450 text-xs uppercase tracking-wider whitespace-nowrap bg-zinc-950"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Virtualized Table Body */}
            <tbody
              className="relative"
              style={{
                height: `${totalVirtualSize}px`,
              }}
            >
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-zinc-500"
                  >
                    No matching records found.
                  </td>
                </tr>
              ) : (
                virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onRowClick && onRowClick(row.original)}
                      className={`absolute left-0 w-full flex items-center border-b border-zinc-900/50 hover:bg-zinc-900/40 hover:text-zinc-100 transition-colors select-none ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${virtualRow.index % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/20'}`}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3.5 truncate flex-1"
                          style={{
                            width: cell.column.columnDef.size,
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-zinc-900 px-4 py-3 bg-zinc-950 text-xs text-zinc-500">
          <div>
            Showing {rows.length} of {data.length} records
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Dialog/Detail drawer overlay component for showing AI explanation and detected mappings
interface LeadDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadResult: any; // ProcessedLeadResult
}

export const LeadDetailsModal: React.FC<LeadDetailsModalProps> = ({
  isOpen,
  onClose,
  leadResult,
}) => {
  if (!isOpen || !leadResult) return null;

  const isSkipped = !leadResult.isValid;
  const leadData = leadResult.lead || leadResult.rawRow;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-555 hover:bg-zinc-900 hover:text-zinc-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3 mb-6">
          {isSkipped ? (
            <div className="rounded-full bg-red-950/40 border border-red-800 p-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          ) : (
            <div className="rounded-full bg-emerald-950/40 border border-emerald-800 p-2 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              Record #{leadResult.index + 1} details
            </h2>
            <p className="text-xs text-zinc-500">
              Status: {isSkipped ? (
                <span className="text-red-400 font-medium">Skipped</span>
              ) : (
                <span className="text-emerald-400 font-medium">Imported</span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
          {/* Validation Errors (if any) */}
          {isSkipped && leadResult.errors && leadResult.errors.length > 0 && (
            <div className="rounded-lg bg-red-950/10 border border-red-900/30 p-4 text-sm text-red-400">
              <h4 className="font-semibold mb-1 text-red-300">Validation Failures</h4>
              <ul className="list-disc pl-5 space-y-0.5">
                {leadResult.errors.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Metrics (Confidence & Explanation) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-zinc-900/25">
              <span className="text-xs text-zinc-555">AI Confidence</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-zinc-100">
                  {Math.round(leadResult.confidence * 100)}%
                </span>
                <div className="h-2.5 w-24 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full ${
                      leadResult.confidence > 0.8
                        ? 'bg-emerald-500'
                        : leadResult.confidence > 0.5
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${leadResult.confidence * 100}%` }}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-zinc-900/25">
              <span className="text-xs text-zinc-555">AI Explanation</span>
              <p className="text-sm mt-1 text-zinc-350 leading-relaxed">
                {leadResult.explanation || "No explanation provided by AI."}
              </p>
            </Card>
          </div>

          {/* Column Mappings */}
          {!isSkipped && leadResult.detectedMapping && Object.keys(leadResult.detectedMapping).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-555 mb-2">
                Detected Column Mapping
              </h4>
              <div className="rounded-lg border border-zinc-900 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/40 text-zinc-400 border-b border-zinc-900">
                      <th className="px-3 py-2 font-medium">Original CSV Column</th>
                      <th className="px-3 py-2 font-medium">Mapped CRM Field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(leadResult.detectedMapping).map(([csvCol, crmField]: any, i) => (
                      <tr key={i} className="border-b border-zinc-900/50 hover:bg-zinc-900/10">
                        <td className="px-3 py-2 text-zinc-300 font-mono">{csvCol}</td>
                        <td className="px-3 py-2 text-zinc-400">
                          <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 font-mono text-zinc-150">
                            {crmField}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-900 pt-4">
            {/* Left Panel: Raw CSV Row */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Raw CSV Properties</h4>
              <div className="rounded-xl border border-zinc-900 p-4 bg-zinc-950/40 font-mono text-[10px] space-y-2 max-h-[260px] overflow-y-auto">
                {Object.entries(leadResult.rawRow || {}).map(([key, value]) => (
                  <div key={key} className="flex flex-col pb-1.5 border-b border-zinc-900/30 last:border-0 last:pb-0">
                    <span className="text-zinc-550 uppercase font-bold text-[8.5px]">{key}</span>
                    <span className="text-zinc-400 truncate mt-0.5" title={String(value)}>
                      {String(value) !== 'undefined' && String(value) !== 'null' && String(value) !== '' ? String(value) : <span className="text-zinc-800 italic">empty</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel: Normalized Lead Data */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                {isSkipped ? 'AI Extracted Data' : 'AI Normalized Fields'}
              </h4>
              <div className="rounded-xl border border-zinc-900 p-4 bg-zinc-950 font-mono text-[10px] space-y-2 max-h-[260px] overflow-y-auto relative">
                <div className="absolute top-0 right-0 p-1 text-[8px] uppercase tracking-widest bg-zinc-900 border-l border-b border-zinc-850 rounded-bl text-zinc-550 select-none">
                  Target Schema
                </div>
                {Object.entries(leadData).map(([key, value]) => {
                  if (key === 'created_at' && isSkipped) return null;
                  return (
                    <div key={key} className="flex flex-col pb-1.5 border-b border-zinc-900/30 last:border-0 last:pb-0">
                      <span className="text-zinc-500 uppercase font-bold text-[8.5px]">{key}</span>
                      <span className="text-zinc-200 truncate mt-0.5" title={String(value)}>
                        {String(value) !== 'undefined' && String(value) !== 'null' && String(value) !== '' ? String(value) : <span className="text-zinc-850 italic">empty</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-850 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 select-none cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
