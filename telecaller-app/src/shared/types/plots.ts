export type PlotLabelContentMode = "number" | "number+area" | "number+area+facing";

export interface PlotSetback {
  label: string;
  offsetFt: number;
}

export interface ProjectPhase {
  id: string;
  name: string;
  visible: boolean;
}

export interface ProjectPublicLayout {
  enabled: boolean;
  shareToken: string;
}

export interface ProjectEasement {
  id: string;
  points: [number, number][];
  label: string;
}

export interface Plot {
  id: string;
  number: string;
  size: string;
  rate: string;
  price: string;
  status: "available" | "sold" | "booked" | "hold" | "reserved" | "road" | "market" | "park" | string;
  points?: [number, number][];
  labelRotation?: number;
  labelOffset?: { x: number; y: number };
  phase?: string;
  setbacks?: PlotSetback[];
}

export interface EditingPlot extends Omit<Plot, "points"> {
  isNew?: boolean;
  points: [number, number][];
}

export interface ProximityItem {
  category: string;
  name: string;
  distance: string;
}

export interface CompetitorItem {
  name: string;
  advantage: string;
  pitch: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  image: string;
  totalPlots: number;
  plots: Plot[];
  googleMapLink?: string;
  customOverlay?: string;
  scaleRatio?: number;
  bgX?: number;
  bgY?: number;
  bgScale?: number;
  bgRotate?: number;
  bgOpacity?: number;
  proximity?: ProximityItem[];
  competitors?: CompetitorItem[];
  phases?: ProjectPhase[];
  publicLayout?: ProjectPublicLayout;
  easements?: ProjectEasement[];
  labelContentMode?: PlotLabelContentMode;
}
