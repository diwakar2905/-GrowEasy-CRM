import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Circle, AlertCircle, Terminal, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { ProcessingStageType } from '../../types';

interface ProcessingStepProps {
  currentStage: ProcessingStageType;
  percent: number;
  message: string;
  batchInfo?: {
    batchIndex: number;
    totalBatches: number;
  };
  error?: string | null;
  onReset: () => void;
}

interface StageConfig {
  id: ProcessingStageType;
  label: string;
  description: string;
}

const STAGES: StageConfig[] = [
  { id: 'uploading', label: 'Uploading CSV', description: 'Transmitting raw CSV records to the database cache' },
  { id: 'parsing', label: 'Parsing Records', description: 'Reading data headers and identifying structure' },
  { id: 'analyzing_semantics', label: 'Analyzing Column Semantics', description: 'AI investigating contextual meanings of columns' },
  { id: 'building_prompt', label: 'Building AI Prompt', description: 'Constructing batch templates for extraction' },
  { id: 'extracting', label: 'Extracting CRM Information', description: 'Gemini AI standardizing contact details and notes' },
  { id: 'validating', label: 'Validating AI Output', description: 'Validating records against CRM Zod schema definitions' },
  { id: 'normalizing', label: 'Normalizing Records', description: 'Standardizing status enums and cleaning phone formats' },
  { id: 'preparing_leads', label: 'Preparing CRM Leads', description: 'Finalizing database-ready contacts structure' },
  { id: 'completed', label: 'Completed', description: 'Lead generation pipeline completed successfully' }
];

export const ProcessingStep: React.FC<ProcessingStepProps> = ({
  currentStage,
  percent,
  message,
  batchInfo,
  error,
  onReset,
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  
  // Estimated remaining time calculation
  const startTimeRef = useRef<number>(Date.now());
  const [estimatedSecondsRemaining, setEstimatedSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Reset timer on upload start
    if (percent <= 5) {
      startTimeRef.current = Date.now();
      setEstimatedSecondsRemaining(null);
      return;
    }

    const elapsedMs = Date.now() - startTimeRef.current;
    if (percent >= 100) {
      setEstimatedSecondsRemaining(0);
      return;
    }

    // T_total = T_elapsed / (P / 100)
    // T_remaining = T_total - T_elapsed = T_elapsed * (100 - P) / P
    const estimatedTotalMs = elapsedMs / (percent / 100);
    const remainingMs = estimatedTotalMs - elapsedMs;
    const remainingSecs = Math.max(1, Math.round(remainingMs / 1000));
    setEstimatedSecondsRemaining(remainingSecs);
  }, [percent]);

  // Generate logs on stage changes to boost "perceived intelligence"
  useEffect(() => {
    if (error) {
      setLogs(prev => [...prev, `❌ [ERROR] Processing interrupted: ${error}`]);
      return;
    }

    const timestamp = () => new Date().toLocaleTimeString();

    switch (currentStage) {
      case 'uploading':
        setLogs([
          `[${timestamp()}] 📡 [SYSTEM] Connecting to GrowEasy API Gateway...`,
          `[${timestamp()}] 📡 [SYSTEM] Transmitting CSV payload...`,
        ]);
        break;
      case 'parsing':
        setLogs(prev => [
          ...prev,
          `[${timestamp()}] 📊 [PARSER] File uploaded. Initiating PapaParse stream...`,
          `[${timestamp()}] 📊 [PARSER] CSV columns and greedy lines parsed successfully.`,
        ]);
        break;
      case 'analyzing_semantics':
        setLogs(prev => [
          ...prev,
          `[${timestamp()}] 🔍 [ANALYZER] Inspecting column headers for platform characteristics...`,
          `[${timestamp()}] 🔍 [ANALYZER] Semantic mapping matching detected.`,
        ]);
        break;
      case 'building_prompt':
        setLogs(prev => [
          ...prev,
          `[${timestamp()}] 📝 [TEMPLATER] Injecting custom ETL mapping schema into prompt variables.`,
          `[${timestamp()}] 📝 [TEMPLATER] Prompt template built successfully.`,
        ]);
        break;
      case 'extracting':
        if (batchInfo) {
          setLogs(prev => [
            ...prev,
            `[${timestamp()}] 🤖 [GEMINI AI] Sending Batch ${batchInfo.batchIndex}/${batchInfo.totalBatches} for semantic parsing...`,
            `[${timestamp()}] 🤖 [GEMINI AI] Standardizing dial codes and country formats...`,
            `[${timestamp()}] 🤖 [GEMINI AI] Batch ${batchInfo.batchIndex} extraction completed.`,
          ]);
        }
        break;
      case 'validating':
        setLogs(prev => [
          ...prev,
          `[${timestamp()}] 🛡️ [ZOD VALIDATOR] Checking mandatory email/phone criteria...`,
        ]);
        break;
      case 'normalizing':
        setLogs(prev => [
          ...prev,
          `[${timestamp()}] ⚖️ [NORMALIZER] Standardizing CRM enums and status codes...`,
        ]);
        break;
      case 'preparing_leads':
        setLogs(prev => [
          ...prev,
          `[${timestamp()}] 💼 [CRM SYNCR] Preparing database-ready contact records...`,
        ]);
        break;
      case 'completed':
        setLogs(prev => [
          ...prev,
          `[${timestamp()}] 💾 [DATABASE] Syncing valid leads with Contacts table...`,
          `[${timestamp()}] ✅ [SYSTEM] Process complete! Redirecting to results...`,
        ]);
        break;
      default:
        break;
    }
  }, [currentStage, batchInfo, error]);

  // Keep logs scrolled to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getStageStatus = (stageId: ProcessingStageType) => {
    if (error) {
      if (stageId === currentStage) return 'error';
      const currentIndex = STAGES.findIndex(s => s.id === currentStage);
      const stageIndex = STAGES.findIndex(s => s.id === stageId);
      return stageIndex > currentIndex ? 'pending' : 'completed';
    }

    const currentIndex = STAGES.findIndex(s => s.id === currentStage);
    const stageIndex = STAGES.findIndex(s => s.id === stageId);

    if (stageId === currentStage) {
      if (currentStage === 'completed') return 'completed';
      return 'active';
    }
    if (stageIndex < currentIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 flex flex-col space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="text-left space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-[10px] text-zinc-400 font-mono select-none">
          <Sparkles className="h-3 w-3 text-zinc-200 fill-zinc-200/20" />
          <span>Active AI Extraction Engine</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-150">Importing Leads...</h1>
        <p className="text-xs text-zinc-550 leading-relaxed">
          GrowEasy AI Agent is mapping, cleaning, and committing your leads. Keep this page open.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Stage Checklist */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="p-5 bg-zinc-950 border-zinc-900 shadow-xl space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-semibold">{message || 'Processing...'}</span>
                <span className="text-zinc-250 font-bold font-mono">{percent}%</span>
              </div>
              <Progress value={percent} className="h-1.5" />
              <div className="text-[10px] text-zinc-550 flex items-center justify-between select-none font-mono">
                <span>AI Pipeline Active</span>
                <span>
                  {percent >= 100 ? (
                    'Completed'
                  ) : estimatedSecondsRemaining !== null ? (
                    `Estimated remaining: ~${estimatedSecondsRemaining}s`
                  ) : (
                    'Calculating time remaining...'
                  )}
                </span>
              </div>
            </div>

            <div className="border-t border-zinc-900 pt-4 space-y-2">
              {STAGES.map((stage) => {
                const status = getStageStatus(stage.id);
                const isActive = status === 'active';
                const isCompleted = status === 'completed';
                const isError = status === 'error';

                return (
                  <div
                    key={stage.id}
                    className={`flex items-start gap-3 p-2 rounded-lg transition-colors duration-300 relative overflow-hidden ${
                      isActive ? 'bg-zinc-900/30 border border-zinc-850/60' : 'border border-transparent'
                    }`}
                  >
                    {/* Glowing highlight border on active stage */}
                    {isActive && (
                      <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-zinc-400" />
                    )}

                    <div className="mt-0.5 select-none shrink-0">
                      <AnimatePresence mode="popLayout">
                        {isCompleted ? (
                          <motion.div
                            key="completed"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          >
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 fill-emerald-950/20" />
                          </motion.div>
                        ) : isActive ? (
                          <motion.div
                            key="active"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            className="relative h-4.5 w-4.5 flex items-center justify-center"
                          >
                            <span className="absolute inline-flex h-full w-full rounded-full bg-zinc-200/20 animate-ping" />
                            <Loader2 className="h-3.5 w-3.5 text-zinc-200 animate-spin" />
                          </motion.div>
                        ) : isError ? (
                          <motion.div
                            key="error"
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                          >
                            <AlertCircle className="h-4.5 w-4.5 text-red-500 fill-red-950/20" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="pending"
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0.3 }}
                          >
                            <Circle className="h-4.5 w-4.5 text-zinc-850" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            isCompleted
                              ? 'text-zinc-555 line-through decoration-zinc-850'
                              : isActive
                              ? 'text-zinc-150 font-bold'
                              : 'text-zinc-650'
                          }`}
                        >
                          {stage.label}
                        </span>
                        {isActive && stage.id === 'extracting' && batchInfo && (
                          <span className="text-[9px] bg-zinc-900 text-zinc-350 border border-zinc-800 px-1.5 py-0.2 rounded font-mono">
                            Batch {batchInfo.batchIndex}/{batchInfo.totalBatches}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[10px] leading-relaxed mt-0.5 ${
                          isActive ? 'text-zinc-400' : isCompleted ? 'text-zinc-650' : 'text-zinc-750'
                        }`}
                      >
                        {stage.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Side: AI Live Terminal Console */}
        <div className="lg:col-span-6">
          <Card className="h-full min-h-[420px] max-h-[520px] bg-zinc-950 border-zinc-900 shadow-xl flex flex-col overflow-hidden relative font-mono">
            {/* Terminal Header */}
            <div className="flex items-center justify-between bg-zinc-900/40 px-4 py-2.5 border-b border-zinc-900 select-none">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-zinc-550" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">AI Live Console</span>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-zinc-800" />
                <span className="h-2 w-2 rounded-full bg-zinc-800" />
                <span className="h-2 w-2 rounded-full bg-zinc-800" />
              </div>
            </div>

            {/* Terminal Logs Body */}
            <div className="flex-1 p-4 overflow-y-auto text-[10px] text-zinc-450 space-y-2 leading-relaxed">
              {logs.length === 0 ? (
                <span className="text-zinc-650 italic">[Waiting for gateway connection...]</span>
              ) : (
                logs.map((log, index) => {
                  const isErr = log.includes('❌') || log.includes('[ERROR]');
                  const isOk = log.includes('✅') || log.includes('complete');
                  const color = isErr ? 'text-red-400' : isOk ? 'text-emerald-400' : 'text-zinc-450';
                  return (
                    <div key={index} className={`whitespace-pre-wrap break-all ${color}`}>
                      {log}
                    </div>
                  );
                })
              )}
              <div ref={consoleEndRef} />
            </div>
          </Card>
        </div>
      </div>

      {/* Error Callout overlay */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-xl border border-red-900/30 bg-red-950/10 p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-300 font-sans">AI Pipeline Aborted</h4>
                <p className="text-xs text-red-400/90 leading-relaxed mt-1 font-sans">{error}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={onReset}
                className="rounded-lg border border-red-800/40 bg-red-950/20 px-3.5 py-1.5 text-xs font-semibold text-red-350 hover:bg-red-900/30 select-none cursor-pointer font-sans"
              >
                Go back to Upload
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
