/** Clinical diagnosis suspicion categories */
export enum Diagnosis {
  SSc = 'SSc',
  SLE = 'SLE',
  DM = 'Dermatomyositis',
  MCTD = 'MCTD',
  Other = 'Other',
  Unknown = 'Unknown',
}

export enum Finger {
  Thumb = 'Thumb',
  Index = 'Index',
  Middle = 'Middle',
  Ring = 'Ring',
  Little = 'Little',
}

export enum Hand {
  Left = 'Left',
  Right = 'Right',
}

export enum Device {
  DeviceA = 'Device A (High Res)',
  DeviceB = 'Device B (Portable)',
  Unknown = 'Unknown',
}

/** Capillaroscopy lesion severity grade */
export enum LesionGrade {
  Normal = 'Normal',
  LowGrade = 'Low-grade',
  HighGrade = 'High-grade',
}

/** Scleroderma-spectrum capillaroscopy patterns */
export enum SclerodermaPattern {
  None = 'None',
  Early = 'Early Pattern',
  Active = 'Active Pattern',
  Late = 'Late Pattern',
}

export interface PatientContext {
  id: string;
  age: string;
  sex: 'Male' | 'Female' | 'Other';
  diagnosisSuspicion: Diagnosis;
}

export interface AnalysisMetrics {
  totalCapillaryCount: number;
  analyzedLengthMm: number;
  /** Capillaries per mm */
  density: number;
  /** Mean apical loop width in µm */
  meanLoopWidth: number;
  /** Tortuosity index 0–10 */
  tortuosityIndex: number;
  hemorrhageCount: number;
  giantCapillaries: number;
  crossedCapillaries: number;
  avascularAreas: boolean;
  /** Ramified / branched capillaries */
  ramifiedCapillaries: number;
  /** Dilated capillaries */
  dilatedCapillaries: number;
  /** Increased sub-papillary venous plexus visibility */
  subpapillaryVenousPlexus: boolean;
}

export interface ZoneData {
  id: string;
  riskContribution: 'High' | 'Medium' | 'Low' | 'Unknown';
  notes: string;
  capillaryCount: number;
  zoneLengthMm: number;
  localDensity: number;
  giantCount: number;
  hemorrhageCount: number;
  crossedCount: number;
  meanLoopWidth: number;
  ramifiedCount: number;
  dilatedCount: number;
}

export interface Point {
  /** Percentage 0–100 */
  x: number;
  /** Percentage 0–100 */
  y: number;
}

export interface SegmentationQuality {
  confidence: 'High' | 'Medium' | 'Low';
  coveragePercentage: number;
  boundaryConsistency: 'OK' | 'Review';
}

export interface AnalysisResult {
  imageUrl: string;
  gradeProbs: {
    normal: number;
    low: number;
    high: number;
  };
  predictedGrade: LesionGrade;
  confidence: 'High' | 'Medium' | 'Low';
  latencyMs: number;
  metrics: AnalysisMetrics;
  zones: ZoneData[];
  explanation: {
    primaryDrivers: string[];
    secondaryFindings: string[];
  };
  isCalibrated: boolean;
  isOOD: boolean;
  recommendedSiteCoords: Point;
  segmentationPath: string;
  hemorrhageCoords: Point[];
  crossingCoords: Point[];
  giantCoords: Point[];
  ramifiedCoords: Point[];
  avascularCoords: Point[];
  dilatedCoords: Point[];
  tortuosityCoords: Point[];
  sclerodermaPattern: SclerodermaPattern;
  segmentationQuality: SegmentationQuality;
}

export interface AppState {
  step: 'intake' | 'assessment' | 'details' | 'review';
  patientContext: PatientContext;
  selectedDevice: Device;
  selectedFinger: Finger;
  selectedHand: Hand;
  uploadedImage: string | null;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  selectedZoneId: string | null;
  isDemoMode: boolean;
}
