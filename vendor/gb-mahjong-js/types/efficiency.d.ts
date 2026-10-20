export interface EfficiencySummary {
  shanten: number;
  acceptanceCount: number;
  acceptanceTileCount: number;
  efficiency: number;
  expectedFan: number;
  mainFans: string[];
}

export interface EfficiencyOption {
  tileId?: number;
  discardTileId?: number;
  shanten: number;
  remainingCount?: number;
  summary: EfficiencySummary;
  elapsedMs?: number;
  debug?: unknown;
}

export interface EfficiencyResult {
  shanten: number;
  isHu: boolean;
  tileCount: number;
  hand: string;
  summary?: EfficiencySummary;
  tenpai?: unknown;
  draws?: EfficiencyOption[];
  acceptance?: EfficiencyOption[];
  discards?: EfficiencyOption[];
  improvements?: unknown;
  elapsedMs: number;
  totalFan?: number;
  fanIds?: number[];
}

export interface EfficiencyOptions {
  compact?: boolean;
  fast?: boolean;
  debug?: boolean;
  allowRegression?: boolean;
  maxShanten?: number;
  shantenModes?: string[];
  exhaustedTiles?: number[];
  remainingTiles?: Record<number, number>;
}

export function analyzeHandDetailed(
  input: string | unknown,
  options?: EfficiencyOptions
): EfficiencyResult;

export function analyzeEfficiency(
  input: string | unknown,
  options?: EfficiencyOptions
): EfficiencyResult;
