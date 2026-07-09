import React from 'react';
import { Dropzone } from '../../components/Dropzone';
import { Database, Sparkles, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/card';

interface LandingStepProps {
  onFileSelect: (file: File) => void;
  isAnalyzing?: boolean;
}

export const LandingStep: React.FC<LandingStepProps> = ({ onFileSelect, isAnalyzing = false }) => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 lg:px-8 flex flex-col space-y-12 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header section with gradient and subtitle */}
      <div className="text-left space-y-4 max-w-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-zinc-400 font-mono">
          <Sparkles className="h-3 w-3 text-zinc-200 fill-zinc-200/20" />
          <span>GrowEasy AI Integrations</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100">
          AI Lead Import
        </h1>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Upload any CSV file. GrowEasy's AI agent parses your columns, detects contact details, resolves cell formatting, and validates leads into your CRM database automatically.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 relative">
          <Card className="p-6 bg-zinc-950 border-zinc-900/60 shadow-2xl relative overflow-hidden">
            {/* Subtle corner light reflection */}
            <div className="absolute top-0 right-0 w-[120px] h-[120px] rounded-full bg-white/[0.01] blur-md" />
            <Dropzone onFileSelect={onFileSelect} maxSize={10} />
          </Card>

          {isAnalyzing && (
            <div className="absolute inset-0 rounded-xl bg-black/65 backdrop-blur-md z-30 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-200">
              <Loader2 className="h-8 w-8 text-zinc-350 animate-spin" />
              <div className="text-center">
                <p className="text-xs font-semibold text-zinc-200">Analyzing CSV structure</p>
                <p className="text-[10px] text-zinc-555 mt-0.5">Running AI source detection on column patterns...</p>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic instructions deck */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950/20 p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Import Checklist</h4>
            
            <ul className="space-y-3 text-xs text-zinc-500">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                <span>Accepts standard <b>.csv</b> files up to 10MB in size.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                <span>AI will extract: Name, Email, Phone, Company, Location, and Status.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                <span>Rows missing <b>both</b> Email and Phone will be safely skipped.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                <span>Standardizes dial codes and normalizes CRM status tags.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-900/50 bg-zinc-950/10 p-5 flex items-center gap-3">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-zinc-500">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">Target Database</span>
              <span className="text-xs font-semibold text-zinc-300">Default Leads Table</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature explanations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-zinc-900">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-850 p-2 text-zinc-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-semibold text-zinc-250">Semantic Column Discovery</h4>
          <p className="text-xs text-zinc-550 leading-relaxed">
            AI maps column headers containing alternate synonyms (e.g. <i>"Client"</i>, <i>"Work Mail"</i>, <i>"Contact"</i>) without rigid configurations.
          </p>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-850 p-2 text-zinc-400">
            <FileText className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-semibold text-zinc-250">Dial-Code Parsing</h4>
          <p className="text-xs text-zinc-550 leading-relaxed">
            Parses international dial codes, extracts clean subscriber numbers, and sets location metrics like City/State.
          </p>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-850 p-2 text-zinc-400">
            <Database className="h-4 w-4" />
          </div>
          <h4 className="text-xs font-semibold text-zinc-250">Zod Data Segregation</h4>
          <p className="text-xs text-zinc-550 leading-relaxed">
            Validates outputs. Valid rows sync to CRM, and faulty rows are parsed into skipped tables with diagnostic logs.
          </p>
        </div>
      </div>
    </div>
  );
};
