import { useEffect, useMemo, useState } from 'react';
import './derzans-draft-proof.css';

type TeamComp = {
  team: string;
  picks: Record<string, string>;
  bans: string[];
};

type Branch = {
  label: string;
  rootAction: string;
  deltaBucket: string;
  confidenceBucket: string;
  aatroxResult: string;
  factorGroups: string[];
  explanation: string;
  blue: TeamComp;
  red: TeamComp;
};

type ProofData = {
  schemaVersion: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  claimBoundary: string;
  primaryFinding: string;
  actual: {
    label: string;
    blue: TeamComp;
    red: TeamComp;
  };
  derzanBranches: Branch[];
  glossary: { term: string; meaning: string }[];
  omissions: string[];
};

const roles = ['top', 'jungle', 'mid', 'bot', 'support'];

const fallbackData: ProofData = {
  schemaVersion: 'sanitized-proof-viewer.v1',
  title: "Derzan's Draft Public Proof",
  subtitle: 'Sanitized proof data is unavailable in this local build.',
  statusLabel: 'Demo artifact missing',
  claimBoundary:
    'The public viewer uses redacted, bucketed outputs. Exact weights, search traces, and private assumptions are omitted.',
  primaryFinding:
    'Generate the sanitized proof export and place it at /data/derzans-draft/proof-viewer.json.',
  actual: {
    label: 'Actual draft',
    blue: { team: 'Blue', picks: {}, bans: [] },
    red: { team: 'Red', picks: {}, bans: [] },
  },
  derzanBranches: [],
  glossary: [],
  omissions: [],
};

function formatChampion(value?: string) {
  if (!value) return '-';
  return value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function CompTable({ title, blue, red }: { title: string; blue: TeamComp; red: TeamComp }) {
  return (
    <div className="dd-comp-block">
      <div className="dd-comp-heading">
        <h3>{title}</h3>
      </div>

      <div className="dd-comp-grid">
        {[blue, red].map((team) => (
          <section className="dd-team" key={team.team}>
            <div className="dd-team-head">
              <span>{team.team}</span>
            </div>
            <dl className="dd-picks">
              {roles.map((role) => (
                <div key={role}>
                  <dt>{role}</dt>
                  <dd>{formatChampion(team.picks[role])}</dd>
                </div>
              ))}
            </dl>
            <p className="dd-bans">
              <span>Bans</span>
              {team.bans.length ? team.bans.map(formatChampion).join(', ') : 'Unavailable'}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function DerzansDraftProof() {
  const [data, setData] = useState<ProofData>(fallbackData);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    fetch('/data/derzans-draft/proof-viewer.json')
      .then((response) => {
        if (!response.ok) throw new Error('Missing public proof artifact');
        return response.json();
      })
      .then((payload: ProofData) => {
        if (isMounted) setData(payload);
      })
      .catch(() => {
        if (isMounted) setData(fallbackData);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeBranch = data.derzanBranches[activeIndex];

  const factorText = useMemo(() => {
    if (!activeBranch?.factorGroups?.length) return 'No public factor groups available.';
    return activeBranch.factorGroups.join(', ');
  }, [activeBranch]);

  return (
    <div className="dd-proof-viewer" aria-label="Derzan public proof viewer">
      <section className="dd-proof-summary">
        <div>
          <p className="dd-kicker">Sanitized proof viewer</p>
          <h2>{data.title}</h2>
          <p>{data.subtitle}</p>
        </div>
        <div className="dd-status">
          <span>{data.statusLabel}</span>
        </div>
      </section>

      <section className="dd-finding">
        <h3>What Derzan Found</h3>
        <p>{data.primaryFinding}</p>
        <p className="dd-boundary">{data.claimBoundary}</p>
      </section>

      <CompTable title={data.actual.label} blue={data.actual.blue} red={data.actual.red} />

      {data.derzanBranches.length > 0 && (
        <section className="dd-branches">
          <div className="dd-branch-list" role="tablist" aria-label="Derzan branches">
            {data.derzanBranches.map((branch, index) => (
              <button
                key={branch.label}
                type="button"
                className={index === activeIndex ? 'is-active' : ''}
                onClick={() => setActiveIndex(index)}
                role="tab"
                aria-selected={index === activeIndex}
              >
                <span>{branch.label}</span>
                <strong>{branch.rootAction}</strong>
              </button>
            ))}
          </div>

          {activeBranch && (
            <article className="dd-branch-detail">
              <div className="dd-metric-row">
                <div>
                  <span>Delta</span>
                  <strong>{activeBranch.deltaBucket}</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{activeBranch.confidenceBucket}</strong>
                </div>
                <div>
                  <span>Constraint</span>
                  <strong>{activeBranch.aatroxResult}</strong>
                </div>
              </div>

              <CompTable
                title="Derzan branch example"
                blue={activeBranch.blue}
                red={activeBranch.red}
              />

              <div className="dd-why">
                <h3>Why This Branch</h3>
                <p>{activeBranch.explanation}</p>
                <p>
                  <span>Public factor groups:</span> {factorText}
                </p>
              </div>
            </article>
          )}
        </section>
      )}

      <section className="dd-glossary">
        <h3>How To Read It</h3>
        <dl className="dd-glossary-grid">
          {data.glossary.map((item) => (
            <div key={item.term}>
              <dt>{item.term}</dt>
              <dd>{item.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="dd-omissions">
        <h3>What The Public Demo Omits</h3>
        <ul>
          {data.omissions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
