'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Papa from 'papaparse';
import { LandingStep } from '../features/import/LandingStep';
import { PreviewStep } from '../features/import/PreviewStep';
import { ProcessingStep } from '../features/import/ProcessingStep';
import { ResultsStep } from '../features/import/ResultsStep';
import { FileMetadata, ProcessingStageType, ImportJobSummary } from '../types';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Upload,
  Settings,
  Database,
  Bell,
  HelpCircle,
  ChevronDown,
  Search,
  BookOpen,
} from 'lucide-react';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userMappings, setUserMappings] = useState<Record<string, string>>({});

  // Preview States
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);

  // Processing States
  const [isUploading, setIsUploading] = useState(false);
  const [currentStage, setCurrentStage] = useState<ProcessingStageType>('idle');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('');
  const [batchInfo, setBatchInfo] = useState<{ batchIndex: number; totalBatches: number } | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Results State
  const [importResult, setImportResult] = useState<ImportJobSummary | null>(null);

  // Triggered when a file is selected in Dropzone
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setIsAnalyzing(true);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: async (results) => {
        try {
          const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          const API_URL = rawApiUrl.replace(/\/+$/, '');
          const formData = new FormData();
          formData.append('file', selectedFile);

          // Upload immediately to get the fileId and run source detection
          const response = await fetch(`${API_URL}/api/import/upload`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to analyze CSV headers.');
          }

          const body = await response.json();
          const { fileId, detectedSource } = body.payload;

          // Initialize local custom mappings from AI predicted mapping array
          const initialMappings: Record<string, string> = {};
          if (detectedSource?.columnMappings) {
            detectedSource.columnMappings.forEach((m: any) => {
              initialMappings[m.originalColumn] = m.crmField;
            });
          }
          setUserMappings(initialMappings);

          setPreviewRows(results.data);
          setPreviewHeaders(results.meta.fields || []);
          setFileMetadata({
            fileId,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            rows: results.data.length,
            columns: results.meta.fields?.length || 0,
            uploadTime: new Date().toISOString(),
            detectedSource,
          });
          
          setIsAnalyzing(false);
          setStep('preview');
        } catch (err: any) {
          console.error(err);
          setError(err.message || 'An error occurred during file analysis.');
          setIsAnalyzing(false);
          setStep('upload');
        }
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
        setIsAnalyzing(false);
        setStep('upload');
      },
    });
  };

  // Called when "Confirm Import" is clicked
  const handleConfirmImport = async () => {
    if (!fileMetadata?.fileId) {
      setError("No active file session found. Please re-upload.");
      return;
    }

    setIsUploading(true);
    setStep('processing');
    setCurrentStage('analyzing_semantics');
    setMessage('Analyzing CSV column structure...');
    setPercent(20);
    setError(null);

    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const API_URL = rawApiUrl.replace(/\/+$/, '');

    try {
      // Pass custom mappings to the streaming processor
      startSSEProcessing(fileMetadata.fileId, API_URL, userMappings);
      setIsUploading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected processing error occurred.');
      setCurrentStage('error');
      setIsUploading(false);
    }
  };

  // Setup Server-Sent Events (SSE) progress listener
  const startSSEProcessing = (fileId: string, baseUrl: string, mappings: Record<string, string>) => {
    const eventSource = new EventSource(`${baseUrl}/api/import/process/${fileId}?mappings=${encodeURIComponent(JSON.stringify(mappings))}`);

    eventSource.addEventListener('progress', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        switch (type) {
          case 'parsing':
            setCurrentStage('parsing');
            setMessage(payload.message);
            setPercent(20);
            break;
          case 'preparing_batches':
            setCurrentStage('analyzing_semantics');
            setMessage("Analyzing column semantics...");
            setPercent(30);
            
            // Timeout to transition to building prompt
            setTimeout(() => {
              setCurrentStage('building_prompt');
              setMessage("Building AI prompt template...");
              setPercent(40);
            }, 800);
            break;
          case 'processing_batch':
            setCurrentStage('extracting');
            setMessage(payload.message);
            setBatchInfo({
              batchIndex: payload.batchIndex,
              totalBatches: payload.totalBatches,
            });
            // Calculate a growing percentage between 50% and 90%
            const batchProgress = 50 + Math.round((payload.batchIndex / payload.totalBatches) * 40);
            setPercent(batchProgress);
            break;
          case 'validating':
            setCurrentStage('validating');
            setMessage("Validating AI output payload...");
            setPercent(92);

            // Fast sequential visual tick-throughs
            setTimeout(() => {
              setCurrentStage('normalizing');
              setMessage("Normalizing CRM leads...");
              setPercent(95);
            }, 600);

            setTimeout(() => {
              setCurrentStage('preparing_leads');
              setMessage("Preparing CRM contacts...");
              setPercent(98);
            }, 1200);
            break;
          case 'completed':
            // Ensure the stages complete fully before results
            setTimeout(() => {
              setCurrentStage('completed');
              setMessage('Import complete!');
              setPercent(100);
              setImportResult(payload);
              setTimeout(() => {
                setStep('results');
              }, 600);
            }, 1800); 
            eventSource.close();
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Failed to parse SSE event data', err);
      }
    });

    eventSource.addEventListener('error', (event: any) => {
      console.error('SSE connection error:', event);
      
      let errorMessage = 'An error occurred during CSV processing connection.';
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          errorMessage = data.error || errorMessage;
        }
      } catch (e) {}

      setError(errorMessage);
      setCurrentStage('error');
      eventSource.close();
    });
  };

  const handleReset = () => {
    setFile(null);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setFileMetadata(null);
    setImportResult(null);
    setPercent(0);
    setCurrentStage('idle');
    setMessage('');
    setError(null);
    setBatchInfo(undefined);
    setStep('upload');
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 font-sans text-zinc-100 antialiased selection:bg-zinc-800">
      {/* 1. Left CRM Navigation Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-950 flex flex-col justify-between hidden md:flex shrink-0">
        <div className="flex flex-col space-y-6 p-5">
          {/* Platform Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-950 font-extrabold text-sm shadow-md shadow-black/40 select-none">
                G
              </div>
              <span className="font-bold text-zinc-100 text-sm tracking-tight">GrowEasy CRM</span>
            </div>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500 rounded px-1.5 py-0.5 font-mono">
              v1.0
            </span>
          </div>

          {/* Quick Search Input */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-600" />
            <input
              type="text"
              placeholder="Search..."
              disabled
              className="h-8 w-full rounded-md border border-zinc-900 bg-zinc-950 pl-8 text-xs text-zinc-400 placeholder-zinc-600 outline-none cursor-not-allowed select-none"
            />
          </div>

          {/* Sidebar Menu Links */}
          <div className="flex flex-col space-y-5">
            {/* Group 1: Lead Workspace */}
            <div className="space-y-1">
              <span className="px-2 text-[9px] uppercase tracking-wider font-extrabold text-zinc-600 block mb-1 select-none">
                Workspace
              </span>
              <button className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-350 cursor-pointer select-none">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </button>
              <button className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-350 cursor-pointer select-none">
                <Users className="h-4 w-4" />
                <span>Contacts</span>
              </button>
              <button className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-350 cursor-pointer select-none">
                <Briefcase className="h-4 w-4" />
                <span>Deals</span>
              </button>
            </div>

            {/* Group 2: AI Integrations */}
            <div className="space-y-1">
              <span className="px-2 text-[9px] uppercase tracking-wider font-extrabold text-zinc-600 block mb-1 select-none">
                AI Pipeline
              </span>
              <button className="w-full flex items-center justify-between rounded-md bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 text-xs font-semibold text-zinc-150 shadow-inner select-none cursor-pointer">
                <span className="flex items-center gap-2.5">
                  <Upload className="h-4 w-4 text-zinc-300" />
                  <span>AI Lead Import</span>
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>
              <button className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-350 cursor-pointer select-none">
                <Database className="h-4 w-4" />
                <span>Lead Databases</span>
              </button>
            </div>

            {/* Group 3: System settings */}
            <div className="space-y-1">
              <span className="px-2 text-[9px] uppercase tracking-wider font-extrabold text-zinc-600 block mb-1 select-none">
                Preferences
              </span>
              <button className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-350 cursor-pointer select-none">
                <Settings className="h-4 w-4" />
                <span>CRM Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* User profile (Clerk-style display) */}
        <div className="border-t border-zinc-900 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-200 text-xs shadow-inner select-none">
              DK
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-zinc-300">Diwakar K</span>
              <span className="text-[10px] text-zinc-600 truncate max-w-[120px]">diwakar@groweasy.ai</span>
            </div>
          </div>
          <button className="text-zinc-500 hover:text-zinc-300 cursor-pointer select-none">
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* 2. Right Workspace Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative overflow-hidden">
        {/* Subtle glowing radial backdrop */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-zinc-900/10 blur-[120px] pointer-events-none pulse-glow" />

        {/* Top Navbar */}
        <header className="h-14 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-35 flex items-center justify-between px-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <span className="hover:text-zinc-400 cursor-pointer select-none">GrowEasy CRM</span>
            <span>/</span>
            <span className="hover:text-zinc-400 cursor-pointer select-none">AI Pipeline</span>
            <span>/</span>
            <span className="text-zinc-250">AI Lead Import</span>
          </div>

          {/* Quick Info & Notifications */}
          <div className="flex items-center gap-4">
            <button className="p-1 rounded text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 cursor-pointer select-none">
              <Bell className="h-4.5 w-4.5" />
            </button>
            <button className="p-1 rounded text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 cursor-pointer select-none flex items-center gap-1">
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
            <div className="h-4 w-[1px] bg-zinc-900" />
            <div className="flex items-center gap-1.5 rounded bg-zinc-900 border border-zinc-850 px-2 py-0.5 text-[10px] text-zinc-400 font-medium font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Server
            </div>
          </div>
        </header>

        {/* Main Content Pane Router */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <LandingStep onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} />
              </motion.div>
            )}

            {step === 'preview' && fileMetadata && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <PreviewStep
                  fileName={fileMetadata.fileName}
                  fileSize={fileMetadata.fileSize}
                  rows={previewRows}
                  headers={previewHeaders}
                  onConfirm={handleConfirmImport}
                  onCancel={handleReset}
                  isUploading={isUploading}
                  detectedSource={fileMetadata.detectedSource}
                  userMappings={userMappings}
                  onMappingChange={(col, field) => setUserMappings(prev => ({ ...prev, [col]: field }))}
                />
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <ProcessingStep
                  currentStage={currentStage}
                  percent={percent}
                  message={message}
                  batchInfo={batchInfo}
                  error={error}
                  onReset={handleReset}
                />
              </motion.div>
            )}

            {step === 'results' && importResult && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full"
              >
                <ResultsStep
                  result={importResult}
                  onReset={handleReset}
                  detectedSource={fileMetadata?.detectedSource}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
