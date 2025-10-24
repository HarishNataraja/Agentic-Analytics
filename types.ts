export enum Agent {
  DATA_ANALYSIS = 'Data Analysis',
  DASHBOARD = 'Dashboard',
  PRESENTATION = 'Presentation',
}

interface BaseChartData {
  data: any[];
}

export interface BarChartData extends BaseChartData {
  type: 'bar';
  dataKey: string;
  nameKey: string;
}

export interface LineChartData extends BaseChartData {
  type: 'line';
  dataKey: string;
  nameKey: string;
}

export interface PieChartData extends BaseChartData {
  type: 'pie';
  dataKey: string;
  nameKey: string;
}

export interface ScatterChartData extends BaseChartData {
  type: 'scatter';
  data: { x: number; y: number; z?: number }[];
  xKey: string;
  yKey: string;
  zKey?: string; // for bubble size
  xAxisLabel: string;
  yAxisLabel: string;
}

// Boxplot data point format: { name: string, box: [min, q1, median, q3, max] }
export interface BoxPlotChartData {
  type: 'boxplot';
  data: { name: string; box: [number, number, number, number, number] }[];
  yAxisLabel: string;
}

// Heatmap data point format: { x: string, y: string, value: number }
export interface HeatmapChartData {
  type: 'heatmap';
  xLabels: string[];
  yLabels: string[];
  data: { x: string; y: string; value: number }[];
}

export type ChartData = BarChartData | LineChartData | PieChartData | ScatterChartData | BoxPlotChartData | HeatmapChartData;


export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  image?: string;
  chart?: ChartData;
  isLoading?: boolean;
  isThinking?: boolean;
  sources?: { uri: string; title: string }[];
  transcript?: { type: 'input' | 'output'; text: string };
  video?: string;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface DashboardItem {
  id: string;
  type: 'chart';
  title: string;
  data: ChartData;
}

export type SlideObjectType = 'text' | 'chart' | 'shape' | 'image';
export type SlideTransitionType = 'none' | 'fade' | 'slide-in-left' | 'slide-in-right';
export type ObjectAnimationType = 'none' | 'fade-in' | 'fly-in-up' | 'fly-in-left';


export interface TextContent {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right';
}

export interface ImageContent {
    src: string;
}

export interface ShapeContent {
    shape: 'rectangle' | 'ellipse';
    color: string;
}

export interface SlideObject {
  id: string;
  type: SlideObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: TextContent | ChartData | ShapeContent | ImageContent;
  animation?: { type: ObjectAnimationType };
}

export interface Slide {
  id: string;
  objects: SlideObject[];
  background: string;
  transition?: { type: SlideTransitionType };
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
}