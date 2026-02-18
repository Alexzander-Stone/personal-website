import { useMemo, useRef, useState } from 'react';
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
  djia: 'Dow Jones',
};

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${percentFormatter.format(value)}%`;
}

function formatPercentPoints(value: number): string {
  return `${formatSignedPercent(value)} pts`;
}

export default function OpportunityCost() {
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [baseline, setBaseline] = useState<ProjectionBaseline>('historical');
  const [peerBenchmark, setPeerBenchmark] = useState<PeerBenchmark>('custom-basket');
  const [usIndex, setUsIndex] = useState<UsIndexKey>('djia');
  const [showPolicyEvents, setShowPolicyEvents] = useState(true);
  const exploreRef = useRef<HTMLDetailsElement | null>(null);

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

  const currentAdminAnchor = adminStartUsIndex.trump2;

  const usReturnSinceInauguration =
    currentAdminAnchor.value > 0 ? ((summaryStats.currentUsIndex / currentAdminAnchor.value) - 1) * 100 : 0;
  const peersReturnSinceInauguration =
    currentAdminAnchor.value > 0 ? ((summaryStats.globalPeersValue / currentAdminAnchor.value) - 1) * 100 : 0;
  const excessDirection =
    summaryStats.currentAdminExcessReturn > 0
      ? 'outperforming'
      : summaryStats.currentAdminExcessReturn < 0
        ? 'underperforming'
        : 'matching';
  const verdictTone =
    summaryStats.currentAdminExcessReturn > 0
      ? 'positive'
      : summaryStats.currentAdminExcessReturn < 0
        ? 'negative'
        : 'flat';

  const openExploreSection = () => {
    const details = exploreRef.current;
    if (!details) {
      return;
    }

    details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="oc-root">
      <section className={`oc-verdict oc-verdict-${verdictTone}`} aria-label="Current administration verdict">
        <p className="oc-verdict-kicker">Current snapshot</p>
        <h3 className="oc-verdict-headline">
          Day {summaryStats.currentAdminExcessDay} of current admin: US stocks are{' '}
          {summaryStats.currentAdminExcessReturn >= 0 ? 'beating' : 'trailing'} global peers by{' '}
          {percentFormatter.format(Math.abs(summaryStats.currentAdminExcessReturn))} points.
        </h3>
        <p className="oc-verdict-body">
          The {usIndexLabel} has returned {formatSignedPercent(usReturnSinceInauguration)} since{' '}
          {currentAdminAnchor.date}. {summaryStats.globalPeersLabel} moved{' '}
          {formatSignedPercent(peersReturnSinceInauguration)} over the same window.
        </p>
        <p className="oc-verdict-body">
          The US is currently {excessDirection} peers by {formatPercentPoints(summaryStats.currentAdminExcessReturn)}.
        </p>
        <p className="oc-verdict-meta">As of {summaryStats.currentAdminExcessDate}.</p>
        {summaryStats.currentAdminExcessDay < 60 && (
          <p className="oc-verdict-meta" style={{ fontStyle: 'italic' }}>
            Early window - treat with caution. Short periods amplify noise.
          </p>
        )}
        <button type="button" className="oc-jump-button" onClick={openExploreSection}>
          Want more data and controls? Open the Explore section.
        </button>
      </section>

      <section className="oc-tier-block" aria-label="The core argument">
        <p className="oc-tier-label">Core read</p>
        <p className="oc-chart-caption">
          Each line is US return minus peer return from inauguration day, aligned by trading day. Above zero means the
          US is ahead; below zero means it is behind.
        </p>

        <ExcessReturnChart
          series={excessReturns}
          periods={administrationPeriods}
          adminStartUsIndex={adminStartUsIndex}
          usIndex={usIndex}
        />

        <StatCards summaryStats={summaryStats} asOfDate={mainSeries.lastDate} usIndexLabel={usIndexLabel} />

        <p className="oc-chart-caption">
          Raw returns by administration. This often shows gains in most periods, which is why excess return above is
          the cleaner comparison.
        </p>
        <NormalizedReturnsChart
          series={normalizedReturns}
          periods={administrationPeriods}
          adminStartUsIndex={adminStartUsIndex}
          usIndex={usIndex}
        />

        <RobustnessSummary robustnessSummary={robustnessSummary} usIndex={usIndex} peerBenchmark={peerBenchmark} />
      </section>

      <details ref={exploreRef} className="oc-explore">
        <summary>
          <span className="oc-explore-title">Explore the data</span>
          <span className="oc-explore-meta">
            Baselines, policy markers, deficit context, and international comparisons.
          </span>
        </summary>

        <div className="oc-explore-content">
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
                  <option value="djia">Dow Jones Industrial Average (^DJI)</option>
                </select>
                <span className="oc-inline-note">
                  Switch index to test robustness against sector concentration effects.
                </span>
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
                <span className="oc-footnote-pill" title={`Dow Jones ${baselineDates.djia}`}>
                  Dow Jones {baselineDates.djia}
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
                <span className="oc-footnote-pill" title={`Dow Jones ${lastDataDates.djia}`}>
                  Dow Jones {lastDataDates.djia}
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
                <span
                  className="oc-footnote-pill"
                  title="VXUS is an ETF proxy and may behave differently from broad index series."
                >
                  VXUS is an ETF proxy and may behave differently from broad index series.
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </details>
    </section>
  );
}
