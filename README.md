# CapillaroScope — AI-Assisted Capillaroscopy

A production-grade clinical decision-support application for **Nailfold Video Capillaroscopy (NVC)** analysis, featuring real-time segmentation simulation, multi-layer visualization, and explainable AI overlays.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Architecture

```
src/
├── main.tsx              # Entry point
├── index.css             # Tailwind + custom styles
├── App.tsx               # Main app layout & step orchestration
├── types.ts              # TypeScript interfaces & enums
├── constants.ts          # Demo data & deterministic analysis generator
└── components/
    ├── Button.tsx         # Reusable button with variants & loading state
    ├── ImageViewer.tsx    # Multi-layer viewer (segmentation, heatmap, zones)
    └── ResultsPanel.tsx   # Grade prediction, metrics, zone explanations
```

## Features

- **4-Step Clinical Workflow**: Intake → Assessment → Details → Review
- **Deterministic Demo Mode**: Seeded PRNG ensures consistent results per image
- **Multi-Layer Image Viewer**: Toggle segmentation, hemorrhages, crossed caps, zones, heatmap, recommended site — each independently
- **Side-by-Side & Overlay Modes**: Compare original vs. segmented output
- **Zoom & Pan**: Scroll-to-zoom with synchronized views and drag-to-pan
- **Per-Zone Analysis**: Click zones A–D for localized metrics and risk factors
- **Explainable AI Panel**: Primary drivers and secondary findings with zone-level drill-down
- **Clinician Review**: Verification checklist, final grade override, follow-up scheduling

## Tech Stack

- **React 19** + TypeScript
- **Vite 6** (build tooling)
- **Tailwind CSS 3** (utility-first styling via PostCSS)
- **Recharts** (grade probability visualization)
- **Lucide React** (icon system)
- **DM Sans / JetBrains Mono / Outfit** (typography)
