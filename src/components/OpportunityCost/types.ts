import type { UTCTimestamp } from 'lightweight-charts';

export type UsIndexKey = 'nasdaq' | 'sp500';
export type IndexKey = UsIndexKey | 'kospi' | 'ftse' | 'nikkei' | 'dax';
export type MarketIndexKey = IndexKey | 'vxus';
export type AdministrationKey = 'obama2' | 'trump1' | 'biden' | 'trump2';
export const ADMIN_KEYS: AdministrationKey[] = ['obama2', 'trump1', 'biden', 'trump2'];
export type PeerBenchmark = 'custom-basket' | 'msci-ex-us';
export type PolicyEventType = 'legislation' | 'tariff' | 'executive';

export type ViewMode = 'full' | 'current';
export type SignDirection = 'positive' | 'negative' | 'flat';

export type ProjectionBaseline =
  | 'obama2-term'
  | 'trump1-term'
  | 'biden-term'
  | 'global-peers-historical'
  | '10yr-average'
  | 'historical'
  | 'median-presidential-term';

export type MarketDataPoint = {
  date: string;
  close: number;
};

export type ChartPoint = {
  time: string;
  value: number;
};

export type ExcessReturnPoint = {
  time: UTCTimestamp;
  value: number;
  day: number;
  date: string;
};

export type AdministrationPeriod = {
  start: string;
  end: string | null;
  label: string;
  color: string;
};

export type AdministrationPeriods = Record<AdministrationKey, AdministrationPeriod>;
export type ExcessReturnSeries = Record<AdministrationKey, ExcessReturnPoint[]>;

export type ConfidenceBandEnvelope = {
  upper: ChartPoint[];
  lower: ChartPoint[];
};

export type ConfidenceBands = {
  oneSigma: ConfidenceBandEnvelope;
  twoSigma: ConfidenceBandEnvelope;
};

export type BaselineOption = {
  value: ProjectionBaseline;
  label: string;
};

export type ProjectionResult = {
  baseline: ProjectionBaseline;
  label: string;
  baselineStart: string;
  baselineEnd: string;
  dailyGrowthRate: number;
  dailyStdDev: number;
  projected: ChartPoint[];
  confidenceBands: ConfidenceBands;
};

export type IndexData = Record<IndexKey, MarketDataPoint[]>;

export type MainChartSeries = {
  actual: ChartPoint[];
  projected: ChartPoint[];
  confidenceBands: ConfidenceBands;
  globalPeers: ChartPoint[];
  globalPeersLabel: string;
  projectionLabel: string;
  fullStart: string;
  currentAdminStart: string;
  lastDate: string;
};

export type InternationalSeries = Record<IndexKey, ChartPoint[]>;

export type SummaryStats = {
  currentAdminExcessReturn: number;
  currentAdminExcessDay: number;
  currentAdminExcessDate: string;
  currentAdminExcessAnnualized: number;
  currentUsIndex: number;
  projectedUsIndex: number;
  globalPeersValue: number;
  opportunityCost: number;
  opportunityCostPct: number;
  globalGap: number;
  globalPeersLabel: string;
  projectionLabel: string;
};

export type DeficitDataPoint = {
  fiscalYear: number;
  deficitGdpPct: number;
  administration: AdministrationKey;
  isEstimate?: boolean;
};

export type SignCounts = {
  positive: number;
  negative: number;
  flat: number;
};

export type RobustnessExcessPoint = {
  usIndex: UsIndexKey;
  peerBenchmark: PeerBenchmark;
  value: number;
  date: string;
  sign: SignDirection;
};

export type BaselineSensitivityPoint = {
  baseline: ProjectionBaseline;
  label: string;
  opportunityCost: number;
  opportunityCostPct: number;
  sign: SignDirection;
};

export type RobustnessSummary = {
  excessByConfig: RobustnessExcessPoint[];
  excessSignCounts: SignCounts;
  baselineByCurrentConfig: BaselineSensitivityPoint[];
  baselineSignCounts: SignCounts;
};

export type PolicyEvent = {
  date: string;
  label: string;
  description: string;
  administration: AdministrationKey;
  type: PolicyEventType;
  fiscalImpact: string;
};

export type MarketDataResult = {
  loading: boolean;
  error: string | null;
  mainSeries: MainChartSeries | null;
  excessReturns: ExcessReturnSeries | null;
  normalizedReturns: ExcessReturnSeries | null;
  administrationPeriods: AdministrationPeriods;
  internationalSeries: InternationalSeries | null;
  summaryStats: SummaryStats | null;
  baselineDates: Record<IndexKey, string> | null;
  lastDataDates: Record<IndexKey, string> | null;
  vxusLastDate: string | null;
  deficitData: DeficitDataPoint[] | null;
  policyEvents: PolicyEvent[] | null;
  adminStartUsIndex: Record<AdministrationKey, { date: string; value: number }> | null;
  baselineOptions: BaselineOption[];
  selectedProjection: ProjectionResult | null;
  robustnessSummary: RobustnessSummary | null;
};
