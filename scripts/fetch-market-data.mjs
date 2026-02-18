import fs from 'node:fs/promises';
import path from 'node:path';
import YahooFinance from 'yahoo-finance2';

const START_DATE = '2013-01-20';
const END_DATE = new Date().toISOString().slice(0, 10);
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/data/market');
const yahooFinance = new YahooFinance({
  suppressNotices: ['ripHistorical'],
});

const INDEX_CONFIG = [
  { symbol: '^IXIC', fileName: 'nasdaq.json' },
  { symbol: '^GSPC', fileName: 'sp500.json' },
  { symbol: '^DJI', fileName: 'djia.json' },
  { symbol: '^KS11', fileName: 'kospi.json' },
  { symbol: '^FTSE', fileName: 'ftse.json' },
  { symbol: '^N225', fileName: 'nikkei.json' },
  { symbol: '^GDAXIP', fileName: 'dax.json' },
  { symbol: 'VXUS', fileName: 'vxus.json' },
];

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

async function fetchSeries(symbol) {
  const rows = await yahooFinance.historical(symbol, {
    period1: START_DATE,
    period2: END_DATE,
    interval: '1d',
  });

  return rows
    .filter((row) => Number.isFinite(row.adjClose))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((row) => ({
      date: formatDate(row.date),
      close: Number(row.adjClose),
    }));
}

async function writeSeries(fileName, series) {
  const outputPath = path.join(OUTPUT_DIR, fileName);
  await fs.writeFile(outputPath, JSON.stringify(series, null, 2) + '\n', 'utf8');
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const { symbol, fileName } of INDEX_CONFIG) {
    const series = await fetchSeries(symbol);
    if (series.length === 0) {
      throw new Error(`No rows returned for ${symbol}`);
    }

    await writeSeries(fileName, series);
    console.log(`Wrote ${series.length} rows to public/data/market/${fileName}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
