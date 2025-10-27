


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
  fileInfo?: { name: string };
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

// Fix: Resolve declaration conflict by defining a global AIStudio interface
// and using it for window.aistudio. This aligns this declaration with
// other potential declarations. Also, add webkitAudioContext for browser compatibility.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }
    interface Window {
        aistudio: AIStudio;
        webkitAudioContext: typeof AudioContext;
    }
}


export interface DashboardItem {
  id: string;
  type: 'chart';
  title: string;
  data: ChartData;
}

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