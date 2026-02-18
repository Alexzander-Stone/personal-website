import { useEffect, useMemo, useState } from 'react';
import { EXCESS_TIME_BASE, SECONDS_PER_DAY } from './chart-utils';
import {
  ADMIN_KEYS,
  type AdministrationKey,
  type AdministrationPeriods,
  type BaselineSensitivityPoint,
  type BaselineOption,
  type ChartPoint,
  type ConfidenceBands,
  type DeficitDataPoint,
  type ExcessReturnPoint,
  type ExcessReturnSeries,
  type IndexKey,
  type InternationalSeries,
  type MainChartSeries,
  type MarketDataPoint,
  type MarketDataResult,
  type MarketIndexKey,
  type PeerBenchmark,
  type PolicyEvent,
  type ProjectionBaseline,
  type ProjectionResult,
  type RobustnessExcessPoint,
  type RobustnessSummary,
  type SignCounts,
  type SignDirection,
  type SummaryStats,
  type UsIndexKey,
} from './types';

const FULL_VIEW_START_DATE = '2021-01-20';
const CURRENT_ADMIN_START_DATE = '2025-01-20';
const TEN_YEAR_START_DATE = '2015-01-20';
const HISTORICAL_PEERS_START_DATE = '2013-01-20';
const HISTORICAL_ANNUAL_RETURN = 0.105;
const TRADING_DAYS_PER_YEAR = 252;
const US_INDEX_KEYS: UsIndexKey[] = ['nasdaq', 'sp500', 'djia'];
const PEER_BENCHMARK_KEYS: PeerBenchmark[] = ['custom-basket', 'msci-ex-us'];
const PEER_KEYS = ['kospi', 'ftse', 'nikkei', 'dax'] as const;
type PeerKey = (typeof PEER_KEYS)[number];
const CORE_INDEX_KEYS: IndexKey[] = ['nasdaq', 'sp500', 'djia', 'kospi', 'ftse', 'nikkei', 'dax'];
const MARKET_INDEX_KEYS: MarketIndexKey[] = [...CORE_INDEX_KEYS, 'vxus'];
const DEFICIT_DATA_URL = '/data/deficit/deficit-gdp.json';
const POLICY_EVENTS_URL = '/data/policy/events.json';
const DATA_LOAD_TIMEOUT_MS = 15000;

const DATA_URLS: Record<MarketIndexKey, string> = {
  nasdaq: '/data/market/nasdaq.json',
  sp500: '/data/market/sp500.json',
  djia: '/data/market/djia.json',
  kospi: '/data/market/kospi.json',
  ftse: '/data/market/ftse.json',
  nikkei: '/data/market/nikkei.json',
  dax: '/data/market/dax.json',
  vxus: '/data/market/vxus.json',
};

const ADMIN_PERIODS: AdministrationPeriods = {
  obama2: {
    start: '2013-01-20',
    end: '2017-01-20',
    label: 'Obama 2nd term',
    color: '#8b5cf6',
  },
  trump1: {
    start: '2017-01-20',
    end: '2021-01-20',
    label: 'Trump 1st term',
    color: '#f59e0b',
  },
  biden: {
    start: '2021-01-20',
    end: '2025-01-20',
    label: 'Biden',
    color: '#3b82f6',
  },
  trump2: {
    start: '2025-01-20',
    end: null,
    label: 'Trump 2nd term',
    color: '#ef4444',
  },
};

const PROJECTION_LABELS: Record<ProjectionBaseline, string> = {
  'obama2-term': 'Obama 2nd term rate',
  'trump1-term': 'Trump 1st term rate',
  'biden-term': 'Biden term rate',
  'global-peers-historical': 'Global peers historical average (since 2013)',
  '10yr-average': '10-year trend',
  historical: 'Historical average (10.5%)',
  'median-presidential-term': 'Median presidential term (n=3)',
};

const BASELINE_OPTIONS: BaselineOption[] = [
  { value: 'historical', label: PROJECTION_LABELS.historical },
  { value: 'median-presidential-term', label: PROJECTION_LABELS['median-presidential-term'] },
  { value: 'global-peers-historical', label: PROJECTION_LABELS['global-peers-historical'] },
  { value: 'obama2-term', label: PROJECTION_LABELS['obama2-term'] },
  { value: 'trump1-term', label: PROJECTION_LABELS['trump1-term'] },
  { value: 'biden-term', label: PROJECTION_LABELS['biden-term'] },
  { value: '10yr-average', label: PROJECTION_LABELS['10yr-average'] },
];

const PROJECTION_BASELINES: ProjectionBaseline[] = [
  'historical',
  'median-presidential-term',
  'global-peers-historical',
  'obama2-term',
  'trump1-term',
  'biden-term',
  '10yr-average',
];

const TERM_BASELINE_TO_ADMIN: Record<
  Extract<ProjectionBaseline, 'obama2-term' | 'trump1-term' | 'biden-term'>,
  AdministrationKey
> = {
  'obama2-term': 'obama2',
  'trump1-term': 'trump1',
  'biden-term': 'biden',
};

const PEER_BENCHMARK_LABELS: Record<PeerBenchmark, string> = {
  'custom-basket': 'Global peers (custom basket)',
  'msci-ex-us': 'MSCI World ex-US proxy (VXUS)',
};

type MarketIndexData = Record<MarketIndexKey, MarketDataPoint[]>;

function normalizeData(points: MarketDataPoint[]): MarketDataPoint[] {
  return points
    .filter((point) => Number.isFinite(point.close) && typeof point.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeDeficitData(points: DeficitDataPoint[]): DeficitDataPoint[] {
  return points
    .filter(
      (point) =>
        Number.isFinite(point.fiscalYear) &&
        Number.isFinite(point.deficitGdpPct) &&
        ADMIN_KEYS.includes(point.administration)
    )
    .sort((left, right) => left.fiscalYear - right.fiscalYear);
}

function normalizePolicyEvents(events: PolicyEvent[]): PolicyEvent[] {
  const allowedTypes = new Set(['legislation', 'tariff', 'executive']);

  return events
    .filter(
      (event) =>
        typeof event.date === 'string' &&
        typeof event.label === 'string' &&
        typeof event.description === 'string' &&
        typeof event.fiscalImpact === 'string' &&
        ADMIN_KEYS.includes(event.administration) &&
        allowedTypes.has(event.type)
    )
    .sort((left, right) => left.date.localeCompare(right.date));
}

function toChartSeries(points: MarketDataPoint[]): ChartPoint[] {
  return points.map((point) => ({ time: point.date, value: point.close }));
}

function getAnchorPoint(points: MarketDataPoint[], targetDate: string): MarketDataPoint {
  const exact = points.find((point) => point.date === targetDate);
  if (exact) {
    return exact;
  }

  const next = points.find((point) => point.date > targetDate);
  if (next) {
    return next;
  }

  const previous = [...points].reverse().find((point) => point.date < targetDate);
  if (previous) {
    return previous;
  }

  throw new Error(`Unable to find anchor point near ${targetDate}`);
}

function findMarketPointAtOrBeforeDate(points: MarketDataPoint[], targetDate: string): MarketDataPoint | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point && point.date <= targetDate) {
      return point;
    }
  }

  return null;
}

function buildCompoundedSeries(dates: string[], startValue: number, dailyRate: number): ChartPoint[] {
  return dates.map((date, index) => ({
    time: date,
    value: startValue * Math.pow(1 + dailyRate, index),
  }));
}

function buildConfidenceBands(
  dates: string[],
  startValue: number,
  dailyLogRate: number,
  dailyStdDev: number
): ConfidenceBands {
  return dates.reduce<ConfidenceBands>(
    (acc, date, index) => {
      const drift = (dailyLogRate - (dailyStdDev * dailyStdDev) / 2) * index;
      const diffusion = dailyStdDev * Math.sqrt(index);

      acc.oneSigma.upper.push({ time: date, value: startValue * Math.exp(drift + diffusion) });
      acc.oneSigma.lower.push({ time: date, value: startValue * Math.exp(drift - diffusion) });
      acc.twoSigma.upper.push({ time: date, value: startValue * Math.exp(drift + 2 * diffusion) });
      acc.twoSigma.lower.push({ time: date, value: startValue * Math.exp(drift - 2 * diffusion) });

      return acc;
    },
    {
      oneSigma: { upper: [], lower: [] },
      twoSigma: { upper: [], lower: [] },
    }
  );
}

function buildPercentSeries(points: MarketDataPoint[], anchor: MarketDataPoint): ChartPoint[] {
  return points
    .filter((point) => point.date >= anchor.date)
    .map((point) => ({
      time: point.date,
      value: ((point.close / anchor.close) - 1) * 100,
    }));
}

function computeLogReturnStdDev(points: MarketDataPoint[]): number {
  const returns: number[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]?.close;
    const current = points[index]?.close;

    if (typeof previous !== 'number' || typeof current !== 'number' || previous <= 0 || current <= 0) {
      continue;
    }

    returns.push(Math.log(current / previous));
  }

  if (returns.length < 2) {
    return 0;
  }

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (returns.length - 1);

  return Math.sqrt(variance);
}

function findValueAtOrBeforeDate(series: ChartPoint[], targetDate: string): number {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const point = series[index];
    if (point && point.time <= targetDate) {
      return point.value;
    }
  }

  throw new Error(`Unable to find series value on or before ${targetDate}`);
}

function getSignDirection(value: number): SignDirection {
  if (value > 0) {
    return 'positive';
  }

  if (value < 0) {
    return 'negative';
  }

  return 'flat';
}

function countSigns(values: SignDirection[]): SignCounts {
  return values.reduce<SignCounts>(
    (acc, direction) => {
      acc[direction] += 1;
      return acc;
    },
    { positive: 0, negative: 0, flat: 0 }
  );
}

function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error('Cannot compute median of empty collection.');
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function computeMedianPresidentialDailyRate(
  usSeries: MarketDataPoint[],
  projectionAnchor: MarketDataPoint
): { dailyRate: number; baselineStart: MarketDataPoint; baselineWindow: MarketDataPoint[] } {
  const completeTerms = ADMIN_KEYS.filter((key) => {
    const period = ADMIN_PERIODS[key];
    return Boolean(period.end && period.end <= projectionAnchor.date);
  });

  const annualizedReturns = completeTerms.map((key) => {
    const period = ADMIN_PERIODS[key];
    const start = getAnchorPoint(usSeries, period.start);
    const end = getAnchorPoint(usSeries, period.end as string);
    const window = usSeries.filter((point) => point.date >= start.date && point.date <= end.date);
    const tradingDayCount = Math.max(1, window.length - 1);

    return Math.pow(end.close / start.close, TRADING_DAYS_PER_YEAR / tradingDayCount) - 1;
  });

  if (annualizedReturns.length === 0) {
    const fallbackStart = getAnchorPoint(usSeries, TEN_YEAR_START_DATE);
    const fallbackWindow = usSeries.filter(
      (point) => point.date >= fallbackStart.date && point.date <= projectionAnchor.date
    );
    const fallbackDailyRate = Math.pow(1 + HISTORICAL_ANNUAL_RETURN, 1 / TRADING_DAYS_PER_YEAR) - 1;

    return {
      dailyRate: fallbackDailyRate,
      baselineStart: fallbackStart,
      baselineWindow: fallbackWindow,
    };
  }

  const medianAnnualRate = median(annualizedReturns);
  const baselineStart = getAnchorPoint(usSeries, ADMIN_PERIODS[completeTerms[0]].start);
  const baselineWindow = usSeries.filter(
    (point) => point.date >= baselineStart.date && point.date <= projectionAnchor.date
  );

  return {
    dailyRate: Math.pow(1 + medianAnnualRate, 1 / TRADING_DAYS_PER_YEAR) - 1,
    baselineStart,
    baselineWindow,
  };
}

function computeAdministrationTermRate(
  adminKey: AdministrationKey,
  usSeries: MarketDataPoint[],
  projectionAnchor: MarketDataPoint
): { dailyRate: number; baselineStart: MarketDataPoint; baselineWindow: MarketDataPoint[] } {
  const period = ADMIN_PERIODS[adminKey];
  if (!period.end) {
    throw new Error(`${period.label} is incomplete and cannot be used as a baseline.`);
  }

  const termEndDate = period.end <= projectionAnchor.date ? period.end : projectionAnchor.date;
  const baselineStart = getAnchorPoint(usSeries, period.start);
  const baselineEnd = getAnchorPoint(usSeries, termEndDate);
  const baselineWindow = usSeries.filter(
    (point) => point.date >= baselineStart.date && point.date <= baselineEnd.date
  );
  const tradingDayCount = Math.max(1, baselineWindow.length - 1);
  const dailyRate = Math.pow(baselineEnd.close / baselineStart.close, 1 / tradingDayCount) - 1;

  return {
    dailyRate,
    baselineStart,
    baselineWindow,
  };
}

function computeProjection(
  baseline: ProjectionBaseline,
  indexData: MarketIndexData,
  peerBenchmark: PeerBenchmark,
  usSeries: MarketDataPoint[],
  projectionAnchor: MarketDataPoint,
  projectionDates: string[]
): ProjectionResult {
  const defaultWindow = usSeries.filter(
    (point) => point.date >= projectionAnchor.date && point.date <= projectionAnchor.date
  );

  let baselineStart = projectionAnchor;
  let baselineWindow = defaultWindow;
  let dailyGrowthRate = 0;

  if (baseline === 'historical') {
    baselineStart = getAnchorPoint(usSeries, TEN_YEAR_START_DATE);
    baselineWindow = usSeries.filter(
      (point) => point.date >= baselineStart.date && point.date <= projectionAnchor.date
    );
    dailyGrowthRate = Math.pow(1 + HISTORICAL_ANNUAL_RETURN, 1 / TRADING_DAYS_PER_YEAR) - 1;
  } else if (baseline === 'median-presidential-term') {
    const result = computeMedianPresidentialDailyRate(usSeries, projectionAnchor);
    baselineStart = result.baselineStart;
    baselineWindow = result.baselineWindow;
    dailyGrowthRate = result.dailyRate;
  } else if (baseline === 'global-peers-historical') {
    const result = computeGlobalPeersHistoricalDailyRate(indexData, peerBenchmark, projectionAnchor);
    baselineStart = result.baselineStart;
    baselineWindow = result.baselineWindow;
    dailyGrowthRate = result.dailyRate;
  } else if (baseline === '10yr-average') {
    baselineStart = getAnchorPoint(usSeries, TEN_YEAR_START_DATE);
    baselineWindow = usSeries.filter(
      (point) => point.date >= baselineStart.date && point.date <= projectionAnchor.date
    );

    const tradingDayCount = Math.max(1, baselineWindow.length - 1);
    dailyGrowthRate = Math.pow(projectionAnchor.close / baselineStart.close, 1 / tradingDayCount) - 1;
  } else {
    const result = computeAdministrationTermRate(TERM_BASELINE_TO_ADMIN[baseline], usSeries, projectionAnchor);
    baselineStart = result.baselineStart;
    baselineWindow = result.baselineWindow;
    dailyGrowthRate = result.dailyRate;
  }

  const projected = buildCompoundedSeries(projectionDates, projectionAnchor.close, dailyGrowthRate);
  const dailyLogRate = Math.log(1 + dailyGrowthRate);
  const dailyStdDev = computeLogReturnStdDev(baselineWindow);
  const confidenceBands = buildConfidenceBands(projectionDates, projectionAnchor.close, dailyLogRate, dailyStdDev);

  return {
    baseline,
    label: PROJECTION_LABELS[baseline],
    baselineStart: baselineStart.date,
    baselineEnd: projectionAnchor.date,
    dailyGrowthRate,
    dailyStdDev,
    projected,
    confidenceBands,
  };
}

function computeCustomBasketNormalizedSeries(
  indexData: MarketIndexData,
  startDate: string,
  anchorValue: number
): ChartPoint[] {
  const peerAnchors = PEER_KEYS.reduce<Record<PeerKey, MarketDataPoint>>(
    (acc, key) => {
      acc[key] = getAnchorPoint(indexData[key], startDate);
      return acc;
    },
    {
      kospi: { date: startDate, close: anchorValue },
      ftse: { date: startDate, close: anchorValue },
      nikkei: { date: startDate, close: anchorValue },
      dax: { date: startDate, close: anchorValue },
    }
  );

  const commonStartDate = PEER_KEYS.reduce((latest, key) => {
    const anchorDate = peerAnchors[key].date;
    return anchorDate > latest ? anchorDate : latest;
  }, peerAnchors[PEER_KEYS[0]].date);

  const peerSeriesByKey = PEER_KEYS.reduce<Record<PeerKey, MarketDataPoint[]>>(
    (acc, key) => {
      acc[key] = indexData[key].filter((point) => point.date >= commonStartDate);
      return acc;
    },
    {
      kospi: [],
      ftse: [],
      nikkei: [],
      dax: [],
    }
  );

  const dateSet = new Set<string>();
  PEER_KEYS.forEach((key) => {
    peerSeriesByKey[key].forEach((point) => dateSet.add(point.date));
  });

  const dates = [...dateSet].sort((left, right) => left.localeCompare(right));
  const cursors = PEER_KEYS.reduce<Record<PeerKey, number>>(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {
      kospi: 0,
      ftse: 0,
      nikkei: 0,
      dax: 0,
    }
  );

  const lastKnownNormalized = PEER_KEYS.reduce<Record<PeerKey, number>>(
    (acc, key) => {
      acc[key] = anchorValue;
      return acc;
    },
    {
      kospi: anchorValue,
      ftse: anchorValue,
      nikkei: anchorValue,
      dax: anchorValue,
    }
  );

  return dates.map((date) => {
    const values = PEER_KEYS.map((key) => {
      const points = peerSeriesByKey[key];
      let cursor = cursors[key];
      while (cursor < points.length && points[cursor].date <= date) {
        const point = points[cursor];
        const anchor = peerAnchors[key];
        lastKnownNormalized[key] = (point.close / anchor.close) * anchorValue;
        cursor += 1;
      }

      cursors[key] = cursor;
      return lastKnownNormalized[key];
    });

    return {
      time: date,
      value: values.reduce((sum, value) => sum + value, 0) / values.length,
    };
  });
}

function computeVxusNormalizedSeries(
  indexData: MarketIndexData,
  startDate: string,
  anchorValue: number
): ChartPoint[] {
  const vxusAnchor = getAnchorPoint(indexData.vxus, startDate);

  return indexData.vxus
    .filter((point) => point.date >= vxusAnchor.date)
    .map((point) => ({
      time: point.date,
      value: (point.close / vxusAnchor.close) * anchorValue,
    }));
}

function computeCustomBasketGlobalPeersSeries(indexData: MarketIndexData, usAnchor: MarketDataPoint): ChartPoint[] {
  return computeCustomBasketNormalizedSeries(indexData, CURRENT_ADMIN_START_DATE, usAnchor.close);
}

function computeVxusGlobalPeersSeries(indexData: MarketIndexData, usAnchor: MarketDataPoint): ChartPoint[] {
  return computeVxusNormalizedSeries(indexData, CURRENT_ADMIN_START_DATE, usAnchor.close);
}

function computeGlobalPeersHistoricalDailyRate(
  indexData: MarketIndexData,
  peerBenchmark: PeerBenchmark,
  projectionAnchor: MarketDataPoint
): { dailyRate: number; baselineStart: MarketDataPoint; baselineWindow: MarketDataPoint[] } {
  const anchorValue = 100;
  const peersSeries =
    peerBenchmark === 'msci-ex-us'
      ? computeVxusNormalizedSeries(indexData, HISTORICAL_PEERS_START_DATE, anchorValue)
      : computeCustomBasketNormalizedSeries(indexData, HISTORICAL_PEERS_START_DATE, anchorValue);

  const boundedWindow = peersSeries
    .filter((point) => point.time <= projectionAnchor.date)
    .map((point) => ({ date: point.time, close: point.value }));

  if (boundedWindow.length < 2) {
    throw new Error('Insufficient historical peer data for global-peers-historical baseline.');
  }

  const baselineStart = boundedWindow[0];
  const baselineEnd = boundedWindow[boundedWindow.length - 1];
  const tradingDayCount = Math.max(1, boundedWindow.length - 1);
  const dailyRate = Math.pow(baselineEnd.close / baselineStart.close, 1 / tradingDayCount) - 1;

  return {
    dailyRate,
    baselineStart,
    baselineWindow: boundedWindow,
  };
}

function computeGlobalPeersSeries(
  indexData: MarketIndexData,
  usAnchor: MarketDataPoint,
  peerBenchmark: PeerBenchmark
): { series: ChartPoint[]; label: string } {
  if (peerBenchmark === 'msci-ex-us') {
    return {
      series: computeVxusGlobalPeersSeries(indexData, usAnchor),
      label: PEER_BENCHMARK_LABELS['msci-ex-us'],
    };
  }

  return {
    series: computeCustomBasketGlobalPeersSeries(indexData, usAnchor),
    label: PEER_BENCHMARK_LABELS['custom-basket'],
  };
}

function computeCustomBasketExcessReturn(
  indexData: MarketIndexData,
  usIndex: UsIndexKey,
  adminStart: string,
  adminEnd: string | null
): ExcessReturnPoint[] {
  const usSeries = indexData[usIndex];

  const initialUsAnchor = getAnchorPoint(usSeries, adminStart);
  const initialPeerAnchors = PEER_KEYS.map((key) => getAnchorPoint(indexData[key], adminStart));

  const commonStartDate = [initialUsAnchor.date, ...initialPeerAnchors.map((point) => point.date)].reduce(
    (latest, date) => (date > latest ? date : latest)
  );

  const usAnchor = getAnchorPoint(usSeries, commonStartDate);
  const peerAnchors = PEER_KEYS.reduce<Record<PeerKey, MarketDataPoint>>(
    (acc, key) => {
      acc[key] = getAnchorPoint(indexData[key], commonStartDate);
      return acc;
    },
    {
      kospi: usAnchor,
      ftse: usAnchor,
      nikkei: usAnchor,
      dax: usAnchor,
    }
  );

  const adminUsSeries = usSeries.filter(
    (point) => point.date >= usAnchor.date && (!adminEnd || point.date <= adminEnd)
  );

  return adminUsSeries.reduce<ExcessReturnPoint[]>((acc, point) => {
    const peerReturns: number[] = [];

    for (const key of PEER_KEYS) {
      const peerPoint = findMarketPointAtOrBeforeDate(indexData[key], point.date);
      const peerAnchor = peerAnchors[key];

      if (!peerPoint || peerPoint.date < peerAnchor.date) {
        return acc;
      }

      peerReturns.push(peerPoint.close / peerAnchor.close - 1);
    }

    if (peerReturns.length !== PEER_KEYS.length) {
      return acc;
    }

    const day = acc.length;
    const usReturn = point.close / usAnchor.close - 1;
    const peersReturn = peerReturns.reduce((sum, value) => sum + value, 0) / peerReturns.length;

    acc.push({
      day,
      date: point.date,
      time: (EXCESS_TIME_BASE + day * SECONDS_PER_DAY) as ExcessReturnPoint['time'],
      value: (usReturn - peersReturn) * 100,
    });

    return acc;
  }, []);
}

function computeVxusExcessReturn(
  indexData: MarketIndexData,
  usIndex: UsIndexKey,
  adminStart: string,
  adminEnd: string | null
): ExcessReturnPoint[] {
  const usSeries = indexData[usIndex];
  const vxus = indexData.vxus;

  const initialUsAnchor = getAnchorPoint(usSeries, adminStart);
  const initialVxusAnchor = getAnchorPoint(vxus, adminStart);
  const commonStartDate = initialUsAnchor.date > initialVxusAnchor.date ? initialUsAnchor.date : initialVxusAnchor.date;

  const usAnchor = getAnchorPoint(usSeries, commonStartDate);
  const vxusAnchor = getAnchorPoint(vxus, commonStartDate);

  const adminUsSeries = usSeries.filter(
    (point) => point.date >= usAnchor.date && (!adminEnd || point.date <= adminEnd)
  );

  return adminUsSeries.reduce<ExcessReturnPoint[]>((acc, point) => {
    const vxusPoint = findMarketPointAtOrBeforeDate(vxus, point.date);
    if (!vxusPoint || vxusPoint.date < vxusAnchor.date) {
      return acc;
    }

    const day = acc.length;
    const usReturn = point.close / usAnchor.close - 1;
    const peersReturn = vxusPoint.close / vxusAnchor.close - 1;

    acc.push({
      day,
      date: point.date,
      time: (EXCESS_TIME_BASE + day * SECONDS_PER_DAY) as ExcessReturnPoint['time'],
      value: (usReturn - peersReturn) * 100,
    });

    return acc;
  }, []);
}

function computeExcessReturn(
  indexData: MarketIndexData,
  usIndex: UsIndexKey,
  adminStart: string,
  adminEnd: string | null,
  peerBenchmark: PeerBenchmark
): ExcessReturnPoint[] {
  if (peerBenchmark === 'msci-ex-us') {
    return computeVxusExcessReturn(indexData, usIndex, adminStart, adminEnd);
  }

  return computeCustomBasketExcessReturn(indexData, usIndex, adminStart, adminEnd);
}

function computeNormalizedReturns(
  indexData: MarketIndexData,
  usIndex: UsIndexKey,
  adminStart: string,
  adminEnd: string | null
): ExcessReturnPoint[] {
  const usSeries = indexData[usIndex];
  const usAnchor = getAnchorPoint(usSeries, adminStart);
  const adminUsSeries = usSeries.filter(
    (point) => point.date >= usAnchor.date && (!adminEnd || point.date <= adminEnd)
  );

  return adminUsSeries.map((point, day) => ({
    day,
    date: point.date,
    time: (EXCESS_TIME_BASE + day * SECONDS_PER_DAY) as ExcessReturnPoint['time'],
    value: ((point.close / usAnchor.close) - 1) * 100,
  }));
}

function computeDerivedData(
  indexData: MarketIndexData,
  selectedBaseline: ProjectionBaseline,
  peerBenchmark: PeerBenchmark,
  usIndex: UsIndexKey
): {
  mainSeries: MainChartSeries;
  excessReturns: ExcessReturnSeries;
  normalizedReturns: ExcessReturnSeries;
  internationalSeries: InternationalSeries;
  summaryStats: SummaryStats;
  robustnessSummary: RobustnessSummary;
  baselineDates: Record<IndexKey, string>;
  lastDataDates: Record<IndexKey, string>;
  vxusLastDate: string;
  adminStartUsIndex: Record<AdministrationKey, { date: string; value: number }>;
  selectedProjection: ProjectionResult;
} {
  const usSeries = indexData[usIndex];
  if (usSeries.length === 0) {
    throw new Error(`${usIndex.toUpperCase()} data is empty.`);
  }

  const fullStart = getAnchorPoint(usSeries, FULL_VIEW_START_DATE);
  const projectionAnchor = getAnchorPoint(usSeries, CURRENT_ADMIN_START_DATE);

  const projectionDates = usSeries
    .filter((point) => point.date >= projectionAnchor.date)
    .map((point) => point.date);

  const projections = Object.fromEntries(
    PROJECTION_BASELINES.map((baseline) => [
      baseline,
      computeProjection(baseline, indexData, peerBenchmark, usSeries, projectionAnchor, projectionDates),
    ])
  ) as Record<ProjectionBaseline, ProjectionResult>;

  const selectedProjection = projections[selectedBaseline];

  const actualSeries = toChartSeries(usSeries);
  const globalPeers = computeGlobalPeersSeries(indexData, projectionAnchor, peerBenchmark);

  const latestDate = actualSeries[actualSeries.length - 1]?.time;
  if (!latestDate) {
    throw new Error('Unable to derive latest market date.');
  }

  const latestActual = findValueAtOrBeforeDate(actualSeries, latestDate);
  const latestProjected = findValueAtOrBeforeDate(selectedProjection.projected, latestDate);
  const latestGlobalPeers = findValueAtOrBeforeDate(globalPeers.series, latestDate);

  const opportunityCost = latestProjected - latestActual;
  const opportunityCostPct = latestProjected === 0 ? 0 : (opportunityCost / latestProjected) * 100;
  const globalGap = latestGlobalPeers - latestActual;

  const baselineDates = CORE_INDEX_KEYS.reduce<Record<IndexKey, string>>(
    (acc, key) => {
      acc[key] = getAnchorPoint(indexData[key], CURRENT_ADMIN_START_DATE).date;
      return acc;
    },
    {
      nasdaq: CURRENT_ADMIN_START_DATE,
      sp500: CURRENT_ADMIN_START_DATE,
      djia: CURRENT_ADMIN_START_DATE,
      kospi: CURRENT_ADMIN_START_DATE,
      ftse: CURRENT_ADMIN_START_DATE,
      nikkei: CURRENT_ADMIN_START_DATE,
      dax: CURRENT_ADMIN_START_DATE,
    }
  );

  const internationalSeries = CORE_INDEX_KEYS.reduce<InternationalSeries>(
    (acc, key) => {
      const anchor = getAnchorPoint(indexData[key], CURRENT_ADMIN_START_DATE);
      acc[key] = buildPercentSeries(indexData[key], anchor);
      return acc;
    },
    {
      nasdaq: [],
      sp500: [],
      djia: [],
      kospi: [],
      ftse: [],
      nikkei: [],
      dax: [],
    }
  );

  const excessReturns = ADMIN_KEYS.reduce<ExcessReturnSeries>(
    (acc, adminKey) => {
      const period = ADMIN_PERIODS[adminKey];
      acc[adminKey] = computeExcessReturn(indexData, usIndex, period.start, period.end, peerBenchmark);
      return acc;
    },
    {
      obama2: [],
      trump1: [],
      biden: [],
      trump2: [],
    }
  );

  const normalizedReturns = ADMIN_KEYS.reduce<ExcessReturnSeries>(
    (acc, adminKey) => {
      const period = ADMIN_PERIODS[adminKey];
      acc[adminKey] = computeNormalizedReturns(indexData, usIndex, period.start, period.end);
      return acc;
    },
    {
      obama2: [],
      trump1: [],
      biden: [],
      trump2: [],
    }
  );

  const latestCurrentAdminExcessPoint = excessReturns.trump2[excessReturns.trump2.length - 1];
  if (!latestCurrentAdminExcessPoint) {
    throw new Error('Unable to compute current administration excess return.');
  }

  const annualized =
    latestCurrentAdminExcessPoint.day > 0
      ? (latestCurrentAdminExcessPoint.value / latestCurrentAdminExcessPoint.day) * TRADING_DAYS_PER_YEAR
      : 0;

  const lastDataDates = CORE_INDEX_KEYS.reduce<Record<IndexKey, string>>(
    (acc, key) => {
      const latestPoint = indexData[key][indexData[key].length - 1];
      if (!latestPoint) {
        throw new Error(`Unable to determine last data date for ${key}.`);
      }
      acc[key] = latestPoint.date;
      return acc;
    },
    {
      nasdaq: CURRENT_ADMIN_START_DATE,
      sp500: CURRENT_ADMIN_START_DATE,
      djia: CURRENT_ADMIN_START_DATE,
      kospi: CURRENT_ADMIN_START_DATE,
      ftse: CURRENT_ADMIN_START_DATE,
      nikkei: CURRENT_ADMIN_START_DATE,
      dax: CURRENT_ADMIN_START_DATE,
    }
  );

  const vxusLastPoint = indexData.vxus[indexData.vxus.length - 1];
  if (!vxusLastPoint) {
    throw new Error('Unable to determine last data date for VXUS.');
  }

  const adminStartUsIndex = ADMIN_KEYS.reduce<Record<AdministrationKey, { date: string; value: number }>>(
    (acc, key) => {
      const period = ADMIN_PERIODS[key];
      const anchor = getAnchorPoint(usSeries, period.start);
      acc[key] = { date: anchor.date, value: anchor.close };
      return acc;
    },
    {
      obama2: { date: CURRENT_ADMIN_START_DATE, value: 0 },
      trump1: { date: CURRENT_ADMIN_START_DATE, value: 0 },
      biden: { date: CURRENT_ADMIN_START_DATE, value: 0 },
      trump2: { date: CURRENT_ADMIN_START_DATE, value: 0 },
    }
  );

  const mainSeries: MainChartSeries = {
    actual: actualSeries,
    projected: selectedProjection.projected,
    confidenceBands: selectedProjection.confidenceBands,
    globalPeers: globalPeers.series,
    globalPeersLabel: globalPeers.label,
    projectionLabel: selectedProjection.label,
    fullStart: fullStart.date,
    currentAdminStart: projectionAnchor.date,
    lastDate: latestDate,
  };

  const summaryStats: SummaryStats = {
    currentAdminExcessReturn: latestCurrentAdminExcessPoint.value,
    currentAdminExcessDay: latestCurrentAdminExcessPoint.day,
    currentAdminExcessDate: latestCurrentAdminExcessPoint.date,
    currentAdminExcessAnnualized: annualized,
    currentUsIndex: latestActual,
    projectedUsIndex: latestProjected,
    globalPeersValue: latestGlobalPeers,
    opportunityCost,
    opportunityCostPct,
    globalGap,
    globalPeersLabel: globalPeers.label,
    projectionLabel: selectedProjection.label,
  };

  const baselineByCurrentConfig = PROJECTION_BASELINES.map<BaselineSensitivityPoint>((baseline) => {
    const projection = projections[baseline];
    const projectedValue = findValueAtOrBeforeDate(projection.projected, latestDate);
    const baselineOpportunityCost = projectedValue - latestActual;
    const baselineOpportunityCostPct =
      projectedValue === 0 ? 0 : (baselineOpportunityCost / projectedValue) * 100;

    return {
      baseline,
      label: projection.label,
      opportunityCost: baselineOpportunityCost,
      opportunityCostPct: baselineOpportunityCostPct,
      sign: getSignDirection(baselineOpportunityCost),
    };
  });

  const excessByConfig = US_INDEX_KEYS.flatMap((candidateUsIndex) =>
    PEER_BENCHMARK_KEYS.map<RobustnessExcessPoint>((candidatePeerBenchmark) => {
      const comparisonSeries = computeExcessReturn(
        indexData,
        candidateUsIndex,
        ADMIN_PERIODS.trump2.start,
        ADMIN_PERIODS.trump2.end,
        candidatePeerBenchmark
      );
      const latestPoint = comparisonSeries[comparisonSeries.length - 1];
      if (!latestPoint) {
        throw new Error(
          `Unable to compute excess return for ${candidateUsIndex} vs ${candidatePeerBenchmark}.`
        );
      }

      return {
        usIndex: candidateUsIndex,
        peerBenchmark: candidatePeerBenchmark,
        value: latestPoint.value,
        date: latestPoint.date,
        sign: getSignDirection(latestPoint.value),
      };
    })
  );

  const robustnessSummary: RobustnessSummary = {
    excessByConfig,
    excessSignCounts: countSigns(excessByConfig.map((entry) => entry.sign)),
    baselineByCurrentConfig,
    baselineSignCounts: countSigns(baselineByCurrentConfig.map((entry) => entry.sign)),
  };

  return {
    mainSeries,
    excessReturns,
    normalizedReturns,
    internationalSeries,
    summaryStats,
    robustnessSummary,
    baselineDates,
    lastDataDates,
    vxusLastDate: vxusLastPoint.date,
    adminStartUsIndex,
    selectedProjection,
  };
}

export default function useMarketData(
  selectedBaseline: ProjectionBaseline,
  peerBenchmark: PeerBenchmark,
  usIndex: UsIndexKey
): MarketDataResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<MarketIndexData | null>(null);
  const [rawDeficitData, setRawDeficitData] = useState<DeficitDataPoint[] | null>(null);
  const [rawPolicyEvents, setRawPolicyEvents] = useState<PolicyEvent[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, DATA_LOAD_TIMEOUT_MS);

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const marketPromise = Promise.all(
          MARKET_INDEX_KEYS.map(async (key) => {
            const response = await fetch(DATA_URLS[key], { signal: controller.signal });
            if (!response.ok) {
              throw new Error(`Failed to fetch ${key}: ${response.status}`);
            }

            const json = (await response.json()) as MarketDataPoint[];
            return [key, normalizeData(json)] as const;
          })
        );

        const deficitPromise = fetch(DEFICIT_DATA_URL, { signal: controller.signal });
        const policyPromise = fetch(POLICY_EVENTS_URL, { signal: controller.signal });

        const [marketRows, deficitResponse, policyResponse] = await Promise.all([
          marketPromise,
          deficitPromise,
          policyPromise,
        ]);

        if (!deficitResponse.ok) {
          throw new Error(`Failed to fetch deficit data: ${deficitResponse.status}`);
        }

        if (!policyResponse.ok) {
          throw new Error(`Failed to fetch policy events: ${policyResponse.status}`);
        }

        const nextData = marketRows.reduce<MarketIndexData>(
          (acc, [key, series]) => {
            acc[key] = series;
            return acc;
          },
          {
            nasdaq: [],
            sp500: [],
            djia: [],
            kospi: [],
            ftse: [],
            nikkei: [],
            dax: [],
            vxus: [],
          }
        );

        const deficitJson = (await deficitResponse.json()) as DeficitDataPoint[];
        const policyJson = (await policyResponse.json()) as PolicyEvent[];

        if (!isActive) {
          return;
        }

        setRawData(nextData);
        setRawDeficitData(normalizeDeficitData(deficitJson));
        setRawPolicyEvents(normalizePolicyEvents(policyJson));
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        const isAbortError = loadError instanceof DOMException && loadError.name === 'AbortError';
        const message = isAbortError
          ? `Market data request timed out after ${Math.round(DATA_LOAD_TIMEOUT_MS / 1000)}s.`
          : loadError instanceof Error
            ? loadError.message
            : 'Unknown error while loading market and policy data.';

        setError(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }

        window.clearTimeout(timeoutId);
      }
    }

    load();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const derived = useMemo(() => {
    if (!rawData) {
      return { data: null, computeError: null as string | null };
    }

    try {
      return {
        data: computeDerivedData(rawData, selectedBaseline, peerBenchmark, usIndex),
        computeError: null as string | null,
      };
    } catch (computeError) {
      return {
        data: null,
        computeError:
          computeError instanceof Error
            ? computeError.message
            : 'Unable to compute derived market data.',
      };
    }
  }, [rawData, selectedBaseline, peerBenchmark, usIndex]);

  return {
    loading,
    error: error ?? derived.computeError,
    mainSeries: derived.data?.mainSeries ?? null,
    excessReturns: derived.data?.excessReturns ?? null,
    normalizedReturns: derived.data?.normalizedReturns ?? null,
    administrationPeriods: ADMIN_PERIODS,
    internationalSeries: derived.data?.internationalSeries ?? null,
    summaryStats: derived.data?.summaryStats ?? null,
    robustnessSummary: derived.data?.robustnessSummary ?? null,
    baselineDates: derived.data?.baselineDates ?? null,
    lastDataDates: derived.data?.lastDataDates ?? null,
    vxusLastDate: derived.data?.vxusLastDate ?? null,
    deficitData: rawDeficitData,
    policyEvents: rawPolicyEvents,
    adminStartUsIndex: derived.data?.adminStartUsIndex ?? null,
    baselineOptions: BASELINE_OPTIONS,
    selectedProjection: derived.data?.selectedProjection ?? null,
  };
}
