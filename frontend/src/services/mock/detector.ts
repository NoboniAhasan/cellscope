import { AnalysisParameters, CellMeasurement, QualityWarning } from '../../types';

export interface GeneratedDetectionResult {
  measurements: CellMeasurement[];
  warnings: QualityWarning[];
  maskDataUrl: string;
}

/**
 * Calculates polygon area using the Shoelace formula (px²).
 */
export function calculateShoelaceArea(contour: Array<[number, number]>): number {
  const n = contour.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = contour[i];
    const [x2, y2] = contour[(i + 1) % n];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

/**
 * Calculates Euclidean polygon perimeter (px).
 */
export function calculatePerimeter(contour: Array<[number, number]>): number {
  const n = contour.length;
  if (n < 3) return 0;
  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = contour[i];
    const [x2, y2] = contour[(i + 1) % n];
    perimeter += Math.hypot(x2 - x1, y2 - y1);
  }
  return perimeter;
}

/**
 * Calculates isoperimetric circularity: C = 4π * Area / Perimeter².
 * Perfect circle is 1.0; elongated/irregular shapes approach 0.
 */
export function calculateCircularity(area: number, perimeter: number): number {
  if (perimeter <= 0 || area <= 0) return 0;
  const c = (4 * Math.PI * area) / (perimeter * perimeter);
  return Math.min(1.0, Math.round(c * 1000) / 1000);
}

/**
 * Calculates polygon centroid.
 */
export function calculateCentroid(contour: Array<[number, number]>): { x: number; y: number } {
  const n = contour.length;
  if (n < 3) return { x: 0, y: 0 };
  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < n; i++) {
    const [x0, y0] = contour[i];
    const [x1, y1] = contour[(i + 1) % n];
    const a = x0 * y1 - x1 * y0;
    signedArea += a;
    cx += (x0 + x1) * a;
    cy += (y0 + y1) * a;
  }

  signedArea *= 0.5;
  if (Math.abs(signedArea) < 1e-5) {
    // Fallback to average vertex
    const sumX = contour.reduce((acc, p) => acc + p[0], 0);
    const sumY = contour.reduce((acc, p) => acc + p[1], 0);
    return { x: Math.round(sumX / n), y: Math.round(sumY / n) };
  }

  cx /= 6 * signedArea;
  cy /= 6 * signedArea;
  return { x: Math.round(cx), y: Math.round(cy) };
}

/**
 * Calculates Axis-Aligned Bounding Box.
 */
export function calculateBoundingBox(contour: Array<[number, number]>): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (contour.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of contour) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return {
    x: Math.round(minX),
    y: Math.round(minY),
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  };
}

/**
 * Generates an irregular elliptical contour polygon.
 */
function generateEllipseContour(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angleRad: number,
  roughness: number,
  numPoints = 16,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const cosAngle = Math.cos(angleRad);
  const sinAngle = Math.sin(angleRad);

  for (let i = 0; i < numPoints; i++) {
    const theta = (i * 2 * Math.PI) / numPoints;
    // Add controlled roughness jitter
    const jitter = 1 + (Math.sin(i * 3) * 0.15 + (Math.random() - 0.5) * 0.1) * roughness;
    const px = rx * jitter * Math.cos(theta);
    const py = ry * jitter * Math.sin(theta);

    // Rotate and translate
    const rotX = px * cosAngle - py * sinAngle + cx;
    const rotY = px * sinAngle + py * cosAngle + cy;
    points.push([Math.round(rotX * 10) / 10, Math.round(rotY * 10) / 10]);
  }

  return points;
}

/**
 * Generates mock candidate detections respecting parameters, image dimensions, and preset.
 */
export function generateMockDetections(
  width: number,
  height: number,
  params: AnalysisParameters,
  runId: number,
): GeneratedDetectionResult {
  const measurements: CellMeasurement[] = [];
  const warnings: QualityWarning[] = [];

  // Determine target count and base dimensions based on preset and polarity
  let targetCount = 28;
  let baseRadius = 22;
  let roughness = 0.5;

  if (params.preset === 'fluorescence') {
    targetCount = params.polarity === 'bright_on_dark' ? 24 : 14;
    baseRadius = 26;
    roughness = 0.3; // rounder nuclear contours
  } else if (params.preset === 'dark_stained') {
    targetCount = params.polarity === 'dark_on_bright' ? 36 : 18;
    baseRadius = 18;
    roughness = 0.6;
  } else if (params.preset === 'low_contrast') {
    targetCount = 16;
    baseRadius = 20;
    roughness = 0.85; // more jagged, lower contrast boundaries
  }

  // Sigma reduces small fragmented count
  if (params.blurSigma > 2.5) {
    targetCount = Math.round(targetCount * 0.7);
  }

  // Generate candidate objects distributed across the canvas
  const padding = 40;
  const usableWidth = Math.max(100, width - padding * 2);
  const usableHeight = Math.max(100, height - padding * 2);

  let objectId = 1;
  const attempts = targetCount * 2;

  for (let i = 0; i < attempts && measurements.length < targetCount; i++) {
    const cx = padding + Math.random() * usableWidth;
    const cy = padding + Math.random() * usableHeight;

    // Vary size
    const sizeScale = 0.6 + Math.random() * 0.9;
    const rx = baseRadius * sizeScale;
    const ry = rx * (0.7 + Math.random() * 0.5); // some elongation
    const angle = Math.random() * Math.PI;

    const contour = generateEllipseContour(cx, cy, rx, ry, angle, roughness);
    const area = Math.round(calculateShoelaceArea(contour));

    // Filter by min/max area parameters
    if (area < params.minArea || area > params.maxArea) {
      continue;
    }

    const perimeter = Math.round(calculatePerimeter(contour) * 10) / 10;
    const circularity = calculateCircularity(area, perimeter);
    const centroid = calculateCentroid(contour);
    const bbox = calculateBoundingBox(contour);

    measurements.push({
      id: objectId++,
      runId,
      area,
      perimeter,
      circularity,
      centroid,
      bbox,
      contour,
      source: 'automated',
    });
  }

  // Derivation of post-run Quality Warnings
  if (measurements.length === 0) {
    warnings.push({
      code: 'NO_OBJECTS',
      message: 'No candidate objects were identified with current area thresholds.',
      suggestion: 'Try lowering the Min Area threshold or switching Polarity.',
      severity: 'warning',
    });
  } else if (measurements.length > 50) {
    warnings.push({
      code: 'TOO_MANY_TINY_OBJECTS',
      message: `Detected ${measurements.length} candidate objects, indicating possible over-segmentation.`,
      suggestion: 'Increase Gaussian Blur sigma or raise the Min Area filter.',
      severity: 'warning',
    });
  }

  // Create simple 1x1 black/white mask placeholder data URL
  const maskDataUrl =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="black"/></svg>';

  return {
    measurements,
    warnings,
    maskDataUrl,
  };
}
