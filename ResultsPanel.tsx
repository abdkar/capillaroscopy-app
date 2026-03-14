import React from 'react';
import { AnalysisResult, LesionGrade } from './types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Info, AlertCircle } from 'lucide-react';

interface ResultsPanelProps {
  result: AnalysisResult | null;
  selectedZoneId: string | null;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  result,
  selectedZoneId,
}) => {
  if (!result) return null;

  const data = [
    { name: 'Normal', prob: result.gradeProbs.normal },
    { name: 'Low', prob: result.gradeProbs.low },
    { name: 'High', prob: result.gradeProbs.high },
  ];

  const barColors: Record<string, string> = {
    Normal: '#22c55e',
    Low: '#eab308',
    High: '#ef4444',
  };

  const confidenceStyles: Record<string, string> = {
    High: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-red-50 text-red-700 border-red-200',
  };

  const selectedZone = result.zones.find((z) => z.id === selectedZoneId);

  const getZoneExplanation = (
    zone: typeof selectedZone
  ): { drivers: string[]; findings: string[] } => {
    if (!zone) return { drivers: [], findings: [] };
    const drivers: string[] = [];
    const findings: string[] = [];

    if (zone.localDensity < 7) drivers.push('Reduced capillary density');
    if (zone.crossedCount > 0)
      drivers.push(`Crossed capillary patterns (${zone.crossedCount})`);
    if (zone.giantCount > 0)
      drivers.push(`Giant capillaries (${zone.giantCount})`);
    if (zone.meanLoopWidth > 50) drivers.push('Enlarged loop width');
    if (drivers.length === 0)
      drivers.push('Normal density', 'No crossed capillaries');

    if (zone.hemorrhageCount > 0)
      findings.push(`Micro-hemorrhages (${zone.hemorrhageCount})`);
    else findings.push('No hemorrhages detected');

    return { drivers, findings };
  };

  const zoneExplanation = selectedZone ? getZoneExplanation(selectedZone) : null;

  const MetricItem: React.FC<{
    label: string;
    value: string | number;
    unit?: string;
    alert?: boolean;
  }> = ({ label, value, unit, alert: isAlert }) => (
    <div>
      <div className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-0.5">
        {label}
      </div>
      <div
        className={`font-mono text-sm font-semibold ${
          isAlert ? 'text-red-600' : 'text-slate-800'
        }`}
      >
        {value}
        {unit && (
          <span className="text-xs font-normal text-slate-400 ml-0.5">{unit}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pr-1 scrollbar-thin pb-4">
      {/* Classification */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-slate-200 shadow-sm shrink-0 animate-fade-in hover:shadow-md transition-shadow duration-300">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-base font-bold text-slate-900 font-display">
            Lesion Grade
          </h2>
          <span
            className={`px-2 py-0.5 rounded-md text-sm font-bold border uppercase tracking-wider ${confidenceStyles[result.confidence]}`}
          >
            {result.confidence} Conf.
          </span>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-400 uppercase tracking-wider font-medium mb-1">
            Prediction
          </p>
          <span
            className={`text-xl font-bold font-display ${
              result.predictedGrade === LesionGrade.Normal
                ? 'text-emerald-600'
                : result.predictedGrade === LesionGrade.LowGrade
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            {result.predictedGrade}
          </span>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated from zone-level feature extraction
          </p>
        </div>

        <div className="h-20 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide domain={[0, 1]} />
              <YAxis
                dataKey="name"
                type="category"
                width={48}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                formatter={(value: number) => [
                  `${(value * 100).toFixed(1)}%`,
                  'Probability',
                ]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                }}
              />
              <Bar dataKey="prob" radius={[0, 4, 4, 0]} barSize={14}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColors[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-medical-50/80 backdrop-blur-md p-5 rounded-2xl border border-medical-100 shrink-0 animate-fade-in hover:shadow-md transition-shadow duration-300">
        <h3 className="text-xs font-bold text-medical-900 mb-4 font-display uppercase tracking-wide">
          {selectedZoneId ? `${selectedZoneId} — Risk Factors` : 'Image-Level Explanation'}
        </h3>

        <div className="space-y-3">
          <div>
            <span className="text-xs font-bold text-medical-700 uppercase tracking-wider">
              Primary Drivers
            </span>
            <ul className="list-disc list-inside text-xs text-medical-900 mt-1 space-y-0.5">
              {(zoneExplanation?.drivers ?? result.explanation.primaryDrivers).map(
                (d, i) => (
                  <li key={i}>{d}</li>
                )
              )}
            </ul>
          </div>

          <div>
            <span className="text-xs font-bold text-medical-600 uppercase tracking-wider">
              Secondary Findings
            </span>
            <ul className="list-disc list-inside text-xs text-medical-800 mt-1 space-y-0.5">
              {(
                zoneExplanation?.findings ?? result.explanation.secondaryFindings
              ).map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>

          {result.confidence === 'Low' && (
            <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-100 p-2 rounded-lg mt-2">
              <AlertCircle size={12} />
              <span>Low confidence — manual review recommended</span>
            </div>
          )}
        </div>

        {!selectedZoneId && (
          <div className="mt-3 flex items-start gap-2 text-sm text-medical-600 bg-medical-100/50 p-2 rounded-lg">
            <Info size={12} className="mt-0.5 shrink-0" />
            <p>Click zones in the viewer to isolate per-region findings.</p>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200 shadow-sm animate-fade-in hover:shadow-md transition-shadow duration-300">
        <h3 className="text-xs font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 font-display uppercase tracking-wide">
          {selectedZoneId ? `Metrics: ${selectedZoneId}` : 'Global Metrics'}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <MetricItem
            label="Capillaries"
            value={
              selectedZoneId
                ? (selectedZone?.capillaryCount ?? '—')
                : result.metrics.totalCapillaryCount
            }
          />
          <MetricItem
            label="Length"
            value={
              selectedZoneId
                ? (selectedZone?.zoneLengthMm ?? '—')
                : result.metrics.analyzedLengthMm
            }
            unit="mm"
          />
          <MetricItem
            label="Density"
            value={
              selectedZoneId
                ? (selectedZone?.localDensity ?? '—')
                : result.metrics.density
            }
            unit="/mm"
          />
          <MetricItem
            label="Loop Width"
            value={
              selectedZoneId
                ? (selectedZone?.meanLoopWidth ?? '—')
                : result.metrics.meanLoopWidth
            }
            unit="µm"
          />
          <MetricItem
            label="Hemorrhages"
            value={
              selectedZoneId
                ? (selectedZone?.hemorrhageCount ?? 0)
                : result.metrics.hemorrhageCount
            }
            alert={
              (selectedZoneId
                ? (selectedZone?.hemorrhageCount ?? 0)
                : result.metrics.hemorrhageCount) > 0
            }
          />
          <MetricItem
            label="Crossed Caps"
            value={
              selectedZoneId
                ? (selectedZone?.crossedCount ?? 0)
                : result.metrics.crossedCapillaries
            }
            alert={
              (selectedZoneId
                ? (selectedZone?.crossedCount ?? 0)
                : result.metrics.crossedCapillaries) > 0
            }
          />
        </div>
      </div>

      {/* Trust footer */}
      <div className="text-sm text-slate-400 text-center pt-1 flex items-center justify-center gap-3">
        <span>
          Calibration:{' '}
          <span className={result.isCalibrated ? 'text-emerald-500' : 'text-amber-500'}>
            {result.isCalibrated ? 'OK' : 'Pending'}
          </span>
        </span>
        <span className="text-slate-300">|</span>
        <span>Latency: {result.latencyMs}ms</span>
        <span className="text-slate-300">|</span>
        <span>
          Coverage: {result.segmentationQuality.coveragePercentage}%
        </span>
      </div>
    </div>
  );
};
