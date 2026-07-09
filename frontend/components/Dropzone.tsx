import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  maxSize?: number; // in MB
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect, maxSize = 10 }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    maxSize: maxSize * 1024 * 1024, // convert MB to bytes
  });

  const isError = fileRejections.length > 0;

  return (
    <div className="w-full">
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        {...(getRootProps() as any)}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
          isDragActive
            ? 'border-zinc-200 bg-zinc-950/50'
            : isError
            ? 'border-red-800 bg-red-950/10'
            : 'border-zinc-800 bg-zinc-950/20 hover:border-zinc-700 hover:bg-zinc-950/30'
        }`}
      >
        <input {...getInputProps()} />
        
        <motion.div
          animate={isDragActive ? { y: [0, -8, 0] } : {}}
          transition={{ repeat: isDragActive ? Infinity : 0, duration: 1 }}
          whileHover={{ y: -4 }}
          className="mb-4 rounded-full bg-zinc-900 p-4 border border-zinc-800 text-zinc-400"
        >
          <Upload className="h-6 w-6" />
        </motion.div>

        <h3 className="mb-1 text-sm font-medium text-zinc-200">
          {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file'}
        </h3>
        <p className="mb-6 text-xs text-zinc-500">
          or click to browse your computer
        </p>

        <div className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400">
          <FileSpreadsheet className="h-3.5 w-3.5 text-zinc-500" />
          <span>Accepted format: <b>.csv</b></span>
          <span className="text-zinc-650">•</span>
          <span>Max size: <b>{maxSize}MB</b></span>
        </div>

        {isError && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>
              {fileRejections[0].errors[0].code === 'file-too-large'
                ? `File is too large. Max size is ${maxSize}MB.`
                : 'Invalid file type. Only CSV files are accepted.'}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
