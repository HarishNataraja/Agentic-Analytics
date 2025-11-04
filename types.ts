// Fix: Import React to resolve "Cannot find namespace 'React'" error for React.FC type.
import React from 'react';


export enum Agent {
  DATA_ANALYSIS = 'Data Analysis',
  DASHBOARD = 'Dashboard',
  PRESENTATION = 'Presentation',
  DATA_CONNECTIONS = 'Data Connections',
}

interface BaseChartData {
  data: any[];
}

export interface BarChartData extends BaseChartData {
  type: 'bar';
  dataKey: string;
  nameKey: string;
  aggregation?: 'sum' | 'average' | 'count';
}

export interface LineChartData extends BaseChartData {
  type: 'line';
  dataKey: string;
  nameKey: string;
  aggregation?: 'sum' | 'average' | 'count';
}

export interface PieChartData extends BaseChartData {
  type: 'pie';
  dataKey: string;
  nameKey: string;
  aggregation?: 'sum' | 'average' | 'count';
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
  fileInfo?: { name: string };
  chart?: ChartData;
  isLoading?: boolean;
  isThinking?: boolean;
  sources?: { uri: string; title: string }[];
  transcript?: { type: 'input' | 'output'; text: string };
  video?: string;
  suggestions?: string[];
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface User {
  id: string;
  email: string;
  name?: string;
}

// Fix: Resolve declaration conflict by defining a global AIStudio interface
// and using it for window.aistudio. This aligns this declaration with
// other potential declarations. Also, add webkitAudioContext for browser compatibility.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }
    // Fix: To resolve a declaration conflict, 'aistudio' is declared as a global variable
    // instead of a property on the Window interface. This makes it available on `window`
    // while avoiding modifier conflicts with other ambient declarations.
    var aistudio: AIStudio;
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}


export interface DashboardLayout {
    x: number; // grid column start
    y: number; // grid row start
    w: number; // width in grid columns
    h: number; // height in grid rows
}

interface BaseDashboardItem {
    id: string;
    title: string;
    layout: DashboardLayout;
}

export interface ChartItem extends BaseDashboardItem {
    type: 'chart';
    data: ChartData;
}

export interface KPIItem extends BaseDashboardItem {
    type: 'kpi';
    value: string;
    change?: string; // e.g., "+5.2%"
    changeType?: 'positive' | 'negative';
}

export interface TableAggregation {
    groupBy: string; // column to group by
    metrics: { // columns to calculate
        sourceColumn: string;
        operation: 'sum' | 'average' | 'count';
    }[];
}

export interface TableItem extends BaseDashboardItem {
    type: 'table';
    headers: string[];
    rows: (string | number)[][];
    aggregation?: TableAggregation;
}

export interface FilterItem extends BaseDashboardItem {
    type: 'filter';
    filterType: 'select' | 'date-range';
    options?: string[]; // for select
    column: string; // The data column this filter applies to
}

export type DashboardItem = ChartItem | KPIItem | TableItem | FilterItem;


export type SlideObjectType = 'text' | 'chart' | 'shape' | 'image' | 'icon' | 'video';

export type ObjectAnimationPreset = 'none' | 'fade-in' | 'fly-in-up' | 'fly-in-left' | 'zoom-in' | 'bounce-in' | 'flip-3d' | 'reveal-mask' | 'parallax-drift-slow' | 'parallax-drift-medium' | 'parallax-drift-fast' | 'fade-out' | 'fly-out-down' | 'fly-out-right' | 'zoom-out';
export type SlideTransitionPreset = 'none' | 'fade' | 'slide-in-left' | 'slide-in-right' | 'cube-rotate' | 'card-flip';
export type AnimationTrigger = 'on-load' | 'on-click';

export interface ObjectAnimation {
    preset: ObjectAnimationPreset;
    trigger: AnimationTrigger;
    duration: number; // in ms
    delay: number; // in ms
    loop: boolean;
}

export interface SlideTransition {
    preset: SlideTransitionPreset;
    duration: number; // in ms
}


export type ShapeType = 
    // Basic Shapes
    | 'rectangle' | 'rectangle-rounded-corners' | 'ellipse' | 'triangle' | 'right-triangle' | 'diamond' 
    | 'pentagon' | 'hexagon' | 'octagon' | 'cross' | 'ring' | 'heart' | 'smiley-face' | 'lightning-bolt'
    // Block Arrows
    | 'right-arrow' | 'left-arrow' | 'up-arrow' | 'down-arrow' | 'left-right-arrow' | 'chevron'
    // Flowchart
    | 'flowchart-process' | 'flowchart-decision' | 'flowchart-data' | 'flowchart-terminator' 
    // Stars and Banners
    | 'star-5-point' | 'star-8-point' | 'banner-up' | 'scroll-horizontal'
    // Callouts
    | 'callout-rectangle' | 'callout-cloud';


export interface Shadow {
    color: string;
    blur: number;
    x: number;
    y: number;
}

export interface Gradient {
    type: 'linear' | 'radial';
    startColor: string;
    endColor: string;
    angle: number; // Only for linear
}

export interface ImageFilters {
    brightness: number; // 0-200, default 100
    contrast: number;   // 0-200, default 100
    saturate: number;   // 0-200, default 100
    grayscale: number;  // 0-100, default 0
    sepia: number;      // 0-100, default 0
    blur: number;       // 0-20, default 0
}

export interface TextContent {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor: string; // Can be 'transparent'
  letterSpacing: number; // in px
  lineHeight: number; // multiplier, e.g., 1.5
  paragraphSpacing: number; // in px, space after paragraph
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  overflow: 'visible' | 'hidden' | 'ellipsis';
  textShadow?: Shadow;
  strokeColor: string;
  strokeWidth: number;
}

export interface ImageContent {
  src: string; // base64 data URL
  altText: string;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  objectFit: 'cover' | 'contain';
  filters: ImageFilters;
}

export interface VideoContent {
    src: string; // object URL for the video blob
    thumbnail: string; // base64 data URL for the thumbnail
}

export interface ShapeContent {
  shape: ShapeType;
  fillColor: string;
  gradient?: Gradient;
  borderColor: string;
  borderWidth: number;
  borderStyle: 'solid' | 'dashed' | 'dotted';
}

export interface IconContent {
    name: string;
    color: string;
}

export interface SlideObject {
  id: string;
  type: SlideObjectType;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  opacity: number;
  shadow?: Shadow;
  locked?: boolean;
  animation: ObjectAnimation;
  exitAnimation: ObjectAnimation | null;
  content: TextContent | ChartData | ShapeContent | ImageContent | IconContent | VideoContent;
}

export interface Slide {
  id: string;
  background: string;
  backgroundImage?: {
      src: string;
      fit: 'cover' | 'contain';
      opacity: number;
  };
  notes: string;
  transition: SlideTransition;
  objects: SlideObject[];
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
}

// Data Connections
export type DataSourceType = 'POSTGRESQL' | 'MYSQL' | 'GOOGLE_SHEETS' | 'SALESFORCE' | 'CSV' | 'EXCEL';

export interface DataConnection {
    id: string;
    name: string;
    type: DataSourceType;
    // In a real app, credentials would be handled securely and not stored in frontend state.
    // For this demo, it's just for UI purposes.
    credentials: { [key: string]: string };
    status: 'connected' | 'disconnected' | 'connecting';
    createdAt: string;
    fileContent?: string;
    transformations?: Transformation[];
}

// Data Transformations
export enum TransformationType {
    RENAME_COLUMN = 'RENAME_COLUMN',
    CHANGE_TYPE = 'CHANGE_TYPE',
    REMOVE_MISSING = 'REMOVE_MISSING',
    FILL_MISSING = 'FILL_MISSING',
    FILTER_ROWS = 'FILTER_ROWS',
}

export interface Transformation {
    id: string;
    type: TransformationType;
    payload: any; // e.g., { column: 'oldName', newName: 'newName' }
}

export interface AITransformationSuggestion {
    id: string;
    title: string;
    description: string;
    transformation: Transformation;
}

// Project Structure
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  
  // Agent-specific state
  messages: Message[];
  dataContext: string | null;

  dashboardItems: DashboardItem[];
  dashboardData: any[] | null;
  activeFilters: { [column: string]: string };

  presentation: Presentation | null;
  presentationMessages: Message[];
  presentationHistory: Presentation[];
  presentationHistoryIndex: number;
  selectedSlideId: string | null;
  selectedObjectIds: string[];

  dataConnections: DataConnection[];
}

// Editor-specific types
export interface ContextMenuItem {
  label: string;
  icon: React.FC<{ className?: string }>;
  action: () => void;
  disabled?: boolean;
  isSeparator?: boolean;
  shortcut?: string;
}