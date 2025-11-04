/**
 * export all charts as named exports to match the chart type
 */
// Fix: Refactor to use a direct `export from` syntax for simplicity and to resolve module resolution errors.
// Fix: The `export { identifier as "..." } from "..."` syntax is invalid for identifiers with hyphens.
// Changed to import all modules and then use a single export statement with quoted keys for invalid identifiers.
import { area } from "./area";
import { bar } from "./bar";
import { boxplot } from "./boxplot";
import { column } from "./column";
import { districtMap } from "./district-map";
import { dualAxes } from "./dual-axes";
import { fishboneDiagram } from "./fishbone-diagram";
import { flowDiagram } from "./flow-diagram";
import { funnel } from "./funnel";
import { histogram } from "./histogram";
import { line } from "./line";
import { liquid } from "./liquid";
import { mindMap } from "./mind-map";
import { networkGraph } from "./network-graph";
import { organizationChart } from "./organization-chart";
import { pathMap } from "./path-map";
import { pie } from "./pie";
import { pinMap } from "./pin-map";
import { radar } from "./radar";
import { sankey } from "./sankey";
import { scatter } from "./scatter";
import { treemap } from "./treemap";
import { venn } from "./venn";
import { violin } from "./violin";
import { wordCloud } from "./word-cloud";

// Fix: Corrected invalid export syntax. Export names cannot be string literals.
// Using valid identifiers for named exports. Consumers will need to use these identifiers.
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
