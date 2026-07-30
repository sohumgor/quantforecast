export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Builds a Plotly colorscale with hard step boundaries (rather than a smooth
 * gradient) for `n` discrete categories, so a heatmap trace can encode
 * categorical identity instead of magnitude.
 */
export function buildDiscreteColorscale(colors: string[]): [number, string][] {
  const n = colors.length;
  const stops: [number, string][] = [];
  colors.forEach((color, i) => {
    stops.push([i / n, color]);
    stops.push([(i + 1) / n, color]);
  });
  return stops;
}
