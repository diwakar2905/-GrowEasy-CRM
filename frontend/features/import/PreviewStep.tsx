import React, { useMemo, useState } from 'react';
import { CRMTable } from '../../components/CRMTable';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  FileSpreadsheet,
  ArrowLeft,
  Play,
  Database,
  Columns,
  FileCode,
  Sparkles,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Calendar,
  Phone,
  AlertCircle,
  EyeOff,
  ShieldAlert
} from 'lucide-react';
import { AIDetectedSource } from '../../types';
import { Tabs } from '../../components/ui/tabs';

interface PreviewStepProps {
  fileName: string;
  fileSize: number;
  rows: any[];
  headers: string[];
  onConfirm: () => void;
  onCancel: () => void;
  isUploading: boolean;
  detectedSource?: AIDetectedSource;
  userMappings: Record<string, string>;
  onMappingChange: (col: string, field: string) => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  fileName,
  fileSize,
  rows,
  headers,
  onConfirm,
  onCancel,
  isUploading,
  detectedSource,
  userMappings,
  onMappingChange,
}) => {
  const [activeView, setActiveView] = useState('mapping');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    source: true,
    mapping: true,
    warnings: true
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const targetFields = [
    { value: 'name', label: 'Lead Name (name)' },
    { value: 'email', label: 'Email Address (email)' },
    { value: 'phone', label: 'Phone Number (phone)' },
    { value: 'company', label: 'Company Name (company)' },
    { value: 'city', label: 'City (city)' },
    { value: 'state', label: 'State/Province (state)' },
    { value: 'country', label: 'Country (country)' },
    { value: 'lead_owner', label: 'Lead Owner (lead_owner)' },
    { value: 'crm_status', label: 'Lead Status (crm_status)' },
    { value: 'crm_note', label: 'Lead Notes (crm_note)' },
    { value: 'data_source', label: 'Data Source (data_source)' },
    { value: 'possession_time', label: 'Possession Time (possession_time)' },
    { value: 'description', label: 'Description (description)' },
    { value: '', label: 'Ignore / Don\'t Import' },
  ];
  // Format file size nicely
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Pre-analyze headers to simulate AI mapping plan before actual backend processing
  const aiMappingPlan = useMemo(() => {
    return headers.map((header) => {
      const hLower = header.toLowerCase().trim();
      let target = '';
      if (hLower.includes('name') || hLower.includes('client') || hLower.includes('person') || hLower.includes('lead')) {
        target = 'name';
      } else if (hLower.includes('email') || hLower.includes('mail')) {
        target = 'email';
      } else if (hLower.includes('phone') || hLower.includes('contact') || hLower.includes('mobile') || hLower.includes('cell')) {
        target = 'phone';
      } else if (hLower.includes('company') || hLower.includes('firm') || hLower.includes('employer') || hLower.includes('org')) {
        target = 'company';
      } else if (hLower.includes('city') || hLower.includes('hq') || hLower.includes('town')) {
        target = 'city';
      } else if (hLower.includes('state') || hLower.includes('province')) {
        target = 'state';
      } else if (hLower.includes('source')) {
        target = 'data_source';
      } else if (hLower.includes('status')) {
        target = 'crm_status';
      }
      return { csvCol: header, crmField: target };
    }).filter(item => item.crmField !== '');
  }, [headers]);

  // Convert headers to column definitions for CRMTable
  const columns = useMemo(() => {
    return headers.map((header) => ({
      id: header,
      accessorKey: header,
      header: () => <span className="font-mono text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{header}</span>,
      cell: (info: any) => {
        const val = info.getValue();
        return (
          <span className="font-mono text-xs text-zinc-300 block truncate" title={String(val || '')}>
            {val !== undefined && val !== null && val !== '' ? String(val) : <span className="text-zinc-800 italic">null</span>}
          </span>
        );
      },
      size: 180,
    }));
  }, [headers]);

  if (headers.length === 0 || rows.length === 0) {
    return (
      <div className="max-w-md mx-auto py-24 px-6 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
        <div className="rounded-full bg-zinc-900 border border-zinc-800 p-4 text-zinc-500 mb-4 select-none">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">No Preview Data Available</h3>
        <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed font-mono">
          We couldn't extract any columns or rows from the selected file. Ensure it is a valid CSV document with data cells.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button variant="primary" size="sm" onClick={onCancel}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Go back to Upload
          </Button>
          <span className="text-[10px] text-zinc-650 mt-1 select-none font-mono">
            Supported encodings: UTF-8, ANSI comma-separated values.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-6 flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Navigation and Actions Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 w-fit select-none cursor-pointer focus:outline-none"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to upload
        </button>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isUploading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} isLoading={isUploading}>
            <Play className="mr-2 h-3.5 w-3.5 fill-zinc-950 stroke-zinc-950" />
            Confirm Import
          </Button>
        </div>
      </div>

      {/* Header Panel */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Review CSV Schema</h1>
        <p className="text-xs text-zinc-550 mt-1 leading-relaxed">
          Verify the file structure and columns below. Confirming will upload the file and begin AI normalization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Stats and Table */}
        <div className="lg:col-span-8 space-y-6">
          {/* Metadata KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-zinc-950 border-zinc-900 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-600 block">File Name</span>
              <p className="text-xs font-bold text-zinc-250 truncate mt-1.5" title={fileName}>
                {fileName}
              </p>
            </Card>

            <Card className="p-4 bg-zinc-950 border-zinc-900 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-600 block">Total Rows</span>
              <p className="text-sm font-bold text-zinc-250 mt-1.5">{rows.length}</p>
            </Card>

            <Card className="p-4 bg-zinc-950 border-zinc-900 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-600 block">Columns</span>
              <p className="text-sm font-bold text-zinc-250 mt-1.5">{headers.length}</p>
            </Card>

            <Card className="p-4 bg-zinc-950 border-zinc-900 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-zinc-600 block">File Size</span>
              <p className="text-sm font-bold text-zinc-250 mt-1.5">{formatFileSize(fileSize)}</p>
            </Card>
          </div>

          {/* Tabbed Mapping and Preview Dashboards */}
          <Card className="p-6 bg-zinc-950 border-zinc-900/60 shadow-xl space-y-6">
            <Tabs
              options={[
                { id: 'mapping', label: 'Schema Mapping', count: headers.length },
                { id: 'preview', label: 'Data Preview', count: rows.length },
              ]}
              activeId={activeView}
              onChange={setActiveView}
            />

            {activeView === 'mapping' ? (
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                <div className="text-[10px] text-zinc-550 pb-2 border-b border-zinc-900 flex justify-between font-bold uppercase tracking-wider select-none font-mono">
                  <span className="w-1/2">CSV Column Name & Sample Value</span>
                  <span className="w-5/12 text-left">CRM Destination Field</span>
                  <span className="w-1/12 text-right">Confidence</span>
                </div>
                {headers.map((col) => {
                  const sampleValue = rows[0]?.[col] || '';
                  const currentMapped = userMappings[col] || '';
                  const aiMapInfo = detectedSource?.columnMappings.find(m => m.originalColumn === col);
                  const aiConfidence = aiMapInfo?.confidence || 0;
                  const isUnmapped = currentMapped === '';

                  return (
                    <div
                      key={col}
                      className="flex items-center justify-between py-3 border-b border-zinc-900/50 hover:bg-zinc-900/10 transition-colors"
                    >
                      {/* Left: CSV Header and sample value */}
                      <div className="w-1/2 flex flex-col min-w-0 pr-4">
                        <span className="text-sm font-semibold text-zinc-250 truncate" title={col}>
                          {col}
                        </span>
                        <span className="text-[10px] text-zinc-650 font-mono mt-0.5 truncate">
                          e.g. {sampleValue !== '' ? `"${sampleValue}"` : <span className="italic">empty</span>}
                        </span>
                      </div>

                      {/* Middle: Selection dropdown */}
                      <div className="w-5/12 pr-4">
                        <select
                          value={currentMapped}
                          onChange={(e) => onMappingChange(col, e.target.value)}
                          className="w-full h-8 bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-zinc-700 select-none cursor-pointer"
                        >
                          {targetFields.map((tf) => (
                            <option key={tf.value} value={tf.value} className="bg-zinc-950 text-zinc-300">
                              {tf.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Right: Confidence badge / Warning tag */}
                      <div className="w-1/12 text-right">
                        {isUnmapped ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-950/20 border border-amber-900/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 select-none">
                            ⚠️ Unmapped
                          </span>
                        ) : (
                          <span className={`font-mono text-xs font-bold ${
                            aiConfidence > 0.8 ? 'text-emerald-450' : aiConfidence > 0.5 ? 'text-amber-405' : 'text-red-450'
                          }`}>
                            {aiConfidence > 0 ? `${Math.round(aiConfidence * 100)}%` : 'User'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <CRMTable
                data={rows}
                columns={columns}
                searchPlaceholder="Filter columns and content..."
              />
            )}
          </Card>
        </div>

        {/* Right Side: AI Pre-Analysis Mapping Insight */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-zinc-950 border border-zinc-900 shadow-xl overflow-hidden flex flex-col relative select-none">
            {/* Subtle glow border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            
            <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-zinc-400 animate-pulse" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">AI Analysis & Forensics</h4>
              </div>
            </div>

            {/* Accordion List */}
            <div className="divide-y divide-zinc-900">
              {/* Section 1: Source & Metadata Diagnostics */}
              <div>
                <button
                  onClick={() => toggleSection('source')}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-900/10 transition-colors focus:outline-none"
                >
                  <span className="text-xs font-bold text-zinc-300">Origin Source & Diagnostics</span>
                  {openSections.source ? <ChevronUp className="h-4 w-4 text-zinc-550" /> : <ChevronDown className="h-4 w-4 text-zinc-550" />}
                </button>

                {openSections.source && (
                  <div className="px-5 pb-5 pt-1 space-y-4">
                    {/* Platform details */}
                    <div className="p-3 bg-zinc-900/20 border border-zinc-900/60 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-550 block">Origin Platform</span>
                        {detectedSource && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${
                            detectedSource.confidence >= 0.70
                              ? 'bg-emerald-950/40 text-emerald-450 border-emerald-900/40'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-850'
                          }`}>
                            Match: {detectedSource.confidence >= 0.70 ? `${Math.round(detectedSource.confidence * 100)}%` : 'Low'}
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-zinc-200">
                        {detectedSource && detectedSource.confidence >= 0.70 ? detectedSource.source : 'Custom CSV Detected'}
                      </h5>
                      <p className="text-[10px] text-zinc-500 leading-relaxed mt-2.5">
                        {detectedSource && detectedSource.confidence >= 0.70
                          ? detectedSource.reasoning
                          : 'The CSV layout contains unique headers. AI has prepared a custom integration template.'}
                      </p>
                    </div>

                    {/* Metadata Diagnostics */}
                    <div className="space-y-3 font-mono text-[10px] text-zinc-450 border-t border-zinc-900/60 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Globe className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                          <span>Language:</span>
                        </div>
                        <span className="text-zinc-250 font-bold">{detectedSource?.language || 'English'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Calendar className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                          <span>Date Format:</span>
                        </div>
                        <span className="text-zinc-250 font-bold">{detectedSource?.dateFormat || 'ISO 8601 / UTC'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Phone className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                          <span>Phone Format:</span>
                        </div>
                        <span className="text-zinc-250 font-bold">{detectedSource?.phoneFormat || 'E.164 (International)'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: AI Column Mapping Grid */}
              <div>
                <button
                  onClick={() => toggleSection('mapping')}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-900/10 transition-colors focus:outline-none"
                >
                  <span className="text-xs font-bold text-zinc-300">AI Column Mappings Confidence</span>
                  {openSections.mapping ? <ChevronUp className="h-4 w-4 text-zinc-550" /> : <ChevronDown className="h-4 w-4 text-zinc-550" />}
                </button>

                {openSections.mapping && (
                  <div className="px-5 pb-5 pt-1 space-y-3">
                    <p className="text-[10px] text-zinc-550 leading-relaxed font-mono">
                      Calculated extraction confidence for resolved CSV headers:
                    </p>
                    {detectedSource && detectedSource.columnMappings && detectedSource.columnMappings.filter(m => m.crmField !== '').length > 0 ? (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {detectedSource.columnMappings
                          .filter(m => m.crmField !== '')
                          .map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 rounded bg-zinc-900/30 border border-zinc-900/60 font-mono text-[10px]"
                            >
                              <span className="text-zinc-450 truncate max-w-[110px]" title={item.originalColumn}>
                                {item.originalColumn}
                              </span>
                              <span className="text-zinc-600 select-none">→</span>
                              <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-zinc-350">
                                {item.crmField}
                              </span>
                              <span className={`font-bold ${
                                item.confidence > 0.8 ? 'text-emerald-450' : item.confidence > 0.5 ? 'text-amber-405' : 'text-red-450'
                              }`}>
                                {Math.round(item.confidence * 100)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-zinc-650 text-xs italic font-mono">
                        No mapping coordinates detected.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Cleanse & Deduplication Warnings */}
              <div>
                <button
                  onClick={() => toggleSection('warnings')}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-900/10 transition-colors focus:outline-none"
                >
                  <span className="text-xs font-bold text-zinc-300">Cleanse & Deduplication Plan</span>
                  {openSections.warnings ? <ChevronUp className="h-4 w-4 text-zinc-550" /> : <ChevronDown className="h-4 w-4 text-zinc-550" />}
                </button>

                {openSections.warnings && (
                  <div className="px-5 pb-5 pt-1 space-y-4 font-mono text-[10px] text-zinc-450">
                    {/* Ignored Columns */}
                    <div>
                      <div className="flex items-center gap-1.5 text-zinc-400 mb-1.5">
                        <EyeOff className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                        <span>Ignored Fields ({detectedSource?.ignoredColumns?.length || 0}):</span>
                      </div>
                      {detectedSource?.ignoredColumns && detectedSource.ignoredColumns.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {detectedSource.ignoredColumns.map((col, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-900/60 border border-zinc-850 text-zinc-500">
                              {col}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-600 italic">None</span>
                      )}
                    </div>

                    {/* Duplicate Check Columns */}
                    <div>
                      <div className="flex items-center gap-1.5 text-zinc-400 mb-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                        <span>Deduplication Columns:</span>
                      </div>
                      {detectedSource?.duplicateColumns && detectedSource.duplicateColumns.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {detectedSource.duplicateColumns.map((col, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-900/60 border border-zinc-850 text-zinc-400">
                              {col}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-600 italic">None</span>
                      )}
                    </div>

                    {/* Potential Missing Information */}
                    <div className="border-t border-zinc-900/60 pt-3">
                      <div className="flex items-center gap-1.5 text-zinc-400 mb-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                        <span>Data Density Insights:</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        {detectedSource?.potentialMissingInfo || 'All rows appear to contain dense values without anomalies.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Help Note Footer */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex gap-2 text-[10px] text-zinc-600">
              <HelpCircle className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
              <span>
                Diagnostics are derived semantically from columns and row sampling to keep integration rules transparent.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
