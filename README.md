# ⚡ LeadFlow AI — Intelligent CRM CSV Importer

LeadFlow AI is a production-grade, AI-powered CSV Importer designed to ingest arbitrary CSV files, dynamically analyze their semantic structures using Google Gemini, and transform records into a standardized CRM Lead format. It features a dark-mode B2B SaaS dashboard, client-side virtualized previews, real-time Server-Sent Events (SSE) progress tracking, and strict Zod validation.

---

## 🌟 Key Features

### 🧠 1. AI-Powered Source Detection
- Intelligently detects the CSV provider (e.g., Facebook Lead Ads, HubSpot, Salesforce) based on headers and row semantics instead of filenames.
- Displays an AI source card with confidence percentage ratings immediately upon file selection.

### 🗺️ 2. Visual Column Mapping Editor
- Presents matching confidence scores for every single header mapped to your CRM.
- Flags unmapped columns with warning badges and allows you to manually correct mappings in real time before finalizing import.

### ⏱️ 3. Premium Progress Checklist & Time Estimator
- Replaces generic spinner loaders with a multi-stage active progress checklist.
- Evaluates average processing duration to deliver remaining time countdowns.

### 🎯 4. AI Confidence Badges
- Attaches row-level matching weights (`Excellent Match`, `High Confidence`, `Needs Review`, `Manual Review Recommended`) dynamically to imported leads based on completeness and AI mapping metrics.

### 📊 5. AI Lead Insights Dashboard
- Generates data quality grades (0-100), profile completeness percentages, and contact coverage rates.
- Displays visual SVGs progress rings, demographic cluster summaries, and suggested data cleanup actions.

### 📂 6. Downloadable Audit Reports
- Merges imported and skipped leads into unified audit reports sorted by their original CSV row index.
- Downloads files in CSV or JSON formats carrying validation errors, AI explanations, and timestamps.

### 🎨 7. Premium Microinteractions & Empty States
- Built using Framer Motion to enable smooth page cross-fades, spring button clicks, checkmark pops, and table transitions.
- Displays descriptive empty screens for missing imports, zero-anomalies, and parsed data preview failures.

---

## 💻 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router, Tailwind CSS v4)
- **State Management & Logic**: React 19, TypeScript
- **Grid Virtualization**: TanStack Table v8, TanStack Virtual v3
- **File Uploader**: React Dropzone, Framer Motion
- **Icons**: Lucide Icons

### Backend
- **Framework**: Node.js, Express, TypeScript
- **Parser**: PapaParse (header detection and greedy lines skipping)
- **Validation**: Zod (formatting checks and enums normalization)
- **Uploads Handler**: Multer (in-memory buffer storage)
- **AI Engine**: Google Gemini API (`@google/generative-ai` SDK)

---

## 🏗️ Architecture & Folder Structure

```
d:/Assesment/
├── backend/
│   ├── src/
│   │   ├── config/             # Env validators and Gemini SDK configuration
│   │   ├── controllers/        # Handles Multer upload & SSE progress streams
│   │   ├── prompts/            # Gemini system instructions & mapping templates
│   │   ├── routes/             # POST /upload and GET /process endpoints
│   │   ├── services/           # PapaParse reader, Gemini SDK wrappers, batch runner
│   │   ├── tests/              # CRM validator unit test suite
│   │   ├── types/              # Lead mapping and job statistics schemas
│   │   └── validators/         # Zod validation rules and format cleanups
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
└── frontend/
    ├── app/                    # Next.js App Router & Global Styles
    ├── components/             # Reusable UI (Cards, Buttons, Tables, Dropzones)
    ├── features/               # Pipeline stages (Landing, Preview, Progress, Results)
    ├── types/                  # Typed interfaces matching backend structures
    ├── package.json
    ├── tsconfig.json
    └── tailwind.config.ts
```

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
Create a `.env` file inside the `backend` folder:
```env
PORT=5000
CORS_ORIGIN=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key_here
NODE_ENV=development
```

### Frontend (`frontend/.env.local`)
Create a `.env.local` file inside the `frontend` folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🚀 Setup & Installation Guide

### Prerequisites
- **Node.js**: >= 20.x
- **pnpm**: >= 10.x (chosen for high speed, disk spaces saving, and workspaces optimization)

### Step 1: Running the Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run the validation checks test suite:
   ```bash
   pnpm exec ts-node-dev src/tests/validator.test.ts
   ```
4. Start the backend development server:
   ```bash
   pnpm run dev
   ```
   *The server runs locally on `http://localhost:5000`.*

### Step 2: Running the Frontend
1. In a new terminal tab, navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the Next.js development server:
   ```bash
   pnpm run dev
   ```
   *Open your browser and navigate to `http://localhost:3000`.*

---

## 🚢 Deployment Guidelines

### Backend (Railway, Render, or Heroku)
1. Link your git repository. Set directory to `backend`.
2. Add environment variables: `PORT`, `CORS_ORIGIN` (point to your deployed frontend domain), `GEMINI_API_KEY`, and `NODE_ENV=production`.
3. Build & start commands:
   ```bash
   pnpm run build && pnpm run start
   ```

### Frontend (Vercel or Netlify)
1. Link your repository. Set root directory to `frontend`.
2. Set build command to `pnpm run build`.
3. Add environment variable: `NEXT_PUBLIC_API_URL` pointing to your deployed backend.
4. Deploy!
