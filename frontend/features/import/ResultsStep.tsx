import React, { useState, useMemo } from 'react';
import { CRMTable, LeadDetailsModal } from '../../components/CRMTable';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs } from '../../components/ui/tabs';
import { ImportJobSummary, ProcessedLeadResult, AIDetectedSource } from '../../types';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  Copy,
  RefreshCw,
  Eye,
  Check,
  MapPin,
  Map,
  Target,
  Building2,
  ShieldCheck,
  Database
} from 'lucide-react';

interface ResultsStepProps {
  result: ImportJobSummary;
  onReset: () => void;
  detectedSource?: AIDetectedSource;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({ result, onReset, detectedSource }) => {
  const [activeTab, setActiveTab] = useState('insights');
  const [selectedLead, setSelectedLead] = useState<ProcessedLeadResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Helper to format processing time
  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(2) + 's';
  };

  // Combine all processed leads (imported and skipped) and sort them by original row order
  const allLeads = useMemo(() => {
    const combined = [
      ...result.importedLeads.map((l) => ({ ...l, auditStatus: 'Imported' })),
      ...result.skippedLeads.map((l) => ({ ...l, auditStatus: 'Skipped' })),
    ];
    return combined.sort((a, b) => a.index - b.index);
  }, [result]);

  // 📊 AI Leads Insights calculations
  const completenessRate = useMemo(() => {
    if (result.importedCount === 0) return 0;
    const completeLeads = result.importedLeads.filter((l) => 
      l.lead?.name && 
      l.lead?.email && 
      (l.lead?.mobile_without_country_code || l.lead?.country_code) && 
      l.lead?.company
    ).length;
    return Math.round((completeLeads / result.importedCount) * 100);
  }, [result]);

  const missingEmailPct = useMemo(() => {
    if (result.totalRows === 0) return 0;
    const missing = result.importedLeads.filter((l) => !l.lead?.email).length + 
                    result.skippedLeads.filter((l) => !l.rawRow.email && !l.rawRow.Email && !l.rawRow['Email Address']).length;
    return Math.min(100, Math.round((missing / result.totalRows) * 100));
  }, [result]);

  const missingPhonePct = useMemo(() => {
    if (result.totalRows === 0) return 0;
    const missing = result.importedLeads.filter((l) => !l.lead?.mobile_without_country_code).length + 
                    result.skippedLeads.filter((l) => !l.rawRow.phone && !l.rawRow.Phone && !l.rawRow.Mobile && !l.rawRow['Phone Number']).length;
    return Math.min(100, Math.round((missing / result.totalRows) * 100));
  }, [result]);

  const qualityScore = useMemo(() => {
    if (result.totalRows === 0) return 0;
    const skippedPenalty = (result.skippedCount / result.totalRows) * 50;
    const duplicatePenalty = (result.duplicateCount / result.totalRows) * 20;
    const completenessPenalty = (100 - completenessRate) * 0.3;
    return Math.max(10, Math.round(100 - skippedPenalty - duplicatePenalty - completenessPenalty));
  }, [result, completenessRate]);

  const cleanupActions = useMemo(() => {
    const actions = [];
    if (result.duplicateCount > 0) {
      actions.push({
        id: 'duplicates',
        type: 'warning',
        text: `Merge ${result.duplicateCount} duplicate records to clean up sales pipeline contact redundancy.`,
        urgency: 'High'
      });
    }
    if (result.skippedCount > 0) {
      actions.push({
        id: 'skipped',
        type: 'danger',
        text: `Review the ${result.skippedCount} skipped rows lacking both email and phone contact channels.`,
        urgency: 'Critical'
      });
    }
    if (missingEmailPct > 10) {
      actions.push({
        id: 'emails',
        type: 'warning',
        text: `${missingEmailPct}% of leads lack emails. Run email verification or social profiles enrichment.`,
        urgency: 'Medium'
      });
    }
    if (missingPhonePct > 10) {
      actions.push({
        id: 'phones',
        type: 'info',
        text: `${missingPhonePct}% of contacts are missing phone numbers. Prompt sales team to collect mobile tags on follow-up.`,
        urgency: 'Low'
      });
    }
    if (completenessRate < 80) {
      actions.push({
        id: 'completeness',
        type: 'info',
        text: `Enrich profile parameters on ${result.importedCount - Math.round(result.importedCount * completenessRate / 100)} sparse contacts to enable automated marketing routing.`,
        urgency: 'Low'
      });
    }
    // Default fallback cleanup action
    actions.push({
      id: 'general',
      type: 'success',
      text: 'Verify lead status assignments are aligned with GrowEasy sales stages.',
      urgency: 'Routine'
    });
    return actions;
  }, [result, missingEmailPct, missingPhonePct, completenessRate]);

  // Download complete audit report as JSON
  const handleDownloadAuditJSON = () => {
    const auditData = allLeads.map((l) => ({
      originalRowNumber: l.index + 1,
      importStatus: l.auditStatus,
      skipReason: l.auditStatus === 'Skipped' && l.errors && l.errors.length > 0 ? l.errors[0] : null,
      confidence: l.confidence,
      validationErrors: l.errors || [],
      timestamp: new Date().toISOString(),
      processingDurationMs: result.processingTimeMs,
      mappedFields: l.lead || null,
    }));

    const jsonStr = JSON.stringify(auditData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `groweasy_import_audit_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download complete audit report as CSV
  const handleDownloadAuditCSV = () => {
    const csvHeaders = [
      "Original Row Number",
      "Import Status",
      "Skip Reason",
      "Confidence",
      "Validation Errors",
      "Processing Duration (ms)",
      "Timestamp",
      "Normalized Name",
      "Normalized Email",
      "Normalized Phone",
      "Normalized Company",
      "Normalized Status",
      "Normalized Note"
    ];

    const csvRows = [
      csvHeaders.join(','),
      ...allLeads.map((l) => {
        const rowNumber = l.index + 1;
        const status = l.auditStatus;
        const skipReason = l.errors && l.errors.length > 0 && status === 'Skipped' ? l.errors[0] : '';
        const confidence = `${Math.round(l.confidence * 100)}%`;
        const valErrors = l.errors ? l.errors.join(' | ') : '';
        const duration = result.processingTimeMs;
        const timestamp = new Date().toISOString();
        const name = l.lead?.name || '';
        const email = l.lead?.email || '';
        const phone = l.lead ? `${l.lead.country_code || ''} ${l.lead.mobile_without_country_code || ''}`.trim() : '';
        const company = l.lead?.company || '';
        const crmStatus = l.lead?.crm_status || '';
        const crmNote = l.lead?.crm_note || '';

        return [
          rowNumber,
          `"${status}"`,
          `"${skipReason.replace(/"/g, '""')}"`,
          `"${confidence}"`,
          `"${valErrors.replace(/"/g, '""')}"`,
          duration,
          `"${timestamp}"`,
          `"${name.replace(/"/g, '""')}"`,
          `"${email.replace(/"/g, '""')}"`,
          `"${phone.replace(/"/g, '""')}"`,
          `"${company.replace(/"/g, '""')}"`,
          `"${crmStatus.replace(/"/g, '""')}"`,
          `"${crmNote.replace(/"/g, '""')}"`
        ].join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `groweasy_import_audit_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Define Columns for the Imported Leads Table
  const importedColumns = useMemo(
    () => [
      {
        accessorKey: 'lead.name',
        header: () => <span className="font-mono text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Name</span>,
        cell: (info: any) => (
          <span className="font-semibold text-zinc-150 block truncate">
            {info.getValue() || <span className="text-zinc-800 italic">No name</span>}
          </span>
        ),
        size: 150,
      },
      {
        accessorKey: 'lead.email',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Email</span>,
        cell: (info: any) => (
          <span className="text-zinc-350 font-mono text-xs block truncate">
            {info.getValue() || <span className="text-zinc-800 italic">empty</span>}
          </span>
        ),
        size: 190,
      },
      {
        id: 'phone',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Phone</span>,
        cell: (info: any) => {
          const row = info.row.original;
          const country = row.lead?.country_code || '';
          const num = row.lead?.mobile_without_country_code || '';
          if (!num) return <span className="text-zinc-850 italic">empty</span>;
          return (
            <span className="text-zinc-350 font-mono text-xs">
              {country} {num}
            </span>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'lead.company',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Company</span>,
        cell: (info: any) => (
          <span className="text-zinc-350 block truncate">
            {info.getValue() || <span className="text-zinc-800 italic">empty</span>}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: 'lead.crm_status',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Status</span>,
        cell: (info: any) => {
          const status = info.getValue();
          if (!status) return <span className="text-zinc-850 italic">none</span>;

          const colors: Record<string, string> = {
            GOOD_LEAD_FOLLOW_UP: 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40',
            DID_NOT_CONNECT: 'bg-amber-950/20 text-amber-400 border-amber-900/40',
            BAD_LEAD: 'bg-red-950/20 text-red-400 border-red-900/40',
            SALE_DONE: 'bg-blue-950/20 text-blue-400 border-blue-900/40',
          };

          const label: Record<string, string> = {
            GOOD_LEAD_FOLLOW_UP: 'Hot Follow Up',
            DID_NOT_CONNECT: 'No Connection',
            BAD_LEAD: 'Bad Lead',
            SALE_DONE: 'Closed Won',
          };

          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                colors[status] || 'bg-zinc-900 text-zinc-400 border-zinc-850'
              }`}
            >
              <span className={`h-1 w-1 rounded-full ${
                status === 'GOOD_LEAD_FOLLOW_UP' ? 'bg-emerald-400' :
                status === 'DID_NOT_CONNECT' ? 'bg-amber-450' :
                status === 'BAD_LEAD' ? 'bg-red-450' : 'bg-blue-400'
              }`} />
              {label[status] || status}
            </span>
          );
        },
        size: 130,
      },
      {
        accessorKey: 'confidence',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Confidence</span>,
        cell: (info: any) => {
          const confidence = info.getValue() ?? 0.5;
          const percent = Math.round(confidence * 100);
          
          let label = 'Manual Review';
          let badgeColor = 'bg-red-950/20 text-red-400 border-red-900/40';
          let progressColor = 'bg-red-500';

          if (percent >= 99) {
            label = 'Excellent Match';
            badgeColor = 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40';
            progressColor = 'bg-emerald-400';
          } else if (percent >= 90) {
            label = 'High Confidence';
            badgeColor = 'bg-teal-950/20 text-teal-400 border-teal-900/40';
            progressColor = 'bg-teal-400';
          } else if (percent >= 75) {
            label = 'Needs Review';
            badgeColor = 'bg-amber-950/20 text-amber-450 border-amber-900/40';
            progressColor = 'bg-amber-450';
          } else {
            label = 'Manual Review Recommended';
            badgeColor = 'bg-red-950/20 text-red-400 border-red-900/40';
            progressColor = 'bg-red-400';
          }

          return (
            <div className="flex flex-col space-y-1.5 min-w-[140px] pr-2">
              <div className="flex items-center justify-between text-[9px] gap-2 select-none">
                <span className={`inline-flex items-center px-1.5 py-0.2 rounded border font-semibold ${badgeColor} truncate max-w-[110px]`}>
                  {label}
                </span>
                <span className="font-mono font-bold text-zinc-350">{percent}%</span>
              </div>
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className={`h-full ${progressColor}`} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        },
        size: 160,
      },
      {
        id: 'actions',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Action</span>,
        cell: (info: any) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLead(info.row.original);
            }}
            className="inline-flex items-center gap-1 text-[10px] text-zinc-450 hover:text-zinc-200 select-none cursor-pointer focus:outline-none"
          >
            <Eye className="h-3.5 w-3.5" />
            Inspect
          </button>
        ),
        size: 80,
      },
    ],
    []
  );

  // Define Columns for the Skipped Leads Table
  const skippedColumns = useMemo(
    () => [
      {
        accessorKey: 'index',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Row #</span>,
        cell: (info: any) => <span className="text-zinc-500 font-mono">#{info.getValue() + 1}</span>,
        size: 85,
      },
      {
        accessorKey: 'errors',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Skip Reason</span>,
        cell: (info: any) => {
          const errors = info.getValue() as string[];
          const primaryErr = errors?.[0] || 'AI filter skipped';
          return (
            <span
              className="text-red-450 font-medium truncate block max-w-[280px]"
              title={errors?.join(', ')}
            >
              {primaryErr}
            </span>
          );
        },
        size: 280,
      },
      {
        id: 'contact',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Original Row Preview</span>,
        cell: (info: any) => {
          const row = info.row.original.rawRow;
          const nameVal = row.name || row.Name || row['Person Name'] || Object.values(row)[0] || '';
          const emailVal = row.email || row.Email || row['Email Address'] || '';
          return (
            <span className="text-zinc-500 block truncate text-xs">
              {String(nameVal)} ({String(emailVal || 'No Contact Info')})
            </span>
          );
        },
        size: 280,
      },
      {
        id: 'actions',
        header: () => <span className="font-mono text-[10px] text-zinc-555 font-bold uppercase tracking-wider">Action</span>,
        cell: (info: any) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLead(info.row.original);
            }}
            className="inline-flex items-center gap-1 text-[10px] text-zinc-450 hover:text-zinc-200 select-none cursor-pointer focus:outline-none"
          >
            <Eye className="h-3.5 w-3.5" />
            Inspect
          </button>
        ),
        size: 80,
      },
    ],
    []
  );

  const tabOptions = [
    { id: 'insights', label: 'AI Lead Insights', count: undefined },
    { id: 'imported', label: 'Imported Leads', count: result.importedCount },
    { id: 'skipped', label: 'Skipped Rows', count: result.skippedCount },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-6 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">AI Lead Import Complete</h1>
          <p className="text-xs text-zinc-550 mt-1">
            CSV records successfully processed. Standardized contacts synced to your CRM leads list.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadAuditJSON}
            disabled={result.totalRows === 0}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Download Audit (JSON)
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadAuditCSV}
            disabled={result.totalRows === 0}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download Audit (CSV)
          </Button>

          <Button variant="primary" size="sm" onClick={onReset}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            New Import
          </Button>
        </div>
      </div>

      {/* AI Narrative Summary Card */}
      {result.aiSummary && (
        <Card className="p-5 bg-zinc-950/60 border-zinc-900 shadow-xl relative overflow-hidden flex items-start gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-white/[0.01] blur-xl pointer-events-none" />
          <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-gradient-to-b from-zinc-550 to-zinc-800" />
          
          <div className="rounded-lg bg-zinc-900 border border-zinc-850 p-2 text-zinc-400 shrink-0 select-none">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block mb-1.5 select-none">AI Narrative Summary</span>
            <p className="text-zinc-250 text-xs sm:text-xs leading-relaxed font-mono">
              "{result.aiSummary}"
            </p>
          </div>
        </Card>
      )}

      {/* Redesigned Premium Stats Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Imported Card */}
        <Card className="p-5 border border-zinc-900 bg-zinc-950/40 relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:border-zinc-800 transition-all duration-300 hover:shadow-2xl group select-none">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/20 via-emerald-500/80 to-emerald-500/20" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block">Imported</span>
            <div className="rounded bg-emerald-950/20 border border-emerald-900/30 p-1.5 text-emerald-400 shrink-0">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-zinc-150 tracking-tight">{result.importedCount}</p>
            <span className="text-[10px] text-zinc-600 block mt-1 font-mono">Synced CRM contacts</span>
          </div>
        </Card>

        {/* Skipped Card */}
        <Card className="p-5 border border-zinc-900 bg-zinc-950/40 relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:border-zinc-800 transition-all duration-300 hover:shadow-2xl group select-none">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/20 via-red-500/80 to-red-500/20" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block">Skipped</span>
            <div className="rounded bg-red-950/20 border border-red-900/30 p-1.5 text-red-400 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-zinc-150 tracking-tight">{result.skippedCount}</p>
            <span className="text-[10px] text-zinc-600 block mt-1 font-mono">Filtered anomalies</span>
          </div>
        </Card>

        {/* Duplicates Card */}
        <Card className="p-5 border border-zinc-900 bg-zinc-950/40 relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:border-zinc-800 transition-all duration-300 hover:shadow-2xl group select-none">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/20 via-amber-500/80 to-amber-500/20" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block">Duplicates</span>
            <div className="rounded bg-amber-950/20 border border-amber-900/30 p-1.5 text-amber-500 shrink-0">
              <Copy className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-zinc-150 tracking-tight">{result.duplicateCount}</p>
            <span className="text-[10px] text-zinc-600 block mt-1 font-mono">Deduplicated records</span>
          </div>
        </Card>

        {/* Processing Time Card */}
        <Card className="p-5 border border-zinc-900 bg-zinc-950/40 relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:border-zinc-800 transition-all duration-300 hover:shadow-2xl group select-none">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-zinc-550 via-zinc-400 to-zinc-550" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block">Duration</span>
            <div className="rounded bg-zinc-900 border border-zinc-850 p-1.5 text-zinc-400 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-zinc-150 tracking-tight">{formatTime(result.processingTimeMs)}</p>
            <span className="text-[10px] text-zinc-600 block mt-1 font-mono">Total API elapsed time</span>
          </div>
        </Card>

        {/* Average Confidence Card */}
        <Card className="p-5 border border-zinc-900 bg-zinc-950/40 relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:border-zinc-800 transition-all duration-300 hover:shadow-2xl group select-none">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500/20 via-sky-500/80 to-sky-500/20" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block">AI Confidence</span>
            <div className="rounded bg-sky-950/20 border border-sky-900/30 p-1.5 text-sky-400 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-zinc-150 tracking-tight">
              {Math.round(result.averageConfidence * 100)}%
            </p>
            <span className="text-[10px] text-zinc-650 block mt-1 font-mono">Average row matches</span>
          </div>
        </Card>

        {/* Detected Source Card */}
        <Card className="p-5 border border-zinc-900 bg-zinc-950/40 relative overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:border-zinc-800 transition-all duration-300 hover:shadow-2xl group select-none">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500/20 via-indigo-500/80 to-indigo-500/20" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block">Detected Source</span>
            <div className="rounded bg-indigo-950/20 border border-indigo-900/30 p-1.5 text-indigo-400 shrink-0">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-zinc-150 truncate leading-none mt-1" title={detectedSource?.source || 'Custom CSV'}>
              {detectedSource?.source || 'Custom CSV'}
            </p>
            <span className="text-[10px] text-zinc-600 block mt-3 font-mono truncate">
              Confidence: {detectedSource ? `${Math.round(detectedSource.confidence * 100)}%` : '100%'}
            </span>
          </div>
        </Card>
      </div>

      {/* Tables Dashboard */}
      <Card className="p-6 bg-zinc-950 border-zinc-900 shadow-xl space-y-6">
        <Tabs
          options={tabOptions}
          activeId={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'insights' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Grid Row 1: Health Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Data Quality Score Card */}
              <Card className="p-5 border border-zinc-900 bg-zinc-950/20 flex flex-col items-center justify-between text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/20 via-emerald-500/80 to-emerald-500/20" />
                <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block mb-4">Overall Data Quality</span>
                
                {/* Ring Progress Display */}
                <div className="relative h-28 w-28 flex items-center justify-center mb-4">
                  <svg className="absolute transform -rotate-90 h-full w-full">
                    <circle
                      cx="56"
                      cy="56"
                      r="45"
                      stroke="#18181b"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="45"
                      stroke={qualityScore > 80 ? '#10b981' : qualityScore > 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 45}
                      strokeDashoffset={2 * Math.PI * 45 * (1 - qualityScore / 100)}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="text-2xl font-black text-zinc-100 tracking-tighter">{qualityScore}%</span>
                </div>
                
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  qualityScore > 80 
                    ? 'bg-emerald-950/30 text-emerald-450 border-emerald-900/30' 
                    : qualityScore > 50 
                    ? 'bg-amber-955/30 text-amber-500 border-amber-900/30' 
                    : 'bg-red-950/30 text-red-450 border-red-900/30'
                }`}>
                  {qualityScore > 80 ? 'Excellent Dataset' : qualityScore > 50 ? 'Needs Alignment' : 'Action Required'}
                </span>
              </Card>

              {/* Profile Completeness Card */}
              <Card className="p-5 border border-zinc-900 bg-zinc-950/20 flex flex-col items-center justify-between text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500/20 via-sky-500/80 to-sky-500/20" />
                <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block mb-4">Profile Completeness</span>
                
                <div className="relative h-28 w-28 flex items-center justify-center mb-4">
                  <svg className="absolute transform -rotate-90 h-full w-full">
                    <circle
                      cx="56"
                      cy="56"
                      r="45"
                      stroke="#18181b"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="45"
                      stroke="#0ea5e9"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 45}
                      strokeDashoffset={2 * Math.PI * 45 * (1 - completenessRate / 100)}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="text-2xl font-black text-zinc-100 tracking-tighter">{completenessRate}%</span>
                </div>
                
                <span className="text-[10px] font-mono text-zinc-500">
                  {result.importedCount > 0 ? `${result.importedLeads.filter(l => l.lead?.name && l.lead?.email && (l.lead?.mobile_without_country_code || l.lead?.country_code) && l.lead?.company).length} fully populated leads` : '0 populated leads'}
                </span>
              </Card>

              {/* Contact Coverage Health Card */}
              <Card className="p-5 border border-zinc-900 bg-zinc-950/20 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500/20 via-teal-500/80 to-teal-500/20" />
                <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block mb-3">Contact Channels Coverage</span>
                
                <div className="space-y-4 py-2 font-mono">
                  {/* Email Line */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400">Email Address:</span>
                      <span className="text-zinc-250 font-bold">{100 - missingEmailPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full bg-teal-500 transition-all duration-1000 ease-out"
                        style={{ width: `${100 - missingEmailPct}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-zinc-600 block">{missingEmailPct}% missing email fields</span>
                  </div>

                  {/* Phone Line */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400">Phone / Mobile:</span>
                      <span className="text-zinc-250 font-bold">{100 - missingPhonePct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full bg-teal-500 transition-all duration-1000 ease-out"
                        style={{ width: `${100 - missingPhonePct}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-zinc-600 block">{missingPhonePct}% missing mobile fields</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Grid Row 2: Suggested Cleanups & Demographic Clusters */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Cleanup Actions */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block select-none">Suggested Cleanup Actions</span>
                <Card className="p-4 bg-zinc-950 border border-zinc-900 flex-1 divide-y divide-zinc-900 max-h-[300px] overflow-y-auto">
                  {cleanupActions.map((action, idx) => (
                    <div key={action.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border shrink-0 mt-0.5 ${
                        action.type === 'danger'
                          ? 'bg-red-955/20 text-red-400 border-red-900/40'
                          : action.type === 'warning'
                          ? 'bg-amber-955/20 text-amber-500 border-amber-900/40'
                          : action.type === 'success'
                          ? 'bg-emerald-950/20 text-emerald-450 border-emerald-900/40'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-850'
                      }`}>
                        {action.urgency}
                      </span>
                      <span className="text-xs text-zinc-350 leading-relaxed font-mono">
                        {action.text}
                      </span>
                    </div>
                  ))}
                </Card>
              </div>

              {/* Demographic Clusters */}
              <div className="lg:col-span-5 flex flex-col space-y-3">
                <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider text-zinc-550 block select-none">Demographics & Clusters</span>
                <Card className="p-5 bg-zinc-950 border border-zinc-900 flex-1 flex flex-col justify-between font-mono text-[10px] text-zinc-450 space-y-3">
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-500">Top City Cluster:</span>
                    <span className="text-zinc-200 font-bold">{result.mostCommonCity || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-500">Top State Cluster:</span>
                    <span className="text-zinc-200 font-bold">{result.mostCommonState || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-500">Top Lead Owner:</span>
                    <span className="text-zinc-200 font-bold">Sales Router Pool</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-900">
                    <span className="text-zinc-500">Common Status:</span>
                    <span className="text-zinc-200 font-bold">{result.topLeadStatus || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 last:border-0 pt-1.5">
                    <span className="text-zinc-500">Common Company:</span>
                    <span className="text-zinc-250 font-bold truncate max-w-[150px]">{result.mostCommonCompany || 'N/A'}</span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : activeTab === 'imported' ? (
          result.importedLeads.length > 0 ? (
            <CRMTable
              data={result.importedLeads}
              columns={importedColumns}
              searchPlaceholder="Search leads list..."
              onRowClick={setSelectedLead}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 animate-in fade-in duration-300">
              <div className="rounded-full bg-red-950/20 border border-red-900/30 p-4 text-red-400 mb-4 select-none">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">No Leads Qualified for Import</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed">
                All records within the uploaded CSV failed primary validation schema filters (missing both valid Email and Phone details).
              </p>
              <div className="mt-6 flex flex-col items-center gap-2">
                <Button variant="primary" size="sm" onClick={onReset}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Upload New CSV
                </Button>
                <span className="text-[10px] text-zinc-650 mt-1 select-none">
                  Mandatory: Every profile requires either an email address or mobile number.
                </span>
              </div>
            </div>
          )
        ) : (
          result.skippedLeads.length > 0 ? (
            <CRMTable
              data={result.skippedLeads}
              columns={skippedColumns}
              searchPlaceholder="Search skipped records..."
              onRowClick={setSelectedLead}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 animate-in fade-in duration-300">
              <div className="rounded-full bg-emerald-950/20 border border-emerald-900/30 p-4 text-emerald-450 mb-4 select-none">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">100% Validation Alignment</h3>
              <p className="text-xs text-zinc-555 max-w-sm mt-1 leading-relaxed">
                Excellent! Every single raw record from your CSV file was successfully mapped and validated.
              </p>
              <span className="text-[10px] text-zinc-655 mt-4 select-none">
                No data errors, empty parameters, or anomalies were detected.
              </span>
            </div>
          )
        )}
      </Card>

      {/* Lead Details Modal Overlay */}
      <LeadDetailsModal
        isOpen={selectedLead !== null}
        onClose={() => setSelectedLead(null)}
        leadResult={selectedLead}
      />
    </div>
  );
};
