import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaSeries,
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
import type { AdministrationPeriods, ChartPoint, ConfidenceBands, PolicyEvent, UsIndexKey } from './types';

type Props = {
  actualSeries: ChartPoint[];
  projectedSeries: ChartPoint[];
  confidenceBands: ConfidenceBands;
  globalPeersSeries: ChartPoint[];
  globalPeersLabel: string;
  projectionLabel: string;
  startDate: string;
  usIndex: UsIndexKey;
  showPolicyEvents: boolean;
  policyEvents: PolicyEvent[];
  administrationPeriods: AdministrationPeriods;
};

type LegendState = {
  date: string;
  actual: number | null;
  projected: number | null;
  globalPeers: number | null;
  oneSigmaUpper: number | null;
  oneSigmaLower: number | null;
  twoSigmaUpper: number | null;
  twoSigmaLower: number | null;
};

type SeriesRefs = {
  outerConeArea: ISeriesApi<'Area', Time>;
  outerConeMask: ISeriesApi<'Area', Time>;
  innerConeArea: ISeriesApi<'Area', Time>;
  innerConeMask: ISeriesApi<'Area', Time>;
  actualLine: ISeriesApi<'Line', Time>;
  projectedLine: ISeriesApi<'Line', Time>;
  globalPeersLine: ISeriesApi<'Line', Time>;
};

const valueFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const COMPACT_POLICY_BREAKPOINT = 760;
const NARROW_POLICY_BREAKPOINT = 520;
const COMPACT_POLICY_SPACING_DAYS = 28;
const COMPACT_POLICY_MAX_MARKERS_NARROW = 5;
const COMPACT_POLICY_MAX_MARKERS_REGULAR = 7;
const US_INDEX_LABELS: Record<UsIndexKey, string> = {
  nasdaq: 'NASDAQ',
  sp500: 'S&P 500',
};

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

export default function OpportunityCostChart({
  actualSeries,
  projectedSeries,
  confidenceBands,
  globalPeersSeries,
  globalPeersLabel,
  projectionLabel,
  startDate,
  usIndex,
  showPolicyEvents,
  policyEvents,
  administrationPeriods,
}: Props) {
  const usIndexLabel = US_INDEX_LABELS[usIndex];
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<SeriesRefs | null>(null);
  const policyLineRefs = useRef<ISeriesApi<'Line', Time>[]>([]);
  const renderedPolicyEventsRef = useRef<PolicyEvent[]>([]);
  const eventsByDateRef = useRef<Map<string, PolicyEvent[]>>(new Map());
  const showPolicyEventsRef = useRef(showPolicyEvents);
  const isCompactPolicyModeRef = useRef(false);

  const [legend, setLegend] = useState<LegendState | null>(null);
  const [activePolicyEvent, setActivePolicyEvent] = useState<PolicyEvent | null>(null);
  const [isCompactPolicyMode, setIsCompactPolicyMode] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const filteredActual = useMemo(
    () => actualSeries.filter((point) => point.time >= startDate),
    [actualSeries, startDate]
  );
  const filteredProjected = useMemo(
    () => projectedSeries.filter((point) => point.time >= startDate),
    [projectedSeries, startDate]
  );
  const filteredGlobalPeers = useMemo(
    () => globalPeersSeries.filter((point) => point.time >= startDate),
    [globalPeersSeries, startDate]
  );
  const filteredOneSigmaUpper = useMemo(
    () => confidenceBands.oneSigma.upper.filter((point) => point.time >= startDate),
    [confidenceBands.oneSigma.upper, startDate]
  );
  const filteredOneSigmaLower = useMemo(
    () => confidenceBands.oneSigma.lower.filter((point) => point.time >= startDate),
    [confidenceBands.oneSigma.lower, startDate]
  );
  const filteredTwoSigmaUpper = useMemo(
    () => confidenceBands.twoSigma.upper.filter((point) => point.time >= startDate),
    [confidenceBands.twoSigma.upper, startDate]
  );
  const filteredTwoSigmaLower = useMemo(
    () => confidenceBands.twoSigma.lower.filter((point) => point.time >= startDate),
    [confidenceBands.twoSigma.lower, startDate]
  );

  const latestActualDate = filteredActual[filteredActual.length - 1]?.time ?? '9999-12-31';

  const visiblePolicyEvents = useMemo(
    () => policyEvents.filter((event) => event.date >= startDate && event.date <= latestActualDate),
    [policyEvents, startDate, latestActualDate]
  );

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
        priceFormatter: (price) => valueFormatter.format(price),
      },
    });
    chartRef.current = chart;

    const nextSeriesRefs: SeriesRefs = {
      outerConeArea: chart.addSeries(AreaSeries, {
        lineColor: 'rgba(59, 130, 246, 0)',
        topColor: 'rgba(59, 130, 246, 0.1)',
        bottomColor: 'rgba(59, 130, 246, 0.02)',
        priceLineVisible: false,
        lastValueVisible: false,
      }),
      outerConeMask: chart.addSeries(AreaSeries, {
        lineColor: 'rgba(24, 27, 34, 0)',
        topColor: 'rgba(24, 27, 34, 1)',
        bottomColor: 'rgba(24, 27, 34, 1)',
        priceLineVisible: false,
        lastValueVisible: false,
      }),
      innerConeArea: chart.addSeries(AreaSeries, {
        lineColor: 'rgba(59, 130, 246, 0)',
        topColor: 'rgba(59, 130, 246, 0.22)',
        bottomColor: 'rgba(59, 130, 246, 0.06)',
        priceLineVisible: false,
        lastValueVisible: false,
      }),
      innerConeMask: chart.addSeries(AreaSeries, {
        lineColor: 'rgba(24, 27, 34, 0)',
        topColor: 'rgba(24, 27, 34, 1)',
        bottomColor: 'rgba(24, 27, 34, 1)',
        priceLineVisible: false,
        lastValueVisible: false,
      }),
      actualLine: chart.addSeries(LineSeries, {
        color: '#ef4444',
        lineWidth: 2,
        title: `Actual ${usIndexLabel}`,
        priceLineVisible: false,
      }),
      projectedLine: chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        title: projectionLabel,
        priceLineVisible: false,
      }),
      globalPeersLine: chart.addSeries(LineSeries, {
        color: '#22d3ee',
        lineWidth: 2,
        title: globalPeersLabel,
        priceLineVisible: false,
      }),
    };

    seriesRefs.current = nextSeriesRefs;

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      if (!param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        setLegend(null);
        setActivePolicyEvent(null);
        return;
      }

      const refs = seriesRefs.current;
      if (!refs) {
        return;
      }

      const hoveredDate = formatTime(param.time);
      setLegend({
        date: hoveredDate,
        actual: readSeriesValue(param.seriesData.get(refs.actualLine)),
        projected: readSeriesValue(param.seriesData.get(refs.projectedLine)),
        globalPeers: readSeriesValue(param.seriesData.get(refs.globalPeersLine)),
        oneSigmaUpper: readSeriesValue(param.seriesData.get(refs.innerConeArea)),
        oneSigmaLower: readSeriesValue(param.seriesData.get(refs.innerConeMask)),
        twoSigmaUpper: readSeriesValue(param.seriesData.get(refs.outerConeArea)),
        twoSigmaLower: readSeriesValue(param.seriesData.get(refs.outerConeMask)),
      });

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
      seriesRefs.current = null;
      policyLineRefs.current = [];
    };
  }, []);

  useEffect(() => {
    if (!seriesRefs.current) {
      return;
    }

    seriesRefs.current.outerConeArea.setData(filteredTwoSigmaUpper);
    seriesRefs.current.outerConeMask.setData(filteredTwoSigmaLower);
    seriesRefs.current.innerConeArea.setData(filteredOneSigmaUpper);
    seriesRefs.current.innerConeMask.setData(filteredOneSigmaLower);
    seriesRefs.current.actualLine.setData(filteredActual);
    seriesRefs.current.projectedLine.setData(filteredProjected);
    seriesRefs.current.globalPeersLine.setData(filteredGlobalPeers);
    chartRef.current?.timeScale().fitContent();
  }, [
    filteredActual,
    filteredProjected,
    filteredOneSigmaUpper,
    filteredOneSigmaLower,
    filteredTwoSigmaUpper,
    filteredTwoSigmaLower,
    filteredGlobalPeers,
  ]);

  useEffect(() => {
    if (!seriesRefs.current) {
      return;
    }

    seriesRefs.current.actualLine.applyOptions({ title: `Actual ${usIndexLabel}` });
    seriesRefs.current.projectedLine.applyOptions({ title: projectionLabel });
    seriesRefs.current.globalPeersLine.applyOptions({ title: globalPeersLabel });
  }, [projectionLabel, globalPeersLabel, usIndexLabel]);

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

    const yValues = [
      ...filteredActual,
      ...filteredProjected,
      ...filteredGlobalPeers,
      ...filteredTwoSigmaUpper,
      ...filteredTwoSigmaLower,
    ].map((point) => point.value);
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
  }, [
    filteredActual,
    filteredProjected,
    filteredGlobalPeers,
    filteredTwoSigmaUpper,
    filteredTwoSigmaLower,
    showPolicyEvents,
    renderedPolicyEvents,
    administrationPeriods,
  ]);

  const gap =
    legend && typeof legend.actual === 'number' && typeof legend.projected === 'number'
      ? legend.projected - legend.actual
      : null;
  const formatCurrency = (value: number | null) => (typeof value === 'number' ? valueFormatter.format(value) : '—');
  const oneSigmaRange =
    legend && typeof legend.oneSigmaLower === 'number' && typeof legend.oneSigmaUpper === 'number'
      ? `${valueFormatter.format(legend.oneSigmaLower)} to ${valueFormatter.format(legend.oneSigmaUpper)}`
      : '—';
  const twoSigmaRange =
    legend && typeof legend.twoSigmaLower === 'number' && typeof legend.twoSigmaUpper === 'number'
      ? `${valueFormatter.format(legend.twoSigmaLower)} to ${valueFormatter.format(legend.twoSigmaUpper)}`
      : '—';

  return (
    <section className="oc-chart-panel" aria-label={`${usIndexLabel} opportunity cost chart`}>
      <div className="oc-chart-header">
        <h4 title={`${usIndexLabel} vs selected baseline + ${globalPeersLabel.toLowerCase()}`}>
          {usIndexLabel} vs selected baseline + {globalPeersLabel.toLowerCase()}
        </h4>
        <div className="oc-hover-panel oc-hover-panel-main" aria-live="polite">
          <div className="oc-hover-row">
            <span className="oc-hover-key">Date</span>
            <span className="oc-hover-val" title={legend?.date ?? 'Hover chart to inspect values'}>
              {legend?.date ?? 'Hover chart to inspect values'}
            </span>
          </div>
          <div className="oc-hover-subgrid">
            <div className="oc-hover-metric">
              <span className="oc-hover-metric-label">Actual</span>
              <span className="oc-hover-metric-value" title={`Actual ${formatCurrency(legend?.actual ?? null)}`}>
                {formatCurrency(legend?.actual ?? null)}
              </span>
            </div>
            <div className="oc-hover-metric">
              <span className="oc-hover-metric-label">Baseline</span>
              <span className="oc-hover-metric-value" title={`Baseline ${formatCurrency(legend?.projected ?? null)}`}>
                {formatCurrency(legend?.projected ?? null)}
              </span>
            </div>
            <div className="oc-hover-metric">
              <span className="oc-hover-metric-label">Peers</span>
              <span className="oc-hover-metric-value" title={`Peers ${formatCurrency(legend?.globalPeers ?? null)}`}>
                {formatCurrency(legend?.globalPeers ?? null)}
              </span>
            </div>
            <div className="oc-hover-metric">
              <span className="oc-hover-metric-label">Gap</span>
              <span className="oc-hover-metric-value" title={`Gap ${formatCurrency(gap)}`}>
                {formatCurrency(gap)}
              </span>
            </div>
          </div>
          <div className="oc-hover-row">
            <span className="oc-hover-key">1 sigma (~68%)</span>
            <span className="oc-hover-val" title={`1 sigma range ${oneSigmaRange}`}>
              {oneSigmaRange}
            </span>
          </div>
          <div className="oc-hover-row">
            <span className="oc-hover-key">2 sigma (~95%)</span>
            <span className="oc-hover-val" title={`2 sigma range ${twoSigmaRange}`}>
              {twoSigmaRange}
            </span>
          </div>
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
      <ul className="oc-chart-meta-list" aria-label="Chart interpretation notes">
        <li>
          Red = actual {usIndexLabel}, blue = selected baseline, cyan = {globalPeersLabel.toLowerCase()}, blue
          bands = 1 sigma (~68%) and 2 sigma (~95%) uncertainty ranges.
        </li>
        {showPolicyEvents ? (
          <li>
            Showing {renderedPolicyEvents.length} of {visiblePolicyEvents.length} policy markers
            {isCompactPolicyMode
              ? ` (compact mode: up to ${
                  chartWidth > 0 && chartWidth < NARROW_POLICY_BREAKPOINT
                    ? COMPACT_POLICY_MAX_MARKERS_NARROW
                    : COMPACT_POLICY_MAX_MARKERS_REGULAR
                }).`
              : '.'}
          </li>
        ) : null}
        {showPolicyEvents ? (
          <li>
            Dashed vertical lines = policy events (rule: &gt;$200B 10-year fiscal impact legislation, or tariffs
            affecting &gt;$50B trade volume / &gt;10% of imports).
          </li>
        ) : null}
      </ul>
    </section>
  );
}
