import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from 'lightweight-charts';
import { EXCESS_TIME_BASE, SECONDS_PER_DAY, readSeriesValue } from './chart-utils';
import {
  ADMIN_KEYS,
  type AdministrationKey,
  type AdministrationPeriods,
  type ExcessReturnSeries,
  type UsIndexKey,
} from './types';

type Props = {
  series: ExcessReturnSeries;
  periods: AdministrationPeriods;
  adminStartUsIndex: Record<AdministrationKey, { date: string; value: number }>;
  usIndex: UsIndexKey;
};

type LegendEntry = {
  value: number | null;
  date: string | null;
};

type LegendState = {
  day: number;
  values: Record<AdministrationKey, LegendEntry>;
};

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const US_INDEX_LABELS: Record<UsIndexKey, string> = {
  nasdaq: 'NASDAQ',
  sp500: 'S&P 500',
};

function getDayFromTime(time: Time): number {
  if (typeof time === 'number') {
    return Math.max(0, Math.round((time - EXCESS_TIME_BASE) / SECONDS_PER_DAY));
  }

  if (typeof time === 'string') {
    const parsed = Date.parse(`${time}T00:00:00Z`);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.round((Math.floor(parsed / 1000) - EXCESS_TIME_BASE) / SECONDS_PER_DAY));
  }

  const asTimestamp = Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000);
  return Math.max(0, Math.round((asTimestamp - EXCESS_TIME_BASE) / SECONDS_PER_DAY));
}

function formatPercent(value: number | null): string {
  if (typeof value !== 'number') {
    return 'N/A';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${percentFormatter.format(value)}%`;
}

export default function ExcessReturnChart({ series, periods, adminStartUsIndex, usIndex }: Props) {
  const usIndexLabel = US_INDEX_LABELS[usIndex];
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const zeroLineRef = useRef<ISeriesApi<'Line', Time> | null>(null);
  const linesRef = useRef<Map<AdministrationKey, ISeriesApi<'Line', Time>>>(new Map());
  const pointsByDayRef = useRef<Record<AdministrationKey, Map<number, { date: string }>>>({
    obama2: new Map(),
    trump1: new Map(),
    biden: new Map(),
    trump2: new Map(),
  });

  const [visibility, setVisibility] = useState<Record<AdministrationKey, boolean>>({
    obama2: true,
    trump1: true,
    biden: true,
    trump2: true,
  });
  const [legend, setLegend] = useState<LegendState | null>(null);

  const pointsByDay = useMemo(
    () =>
      ADMIN_KEYS.reduce<Record<AdministrationKey, Map<number, { date: string }>>>(
        (acc, key) => {
          const map = new Map<number, { date: string }>();
          series[key].forEach((point) => {
            map.set(point.day, { date: point.date });
          });
          acc[key] = map;
          return acc;
        },
        {
          obama2: new Map(),
          trump1: new Map(),
          biden: new Map(),
          trump2: new Map(),
        }
      ),
    [series]
  );

  useEffect(() => {
    pointsByDayRef.current = pointsByDay;
  }, [pointsByDay]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 430,
      layout: {
        background: { type: ColorType.Solid, color: '#181b22' },
        textColor: '#d4d9e3',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(156, 163, 175, 0.15)' },
        horzLines: { color: 'rgba(156, 163, 175, 0.15)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(156, 163, 175, 0.35)',
      },
      timeScale: {
        borderColor: 'rgba(156, 163, 175, 0.35)',
        tickMarkFormatter: (time) => `D${getDayFromTime(time)}`,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      localization: {
        priceFormatter: (value) => formatPercent(value),
      },
    });

    chartRef.current = chart;

    const zeroLine = chart.addSeries(LineSeries, {
      color: 'rgba(156, 163, 175, 0.6)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: 'Zero excess return',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    zeroLineRef.current = zeroLine;

    ADMIN_KEYS.forEach((key) => {
      const line = chart.addSeries(LineSeries, {
        color: periods[key].color,
        lineWidth: 2,
        title: periods[key].label,
        priceLineVisible: false,
        visible: true,
      });

      linesRef.current.set(key, line);
    });

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setLegend(null);
        return;
      }

      const day = getDayFromTime(param.time);
      const values = ADMIN_KEYS.reduce<Record<AdministrationKey, LegendEntry>>(
        (acc, key) => {
          const line = linesRef.current.get(key);
          acc[key] = {
            value: line ? readSeriesValue(param.seriesData.get(line)) : null,
            date: pointsByDayRef.current[key].get(day)?.date ?? null,
          };
          return acc;
        },
        {
          obama2: { value: null, date: null },
          trump1: { value: null, date: null },
          biden: { value: null, date: null },
          trump2: { value: null, date: null },
        }
      );

      setLegend({ day, values });
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
      zeroLineRef.current = null;
      linesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const zeroLine = zeroLineRef.current;
    if (!zeroLine) {
      return;
    }

    const maxDay = ADMIN_KEYS.reduce((highest, key) => {
      const latest = series[key][series[key].length - 1]?.day ?? 0;
      return latest > highest ? latest : highest;
    }, 0);

    const zeroSeriesData = Array.from({ length: maxDay + 1 }, (_, day) => ({
      time: (EXCESS_TIME_BASE + day * SECONDS_PER_DAY) as Time,
      value: 0,
    }));
    zeroLine.setData(zeroSeriesData);

    ADMIN_KEYS.forEach((key) => {
      const line = linesRef.current.get(key);
      if (line) {
        line.setData(series[key].map((point) => ({ time: point.time as Time, value: point.value })));
      }
    });

    chartRef.current?.timeScale().fitContent();
  }, [series]);

  useEffect(() => {
    ADMIN_KEYS.forEach((key) => {
      const line = linesRef.current.get(key);
      if (line) {
        line.applyOptions({ visible: visibility[key] });
      }
    });
  }, [visibility]);

  return (
    <section className="oc-chart-panel" aria-label="US excess return by administration chart">
      <div className="oc-chart-header">
        <h4 title={`US excess return by administration (${usIndexLabel} vs global peers)`}>
          US excess return by administration ({usIndexLabel} vs global peers)
        </h4>

        <div className="oc-toggle-grid" role="group" aria-label="Toggle administration visibility">
          {ADMIN_KEYS.map((key) => (
            <label key={key} className="oc-checkbox">
              <input
                type="checkbox"
                checked={visibility[key]}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setVisibility((previous) => ({
                    ...previous,
                    [key]: checked,
                  }));
                }}
              />
              <span style={{ color: periods[key].color }}>{periods[key].label}</span>
            </label>
          ))}
        </div>
        <div className="oc-hover-panel oc-hover-panel-main" aria-live="polite">
          <div className="oc-hover-row">
            <span className="oc-hover-key">Trading day</span>
            <span
              className="oc-hover-val"
              title={legend ? `Trading day ${legend.day}` : 'Hover chart to inspect excess return'}
            >
              {legend ? `D${legend.day}` : 'Hover chart to inspect excess return'}
            </span>
          </div>
          {ADMIN_KEYS.map((key) => (
            <div className="oc-hover-row" key={key}>
              <span className="oc-hover-key">{periods[key].label}</span>
              <span
                className={`oc-hover-val ${visibility[key] ? '' : 'oc-hover-dim'}`}
                title={
                  visibility[key]
                    ? `${periods[key].label} ${formatPercent(legend?.values[key].value ?? null)} on ${
                        legend?.values[key].date ?? '—'
                      }`
                    : `${periods[key].label} hidden`
                }
              >
                {visibility[key]
                  ? `${formatPercent(legend?.values[key].value ?? null)} (${legend?.values[key].date ?? '—'})`
                  : 'Hidden'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div ref={chartContainerRef} className="oc-chart-canvas" />
      <ul className="oc-chart-meta-list" aria-label="Excess return chart notes">
        <li>
          Above zero = {usIndexLabel} outperformed peers. Below zero = {usIndexLabel} underperformed peers.
        </li>
        <li>
          Starting {usIndexLabel} values by administration:
          <div className="oc-chart-meta-tags" aria-label={`Starting ${usIndexLabel} values by administration`}>
            {ADMIN_KEYS.map((key) => (
              <span key={key} className="oc-chart-meta-pill">
                <strong>{periods[key].label}</strong> {currencyFormatter.format(adminStartUsIndex[key].value)} (
                {adminStartUsIndex[key].date})
              </span>
            ))}
          </div>
        </li>
      </ul>
    </section>
  );
}
