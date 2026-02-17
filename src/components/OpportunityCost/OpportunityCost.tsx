import { useMemo, useState } from 'react';
import DeficitChart from './DeficitChart';
import ExcessReturnChart from './ExcessReturnChart';
import InternationalChart from './InternationalChart';
import NormalizedReturnsChart from './NormalizedReturnsChart';
import OpportunityCostChart from './OpportunityCostChart';
import RobustnessSummary from './RobustnessSummary';
import StatCards from './StatCards';
import useMarketData from './useMarketData';
import type { PeerBenchmark, ProjectionBaseline, UsIndexKey, ViewMode } from './types';
import './opportunity-cost.css';

const US_INDEX_LABELS: Record<UsIndexKey, string> = {
  nasdaq: 'NASDAQ',
  sp500: 'S&P 500',
};

export default function OpportunityCost() {
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [baseline, setBaseline] = useState<ProjectionBaseline>('historical');
  const [peerBenchmark, setPeerBenchmark] = useState<PeerBenchmark>('custom-basket');
  const [usIndex, setUsIndex] = useState<UsIndexKey>('nasdaq');
  const [showPolicyEvents, setShowPolicyEvents] = useState(true);

  const {
    loading,
    error,
    mainSeries,
    excessReturns,
    normalizedReturns,
    administrationPeriods,
    internationalSeries,
    summaryStats,
    robustnessSummary,
    baselineDates,
    lastDataDates,
    vxusLastDate,
    deficitData,
    policyEvents,
    adminStartUsIndex,
    baselineOptions,
    selectedProjection,
  } = useMarketData(baseline, peerBenchmark, usIndex);

  const usIndexLabel = US_INDEX_LABELS[usIndex];

  const startDate = useMemo(() => {
    if (!mainSeries) {
      return '2021-01-20';
    }

    return viewMode === 'full' ? mainSeries.fullStart : mainSeries.currentAdminStart;
  }, [mainSeries, viewMode]);

  if (loading) {
    return (
      <section className="oc-root" aria-live="polite">
        <p>Loading market data...</p>
      </section>
    );
  }

  if (
    error ||
    !mainSeries ||
    !excessReturns ||
    !normalizedReturns ||
    !internationalSeries ||
    !summaryStats ||
    !robustnessSummary ||
    !baselineDates ||
    !lastDataDates ||
    !deficitData ||
    !policyEvents ||
    !vxusLastDate ||
    !adminStartUsIndex ||
    !selectedProjection
  ) {
    return (
      <section className="oc-root" aria-live="polite">
        <p>Unable to load market visualization.</p>
        {error && <p className="oc-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="oc-root">
      <section className="oc-read-guide" aria-label="How to read this analysis">
        <h4>How To Read This</h4>
        <ul className="oc-chart-meta-list">
          <li>Primary chart: excess return (US index minus peer benchmark) by aligned trading day.</li>
          <li>Robustness panel: directional stability checks only, not statistical significance testing.</li>
          <li>Supplementary projections are scenario baselines, not forecasts and not causal estimates.</li>
        </ul>
      </section>

      <NormalizedReturnsChart
        series={normalizedReturns}
        periods={administrationPeriods}
        adminStartUsIndex={adminStartUsIndex}
        usIndex={usIndex}
      />

      <section className="oc-read-guide" aria-label="How chart 1 differs from chart 2">
        <h4>How Chart 1 Differs From Chart 2</h4>
        <ul className="oc-chart-meta-list">
          <li>
            Chart 1 (above): raw cumulative {usIndexLabel} return by administration.
            <code> ((US_t / US_start) - 1) * 100</code>
          </li>
          <li>
            Chart 2 (below): excess return versus global peers.
            <code> US return - peer return</code>
          </li>
          <li>
            Example: if {usIndexLabel} is +20% and peers are +25%, chart 1 shows +20% while chart 2 shows -5%.
          </li>
          <li>So a positive line in chart 1 can still be negative in chart 2 if the US index rose less than peers.</li>
        </ul>
      </section>

      <ExcessReturnChart
        series={excessReturns}
        periods={administrationPeriods}
        adminStartUsIndex={adminStartUsIndex}
        usIndex={usIndex}
      />

      <StatCards summaryStats={summaryStats} asOfDate={mainSeries.lastDate} usIndexLabel={usIndexLabel} />

      <div className="oc-control-row">
        <div className="oc-picker-grid">
          <label className="oc-baseline-picker">
            <span title="US index used in excess return and supplementary projection">
              US index for primary comparison
            </span>
            <select
              value={usIndex}
              onChange={(event) => setUsIndex(event.target.value as UsIndexKey)}
              aria-label="Select US index"
            >
              <option value="nasdaq">NASDAQ Composite (^IXIC)</option>
              <option value="sp500">S&amp;P 500 (^GSPC)</option>
            </select>
            <span className="oc-inline-note">Switch index to test robustness against sector concentration effects.</span>
          </label>

          <label className="oc-baseline-picker">
            <span title="Supplementary projection baseline">Supplementary projection baseline</span>
            <select
              value={baseline}
              onChange={(event) => setBaseline(event.target.value as ProjectionBaseline)}
              aria-label="Select projection baseline"
            >
              {baselineOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="oc-inline-note">
              Supplementary only: primary analysis is the excess return chart above.
            </span>
          </label>

          <label className="oc-baseline-picker">
            <span title="Peer benchmark for excess return and peers line">
              Peer benchmark for excess return and peers line
            </span>
            <select
              value={peerBenchmark}
              onChange={(event) => setPeerBenchmark(event.target.value as PeerBenchmark)}
              aria-label="Select peer benchmark"
            >
              <option value="custom-basket">Custom basket (equal-weight KOSPI/FTSE/Nikkei/DAX)</option>
              <option value="msci-ex-us">MSCI World ex-US proxy (VXUS, cap-weighted)</option>
            </select>
            <span className="oc-inline-note">Custom basket is equal-weight. VXUS is cap-weighted.</span>
          </label>
        </div>

        <div className="oc-controls" role="group" aria-label="Main chart range">
          <button
            type="button"
            className={viewMode === 'full' ? 'oc-toggle oc-toggle-active' : 'oc-toggle'}
            onClick={() => setViewMode('full')}
          >
            Full View (Jan 2021 to present)
          </button>

          <button
            type="button"
            className={viewMode === 'current' ? 'oc-toggle oc-toggle-active' : 'oc-toggle'}
            onClick={() => setViewMode('current')}
          >
            Current Admin (Jan 2025 to present)
          </button>
        </div>

        <label className="oc-checkbox">
          <input
            type="checkbox"
            checked={showPolicyEvents}
            onChange={(event) => setShowPolicyEvents(event.target.checked)}
          />
          <span>Show policy events</span>
        </label>
      </div>

      <RobustnessSummary robustnessSummary={robustnessSummary} usIndex={usIndex} peerBenchmark={peerBenchmark} />

      <OpportunityCostChart
        actualSeries={mainSeries.actual}
        projectedSeries={mainSeries.projected}
        confidenceBands={mainSeries.confidenceBands}
        globalPeersSeries={mainSeries.globalPeers}
        globalPeersLabel={mainSeries.globalPeersLabel}
        projectionLabel={mainSeries.projectionLabel}
        startDate={startDate}
        usIndex={usIndex}
        showPolicyEvents={showPolicyEvents}
        policyEvents={policyEvents}
        administrationPeriods={administrationPeriods}
      />

      <DeficitChart data={deficitData} periods={administrationPeriods} />

      <InternationalChart
        series={internationalSeries}
        showPolicyEvents={showPolicyEvents}
        policyEvents={policyEvents}
        administrationPeriods={administrationPeriods}
      />

      <div className="oc-footnote">
        <div className="oc-footnote-row">
          <span className="oc-footnote-label">Selected benchmark</span>
          <span className="oc-footnote-pill" title={mainSeries.globalPeersLabel}>
            {mainSeries.globalPeersLabel}
          </span>
        </div>

        <div className="oc-footnote-row">
          <span className="oc-footnote-label">Baseline window</span>
          <span
            className="oc-footnote-pill"
            title={`${selectedProjection.baselineStart} to ${selectedProjection.baselineEnd}`}
          >
            {selectedProjection.baselineStart} to {selectedProjection.baselineEnd}
          </span>
        </div>

        <div className="oc-footnote-row">
          <span className="oc-footnote-label">Anchor dates (Jan 2025)</span>
          <div className="oc-footnote-pills">
            <span className="oc-footnote-pill" title={`S&P 500 ${baselineDates.sp500}`}>
              S&amp;P 500 {baselineDates.sp500}
            </span>
            <span className="oc-footnote-pill" title={`NASDAQ ${baselineDates.nasdaq}`}>
              NASDAQ {baselineDates.nasdaq}
            </span>
            <span className="oc-footnote-pill" title={`KOSPI ${baselineDates.kospi}`}>
              KOSPI {baselineDates.kospi}
            </span>
            <span className="oc-footnote-pill" title={`FTSE ${baselineDates.ftse}`}>
              FTSE {baselineDates.ftse}
            </span>
            <span className="oc-footnote-pill" title={`Nikkei ${baselineDates.nikkei}`}>
              Nikkei {baselineDates.nikkei}
            </span>
            <span className="oc-footnote-pill" title={`DAX ${baselineDates.dax}`}>
              DAX {baselineDates.dax}
            </span>
          </div>
        </div>

        <div className="oc-footnote-row">
          <span className="oc-footnote-label">Latest data dates</span>
          <div className="oc-footnote-pills">
            <span className="oc-footnote-pill" title={`S&P 500 ${lastDataDates.sp500}`}>
              S&amp;P 500 {lastDataDates.sp500}
            </span>
            <span className="oc-footnote-pill" title={`NASDAQ ${lastDataDates.nasdaq}`}>
              NASDAQ {lastDataDates.nasdaq}
            </span>
            <span className="oc-footnote-pill" title={`KOSPI ${lastDataDates.kospi}`}>
              KOSPI {lastDataDates.kospi}
            </span>
            <span className="oc-footnote-pill" title={`FTSE ${lastDataDates.ftse}`}>
              FTSE {lastDataDates.ftse}
            </span>
            <span className="oc-footnote-pill" title={`Nikkei ${lastDataDates.nikkei}`}>
              Nikkei {lastDataDates.nikkei}
            </span>
            <span className="oc-footnote-pill" title={`DAX ${lastDataDates.dax}`}>
              DAX {lastDataDates.dax}
            </span>
            <span className="oc-footnote-pill" title={`VXUS ${vxusLastDate}`}>
              VXUS {vxusLastDate}
            </span>
          </div>
        </div>

        {peerBenchmark === 'msci-ex-us' ? (
          <div className="oc-footnote-row">
            <span className="oc-footnote-label">Note</span>
            <span className="oc-footnote-pill" title="VXUS is an ETF proxy and may behave differently from broad index series.">
              VXUS is an ETF proxy and may behave differently from broad index series.
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
