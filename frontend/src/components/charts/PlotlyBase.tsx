"use client";

import dynamic from "next/dynamic";
import type { Config, Data, Layout, PlotMouseEvent } from "plotly.js";
import type { CSSProperties } from "react";

// Loaded via the small `plotly.js-dist-min` bundle + react-plotly.js's
// factory export (not the default export, which pulls in the full
// `plotly.js` package) to keep the client bundle smaller. Dynamically
// imported with ssr:false since Plotly needs the DOM.
const PlotImpl = dynamic(
  async () => {
    const [plotlyModule, factoryModule] = await Promise.all([
      import("plotly.js-dist-min"),
      import("react-plotly.js/factory"),
    ]);
    return factoryModule.default(plotlyModule.default);
  },
  { ssr: false },
);

export interface PlotlyChartProps {
  data: Data[];
  layout: Partial<Layout>;
  config?: Partial<Config>;
  style?: CSSProperties;
  className?: string;
  useResizeHandler?: boolean;
  onClick?: (event: Readonly<PlotMouseEvent>) => void;
  onHover?: (event: Readonly<PlotMouseEvent>) => void;
  onUnhover?: (event: Readonly<PlotMouseEvent>) => void;
}

export function Plot({ useResizeHandler = true, style, ...rest }: PlotlyChartProps) {
  return (
    <PlotImpl
      useResizeHandler={useResizeHandler}
      style={{ width: "100%", height: "100%", ...style }}
      {...rest}
    />
  );
}
