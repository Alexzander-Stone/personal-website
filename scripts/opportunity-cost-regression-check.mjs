import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const MARKET_DIR = path.join(ROOT_DIR, 'public/data/market');
const SNAPSHOT_PATH = path.join(ROOT_DIR, 'scripts/snapshots/opportunity-cost-regression.json');

const CURRENT_ADMIN_START_DATE = '2025-01-20';
const TEN_YEAR_START_DATE = '2015-01-20';
const HISTORICAL_PEERS_START_DATE = '2013-01-20';
const HISTORICAL_ANNUAL_RETURN = 0.105;
const TRADING_DAYS_PER_YEAR = 252;

const PEER_KEYS = ['kospi', 'ftse', 'nikkei', 'dax'];
const INDEX_KEYS = ['nasdaq', 'sp500', 'kospi', 'ftse', 'nikkei', 'dax'];
const US_INDEX_KEYS = ['nasdaq', 'sp500'];
const PEER_BENCHMARKS = ['custom-basket', 'msci-ex-us'];
const BASELINE_KEYS = [
  'historical',
  'median-presidential-term',
  'global-peers-historical',
  'obama2-term',
  'trump1-term',
  'biden-term',
  '10yr-average',
];

const ADMIN_PERIODS = {
  obama2: { start: '2013-01-20', end: '2017-01-20' },
  trump1: { start: '2017-01-20', end: '2021-01-20' },
  biden: { start: '2021-01-20', end: '2025-01-20' },
  trump2: { start: '2025-01-20', end: null },
};

function round(value, decimals = 6) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function toComparable(snapshot) {
  const { generatedAt, ...rest } = snapshot;
  return rest;
}

function signOf(value) {
  if (value > 0) {
    return 'positive';
  }
  if (value < 0) {
    return 'negative';
  }
  return 'flat';
}

async function readMarketSeries(fileName) {
  const raw = await fs.readFile(path.join(MARKET_DIR, fileName), 'utf8');
  const points = JSON.parse(raw);
  return points
    .filter((point) => Number.isFinite(point.close) && typeof point.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getAnchorPoint(points, targetDate) {
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

function findPointAtOrBefore(points, targetDate) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point && point.date <= targetDate) {
      return point;
    }
  }
  return null;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function computeCustomBasketExcess(indexData, usKey, startDate, endDate) {
  const usSeries = indexData[usKey];
  const initialUsAnchor = getAnchorPoint(usSeries, startDate);
  const initialPeerAnchors = PEER_KEYS.map((key) => getAnchorPoint(indexData[key], startDate));
  const commonStartDate = [initialUsAnchor.date, ...initialPeerAnchors.map((point) => point.date)].reduce(
    (latest, date) => (date > latest ? date : latest)
  );

  const usAnchor = getAnchorPoint(usSeries, commonStartDate);
  const peerAnchors = Object.fromEntries(
    PEER_KEYS.map((key) => [key, getAnchorPoint(indexData[key], commonStartDate)])
  );

  const adminUsSeries = usSeries.filter(
    (point) => point.date >= usAnchor.date && (!endDate || point.date <= endDate)
  );

  const result = [];
  for (const point of adminUsSeries) {
    const peerReturns = [];
    for (const key of PEER_KEYS) {
      const peerPoint = findPointAtOrBefore(indexData[key], point.date);
      const peerAnchor = peerAnchors[key];
      if (!peerPoint || peerPoint.date < peerAnchor.date) {
        continue;
      }
      peerReturns.push(peerPoint.close / peerAnchor.close - 1);
    }

    if (peerReturns.length !== PEER_KEYS.length) {
      continue;
    }

    const usReturn = point.close / usAnchor.close - 1;
    const peersReturn = peerReturns.reduce((sum, value) => sum + value, 0) / peerReturns.length;

    result.push({
      date: point.date,
      value: (usReturn - peersReturn) * 100,
    });
  }

  return result;
}

function computeVxusExcess(indexData, usKey, startDate, endDate) {
  const usSeries = indexData[usKey];
  const vxusSeries = indexData.vxus;

  const initialUsAnchor = getAnchorPoint(usSeries, startDate);
  const initialVxusAnchor = getAnchorPoint(vxusSeries, startDate);
  const commonStartDate = initialUsAnchor.date > initialVxusAnchor.date ? initialUsAnchor.date : initialVxusAnchor.date;

  const usAnchor = getAnchorPoint(usSeries, commonStartDate);
  const vxusAnchor = getAnchorPoint(vxusSeries, commonStartDate);

  const adminUsSeries = usSeries.filter(
    (point) => point.date >= usAnchor.date && (!endDate || point.date <= endDate)
  );

  const result = [];
  for (const point of adminUsSeries) {
    const vxusPoint = findPointAtOrBefore(vxusSeries, point.date);
    if (!vxusPoint || vxusPoint.date < vxusAnchor.date) {
      continue;
    }

    const usReturn = point.close / usAnchor.close - 1;
    const peersReturn = vxusPoint.close / vxusAnchor.close - 1;
    result.push({
      date: point.date,
      value: (usReturn - peersReturn) * 100,
    });
  }

  return result;
}

function computeCustomBasketNormalizedSeries(indexData, startDate, anchorValue) {
  const peerAnchors = Object.fromEntries(PEER_KEYS.map((key) => [key, getAnchorPoint(indexData[key], startDate)]));
  const commonStartDate = PEER_KEYS.reduce((latest, key) => {
    const anchorDate = peerAnchors[key].date;
    return anchorDate > latest ? anchorDate : latest;
  }, peerAnchors[PEER_KEYS[0]].date);

  const peerSeriesByKey = Object.fromEntries(
    PEER_KEYS.map((key) => [key, indexData[key].filter((point) => point.date >= commonStartDate)])
  );

  const dates = [
    ...new Set(PEER_KEYS.flatMap((key) => peerSeriesByKey[key].map((point) => point.date))),
  ].sort((left, right) => left.localeCompare(right));

  const cursors = Object.fromEntries(PEER_KEYS.map((key) => [key, 0]));
  const lastKnown = Object.fromEntries(PEER_KEYS.map((key) => [key, anchorValue]));

  return dates.map((date) => {
    const values = PEER_KEYS.map((key) => {
      const points = peerSeriesByKey[key];
      let cursor = cursors[key];

      while (cursor < points.length && points[cursor].date <= date) {
        const point = points[cursor];
        const anchor = peerAnchors[key];
        lastKnown[key] = (point.close / anchor.close) * anchorValue;
        cursor += 1;
      }

      cursors[key] = cursor;
      return lastKnown[key];
    });

    return {
      time: date,
      value: values.reduce((sum, value) => sum + value, 0) / values.length,
    };
  });
}

function computeVxusNormalizedSeries(indexData, startDate, anchorValue) {
  const vxusAnchor = getAnchorPoint(indexData.vxus, startDate);
  return indexData.vxus
    .filter((point) => point.date >= vxusAnchor.date)
    .map((point) => ({
      time: point.date,
      value: (point.close / vxusAnchor.close) * anchorValue,
    }));
}

function computeMedianPresidentialRate(usSeries, projectionAnchor) {
  const completeTerms = ['obama2', 'trump1', 'biden'];
  const annualizedReturns = completeTerms.map((key) => {
    const period = ADMIN_PERIODS[key];
    const start = getAnchorPoint(usSeries, period.start);
    const end = getAnchorPoint(usSeries, period.end);
    const window = usSeries.filter((point) => point.date >= start.date && point.date <= end.date);
    const tradingDayCount = Math.max(1, window.length - 1);
    return Math.pow(end.close / start.close, TRADING_DAYS_PER_YEAR / tradingDayCount) - 1;
  });

  const medianAnnualRate = median(annualizedReturns);
  return Math.pow(1 + medianAnnualRate, 1 / TRADING_DAYS_PER_YEAR) - 1;
}

function computeAdminTermRate(usSeries, adminKey, projectionAnchor) {
  const period = ADMIN_PERIODS[adminKey];
  const termEndDate = period.end <= projectionAnchor.date ? period.end : projectionAnchor.date;
  const baselineStart = getAnchorPoint(usSeries, period.start);
  const baselineEnd = getAnchorPoint(usSeries, termEndDate);
  const baselineWindow = usSeries.filter(
    (point) => point.date >= baselineStart.date && point.date <= baselineEnd.date
  );
  const tradingDayCount = Math.max(1, baselineWindow.length - 1);
  return Math.pow(baselineEnd.close / baselineStart.close, 1 / tradingDayCount) - 1;
}

function computeGlobalPeersHistoricalRate(indexData, peerBenchmark, projectionAnchor) {
  const peersSeries =
    peerBenchmark === 'msci-ex-us'
      ? computeVxusNormalizedSeries(indexData, HISTORICAL_PEERS_START_DATE, 100)
      : computeCustomBasketNormalizedSeries(indexData, HISTORICAL_PEERS_START_DATE, 100);

  const boundedWindow = peersSeries.filter((point) => point.time <= projectionAnchor.date);
  if (boundedWindow.length < 2) {
    throw new Error('Insufficient peer history for baseline regression check.');
  }

  const start = boundedWindow[0].value;
  const end = boundedWindow[boundedWindow.length - 1].value;
  const tradingDayCount = Math.max(1, boundedWindow.length - 1);
  return Math.pow(end / start, 1 / tradingDayCount) - 1;
}

function computeBaselineRate(indexData, usSeries, baseline, projectionAnchor, peerBenchmark) {
  if (baseline === 'historical') {
    return Math.pow(1 + HISTORICAL_ANNUAL_RETURN, 1 / TRADING_DAYS_PER_YEAR) - 1;
  }

  if (baseline === 'median-presidential-term') {
    return computeMedianPresidentialRate(usSeries, projectionAnchor);
  }

  if (baseline === 'global-peers-historical') {
    return computeGlobalPeersHistoricalRate(indexData, peerBenchmark, projectionAnchor);
  }

  if (baseline === '10yr-average') {
    const baselineStart = getAnchorPoint(usSeries, TEN_YEAR_START_DATE);
    const baselineWindow = usSeries.filter(
      (point) => point.date >= baselineStart.date && point.date <= projectionAnchor.date
    );
    const tradingDayCount = Math.max(1, baselineWindow.length - 1);
    return Math.pow(projectionAnchor.close / baselineStart.close, 1 / tradingDayCount) - 1;
  }

  if (baseline === 'obama2-term') {
    return computeAdminTermRate(usSeries, 'obama2', projectionAnchor);
  }

  if (baseline === 'trump1-term') {
    return computeAdminTermRate(usSeries, 'trump1', projectionAnchor);
  }

  return computeAdminTermRate(usSeries, 'biden', projectionAnchor);
}

function findValueAtOrBeforeDate(series, targetDate) {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const point = series[index];
    if (point && point.time <= targetDate) {
      return point.value;
    }
  }
  throw new Error(`Missing value at or before ${targetDate}`);
}

async function buildSnapshot() {
  const market = {
    nasdaq: await readMarketSeries('nasdaq.json'),
    sp500: await readMarketSeries('sp500.json'),
    kospi: await readMarketSeries('kospi.json'),
    ftse: await readMarketSeries('ftse.json'),
    nikkei: await readMarketSeries('nikkei.json'),
    dax: await readMarketSeries('dax.json'),
    vxus: await readMarketSeries('vxus.json'),
  };

  const asOfDate = market.nasdaq[market.nasdaq.length - 1]?.date;
  if (!asOfDate) {
    throw new Error('NASDAQ data is empty.');
  }

  const anchorDates = Object.fromEntries(
    INDEX_KEYS.map((key) => [key, getAnchorPoint(market[key], CURRENT_ADMIN_START_DATE).date])
  );

  const excessConfigs = US_INDEX_KEYS.flatMap((usIndex) =>
    PEER_BENCHMARKS.map((peerBenchmark) => {
      const rows =
        peerBenchmark === 'msci-ex-us'
          ? computeVxusExcess(market, usIndex, ADMIN_PERIODS.trump2.start, ADMIN_PERIODS.trump2.end)
          : computeCustomBasketExcess(market, usIndex, ADMIN_PERIODS.trump2.start, ADMIN_PERIODS.trump2.end);

      const latest = rows[rows.length - 1];
      if (!latest) {
        throw new Error(`No excess rows for ${usIndex}/${peerBenchmark}`);
      }

      return {
        usIndex,
        peerBenchmark,
        date: latest.date,
        value: round(latest.value, 4),
        sign: signOf(latest.value),
      };
    })
  );

  const defaultUsSeries = market.nasdaq;
  const projectionAnchor = getAnchorPoint(defaultUsSeries, CURRENT_ADMIN_START_DATE);
  const latestActual = defaultUsSeries[defaultUsSeries.length - 1].close;
  const projectionDates = defaultUsSeries
    .filter((point) => point.date >= projectionAnchor.date)
    .map((point) => point.date);
  const lastProjectionDate = projectionDates[projectionDates.length - 1];

  const baselineOpportunityCostPct = BASELINE_KEYS.map((baseline) => {
    const rate = computeBaselineRate(market, defaultUsSeries, baseline, projectionAnchor, 'custom-basket');
    const projectedSeries = projectionDates.map((date, index) => ({
      time: date,
      value: projectionAnchor.close * Math.pow(1 + rate, index),
    }));
    const projectedLatest = findValueAtOrBeforeDate(projectedSeries, lastProjectionDate);
    const opportunityCost = projectedLatest - latestActual;
    const opportunityCostPct = projectedLatest === 0 ? 0 : (opportunityCost / projectedLatest) * 100;

    return {
      baseline,
      opportunityCostPct: round(opportunityCostPct, 4),
      sign: signOf(opportunityCost),
    };
  });

  const baselineRankingByPct = [...baselineOpportunityCostPct]
    .sort((left, right) => right.opportunityCostPct - left.opportunityCostPct)
    .map((entry) => entry.baseline);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    asOfDate,
    anchorDates,
    excessConfigs,
    baselineOptionOrder: BASELINE_KEYS,
    baselineOpportunityCostPct,
    baselineRankingByPct,
  };
}

async function main() {
  const updateMode = process.argv.includes('--update');
  const current = await buildSnapshot();

  if (updateMode) {
    await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
    await fs.writeFile(SNAPSHOT_PATH, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
    console.log(`Updated snapshot: ${path.relative(ROOT_DIR, SNAPSHOT_PATH)}`);
    return;
  }

  let existingRaw;
  try {
    existingRaw = await fs.readFile(SNAPSHOT_PATH, 'utf8');
  } catch {
    throw new Error(
      `Snapshot file missing at ${path.relative(ROOT_DIR, SNAPSHOT_PATH)}. Run with --update to create it.`
    );
  }

  const existing = JSON.parse(existingRaw);
  if (!isDeepStrictEqual(toComparable(existing), toComparable(current))) {
    console.error('Opportunity-cost regression check failed.');
    console.error('Current metrics differ from snapshot.');
    console.error(`Snapshot: ${path.relative(ROOT_DIR, SNAPSHOT_PATH)}`);
    console.error('Run `npm run oc:regression:update` to refresh after intentional changes.');
    process.exitCode = 1;
    return;
  }

  console.log('Opportunity-cost regression check passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
