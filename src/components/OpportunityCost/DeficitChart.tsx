import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import { readSeriesValue, toRgba } from './chart-utils';
import type { AdministrationPeriods, DeficitDataPoint } from './types';

type Props = {
  data: DeficitDataPoint[];
  periods: AdministrationPeriods;
};

type LegendState = {
  fiscalYear: number;
  deficitGdpPct: number;
  administrationLabel: string;
};

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function normalizeYear(time: Time): number | null {
  if (typeof time === 'string') {
    const year = Number.parseInt(time.slice(0, 4), 10);
    return Number.isFinite(year) ? year : null;
  }

  if (typeof time === 'number') {
    const year = new Date(time * 1000).getUTCFullYear();
    return Number.isFinite(year) ? year : null;
  }

  return time.year;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${percentFormatter.format(value)}%`;
}

export default function DeficitChart({ data, periods }: Props) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const barsRef = useRef<ISeriesApi<'Histogram', Time> | null>(null);
  const pointByYearRef = useRef<Map<number, DeficitDataPoint>>(new Map());
  const periodsRef = useRef(periods);

  const [legend, setLegend] = useState<LegendState | null>(null);

  const pointByYear = useMemo(
    () =>
      data.reduce<Map<number, DeficitDataPoint>>((acc, point) => {
        acc.set(point.fiscalYear, point);
        return acc;
      }, new Map()),
    [data]
  );

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        time: `${point.fiscalYear}-09-30`,
        value: point.deficitGdpPct,
        color: point.isEstimate
          ? toRgba(periods[point.administration].color, 0.5)
          : periods[point.administration].color,
      })),
    [data, periods]
  );

  const markers = useMemo(
    () => [
      {
        time: '2020-09-30',
        position: 'belowBar' as const,
        shape: 'circle' as const,
        color: '#f3f4f6',
        text: 'COVID response',
      },
      {
        time: '2021-09-30',
        position: 'belowBar' as const,
        shape: 'circle' as const,
        color: '#f3f4f6',
        text: 'COVID response',
      },
      ...data
        .filter((point) => point.isEstimate)
        .map((point) => ({
          time: `${point.fiscalYear}-09-30`,
          position: 'aboveBar' as const,
          shape: 'square' as const,
          color: '#f3f4f6',
          text: 'Estimate',
        })),
    ],
    [data]
  );

  useEffect(() => {
    pointByYearRef.current = pointByYear;
  }, [pointByYear]);

  useEffect(() => {
    periodsRef.current = periods;
  }, [periods]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 330,
      layout: {
        background: { type: ColorType.Solid, color: '#181b22' },
        textColor: '#d4d9e3',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(156, 163, 175, 0.15)' },
        horzLines: { color: 'rgba(156, 163, 175, 0.15)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(156, 163, 175, 0.35)',
      },
      timeScale: {
        borderColor: 'rgba(156, 163, 175, 0.35)',
      },
      localization: {
        priceFormatter: (value) => formatPercent(value),
      },
    });

    chartRef.current = chart;

    const bars = chart.addSeries(HistogramSeries, {
      title: 'Deficit / GDP',
      priceLineVisible: false,
      lastValueVisible: false,
      base: 0,
    });
    barsRef.current = bars;

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setLegend(null);
        return;
      }

      const fiscalYear = normalizeYear(param.time);
      if (!fiscalYear) {
        setLegend(null);
        return;
      }

      const point = pointByYearRef.current.get(fiscalYear);
      const value = readSeriesValue(param.seriesData.get(bars));

      if (!point || typeof value !== 'number') {
        setLegend(null);
        return;
      }

      setLegend({
        fiscalYear,
        deficitGdpPct: value,
        administrationLabel: periodsRef.current[point.administration].label,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      chart.applyOptions({ width: Math.floor(entry.contentRect.width) });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
      barsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!barsRef.current) {
      return;
    }

    barsRef.current.setData(chartData);
    createSeriesMarkers(barsRef.current, markers);
    chartRef.current?.timeScale().fitContent();
  }, [chartData, markers]);

  return (
    <section className="oc-chart-panel" aria-label="Federal deficit as percent of GDP chart">
      <div className="oc-chart-header">
        <h4 title="Federal deficit as percent of GDP by fiscal year">Federal deficit as % of GDP by fiscal year</h4>
        <div className="oc-hover-panel oc-hover-panel-policy" aria-live="polite">
          <div className="oc-hover-row">
            <span className="oc-hover-key">Fiscal year</span>
            <span className="oc-hover-val" title={legend ? `Fiscal year ${legend.fiscalYear}` : 'Hover chart to inspect year'}>
              {legend ? `FY${legend.fiscalYear}` : 'Hover chart to inspect year'}
            </span>
          </div>
          <div className="oc-hover-row">
            <span className="oc-hover-key">Deficit/GDP</span>
            <span className="oc-hover-val" title={legend ? `Deficit over GDP ${formatPercent(legend.deficitGdpPct)}` : 'No value'}>
              {legend ? formatPercent(legend.deficitGdpPct) : '—'}
            </span>
          </div>
          <div className="oc-hover-row">
            <span className="oc-hover-key">Administration</span>
            <span className="oc-hover-val" title={legend?.administrationLabel ?? 'No value'}>
              {legend?.administrationLabel ?? '—'}
            </span>
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="oc-chart-canvas" />
      <ul className="oc-chart-meta-list" aria-label="Deficit chart notes">
        <li>
          Source: FRED (FYFSGDA188S) + CBO FY2025 estimate. Fiscal years run Oct-Sep; straddle years are assigned to
          the president in office for most of the fiscal year.
        </li>
        <li>FY2020 and FY2021 are COVID response years. FY2025 is an estimate until final release (~Oct 2026).</li>
      </ul>
    </section>
  );
}
