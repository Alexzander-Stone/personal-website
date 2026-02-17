import type { PeerBenchmark, RobustnessSummary as RobustnessSummaryModel, UsIndexKey } from './types';

type Props = {
  robustnessSummary: RobustnessSummaryModel;
  usIndex: UsIndexKey;
  peerBenchmark: PeerBenchmark;
};

const US_INDEX_LABELS: Record<UsIndexKey, string> = {
  nasdaq: 'NASDAQ',
  sp500: 'S&P 500',
};

const PEER_BENCHMARK_LABELS: Record<PeerBenchmark, string> = {
  'custom-basket': 'Custom basket',
  'msci-ex-us': 'VXUS',
};

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${percentFormatter.format(value)}%`;
}

function signClassName(sign: 'positive' | 'negative' | 'flat'): string {
  if (sign === 'positive') {
    return 'oc-sign-pill oc-sign-pill-positive';
  }

  if (sign === 'negative') {
    return 'oc-sign-pill oc-sign-pill-negative';
  }

  return 'oc-sign-pill oc-sign-pill-flat';
}

export default function RobustnessSummary({ robustnessSummary, usIndex, peerBenchmark }: Props) {
  const { excessByConfig, excessSignCounts, baselineByCurrentConfig, baselineSignCounts } = robustnessSummary;

  const excessIsConsistent =
    excessSignCounts.positive === excessByConfig.length ||
    excessSignCounts.negative === excessByConfig.length ||
    excessSignCounts.flat === excessByConfig.length;

  const baselineIsConsistent =
    baselineSignCounts.positive === baselineByCurrentConfig.length ||
    baselineSignCounts.negative === baselineByCurrentConfig.length ||
    baselineSignCounts.flat === baselineByCurrentConfig.length;

  return (
    <section className="oc-chart-panel" aria-label="Robustness summary">
      <div className="oc-chart-header">
        <h4 title="Directional robustness checks across index, benchmark, and baseline choices">
          Directional robustness snapshot (descriptive, non-causal)
        </h4>
      </div>

      <div className="oc-robustness-grid">
        <article className="oc-robustness-card">
          <p className="oc-stat-label">Current-admin excess return (direction only)</p>
          <p className="oc-chart-note">
            {excessIsConsistent
              ? `Direction is consistent across all ${excessByConfig.length} index/benchmark configurations.`
              : `Direction is mixed across ${excessByConfig.length} index/benchmark configurations.`}
          </p>
          <p className="oc-chart-note">
            Sign counts: +{excessSignCounts.positive} / -{excessSignCounts.negative} / 0{excessSignCounts.flat}
          </p>
          <div className="oc-robustness-list" role="list" aria-label="Excess return configuration matrix">
            {excessByConfig.map((entry) => {
              const isSelected = entry.usIndex === usIndex && entry.peerBenchmark === peerBenchmark;
              return (
                <div
                  key={`${entry.usIndex}-${entry.peerBenchmark}`}
                  className={`oc-robustness-row ${isSelected ? 'oc-robustness-row-selected' : ''}`}
                  role="listitem"
                >
                  <span className="oc-robustness-label">
                    {US_INDEX_LABELS[entry.usIndex]} vs {PEER_BENCHMARK_LABELS[entry.peerBenchmark]}
                  </span>
                  <span className={signClassName(entry.sign)}>
                    {formatSignedPercent(entry.value)} ({entry.date})
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="oc-robustness-card">
          <p className="oc-stat-label">Supplementary baseline sensitivity (direction only)</p>
          <p className="oc-chart-note">
            Active config: {US_INDEX_LABELS[usIndex]} vs {PEER_BENCHMARK_LABELS[peerBenchmark]}.
          </p>
          <p className="oc-chart-note">
            {baselineIsConsistent
              ? 'Opportunity-cost direction is consistent across all baselines.'
              : 'Opportunity-cost direction changes across baselines.'}{' '}
            (+{baselineSignCounts.positive} / -{baselineSignCounts.negative} / 0{baselineSignCounts.flat})
          </p>
          <div className="oc-robustness-list" role="list" aria-label="Baseline sensitivity">
            {baselineByCurrentConfig.map((entry) => (
              <div key={entry.baseline} className="oc-robustness-row" role="listitem">
                <span className="oc-robustness-label">{entry.label}</span>
                <span className={signClassName(entry.sign)}>{formatSignedPercent(entry.opportunityCostPct)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
      <p className="oc-chart-note">This panel summarizes directional stability only; it is not a formal significance test.</p>
    </section>
  );
}
