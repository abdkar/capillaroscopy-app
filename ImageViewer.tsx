import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnalysisResult } from './types';
import { Star, Columns, Layers, ZoomIn, ZoomOut, Info, Eye } from 'lucide-react';

interface ImageViewerProps {
  imageSrc: string;
  result: AnalysisResult | null;
  onZoneClick: (zoneId: string) => void;
  selectedZoneId: string | null;
}

type ViewMode = 'side-by-side' | 'overlay';

const ToggleChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}> = ({ label, active, onClick, color = 'bg-slate-100 text-slate-700 border-slate-200' }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
      active ? color : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
    }`}
    aria-pressed={active}
  >
    {label}
  </button>
);

export const ImageViewer: React.FC<ImageViewerProps> = ({
  imageSrc,
  result,
  onZoneClick,
  selectedZoneId,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');

  const [showSegmentation, setShowSegmentation] = useState(true);
  const [showHemorrhages, setShowHemorrhages] = useState(true);
  const [showCrossings, setShowCrossings] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showRecommended, setShowRecommended] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const [maskOpacity, setMaskOpacity] = useState(60);
  const [heatmapOpacity, setHeatmapOpacity] = useState(30);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom when result changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [result]);

  // Passive: false wheel listener for zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1;
      setScale((prev) => {
        const next = Math.min(Math.max(1, prev + direction * 0.15), 5);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    },
    [scale, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const stopDrag = useCallback(() => setIsDragging(false), []);

  if (!result) {
    return (
      <div className="w-full h-96 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
        <p className="text-slate-400 font-medium">No analysis data available</p>
      </div>
    );
  }

  const hiddenFindingsCount =
    (result.metrics.hemorrhageCount > 0 && !showHemorrhages ? 1 : 0) +
    (result.metrics.crossedCapillaries > 0 && !showCrossings ? 1 : 0);

  const handleShowHidden = () => {
    if (result.metrics.hemorrhageCount > 0) setShowHemorrhages(true);
    if (result.metrics.crossedCapillaries > 0) setShowCrossings(true);
  };

  const transformStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: 'center center' as const,
    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
  };

  // --- Layer Components ---
  const BackgroundOverlay = ({ isLeftPanel = false }: { isLeftPanel?: boolean }) => (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 800 600"
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient id="heatmapGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 0, 0, 1)" stopOpacity="0.8" />
          <stop offset="50%" stopColor="rgba(255, 255, 0, 1)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {!isLeftPanel && showHeatmap && (
        <rect
          x="10%"
          y="10%"
          width="80%"
          height="80%"
          fill="url(#heatmapGrad)"
          style={{ opacity: heatmapOpacity / 100 }}
        />
      )}

      {!isLeftPanel && showSegmentation && (
        <path
          d={result.segmentationPath}
          fill={`rgba(56, 189, 248, ${0.3 * (maskOpacity / 100)})`}
          stroke="rgba(14, 165, 233, 0.9)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          style={{ opacity: Math.max(0.3, maskOpacity / 100) }}
        />
      )}
    </svg>
  );

  const MarkerOverlay = ({ isLeftPanel = false }: { isLeftPanel?: boolean }) => (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-30"
      viewBox="0 0 800 600"
      preserveAspectRatio="none"
    >
      {!isLeftPanel &&
        showHemorrhages &&
        result.hemorrhageCoords.map((pt, idx) => (
          <g key={`hemo-${idx}`}>
            <circle
              cx={`${pt.x}%`}
              cy={`${pt.y}%`}
              r="8"
              fill="none"
              stroke="rgba(239, 68, 68, 0.6)"
              strokeWidth="2"
            />
            <circle
              cx={`${pt.x}%`}
              cy={`${pt.y}%`}
              r="4"
              fill="rgba(239, 68, 68, 0.9)"
              stroke="white"
              strokeWidth="1"
            />
          </g>
        ))}

      {!isLeftPanel &&
        showCrossings &&
        result.crossingCoords.map((pt, idx) => (
          <g key={`cross-${idx}`} transform={`translate(${pt.x * 8}, ${pt.y * 6})`}>
            <text
              fontSize="20"
              fill="#FACC15"
              textAnchor="middle"
              dominantBaseline="middle"
              fontWeight="900"
              stroke="black"
              strokeWidth="1.2"
              style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}
            >
              ✕
            </text>
          </g>
        ))}

      {!isLeftPanel && showRecommended && (
        <foreignObject
          x={`${result.recommendedSiteCoords.x}%`}
          y={`${result.recommendedSiteCoords.y}%`}
          width="1"
          height="1"
          className="overflow-visible"
        >
          <div className="transform -translate-x-1/2 -translate-y-1/2 text-yellow-400 drop-shadow-lg animate-pulse">
            <Star fill="currentColor" size={28} stroke="black" strokeWidth={1} />
          </div>
        </foreignObject>
      )}
    </svg>
  );

  const ZonesLayer = ({ isLeftPanel = false }: { isLeftPanel?: boolean }) =>
    showZones ? (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 z-20 pointer-events-none">
        {['Zone A', 'Zone B', 'Zone C', 'Zone D'].map((zoneId) => {
          const isSelected = selectedZoneId === zoneId;
          const shouldShow = !isLeftPanel || (isLeftPanel && isSelected);

          if (!shouldShow) return <div key={zoneId} />;

          return (
            <div
              key={zoneId}
              className={`relative transition-all duration-200 pointer-events-auto cursor-pointer ${
                isSelected
                  ? 'border-2 border-medical-400 bg-medical-400/10'
                  : !isLeftPanel
                    ? 'border border-white/20 hover:bg-white/5'
                    : ''
              }`}
              style={{ opacity: maskOpacity / 100 }}
              onClick={() => {
                if (scale === 1) onZoneClick(zoneId);
              }}
            >
              {!isLeftPanel && (
                <span
                  className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded ${
                    isSelected
                      ? 'bg-medical-500 text-white'
                      : 'bg-black/60 text-white/90'
                  }`}
                >
                  {zoneId}
                </span>
              )}
            </div>
          );
        })}
      </div>
    ) : null;

  const ImagePanel = ({ isLeftPanel = false }: { isLeftPanel?: boolean }) => (
    <div className="relative overflow-hidden w-full h-full">
      {/* Panel label */}
      <div
        className={`absolute top-3 left-3 z-40 text-white text-[11px] px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10 font-medium tracking-wide ${
          isLeftPanel ? 'bg-black/60' : 'bg-medical-900/70'
        }`}
      >
        {isLeftPanel ? 'Original' : 'Segmentation Output'}
      </div>
      <div className="w-full h-full" style={transformStyle}>
        <img
          src={imageSrc}
          alt={isLeftPanel ? 'Original image' : 'Segmented output'}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        <BackgroundOverlay isLeftPanel={isLeftPanel} />
        <ZonesLayer isLeftPanel={isLeftPanel} />
        <MarkerOverlay isLeftPanel={isLeftPanel} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Controls */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 sticky top-0 z-40">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* View mode switcher */}
          <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-white text-medical-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Columns size={14} /> Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('overlay')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'overlay'
                  ? 'bg-white text-medical-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers size={14} /> Overlay
            </button>
          </div>

          {/* Opacity sliders */}
          <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Mask
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={maskOpacity}
                onChange={(e) => setMaskOpacity(Number(e.target.value))}
                className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-medical-600"
              />
              <span className="w-8 text-right font-mono text-[10px] text-slate-500">
                {maskOpacity}%
              </span>
            </div>

            {showHeatmap && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200 animate-fade-in">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Heatmap
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={heatmapOpacity}
                  onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                  className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <span className="w-8 text-right font-mono text-[10px] text-slate-500">
                  {heatmapOpacity}%
                </span>
              </div>
            )}

            {/* Zoom controls */}
            <div className="flex items-center gap-1 pl-3 border-l border-slate-200">
              <button
                onClick={() => setScale((s) => Math.max(1, s - 0.25))}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                title="Zoom out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="font-mono text-[10px] w-10 text-center text-slate-500">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale((s) => Math.min(5, s + 0.25))}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                title="Zoom in"
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          <ToggleChip
            label="Segmentation"
            active={showSegmentation}
            onClick={() => setShowSegmentation(!showSegmentation)}
            color="bg-sky-100 text-sky-800 border-sky-200"
          />
          <ToggleChip
            label="Hemorrhages"
            active={showHemorrhages}
            onClick={() => setShowHemorrhages(!showHemorrhages)}
            color="bg-red-100 text-red-800 border-red-200"
          />
          <ToggleChip
            label="Crossed Caps"
            active={showCrossings}
            onClick={() => setShowCrossings(!showCrossings)}
            color="bg-yellow-100 text-yellow-800 border-yellow-200"
          />
          <ToggleChip
            label="Zones"
            active={showZones}
            onClick={() => setShowZones(!showZones)}
            color="bg-indigo-100 text-indigo-800 border-indigo-200"
          />
          <ToggleChip
            label="Heatmap (XAI)"
            active={showHeatmap}
            onClick={() => setShowHeatmap(!showHeatmap)}
            color="bg-orange-100 text-orange-800 border-orange-200"
          />
          <ToggleChip
            label="★ Rec. Site"
            active={showRecommended}
            onClick={() => setShowRecommended(!showRecommended)}
            color="bg-amber-100 text-amber-800 border-amber-200"
          />
        </div>
      </div>

      {/* Hidden findings warning */}
      {hiddenFindingsCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-3 py-2 rounded-lg flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Eye size={14} />
            <span>
              {hiddenFindingsCount} detected finding(s) hidden by current settings.
            </span>
          </div>
          <button
            onClick={handleShowHidden}
            className="font-bold underline hover:text-orange-900 transition-colors"
          >
            Show all
          </button>
        </div>
      )}

      {/* Main viewer */}
      <div
        ref={containerRef}
        className="flex-grow min-h-0 relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 select-none shadow-lg"
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {viewMode === 'side-by-side' ? (
          <div className="grid grid-cols-2 h-full divide-x divide-slate-700">
            <ImagePanel isLeftPanel />
            <ImagePanel isLeftPanel={false} />
          </div>
        ) : (
          <div className="w-full h-full relative">
            <div className="absolute top-3 left-3 z-40 bg-slate-800/70 text-white text-[11px] px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10 font-medium flex items-center gap-1.5 tracking-wide">
              <Layers size={11} /> Overlay
            </div>
            <div className="w-full h-full" style={transformStyle}>
              <img
                src={imageSrc}
                alt="Analysis overlay"
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
              <BackgroundOverlay />
              <ZonesLayer />
              <MarkerOverlay />
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2 z-50 pointer-events-none">
          {showHeatmap && (
            <div className="bg-slate-900/90 text-white p-3 rounded-lg border border-slate-700 shadow-xl backdrop-blur-md pointer-events-auto text-[11px]">
              <div className="font-bold mb-1.5 text-slate-400 uppercase tracking-wider text-[9px]">
                XAI Heatmap
              </div>
              <div className="w-40 h-2.5 rounded-full bg-gradient-to-r from-red-600 via-yellow-400 to-transparent mb-1" />
              <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                <span>High</span>
                <span>Low</span>
              </div>
            </div>
          )}

          <div className="bg-slate-900/90 text-white p-3 rounded-lg border border-slate-700 shadow-xl backdrop-blur-md pointer-events-auto">
            <div className="font-bold mb-2 uppercase tracking-wider text-slate-400 text-[9px]">
              Legend
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-sky-400/30 border border-sky-500 rounded-sm" />
                <span>Segmentation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
                <span>Hemorrhage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold text-xs leading-none">✕</span>
                <span>Crossed Cap.</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={11} className="text-yellow-400 fill-current" />
                <span>Rec. Site</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info size={12} />
          <span>
            {viewMode === 'side-by-side'
              ? 'Views synchronized. Scroll to zoom, drag to pan.'
              : 'Overlay mode. Scroll to zoom, drag to pan.'}
          </span>
        </div>
      </div>
    </div>
  );
};
