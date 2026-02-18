import type { SummaryStats } from './types';

type Props = {
  summaryStats: SummaryStats;
  asOfDate: string;
  usIndexLabel: string;
};

const valueFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatSignedPercentPoints(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${percentFormatter.format(value)}%`;
}

export default function StatCards({ summaryStats, asOfDate, usIndexLabel }: Props) {
  const opportunityCostColor = summaryStats.opportunityCost > 0 ? '#f87171' : '#86efac';
  const opportunityCostDirection = summaryStats.opportunityCost > 0 ? 'below' : 'above';

  return (
    <section className="oc-stat-grid" aria-label="Opportunity cost summary stats">
      <article className="oc-stat-card">
        <p className="oc-stat-label" title="US Excess Return">
          US Excess Return
        </p>
        <p className="oc-stat-value">{formatSignedPercentPoints(summaryStats.currentAdminExcessReturn)}</p>
        <p className="oc-stat-meta">
          {formatSignedPercentPoints(summaryStats.currentAdminExcessAnnualized)} annualized
        </p>
        <p className="oc-stat-meta">
          Trading day {summaryStats.currentAdminExcessDay} ({summaryStats.currentAdminExcessDate})
        </p>
      </article>

      <article className="oc-stat-card">
        <p className="oc-stat-label" title={`Current ${usIndexLabel}`}>
          Current {usIndexLabel}
        </p>
        <p className="oc-stat-value">{valueFormatter.format(summaryStats.currentUsIndex)}</p>
        <p className="oc-stat-meta">As of {asOfDate}</p>
      </article>

      <article className="oc-stat-card">
        <p className="oc-stat-label" title="Projected Value">
          Projected Value
        </p>
        <p className="oc-stat-value">{valueFormatter.format(summaryStats.projectedUsIndex)}</p>
        <p className="oc-stat-meta">Baseline: {summaryStats.projectionLabel}</p>
      </article>

      <article className="oc-stat-card">
        <p className="oc-stat-label" title="Opportunity Cost">
          Opportunity Cost
        </p>
        <p className="oc-stat-value" style={{ color: opportunityCostColor }}>
          {valueFormatter.format(summaryStats.opportunityCost)}
        </p>
        <p className="oc-stat-meta">
          {percentFormatter.format(Math.abs(summaryStats.opportunityCostPct))}% {opportunityCostDirection} baseline
          (gap / projected); peers gap {valueFormatter.format(summaryStats.globalGap)} vs{' '}
          {summaryStats.globalPeersLabel.toLowerCase()}
        </p>
      </article>
    </section>
  );
}
