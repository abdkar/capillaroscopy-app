import { AnalysisResult, LesionGrade, ZoneData, Point } from './types';

export const DEMO_IMAGES = [
  { id: '1', url: '/cap1.jpg', label: 'Capillaroscopy 1' },
  { id: '2', url: '/cap2.jpg', label: 'Capillaroscopy 2' },
  { id: '3', url: '/cap3.jpg', label: 'Capillaroscopy 3' },
];

/**
 * Deterministic PRNG from a string seed.
 * Uses a simple hash → sine approach for consistent per-image results.
 */
const seededRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // Convert to 32bit integer
  }
  const x = Math.sin(hash) * 10000;
  return Math.abs(x - Math.floor(x)); // Ensure always positive [0, 1)
};

/** Count points falling in a given quadrant zone */
const countInZone = (points: Point[], zoneIdx: number): number => {
  return points.filter((p) => {
    const isLeft = p.x < 50;
    const isTop = p.y < 50;
    if (zoneIdx === 0) return isLeft && isTop;
    if (zoneIdx === 1) return !isLeft && isTop;
    if (zoneIdx === 2) return isLeft && !isTop;
    if (zoneIdx === 3) return !isLeft && !isTop;
    return false;
  }).length;
};

export const generateAnalysisResult = (
  imgUrl: string,
  _isDemoMode: boolean
): AnalysisResult => {
  // Use a portion of the URL as the seed for deterministic output
  const seed = imgUrl.substring(Math.max(0, imgUrl.length - 16));
  const rand = (offset = 0) => seededRandom(seed + String(offset));

  // --- Determine Grade ---
  const riskFactor = rand(1);
  let predictedGrade = LesionGrade.Normal;
  if (riskFactor > 0.4) predictedGrade = LesionGrade.LowGrade;
  if (riskFactor > 0.7) predictedGrade = LesionGrade.HighGrade;

  // --- Grade Probabilities ---
  let normal = 0,
    low = 0,
    high = 0;
  if (predictedGrade === LesionGrade.Normal) {
    normal = 0.6 + rand(2) * 0.3;
    low = (1 - normal) * 0.7;
    high = Math.max(0, 1 - normal - low);
  } else if (predictedGrade === LesionGrade.LowGrade) {
    low = 0.5 + rand(2) * 0.3;
    normal = (1 - low) * 0.5;
    high = Math.max(0, 1 - low - normal);
  } else {
    high = 0.6 + rand(2) * 0.3;
    low = (1 - high) * 0.7;
    normal = Math.max(0, 1 - high - low);
  }

  // --- Base Metrics ---
  const length = 4.0 + rand(3) * 2.0;
  const baseDensity = predictedGrade === LesionGrade.HighGrade ? 5 : 9;
  const count = Math.floor(length * baseDensity + rand(4) * 10);
  const density = parseFloat((count / length).toFixed(1));
  const loopWidth =
    predictedGrade === LesionGrade.Normal
      ? 30 + rand(7) * 20
      : 60 + rand(7) * 40;

  // --- Independent Findings ---
  const giantCapsCount =
    predictedGrade === LesionGrade.HighGrade
      ? Math.floor(rand(5) * 5) + 1
      : 0;

  // Hemorrhages
  const numHemorrhages =
    predictedGrade !== LesionGrade.Normal
      ? Math.floor(rand(6) * 5)
      : rand(9) > 0.9
        ? 1
        : 0;

  const hemorrhageCoords: Point[] = Array.from(
    { length: numHemorrhages },
    (_, i) => ({
      x: 20 + rand(100 + i) * 60,
      y: 20 + rand(200 + i) * 60,
    })
  );

  // Crossed Capillaries
  const numCrossings =
    predictedGrade === LesionGrade.HighGrade
      ? Math.floor(rand(8) * 6) + 2
      : Math.floor(rand(8) * 2);

  const crossingCoords: Point[] = Array.from(
    { length: numCrossings },
    (_, i) => ({
      x: 20 + rand(300 + i) * 60,
      y: 20 + rand(400 + i) * 60,
    })
  );

  // --- Zone Generation ---
  const zones: ZoneData[] = ['Zone A', 'Zone B', 'Zone C', 'Zone D'].map(
    (id, idx) => {
      const zRand = rand(10 + idx);
      const zLength = length / 4;
      const zCount = Math.max(0, Math.floor(count / 4 + (zRand - 0.5) * 5));
      const zDensity = parseFloat((zCount / zLength).toFixed(1));

      const zHemo = countInZone(hemorrhageCoords, idx);
      const zCross = countInZone(crossingCoords, idx);
      const zGiant =
        Math.floor(giantCapsCount / 4) +
        (rand(50 + idx) > 0.7 && giantCapsCount > 0 ? 1 : 0);

      let contribution: 'Low' | 'Medium' | 'High' = 'Low';
      if (zGiant > 0 || zHemo > 1 || zCross > 2 || zDensity < 6)
        contribution = 'High';
      else if (zHemo > 0 || zCross > 0 || zDensity < 8)
        contribution = 'Medium';

      return {
        id,
        riskContribution: contribution,
        notes:
          contribution === 'High'
            ? 'High-risk features detected — consider targeted follow-up'
            : contribution === 'Medium'
              ? 'Moderate abnormalities — monitor in subsequent visits'
              : 'Within normal limits',
        capillaryCount: zCount,
        zoneLengthMm: parseFloat(zLength.toFixed(2)),
        localDensity: zDensity,
        giantCount: zGiant,
        hemorrhageCount: zHemo,
        crossedCount: zCross,
        meanLoopWidth: Math.floor(loopWidth + (zRand - 0.5) * 20),
      };
    }
  );

  // --- Explanation ---
  const primaryDrivers: string[] = [];
  const secondaryFindings: string[] = [];

  if (giantCapsCount > 0)
    primaryDrivers.push(`Giant capillaries detected (${giantCapsCount})`);
  if (numCrossings > 1)
    primaryDrivers.push(
      `Crossed capillary patterns detected (${numCrossings})`
    );
  if (density < 7)
    primaryDrivers.push(`Reduced capillary density (${density}/mm)`);
  if (loopWidth > 50)
    primaryDrivers.push(
      `Enlarged mean loop width (${Math.floor(loopWidth)} µm)`
    );

  if (numHemorrhages > 0)
    secondaryFindings.push(
      `Micro-hemorrhages present (${numHemorrhages})`
    );
  else secondaryFindings.push('No hemorrhages detected');

  if (primaryDrivers.length === 0)
    primaryDrivers.push('Normal capillary density', 'Regular loop architecture');

  // --- Segmentation Path ---
  const v = (val: number, off: number) =>
    val + (rand(off) - 0.5) * 40;
  const path = `M ${v(50, 500)},${v(50, 501)} Q ${v(200, 502)},${v(80, 503)} ${v(350, 504)},${v(50, 505)} T ${v(650, 506)},${v(50, 507)} V ${v(450, 508)} Q ${v(400, 509)},${v(420, 510)} ${v(200, 511)},${v(450, 512)} T ${v(50, 513)},${v(450, 514)} Z`;

  const confidence = rand(99) > 0.3 ? 'High' : 'Medium';

  return {
    imageUrl: imgUrl,
    gradeProbs: { normal, low, high },
    predictedGrade,
    confidence,
    latencyMs: Math.floor(100 + rand(600) * 200),
    metrics: {
      totalCapillaryCount: count,
      analyzedLengthMm: parseFloat(length.toFixed(2)),
      density,
      meanLoopWidth: Math.floor(loopWidth),
      tortuosityIndex: parseFloat((rand(8) * 10).toFixed(1)),
      hemorrhageCount: numHemorrhages,
      giantCapillaries: giantCapsCount,
      crossedCapillaries: numCrossings,
      avascularAreas: density < 6,
    },
    zones,
    explanation: { primaryDrivers, secondaryFindings },
    isCalibrated: true,
    isOOD: false,
    recommendedSiteCoords: {
      x: 30 + rand(700) * 40,
      y: 30 + rand(701) * 40,
    },
    segmentationPath: path,
    hemorrhageCoords,
    crossingCoords,
    segmentationQuality: {
      confidence,
      coveragePercentage: Math.floor(85 + rand(800) * 14),
      boundaryConsistency: rand(801) > 0.2 ? 'OK' : 'Review',
    },
  };
};
