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
import { compactPolicyEvents, formatTime, readSeriesValue, toRgba } from './chart-utils';
import type { AdministrationPeriods, IndexKey, InternationalSeries, PolicyEvent } from './types';

type Props = {
  series: InternationalSeries;
  showPolicyEvents: boolean;
  policyEvents: PolicyEvent[];
  administrationPeriods: AdministrationPeriods;
};

type LegendState = {
  date: string;
  values: Record<IndexKey, number | null>;
};

const indexLabel: Record<IndexKey, string> = {
  nasdaq: 'NASDAQ',
  sp500: 'S&P 500',
  kospi: 'KOSPI',
  ftse: 'FTSE 100',
  nikkei: 'Nikkei 225',
  dax: 'DAX',
};

const indexColor: Record<IndexKey, string> = {
  nasdaq: '#ef4444',
  sp500: '#3b82f6',
  kospi: '#10b981',
  ftse: '#f59e0b',
  nikkei: '#ec4899',
  dax: '#8b5cf6',
};

const orderedKeys: IndexKey[] = ['nasdaq', 'sp500', 'kospi', 'ftse', 'nikkei', 'dax'];
const COMPACT_POLICY_BREAKPOINT = 760;
const NARROW_POLICY_BREAKPOINT = 520;
const COMPACT_POLICY_SPACING_DAYS = 28;
const COMPACT_POLICY_MAX_MARKERS_NARROW = 5;
const COMPACT_POLICY_MAX_MARKERS_REGULAR = 7;

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatPercent(value: number | null): string {
  if (typeof value !== 'number') {
    return 'N/A';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${percentFormatter.format(value)}%`;
}

function toUnixDay(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / (1000 * 60 * 60 * 24));
}

function findClosestPolicyEvent(
  events: PolicyEvent[],
  targetDate: string,
  maxDistanceDays: number
): PolicyEvent | null {
  const targetDay = toUnixDay(targetDate);
  let closest: PolicyEvent | null = null;
  let smallestDistance = Number.POSITIVE_INFINITY;

  for (const event of events) {
    const distance = Math.abs(toUnixDay(event.date) - targetDay);
    if (distance <= maxDistanceDays && distance < smallestDistance) {
      closest = event;
      smallestDistance = distance;
    }
  }

  return closest;
}

export default function InternationalChart({
  series,
  showPolicyEvents,
  policyEvents,
  administrationPeriods,
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const linesRef = useRef<Map<IndexKey, ISeriesApi<'Line', Time>>>(new Map());
  const policyLineRefs = useRef<ISeriesApi<'Line', Time>[]>([]);
  const renderedPolicyEventsRef = useRef<PolicyEvent[]>([]);
  const eventsByDateRef = useRef<Map<string, PolicyEvent[]>>(new Map());
  const showPolicyEventsRef = useRef(showPolicyEvents);
  const isCompactPolicyModeRef = useRef(false);

  const [visibility, setVisibility] = useState<Record<IndexKey, boolean>>({
    nasdaq: true,
    sp500: true,
    kospi: true,
    ftse: true,
    nikkei: true,
    dax: true,
  });
  const [legend, setLegend] = useState<LegendState | null>(null);
  const [activePolicyEvent, setActivePolicyEvent] = useState<PolicyEvent | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [isCompactPolicyMode, setIsCompactPolicyMode] = useState(false);

  const normalizedSeries = useMemo(
    () =>
      orderedKeys.reduce<InternationalSeries>(
        (acc, key) => {
          acc[key] = series[key];
          return acc;
        },
        {
          nasdaq: [],
          sp500: [],
          kospi: [],
          ftse: [],
          nikkei: [],
          dax: [],
        }
      ),
    [series]
  );

  const visiblePolicyEvents = useMemo(() => {
    const firstDate = normalizedSeries.nasdaq[0]?.time;
    const lastDate = normalizedSeries.nasdaq[normalizedSeries.nasdaq.length - 1]?.time;
    if (!firstDate || !lastDate) {
      return [];
    }

    return policyEvents.filter((event) => event.date >= firstDate && event.date <= lastDate);
  }, [normalizedSeries, policyEvents]);

  const renderedPolicyEvents = useMemo(() => {
    if (!isCompactPolicyMode) {
      return visiblePolicyEvents;
    }

    const maxEvents =
      chartWidth > 0 && chartWidth < NARROW_POLICY_BREAKPOINT
        ? COMPACT_POLICY_MAX_MARKERS_NARROW
        : COMPACT_POLICY_MAX_MARKERS_REGULAR;

    return compactPolicyEvents(visiblePolicyEvents, COMPACT_POLICY_SPACING_DAYS, maxEvents);
  }, [visiblePolicyEvents, isCompactPolicyMode, chartWidth]);

  const eventsByDate = useMemo(
    () =>
      renderedPolicyEvents.reduce<Map<string, PolicyEvent[]>>((acc, event) => {
        const existing = acc.get(event.date) ?? [];
        existing.push(event);
        acc.set(event.date, existing);
        return acc;
      }, new Map()),
    [renderedPolicyEvents]
  );

  useEffect(() => {
    renderedPolicyEventsRef.current = renderedPolicyEvents;
    eventsByDateRef.current = eventsByDate;
    showPolicyEventsRef.current = showPolicyEvents;
    isCompactPolicyModeRef.current = isCompactPolicyMode;
  }, [renderedPolicyEvents, eventsByDate, showPolicyEvents, isCompactPolicyMode]);

  useEffect(() => {
    if (!showPolicyEvents) {
      setActivePolicyEvent(null);
    }
  }, [showPolicyEvents]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 380,
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
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      localization: {
        priceFormatter: (value) => formatPercent(value),
      },
    });

    chartRef.current = chart;

    orderedKeys.forEach((key) => {
      const line = chart.addSeries(LineSeries, {
        color: indexColor[key],
        lineWidth: 2,
        title: indexLabel[key],
        priceLineVisible: false,
        visible: true,
      });

      linesRef.current.set(key, line);
    });

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setLegend(null);
        setActivePolicyEvent(null);
        return;
      }

      const values = orderedKeys.reduce<Record<IndexKey, number | null>>(
        (acc, key) => {
          const line = linesRef.current.get(key);
          acc[key] = line ? readSeriesValue(param.seriesData.get(line)) : null;
          return acc;
        },
        {
          nasdaq: null,
          sp500: null,
          kospi: null,
          ftse: null,
          nikkei: null,
          dax: null,
        }
      );

      const hoveredDate = formatTime(param.time);
      setLegend({ date: hoveredDate, values });

      if (!showPolicyEventsRef.current) {
        setActivePolicyEvent(null);
        return;
      }

      const datedEvents = eventsByDateRef.current.get(hoveredDate);
      if (datedEvents && datedEvents.length > 0) {
        setActivePolicyEvent(datedEvents[0]);
        return;
      }

      setActivePolicyEvent(
        findClosestPolicyEvent(
          renderedPolicyEventsRef.current,
          hoveredDate,
          isCompactPolicyModeRef.current ? 10 : 1
        )
      );
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const width = Math.floor(entry.contentRect.width);
      chart.applyOptions({ width });
      setChartWidth((previous) => (previous === width ? previous : width));
      setIsCompactPolicyMode((previous) => {
        const next = width < COMPACT_POLICY_BREAKPOINT;
        return previous === next ? previous : next;
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
      linesRef.current.clear();
      policyLineRefs.current = [];
    };
  }, []);

  useEffect(() => {
    orderedKeys.forEach((key) => {
      const line = linesRef.current.get(key);
      if (line) {
        line.setData(normalizedSeries[key]);
      }
    });

    chartRef.current?.timeScale().fitContent();
  }, [normalizedSeries]);

  useEffect(() => {
    orderedKeys.forEach((key) => {
      const line = linesRef.current.get(key);
      if (line) {
        line.applyOptions({ visible: visibility[key] });
      }
    });
  }, [visibility]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    policyLineRefs.current.forEach((line) => chart.removeSeries(line));
    policyLineRefs.current = [];

    if (!showPolicyEvents || renderedPolicyEvents.length === 0) {
      return;
    }

    const yValues = orderedKeys.flatMap((key) => normalizedSeries[key].map((point) => point.value));
    if (yValues.length === 0) {
      return;
    }

    const minValue = Math.min(...yValues);
    const maxValue = Math.max(...yValues);
    const spread = maxValue - minValue;
    const padding = spread > 0 ? spread * 0.04 : Math.max(Math.abs(maxValue), 1) * 0.04;

    renderedPolicyEvents.forEach((event) => {
      const color = toRgba(administrationPeriods[event.administration].color, 0.65);
      const eventLine = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        pointMarkersVisible: false,
      });

      const eventTime = Math.floor(Date.parse(`${event.date}T00:00:00Z`) / 1000);
      eventLine.setData([
        { time: eventTime as Time, value: minValue - padding },
        { time: (eventTime + 60) as Time, value: maxValue + padding },
      ]);

      policyLineRefs.current.push(eventLine);
    });
  }, [normalizedSeries, showPolicyEvents, renderedPolicyEvents, administrationPeriods]);

  return (
    <section className="oc-chart-panel" aria-label="International market performance chart">
      <div className="oc-chart-header">
        <h4 title="International comparison (percent change since Jan 2025)">
          International comparison (percent change since Jan 2025)
        </h4>
        <div className="oc-toggle-grid" role="group" aria-label="Toggle index visibility">
          {orderedKeys.map((key) => (
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
              <span style={{ color: indexColor[key] }}>{indexLabel[key]}</span>
            </label>
          ))}
        </div>
        <div className="oc-hover-panel oc-hover-panel-main" aria-live="polite">
          <div className="oc-hover-row">
            <span className="oc-hover-key">Date</span>
            <span className="oc-hover-val" title={legend?.date ?? 'Hover chart to compare markets'}>
              {legend?.date ?? 'Hover chart to compare markets'}
            </span>
          </div>
          {orderedKeys.map((key) => (
            <div className="oc-hover-row" key={key}>
              <span className="oc-hover-key">{indexLabel[key]}</span>
              <span
                className={`oc-hover-val ${visibility[key] ? '' : 'oc-hover-dim'}`}
                title={
                  visibility[key]
                    ? `${indexLabel[key]} ${formatPercent(legend?.values[key] ?? null)}`
                    : `${indexLabel[key]} hidden`
                }
              >
                {visibility[key] ? formatPercent(legend?.values[key] ?? null) : 'Hidden'}
              </span>
            </div>
          ))}
        </div>

        {showPolicyEvents ? (
          <div className="oc-hover-panel oc-hover-panel-policy" aria-live="polite">
            <div className="oc-hover-row">
              <span className="oc-hover-key">Policy</span>
              <span
                className="oc-hover-val"
                title={
                  activePolicyEvent
                    ? `${activePolicyEvent.date} - ${activePolicyEvent.label}`
                    : 'Hover near dashed policy lines'
                }
              >
                {activePolicyEvent
                  ? `${activePolicyEvent.date} - ${activePolicyEvent.label}`
                  : 'Hover near dashed policy lines'}
              </span>
            </div>
            <div className="oc-hover-row">
              <span className="oc-hover-key">Detail</span>
              <span className="oc-hover-val" title={activePolicyEvent?.description ?? 'No detail'}>
                {activePolicyEvent?.description ?? '—'}
              </span>
            </div>
            <div className="oc-hover-row">
              <span className="oc-hover-key">Impact</span>
              <span className="oc-hover-val" title={activePolicyEvent?.fiscalImpact ?? 'No impact'}>
                {activePolicyEvent?.fiscalImpact ?? '—'}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div ref={chartContainerRef} className="oc-chart-canvas" />
      <ul className="oc-chart-meta-list" aria-label="International chart notes">
        <li>All lines show percent change since Jan 2025.</li>
        <li>
          {showPolicyEvents
            ? `Showing ${renderedPolicyEvents.length} of ${visiblePolicyEvents.length} policy markers.`
            : 'Policy markers hidden.'}
        </li>
      </ul>
    </section>
  );
}
