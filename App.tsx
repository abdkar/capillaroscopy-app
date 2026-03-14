import React, { useState, useEffect } from 'react';
import {
  AppState,
  Device,
  Finger,
  Hand,
  LesionGrade,
  Diagnosis,
} from './types';
import { DEMO_IMAGES, generateAnalysisResult } from './constants';
import { Button } from './Button';
import { ImageViewer } from './ImageViewer';
import { ResultsPanel } from './ResultsPanel';
import {
  Upload,
  Camera,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Download,
  Activity,
  ToggleLeft,
  ToggleRight,
  Microscope,
  Shield,
  FileCheck,
  Sparkles,
} from 'lucide-react';

// --- Step Indicator ---
const StepIndicator: React.FC<{ currentStep: AppState['step'] }> = ({
  currentStep,
}) => {
  const steps = [
    { id: 'intake', label: 'Intake', icon: Upload },
    { id: 'assessment', label: 'Assessment', icon: Microscope },
    { id: 'details', label: 'Details', icon: FileCheck },
    { id: 'review', label: 'Review', icon: Shield },
  ] as const;

  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200 py-3 px-6 shadow-sm z-20">
      <div className="max-w-7xl mx-auto flex items-center gap-2">
        {steps.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isPast = currentIdx > idx;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-medical-600 text-white shadow-md shadow-medical-200'
                      : isPast
                        ? 'bg-medical-100 text-medical-700'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isPast ? <CheckCircle size={14} /> : <Icon size={14} />}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block transition-colors ${
                    isActive
                      ? 'text-medical-900'
                      : isPast
                        ? 'text-medical-600'
                        : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full mx-1 transition-colors duration-500 ${
                    isPast ? 'bg-medical-300' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [state, setState] = useState<AppState>({
    step: 'intake',
    patientContext: {
      id: 'PT-1024',
      age: '',
      sex: 'Female',
      diagnosisSuspicion: Diagnosis.Unknown,
    },
    selectedDevice: Device.DeviceA,
    selectedFinger: Finger.Ring,
    selectedHand: Hand.Left,
    uploadedImage: null,
    isAnalyzing: false,
    analysisResult: null,
    selectedZoneId: null,
    isDemoMode: true,
  });

  const [demoPanelOpen, setDemoPanelOpen] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');

  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === 'sm') root.style.fontSize = '14px';
    else if (fontSize === 'md') root.style.fontSize = '16px';
    else root.style.fontSize = '18px';
  }, [fontSize]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG or PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setState((prev) => ({
        ...prev,
        uploadedImage: ev.target?.result as string,
      }));
    };
    reader.onerror = () => {
      alert('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const loadDemoImage = (img: { url: string }) => {
    setState((prev) => ({ ...prev, uploadedImage: img.url }));
  };

  const runAnalysis = () => {
    if (!state.uploadedImage) return;

    setState((prev) => ({ ...prev, isAnalyzing: true }));

    setTimeout(() => {
      const result = generateAnalysisResult(
        state.uploadedImage!,
        state.isDemoMode
      );
      setState((prev) => ({
        ...prev,
        isAnalyzing: false,
        analysisResult: result,
        step: 'assessment',
      }));
    }, 1500);
  };

  const resetAnalysis = () => {
    setState((prev) => ({
      ...prev,
      step: 'intake',
      uploadedImage: null,
      analysisResult: null,
      selectedZoneId: null,
    }));
  };

  const toggleDemoMode = () => {
    setState((s) => ({ ...s, isDemoMode: !s.isDemoMode }));
  };

  // --- Select Component ---
  const Select: React.FC<{
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
  }> = ({ label, value, options, onChange }) => (
    <div>
      <label className="block text-base font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <select
        className="w-full rounded-lg border-slate-200 bg-slate-50 text-sm text-slate-800 p-2.5 border focus:border-medical-500 focus:ring-1 focus:ring-medical-500 transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );

  // --- INTAKE SCREEN ---
  const renderIntake = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full animate-fade-in">
      {/* Left: Inputs */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 font-display uppercase tracking-wide">
            <Camera size={16} className="text-medical-600" /> Case Image
          </h2>

          {state.uploadedImage ? (
            <div className="relative rounded-lg overflow-hidden border-2 border-medical-500 aspect-video group">
              <img
                src={state.uploadedImage}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setState((s) => ({ ...s, uploadedImage: null }))
                  }
                >
                  Change Image
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-medical-400 hover:bg-medical-50/50 transition-all duration-300">
              <input
                type="file"
                id="img-upload"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <label
                htmlFor="img-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <div className="w-12 h-12 bg-medical-100 text-medical-600 rounded-xl flex items-center justify-center mb-3">
                  <Upload size={22} />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  Click to upload
                </span>
                <span className="text-sm text-slate-400 mt-1">
                  JPG or PNG — max 10 MB
                </span>
              </label>
            </div>
          )}

          <div className="mt-5">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
              Demo cases
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_IMAGES.map((img) => (
                <button
                  key={img.id}
                  onClick={() => loadDemoImage(img)}
                  className="text-left p-1.5 rounded-lg border border-slate-200 hover:border-medical-400 hover:shadow-md transition-all duration-200 group"
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    className="w-full h-14 object-cover rounded bg-slate-100 group-hover:scale-[1.02] transition-transform"
                  />
                  <span className="block text-sm text-slate-500 mt-1 truncate font-medium">
                    {img.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 flex-grow">
          <h2 className="text-sm font-bold text-slate-900 mb-4 font-display uppercase tracking-wide">
            Metadata
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <Select
              label="Device"
              value={state.selectedDevice}
              options={Object.values(Device)}
              onChange={(v) =>
                setState((s) => ({ ...s, selectedDevice: v as Device }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Hand"
                value={state.selectedHand}
                options={Object.values(Hand)}
                onChange={(v) =>
                  setState((s) => ({ ...s, selectedHand: v as Hand }))
                }
              />
              <Select
                label="Finger"
                value={state.selectedFinger}
                options={Object.values(Finger)}
                onChange={(v) =>
                  setState((s) => ({ ...s, selectedFinger: v as Finger }))
                }
              />
            </div>
            <Select
              label="Suspicion"
              value={state.patientContext.diagnosisSuspicion}
              options={Object.values(Diagnosis)}
              onChange={(v) =>
                setState((s) => ({
                  ...s,
                  patientContext: {
                    ...s.patientContext,
                    diagnosisSuspicion: v as Diagnosis,
                  },
                }))
              }
            />
          </div>
        </div>
      </div>

      {/* Right: CTA */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center bg-gradient-to-br from-white/90 to-medical-50/50 backdrop-blur-md rounded-2xl border border-slate-200 text-center p-12 hover:shadow-xl hover:shadow-medical-100/30 transition-shadow duration-300 relative overflow-hidden">
        {/* Soft UI background decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-medical-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        
        <div className="max-w-sm relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-medical-100 to-medical-50 text-medical-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-medical-100">
            <Sparkles size={28} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">
            Ready to Analyze
          </h3>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Upload a nailfold capillaroscopy image and configure metadata to
            begin automated segmentation and classification.
          </p>

          <Button
            size="lg"
            onClick={runAnalysis}
            disabled={!state.uploadedImage}
            isLoading={state.isAnalyzing}
            className="w-full shadow-lg shadow-medical-200/50"
          >
            <Activity size={18} />
            Run Analysis
          </Button>

          {state.isDemoMode && (
            <div className="mt-4 bg-amber-50 text-amber-700 text-base px-3 py-2 rounded-lg border border-amber-200">
              <strong>Demo Mode:</strong> Output values are simulated but
              deterministic per image.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // --- ASSESSMENT SCREEN ---
  const renderAssessment = () => (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 h-full min-h-[600px] animate-fade-in">
      <div className="xl:col-span-8 flex flex-col h-full min-h-0">
        <ImageViewer
          imageSrc={state.analysisResult?.imageUrl || ''}
          result={state.analysisResult}
          onZoneClick={(id) => setState((s) => ({ ...s, selectedZoneId: id }))}
          selectedZoneId={state.selectedZoneId}
        />
        <div className="mt-4 flex justify-between">
          <Button variant="outline" onClick={resetAnalysis}>
            <RotateCcw size={14} /> Reset
          </Button>
          <Button onClick={() => setState((s) => ({ ...s, step: 'details' }))}>
            View Details <ArrowRight size={14} />
          </Button>
        </div>
      </div>
      <div className="xl:col-span-4 h-full min-h-0">
        <ResultsPanel
          result={state.analysisResult}
          selectedZoneId={state.selectedZoneId}
        />
      </div>
    </div>
  );

  // --- DETAILS SCREEN ---
  const renderDetails = () => {
    const r = state.analysisResult;
    if (!r) return null;

    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="mb-5 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setState((s) => ({ ...s, step: 'assessment' }))}
          >
            <ArrowLeft size={14} /> Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download size={14} /> Export PDF
            </Button>
            <Button
              onClick={() => setState((s) => ({ ...s, step: 'review' }))}
            >
              Review <ArrowRight size={14} />
            </Button>
          </div>
        </div>

        {/* Feature Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-900 font-display">
              Extracted Capillaroscopy Features
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    feat: 'Total Capillaries',
                    val: r.metrics.totalCapillaryCount,
                    ref: '—',
                  },
                  {
                    feat: 'Analyzed Length',
                    val: `${r.metrics.analyzedLengthMm} mm`,
                    ref: '—',
                  },
                  {
                    feat: 'Capillary Density',
                    val: `${r.metrics.density} /mm`,
                    ref: '7 – 12 /mm',
                  },
                  {
                    feat: 'Mean Loop Width',
                    val: `${r.metrics.meanLoopWidth} µm`,
                    ref: '20 – 50 µm',
                  },
                  {
                    feat: 'Hemorrhages',
                    val: r.metrics.hemorrhageCount,
                    ref: '0',
                  },
                  {
                    feat: 'Giant Capillaries',
                    val: r.metrics.giantCapillaries,
                    ref: '0',
                  },
                  {
                    feat: 'Crossed Capillaries',
                    val: r.metrics.crossedCapillaries,
                    ref: '0',
                  },
                ].map((row) => (
                  <tr
                    key={row.feat}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.feat}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                      {row.val}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {row.ref}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Per-Zone Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900 font-display">
                Per-Zone Summary
              </h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {r.zones.map((z) => (
                  <div
                    key={z.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-800 shrink-0 w-14">
                      {z.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${
                          z.riskContribution === 'High'
                            ? 'bg-red-100 text-red-800'
                            : z.riskContribution === 'Medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {z.riskContribution}
                      </span>
                      <p className="text-base text-slate-500 mt-1">
                        {z.notes}
                      </p>
                      <p className="text-sm text-slate-400 font-mono mt-0.5">
                        {z.capillaryCount} caps · {z.localDensity}/mm ·{' '}
                        {z.meanLoopWidth}µm
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Explainability */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900 font-display">
                Explainability
              </h2>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                The model focused on high-risk features in the segmented regions
                for this image:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1.5 mb-4">
                {r.explanation.primaryDrivers.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
              {r.explanation.secondaryFindings.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Secondary Findings
                  </p>
                  <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                    {r.explanation.secondaryFindings.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- REVIEW SCREEN ---
  const renderReview = () => (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-medical-100 bg-gradient-to-r from-medical-50 to-medical-100/30">
          <h2 className="text-xl font-bold text-medical-900 font-display">
            Clinician Review & Export
          </h2>
          <p className="text-sm text-medical-700 mt-1">
            Verify automated findings before finalizing.
          </p>
        </div>

        <div className="p-8 space-y-8">
          {/* Checklist */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              Verification
            </h3>
            <div className="space-y-2">
              {[
                'Segmentation mask acceptable?',
                'Recommended assessment site appropriate?',
                'Image quality sufficient for diagnosis?',
              ].map((item, i) => (
                <label
                  key={i}
                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-medical-600 rounded focus:ring-medical-500 border-slate-300"
                    defaultChecked={i < 2}
                  />
                  <span className="text-sm text-slate-700">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Final Assessment */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              Final Assessment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Final Grade
                </label>
                <select
                  className="w-full rounded-lg border-slate-200 bg-slate-50 p-2.5 border text-sm focus:border-medical-500 focus:ring-1 focus:ring-medical-500"
                  defaultValue={state.analysisResult?.predictedGrade}
                >
                  {Object.values(LesionGrade).map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Follow-up
                </label>
                <select className="w-full rounded-lg border-slate-200 bg-slate-50 p-2.5 border text-sm focus:border-medical-500 focus:ring-1 focus:ring-medical-500">
                  <option>Routine (12 months)</option>
                  <option>Short-term (3–6 months)</option>
                  <option>Urgent Referral</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Clinical Notes
              </label>
              <textarea
                rows={3}
                className="w-full rounded-lg border-slate-200 bg-slate-50 p-3 border text-sm focus:border-medical-500 focus:ring-1 focus:ring-medical-500 resize-none"
                placeholder="Enter additional observations…"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setState((s) => ({ ...s, step: 'details' }))}
            >
              Go Back
            </Button>
            <Button variant="secondary" className="flex-1">
              Request Re-analysis
            </Button>
            <Button
              className="flex-1 shadow-md shadow-medical-200/50"
              onClick={() => alert('Report finalized and saved to EHR.')}
            >
              <CheckCircle size={14} />
              Approve & Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50/30 text-slate-900 font-sans relative overflow-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-medical-600 to-medical-700 text-white p-2 rounded-lg shadow-sm">
              <Microscope size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 font-display tracking-tight">
                CapillaroScope
              </h1>
              <p className="text-sm text-slate-400 -mt-0.5 hidden sm:block">
                AI-Assisted Capillaroscopy
              </p>
            </div>
          </div>

            <div className="flex items-center gap-4">
              {/* Font Size Toggle */}
              <div className="hidden sm:flex bg-slate-100/80 backdrop-blur-sm p-1 rounded-lg shrink-0 border border-slate-200/50 items-center justify-center">
                <button
                  className={`px-2 py-1 rounded-md text-sm font-bold transition-all ${fontSize === 'sm' ? 'bg-white shadow-sm text-medical-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setFontSize('sm')}
                  title="Small Text"
                >A-</button>
                <button
                  className={`px-2 py-1 rounded-md text-base font-bold transition-all ${fontSize === 'md' ? 'bg-white shadow-sm text-medical-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setFontSize('md')}
                  title="Medium Text"
                >A</button>
                <button
                  className={`px-2 py-1 rounded-md text-lg font-bold transition-all ${fontSize === 'lg' ? 'bg-white shadow-sm text-medical-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setFontSize('lg')}
                  title="Large Text"
                >A+</button>
              </div>

            {/* Demo Toggle */}
            <button
              className="flex items-center gap-1.5 select-none"
              onClick={toggleDemoMode}
              title="Toggle Demo Mode"
            >
              <span
                className={`text-sm font-bold uppercase tracking-wider transition-colors ${
                  state.isDemoMode ? 'text-medical-600' : 'text-slate-400'
                }`}
              >
                Demo
              </span>
              {state.isDemoMode ? (
                <ToggleRight className="text-medical-600" size={22} />
              ) : (
                <ToggleLeft className="text-slate-300" size={22} />
              )}
            </button>

            <div className="hidden md:flex items-center gap-1.5 text-sm text-slate-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Online
            </div>

            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
              DR
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col h-[calc(100vh-3.5rem)]">
        <StepIndicator currentStep={state.step} />

        <div className="flex-grow overflow-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto h-full">
            {state.step === 'intake' && renderIntake()}
            {state.step === 'assessment' && renderAssessment()}
            {state.step === 'details' && renderDetails()}
            {state.step === 'review' && renderReview()}
          </div>
        </div>
      </main>

      {/* Demo Script Panel */}
      <div
        className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
          demoPanelOpen
            ? 'translate-y-0'
            : 'translate-y-[calc(100%-2.5rem)]'
        }`}
      >
        <div className="bg-slate-900 text-white rounded-lg shadow-2xl w-72 overflow-hidden border border-slate-700">
          <button
            className="w-full bg-slate-800 p-2.5 flex justify-between items-center hover:bg-slate-750 transition-colors"
            onClick={() => setDemoPanelOpen(!demoPanelOpen)}
          >
            <h4 className="font-bold text-base tracking-wide">
              📋 Demo Script
            </h4>
            <span className="text-sm text-slate-400">
              {demoPanelOpen ? '▼' : '▲'}
            </span>
          </button>
          <div className="p-3 text-sm space-y-2 max-h-48 overflow-y-auto scrollbar-thin leading-relaxed">
            <p>
              <strong className="text-amber-400">1.</strong> Select a demo image
              or upload your own.
            </p>
            <p>
              <strong className="text-amber-400">2.</strong> Click "Run Analysis"
              — results are deterministic per image seed.
            </p>
            <p>
              <strong className="text-amber-400">3.</strong> Toggle overlays,
              click zones for per-region breakdowns.
            </p>
            <p>
              <strong className="text-amber-400">4.</strong> Upload a different
              image to see unique analysis results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
