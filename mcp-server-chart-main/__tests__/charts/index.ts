// Fix: Refactor to use a direct `export from` syntax for simplicity and to resolve module resolution errors.
// Fix: The `export { default as "..." } from "..."` syntax is invalid for identifiers with hyphens.
// Changed to import all modules and then use a single export statement with quoted keys for invalid identifiers.
import area from "./area.json";
import bar from "./bar.json";
import boxplot from "./boxplot.json";
import column from "./column.json";
import districtMap from "./district-map.json";
import dualAxes from "./dual-axes.json";
import fishboneDiagram from "./fishbone-diagram.json";
import flowDiagram from "./flow-diagram.json";
import funnel from "./funnel.json";
import histogram from "./histogram.json";
import line from "./line.json";
import liquid from "./liquid.json";
import mindMap from "./mind-map.json";
import networkGraph from "./network-graph.json";
import organizationChart from "./organization-chart.json";
import pathMap from "./path-map.json";
import pie from "./pie.json";
import pinMap from "./pin-map.json";
import radar from "./radar.json";
import sankey from "./sankey.json";
import scatter from "./scatter.json";
import treemap from "./treemap.json";
import venn from "./venn.json";
import violin from "./violin.json";
import wordCloud from "./word-cloud.json";

// Fix: Corrected invalid export syntax. Export names cannot be string literals.
// Using valid identifiers for named exports.
export {
  area,
  bar,
  boxplot,
  column,
  districtMap,
  dualAxes,
  fishboneDiagram,
  flowDiagram,
  funnel,
  histogram,
  line,
  liquid,
  mindMap,
  networkGraph,
  organizationChart,
  pathMap,
  pie,
  pinMap,
  radar,
  sankey,
  scatter,
  treemap,
  venn,
  violin,
  wordCloud,
};
