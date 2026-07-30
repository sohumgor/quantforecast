// `plotly.js-dist-min` has no published types; it's the same runtime API as
// `plotly.js` (typed via @types/plotly.js) but we only ever hand this value,
// untyped, straight into react-plotly.js's factory(), whose own signature
// accepts `unknown` — so no real typing is lost here.
declare module "plotly.js-dist-min" {
  const Plotly: unknown;
  export default Plotly;
}
