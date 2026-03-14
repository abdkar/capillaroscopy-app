import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnalysisResult, SclerodermaPattern } from './types';
import { Star, Columns, Layers, ZoomIn, ZoomOut, Info, Eye, MousePointer2, Plus, Trash2 } from 'lucide-react';

interface ImageViewerProps {
  imageSrc: string;
  result: AnalysisResult | null;
  onZoneClick: (zoneId: string) => void;
  selectedZoneId: string | null;
  onUpdateResult: (updater: (prev: AnalysisResult) => AnalysisResult) => void;
}

type ViewMode = 'side-by-side' | 'overlay';

/** All anomaly types that can be manually placed on the image */
type AnomalyType = 'hemo' | 'cross' | 'giant' | 'ramified' | 'avascular' | 'dilated' | 'tortuosity';
type EditMode = 'none' | AnomalyType | 'delete';

/** Configuration for each anomaly marker style */
const ANOMALY_CONFIG: Record<AnomalyType, { label: string; chipLabel: string; color: string; markerColor: string; symbol: string; chipColor: string }> = {
  hemo:        { label: '+ Hemo',      chipLabel: 'Hemorrhages',   color: 'red',    markerColor: 'rgba(239,68,68,0.9)',   symbol: '●', chipColor: 'bg-red-100 text-red-800 border-red-200' },
  cross:       { label: '+ Cross',     chipLabel: 'Crossed Caps',  color: 'yellow', markerColor: 'rgba(250,204,21,1)',    symbol: '✕', chipColor: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  giant:       { label: '+ Giant',     chipLabel: 'Giant Caps',    color: 'purple', markerColor: 'rgba(168,85,247,0.9)',  symbol: '◆', chipColor: 'bg-purple-100 text-purple-800 border-purple-200' },
  ramified:    { label: '+ Ramified',  chipLabel: 'Ramified',      color: 'pink',   markerColor: 'rgba(236,72,153,0.9)',  symbol: '⌘', chipColor: 'bg-pink-100 text-pink-800 border-pink-200' },
  avascular:   { label: '+ Avascular', chipLabel: 'Avascular',     color: 'gray',   markerColor: 'rgba(107,114,128,0.8)', symbol: '□', chipColor: 'bg-gray-100 text-gray-800 border-gray-200' },
  dilated:     { label: '+ Dilated',   chipLabel: 'Dilated',       color: 'teal',   markerColor: 'rgba(20,184,166,0.9)',  symbol: '◎', chipColor: 'bg-teal-100 text-teal-800 border-teal-200' },
  tortuosity:  { label: '+ Tortuous',  chipLabel: 'Tortuosity',    color: 'orange', markerColor: 'rgba(249,115,22,0.9)',  symbol: '∿', chipColor: 'bg-orange-100 text-orange-800 border-orange-200' },
};

const EDIT_BUTTON_COLORS: Record<string, string> = {
  hemo:       'bg-red-600 text-white border-red-700',
  cross:      'bg-yellow-500 text-slate-900 border-yellow-600',
  giant:      'bg-purple-600 text-white border-purple-700',
  ramified:   'bg-pink-500 text-white border-pink-600',
  avascular:  'bg-gray-600 text-white border-gray-700',
  dilated:    'bg-teal-500 text-white border-teal-600',
  tortuosity: 'bg-orange-500 text-white border-orange-600',
  delete:     'bg-slate-800 text-white border-slate-900',
};

const ToggleChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}> = ({ label, active, onClick, color = 'bg-slate-100 text-slate-700 border-slate-200' }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-xl text-base font-bold tracking-wide border transition-all duration-200 active:scale-95 ${
      active
        ? `${color} shadow-sm`
        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-600 shadow-sm'
    }`}
    aria-pressed={active}
  >
    {label}
  </button>
);

/** Get the coordinate array key on AnalysisResult for a given anomaly type */
const getCoordsKey = (type: AnomalyType): keyof AnalysisResult => {
  const map: Record<AnomalyType, keyof AnalysisResult> = {
    hemo: 'hemorrhageCoords',
    cross: 'crossingCoords',
    giant: 'giantCoords',
    ramified: 'ramifiedCoords',
    avascular: 'avascularCoords',
    dilated: 'dilatedCoords',
    tortuosity: 'tortuosityCoords',
  };
  return map[type];
};

export const ImageViewer: React.FC<ImageViewerProps> = ({
  imageSrc,
  result,
  onZoneClick,
  selectedZoneId,
  onUpdateResult,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [editMode, setEditMode] = useState<EditMode>('none');

  const [showSegmentation, setShowSegmentation] = useState(true);
  const [showHemorrhages, setShowHemorrhages] = useState(true);
  const [showCrossings, setShowCrossings] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showRecommended, setShowRecommended] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showGiant, setShowGiant] = useState(true);
  const [showRamified, setShowRamified] = useState(true);
  const [showAvascular, setShowAvascular] = useState(true);
  const [showDilated, setShowDilated] = useState(true);
  const [showTortuosity, setShowTortuosity] = useState(true);

  const [maskOpacity, setMaskOpacity] = useState(60);
  const [heatmapOpacity, setHeatmapOpacity] = useState(30);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [result]);

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

  // --- HITL: Click to add ---
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (editMode === 'none' || editMode === 'delete' || !result) return;
    if (isDragging) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newPt = { x, y };
    const coordsKey = getCoordsKey(editMode as AnomalyType);

    onUpdateResult((prev) => ({
      ...prev,
      [coordsKey]: [...(prev[coordsKey] as any[]), newPt],
    }));
    setEditMode('none');
  };

  // --- HITL: Click to delete ---
  const handleDeleteMarker = (e: React.MouseEvent, type: AnomalyType, indexToRemove: number) => {
    e.stopPropagation();
    if (editMode !== 'delete') return;
    const coordsKey = getCoordsKey(type);
    onUpdateResult((prev) => ({
      ...prev,
      [coordsKey]: (prev[coordsKey] as any[]).filter((_: any, i: number) => i !== indexToRemove),
    }));
  };

  // --- HITL: Scleroderma Pattern change ---
  const handlePatternChange = (newPattern: SclerodermaPattern) => {
    onUpdateResult((prev) => ({ ...prev, sclerodermaPattern: newPattern }));
  };

  if (!result) {
    return (
      <div className="w-full h-96 bg-white/50 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-300">
        <p className="text-slate-400 font-medium tracking-wide">No analysis data available</p>
      </div>
    );
  }

  const transformStyle = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: 'center center' as const,
    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
  };

  // Visibility map for each anomaly type
  const visibilityMap: Record<AnomalyType, boolean> = {
    hemo: showHemorrhages,
    cross: showCrossings,
    giant: showGiant,
    ramified: showRamified,
    avascular: showAvascular,
    dilated: showDilated,
    tortuosity: showTortuosity,
  };

  // All anomaly coord arrays with their type key
  const allAnomalies: { type: AnomalyType; coords: { x: number; y: number }[] }[] = [
    { type: 'hemo', coords: result.hemorrhageCoords },
    { type: 'cross', coords: result.crossingCoords },
    { type: 'giant', coords: result.giantCoords },
    { type: 'ramified', coords: result.ramifiedCoords },
    { type: 'avascular', coords: result.avascularCoords },
    { type: 'dilated', coords: result.dilatedCoords },
    { type: 'tortuosity', coords: result.tortuosityCoords },
  ];

  const hiddenFindingsCount = allAnomalies.filter(
    (a) => a.coords.length > 0 && !visibilityMap[a.type]
  ).length;

  const handleShowHidden = () => {
    setShowHemorrhages(true);
    setShowCrossings(true);
    setShowGiant(true);
    setShowRamified(true);
    setShowAvascular(true);
    setShowDilated(true);
    setShowTortuosity(true);
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
        <rect x="10%" y="10%" width="80%" height="80%" fill="url(#heatmapGrad)" style={{ opacity: heatmapOpacity / 100 }} />
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

  /** Renders a single circle marker for a point */
  const renderCircleMarker = (type: AnomalyType, pt: { x: number; y: number }, idx: number) => {
    const cfg = ANOMALY_CONFIG[type];
    const isDeleteMode = editMode === 'delete';
    return (
      <g
        key={`${type}-${idx}`}
        onClick={(e) => handleDeleteMarker(e, type, idx)}
        className={isDeleteMode ? 'cursor-pointer pointer-events-auto hover:opacity-50 transition-opacity' : 'pointer-events-none'}
      >
        <circle cx={`${pt.x}%`} cy={`${pt.y}%`} r="10" fill="none" stroke={cfg.markerColor} strokeWidth="2" strokeOpacity="0.5" />
        <circle cx={`${pt.x}%`} cy={`${pt.y}%`} r="5" fill={cfg.markerColor} stroke="white" strokeWidth="1" />
        {isDeleteMode && <circle cx={`${pt.x}%`} cy={`${pt.y}%`} r="14" fill="transparent" />}
      </g>
    );
  };

  /** Renders a text-based marker (for crossed/tortuosity which use symbols) */
  const renderSymbolMarker = (type: AnomalyType, pt: { x: number; y: number }, idx: number) => {
    const cfg = ANOMALY_CONFIG[type];
    const isDeleteMode = editMode === 'delete';
    return (
      <g
        key={`${type}-${idx}`}
        transform={`translate(${pt.x * 8}, ${pt.y * 6})`}
        onClick={(e) => handleDeleteMarker(e, type, idx)}
        className={isDeleteMode ? 'cursor-pointer pointer-events-auto hover:opacity-50 transition-opacity' : 'pointer-events-none'}
      >
        {isDeleteMode && <circle cx="0" cy="0" r="16" fill={`${cfg.markerColor.replace(')', ',0.2)').replace('rgba', 'rgba')}`} />}
        <text fontSize="18" fill={cfg.markerColor} textAnchor="middle" dominantBaseline="middle" fontWeight="900" stroke="black" strokeWidth="0.8" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}>
          {cfg.symbol}
        </text>
      </g>
    );
  };

  const MarkerOverlay = ({ isLeftPanel = false }: { isLeftPanel?: boolean }) => (
    <svg
      className={`absolute inset-0 w-full h-full z-30 ${editMode !== 'none' ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ cursor: editMode !== 'none' && editMode !== 'delete' ? 'crosshair' : 'inherit' }}
      viewBox="0 0 800 600"
      preserveAspectRatio="none"
      onClick={handleSvgClick}
    >
      {/* Hemorrhages — red circles */}
      {!isLeftPanel && showHemorrhages && result.hemorrhageCoords.map((pt, idx) => renderCircleMarker('hemo', pt, idx))}

      {/* Crossed — yellow ✕ symbols */}
      {!isLeftPanel && showCrossings && result.crossingCoords.map((pt, idx) => renderSymbolMarker('cross', pt, idx))}

      {/* Giant — purple diamonds */}
      {!isLeftPanel && showGiant && result.giantCoords.map((pt, idx) => renderCircleMarker('giant', pt, idx))}

      {/* Ramified — pink markers */}
      {!isLeftPanel && showRamified && result.ramifiedCoords.map((pt, idx) => renderSymbolMarker('ramified', pt, idx))}

      {/* Avascular — gray squares */}
      {!isLeftPanel && showAvascular && result.avascularCoords.map((pt, idx) => renderSymbolMarker('avascular', pt, idx))}

      {/* Dilated — teal circles */}
      {!isLeftPanel && showDilated && result.dilatedCoords.map((pt, idx) => renderCircleMarker('dilated', pt, idx))}

      {/* Tortuosity — orange waves */}
      {!isLeftPanel && showTortuosity && result.tortuosityCoords.map((pt, idx) => renderSymbolMarker('tortuosity', pt, idx))}

      {/* Recommended site */}
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
                isSelected ? 'border-2 border-medical-400 bg-medical-400/10' : !isLeftPanel ? 'border border-white/20 hover:bg-white/5' : ''
              }`}
              style={{ opacity: maskOpacity / 100 }}
              onClick={() => { if (scale === 1) onZoneClick(zoneId); }}
            >
              {!isLeftPanel && (
                <span className={`absolute top-2 left-2 text-sm font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-medical-500 text-white' : 'bg-black/60 text-white/90'}`}>
                  {zoneId}
                </span>
              )}
            </div>
          );
        })}
      </div>
    ) : null;

  const ImagePanel = ({ isLeftPanel = false }: { isLeftPanel?: boolean }) => (
    <div className="relative overflow-hidden w-full h-full group">
      <div className={`absolute top-4 left-4 z-40 text-white text-base px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/20 font-bold tracking-wide shadow-lg ${isLeftPanel ? 'bg-black/40' : 'bg-medical-900/60'}`}>
        {isLeftPanel ? 'Original Window' : 'Segmentation Output'}
      </div>
      <div className="w-full h-full" style={transformStyle}>
        <img src={imageSrc} alt={isLeftPanel ? 'Original image' : 'Segmented output'} className="w-full h-full object-cover pointer-events-none" draggable={false} />
        <BackgroundOverlay isLeftPanel={isLeftPanel} />
        <ZonesLayer isLeftPanel={isLeftPanel} />
        <MarkerOverlay isLeftPanel={isLeftPanel} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Controls */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 sticky top-0 z-40 hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* View mode switcher */}
          <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
            <button onClick={() => setViewMode('side-by-side')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'side-by-side' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Columns size={14} /> Side-by-Side
            </button>
            <button onClick={() => setViewMode('overlay')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'overlay' ? 'bg-white text-medical-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Layers size={14} /> Overlay
            </button>
          </div>

          {/* Opacity sliders */}
          <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap justify-end">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase text-slate-400 tracking-wider">Mask</span>
              <input type="range" min="0" max="100" value={maskOpacity} onChange={(e) => setMaskOpacity(Number(e.target.value))} className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-medical-600" />
              <span className="w-8 text-right font-mono text-sm text-slate-500">{maskOpacity}%</span>
            </div>
            {showHeatmap && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-200 animate-fade-in">
                <span className="text-sm font-bold uppercase text-slate-400 tracking-wider">Heatmap</span>
                <input type="range" min="0" max="100" value={heatmapOpacity} onChange={(e) => setHeatmapOpacity(Number(e.target.value))} className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                <span className="w-8 text-right font-mono text-sm text-slate-500">{heatmapOpacity}%</span>
              </div>
            )}
            <div className="flex items-center gap-1 pl-3 border-l border-slate-200">
              <button onClick={() => setScale((s) => Math.max(1, s - 0.25))} className="p-1 rounded hover:bg-slate-100 text-slate-500" title="Zoom out"><ZoomOut size={14} /></button>
              <span className="font-mono text-sm w-10 text-center text-slate-500">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale((s) => Math.min(5, s + 0.25))} className="p-1 rounded hover:bg-slate-100 text-slate-500" title="Zoom in"><ZoomIn size={14} /></button>
            </div>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          <ToggleChip label="Segmentation" active={showSegmentation} onClick={() => setShowSegmentation(!showSegmentation)} color="bg-sky-100 text-sky-800 border-sky-200" />
          <ToggleChip label={ANOMALY_CONFIG.hemo.chipLabel} active={showHemorrhages} onClick={() => setShowHemorrhages(!showHemorrhages)} color={ANOMALY_CONFIG.hemo.chipColor} />
          <ToggleChip label={ANOMALY_CONFIG.cross.chipLabel} active={showCrossings} onClick={() => setShowCrossings(!showCrossings)} color={ANOMALY_CONFIG.cross.chipColor} />
          <ToggleChip label={ANOMALY_CONFIG.giant.chipLabel} active={showGiant} onClick={() => setShowGiant(!showGiant)} color={ANOMALY_CONFIG.giant.chipColor} />
          <ToggleChip label={ANOMALY_CONFIG.ramified.chipLabel} active={showRamified} onClick={() => setShowRamified(!showRamified)} color={ANOMALY_CONFIG.ramified.chipColor} />
          <ToggleChip label={ANOMALY_CONFIG.dilated.chipLabel} active={showDilated} onClick={() => setShowDilated(!showDilated)} color={ANOMALY_CONFIG.dilated.chipColor} />
          <ToggleChip label={ANOMALY_CONFIG.avascular.chipLabel} active={showAvascular} onClick={() => setShowAvascular(!showAvascular)} color={ANOMALY_CONFIG.avascular.chipColor} />
          <ToggleChip label={ANOMALY_CONFIG.tortuosity.chipLabel} active={showTortuosity} onClick={() => setShowTortuosity(!showTortuosity)} color={ANOMALY_CONFIG.tortuosity.chipColor} />
          <ToggleChip label="Zones" active={showZones} onClick={() => setShowZones(!showZones)} color="bg-indigo-100 text-indigo-800 border-indigo-200" />
          <ToggleChip label="Heatmap (XAI)" active={showHeatmap} onClick={() => setShowHeatmap(!showHeatmap)} color="bg-orange-100 text-orange-800 border-orange-200" />
          <ToggleChip label="★ Rec. Site" active={showRecommended} onClick={() => setShowRecommended(!showRecommended)} color="bg-amber-100 text-amber-800 border-amber-200" />
        </div>

        {/* HITL Manual Edit Toolbar */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1"><MousePointer2 size={12} /> Manual Edit:</span>
            {(Object.keys(ANOMALY_CONFIG) as AnomalyType[]).map((type) => (
              <button
                key={type}
                onClick={() => setEditMode(editMode === type ? 'none' : type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${editMode === type ? `${EDIT_BUTTON_COLORS[type]} shadow-inner` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <Plus size={10} /> {ANOMALY_CONFIG[type].label.replace('+ ', '')}
              </button>
            ))}
            <div className="w-px h-4 bg-slate-300 mx-0.5" />
            <button
              onClick={() => setEditMode(editMode === 'delete' ? 'none' : 'delete')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${editMode === 'delete' ? `${EDIT_BUTTON_COLORS.delete} shadow-inner` : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'}`}
            >
              <Trash2 size={10} /> Delete
            </button>
          </div>
          {editMode !== 'none' && (
            <span className="text-xs text-medical-600 animate-pulse bg-medical-50 px-2 py-1 rounded w-fit">
              {editMode === 'delete' ? 'Click any marker to delete it' : `Click on image to place ${ANOMALY_CONFIG[editMode as AnomalyType]?.chipLabel}`}
            </span>
          )}

          {/* Scleroderma Pattern selector */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scleroderma Pattern:</span>
            <select
              value={result.sclerodermaPattern}
              onChange={(e) => handlePatternChange(e.target.value as SclerodermaPattern)}
              className="rounded-lg border-slate-200 bg-slate-50 text-xs text-slate-800 px-2 py-1 border focus:border-medical-500 focus:ring-1 focus:ring-medical-500 transition-colors"
            >
              {Object.values(SclerodermaPattern).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {result.sclerodermaPattern !== SclerodermaPattern.None && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.sclerodermaPattern === SclerodermaPattern.Late ? 'bg-red-100 text-red-700' : result.sclerodermaPattern === SclerodermaPattern.Active ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {result.sclerodermaPattern}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hidden findings warning */}
      {hiddenFindingsCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-3 py-2 rounded-lg flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Eye size={14} />
            <span>{hiddenFindingsCount} anomaly type(s) hidden by current settings.</span>
          </div>
          <button onClick={handleShowHidden} className="font-bold underline hover:text-orange-900 transition-colors">Show all</button>
        </div>
      )}

      {/* Main viewer */}
      <div
        ref={containerRef}
        className="flex-grow min-h-0 relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/50 select-none shadow-xl shadow-slate-200/50"
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
            <div className="absolute top-3 left-3 z-40 bg-slate-800/70 text-white text-base px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10 font-medium flex items-center gap-1.5 tracking-wide">
              <Layers size={11} /> Overlay
            </div>
            <div className="w-full h-full" style={transformStyle}>
              <img src={imageSrc} alt="Analysis overlay" className="w-full h-full object-cover pointer-events-none" draggable={false} />
              <BackgroundOverlay />
              <ZonesLayer />
              <MarkerOverlay />
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2 z-50 pointer-events-none">
          {showHeatmap && (
            <div className="bg-slate-900/90 text-white p-3 rounded-lg border border-slate-700 shadow-xl backdrop-blur-md pointer-events-auto text-base">
              <div className="font-bold mb-1.5 text-slate-400 uppercase tracking-wider text-xs">XAI Heatmap</div>
              <div className="w-40 h-2.5 rounded-full bg-gradient-to-r from-red-600 via-yellow-400 to-transparent mb-1" />
              <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                <span>High</span><span>Low</span>
              </div>
            </div>
          )}

          <div className="bg-slate-900/90 text-white p-3 rounded-lg border border-slate-700 shadow-xl backdrop-blur-md pointer-events-auto max-h-48 overflow-y-auto">
            <div className="font-bold mb-2 uppercase tracking-wider text-slate-400 text-xs">Legend</div>
            <div className="space-y-1 text-base">
              <div className="flex items-center gap-2"><span className="w-3 h-3 bg-sky-400/30 border border-sky-500 rounded-sm" /><span>Segmentation</span></div>
              {(Object.entries(ANOMALY_CONFIG) as [AnomalyType, typeof ANOMALY_CONFIG[AnomalyType]][]).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-2">
                  <span style={{ color: cfg.markerColor }} className="font-bold text-sm leading-none">{cfg.symbol}</span>
                  <span>{cfg.chipLabel}</span>
                </div>
              ))}
              <div className="flex items-center gap-2"><Star size={11} className="text-yellow-400 fill-current" /><span>Rec. Site</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-1 text-base text-slate-400">
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
