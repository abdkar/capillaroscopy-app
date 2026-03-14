import { AnalysisResult, LesionGrade, SclerodermaPattern, ZoneData, Point } from './types';

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

/**
 * Recalculate zone-level counts, risk contributions, and explanation text
 * from the current coordinate arrays. Called after every manual HITL edit.
 */
export const recalculateFromCoords = (prev: AnalysisResult): AnalysisResult => {
  const r = { ...prev };

  // Recalculate global metrics from coordinate array lengths
  const metrics = {
    ...r.metrics,
    hemorrhageCount: r.hemorrhageCoords.length,
    crossedCapillaries: r.crossingCoords.length,
    giantCapillaries: r.giantCoords.length,
    ramifiedCapillaries: r.ramifiedCoords.length,
    dilatedCapillaries: r.dilatedCoords.length,
    avascularAreas: r.avascularCoords.length > 0,
  };

  // Recalculate per-zone counts
  const zones: ZoneData[] = r.zones.map((z, idx) => {
    const zHemo = countInZone(r.hemorrhageCoords, idx);
    const zCross = countInZone(r.crossingCoords, idx);
    const zGiant = countInZone(r.giantCoords, idx);
    const zRamified = countInZone(r.ramifiedCoords, idx);
    const zDilated = countInZone(r.dilatedCoords, idx);

    let contribution: 'Low' | 'Medium' | 'High' = 'Low';
    if (zGiant > 0 || zHemo > 1 || zCross > 2 || z.localDensity < 6)
      contribution = 'High';
    else if (zHemo > 0 || zCross > 0 || zRamified > 0 || zDilated > 0 || z.localDensity < 8)
      contribution = 'Medium';

    return {
      ...z,
      hemorrhageCount: zHemo,
      crossedCount: zCross,
      giantCount: zGiant,
      ramifiedCount: zRamified,
      dilatedCount: zDilated,
      riskContribution: contribution,
      notes:
        contribution === 'High'
          ? 'High-risk features detected — consider targeted follow-up'
          : contribution === 'Medium'
            ? 'Moderate abnormalities — monitor in subsequent visits'
            : 'Within normal limits',
    };
  });

  // Rebuild explanation from current metrics
  const primaryDrivers: string[] = [];
  const secondaryFindings: string[] = [];

  if (metrics.giantCapillaries > 0)
    primaryDrivers.push(`Giant capillaries detected (${metrics.giantCapillaries})`);
  if (metrics.crossedCapillaries > 1)
    primaryDrivers.push(`Crossed capillary patterns (${metrics.crossedCapillaries})`);
  if (metrics.density < 7)
    primaryDrivers.push(`Reduced capillary density (${metrics.density}/mm)`);
  if (metrics.meanLoopWidth > 50)
    primaryDrivers.push(`Enlarged mean loop width (${metrics.meanLoopWidth} µm)`);
  if (metrics.ramifiedCapillaries > 0)
    primaryDrivers.push(`Ramified/branched capillaries (${metrics.ramifiedCapillaries})`);
  if (metrics.dilatedCapillaries > 0)
    primaryDrivers.push(`Dilated capillaries (${metrics.dilatedCapillaries})`);
  if (metrics.avascularAreas)
    primaryDrivers.push('Avascular areas detected');

  if (metrics.hemorrhageCount > 0)
    secondaryFindings.push(`Micro-hemorrhages present (${metrics.hemorrhageCount})`);
  else secondaryFindings.push('No hemorrhages detected');

  if (r.sclerodermaPattern !== SclerodermaPattern.None)
    secondaryFindings.push(`Scleroderma: ${r.sclerodermaPattern}`);

  if (primaryDrivers.length === 0)
    primaryDrivers.push('Normal capillary density', 'Regular loop architecture');

  return {
    ...r,
    metrics,
    zones,
    explanation: { primaryDrivers, secondaryFindings },
  };
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

  // --- Hemorrhages ---
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

  // --- Crossed Capillaries ---
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

  // --- Giant Capillaries ---
  const numGiant =
    predictedGrade === LesionGrade.HighGrade
      ? Math.floor(rand(5) * 5) + 1
      : 0;

  const giantCoords: Point[] = Array.from(
    { length: numGiant },
    (_, i) => ({
      x: 15 + rand(1100 + i) * 70,
      y: 15 + rand(1200 + i) * 70,
    })
  );

  // --- Ramified / Branched ---
  const numRamified =
    predictedGrade !== LesionGrade.Normal ? Math.floor(rand(1300) * 3) : 0;

  const ramifiedCoords: Point[] = Array.from(
    { length: numRamified },
    (_, i) => ({
      x: 15 + rand(1400 + i) * 70,
      y: 15 + rand(1500 + i) * 70,
    })
  );

  // --- Dilated ---
  const numDilated =
    predictedGrade !== LesionGrade.Normal ? Math.floor(rand(1600) * 4) : 0;

  const dilatedCoords: Point[] = Array.from(
    { length: numDilated },
    (_, i) => ({
      x: 15 + rand(1700 + i) * 70,
      y: 15 + rand(1800 + i) * 70,
    })
  );

  // --- Avascular Areas (point-based) ---
  const numAvascular = density < 6 ? Math.floor(rand(1900) * 2) + 1 : 0;

  const avascularCoords: Point[] = Array.from(
    { length: numAvascular },
    (_, i) => ({
      x: 10 + rand(2000 + i) * 80,
      y: 10 + rand(2100 + i) * 80,
    })
  );

  // --- Tortuosity ---
  const tortuosityIndex = parseFloat((rand(8) * 10).toFixed(1));
  const numTortuosity = tortuosityIndex > 5 ? Math.floor(rand(2200) * 3) + 1 : 0;

  const tortuosityCoords: Point[] = Array.from(
    { length: numTortuosity },
    (_, i) => ({
      x: 15 + rand(2300 + i) * 70,
      y: 15 + rand(2400 + i) * 70,
    })
  );

  // --- Scleroderma Pattern ---
  let sclerodermaPattern = SclerodermaPattern.None;
  if (predictedGrade === LesionGrade.HighGrade) {
    const sp = rand(2500);
    sclerodermaPattern = sp > 0.6 ? SclerodermaPattern.Late : SclerodermaPattern.Active;
  } else if (predictedGrade === LesionGrade.LowGrade && rand(2501) > 0.5) {
    sclerodermaPattern = SclerodermaPattern.Early;
  }

  // --- Zone Generation ---
  const zones: ZoneData[] = ['Zone A', 'Zone B', 'Zone C', 'Zone D'].map(
    (id, idx) => {
      const zRand = rand(10 + idx);
      const zLength = length / 4;
      const zCount = Math.max(0, Math.floor(count / 4 + (zRand - 0.5) * 5));
      const zDensity = parseFloat((zCount / zLength).toFixed(1));

      const zHemo = countInZone(hemorrhageCoords, idx);
      const zCross = countInZone(crossingCoords, idx);
      const zGiant = countInZone(giantCoords, idx);
      const zRamified = countInZone(ramifiedCoords, idx);
      const zDilated = countInZone(dilatedCoords, idx);

      let contribution: 'Low' | 'Medium' | 'High' = 'Low';
      if (zGiant > 0 || zHemo > 1 || zCross > 2 || zDensity < 6)
        contribution = 'High';
      else if (zHemo > 0 || zCross > 0 || zRamified > 0 || zDilated > 0 || zDensity < 8)
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
        ramifiedCount: zRamified,
        dilatedCount: zDilated,
      };
    }
  );

  // --- Explanation ---
  const primaryDrivers: string[] = [];
  const secondaryFindings: string[] = [];

  if (numGiant > 0) primaryDrivers.push(`Giant capillaries detected (${numGiant})`);
  if (numCrossings > 1) primaryDrivers.push(`Crossed capillary patterns detected (${numCrossings})`);
  if (density < 7) primaryDrivers.push(`Reduced capillary density (${density}/mm)`);
  if (loopWidth > 50) primaryDrivers.push(`Enlarged mean loop width (${Math.floor(loopWidth)} µm)`);
  if (numRamified > 0) primaryDrivers.push(`Ramified/branched capillaries (${numRamified})`);
  if (numDilated > 0) primaryDrivers.push(`Dilated capillaries (${numDilated})`);
  if (numAvascular > 0) primaryDrivers.push('Avascular areas detected');

  if (numHemorrhages > 0) secondaryFindings.push(`Micro-hemorrhages present (${numHemorrhages})`);
  else secondaryFindings.push('No hemorrhages detected');

  if (sclerodermaPattern !== SclerodermaPattern.None)
    secondaryFindings.push(`Scleroderma: ${sclerodermaPattern}`);

  if (primaryDrivers.length === 0)
    primaryDrivers.push('Normal capillary density', 'Regular loop architecture');

  // --- Segmentation Path ---
  const v = (val: number, off: number) => val + (rand(off) - 0.5) * 40;
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
      tortuosityIndex,
      hemorrhageCount: numHemorrhages,
      giantCapillaries: numGiant,
      crossedCapillaries: numCrossings,
      avascularAreas: numAvascular > 0,
      ramifiedCapillaries: numRamified,
      dilatedCapillaries: numDilated,
      subpapillaryVenousPlexus: predictedGrade === LesionGrade.HighGrade && rand(2600) > 0.5,
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
    giantCoords,
    ramifiedCoords,
    avascularCoords,
    dilatedCoords,
    tortuosityCoords,
    sclerodermaPattern,
    segmentationQuality: {
      confidence,
      coveragePercentage: Math.floor(85 + rand(800) * 14),
      boundaryConsistency: rand(801) > 0.2 ? 'OK' : 'Review',
    },
  };
};
