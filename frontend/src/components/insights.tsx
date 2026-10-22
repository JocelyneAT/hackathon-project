"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import {
  blankProfile,
  type Profile,
  type Recommendations,
  type Impact,
  type Scenarios,
  type Occupation,
} from "@/lib/types";
import { Button, Panel, Tag, Field, Empty, Note, Icon } from "./ui";
export type InsightsData = {
  counts: Record<string, number>;
  countries: {
    code: string;
    name: string;
    supported?: boolean;
    capabilities?: unknown;
    evidence_status?: string;
  }[];
  dataset_versions: unknown[];
  last_import: unknown;
  backend_status: string;
  database: unknown;
  model_version: string;
  scoring_weights: unknown;
  scenario_definitions: unknown;
  limitations: string[];
  diagnostics: unknown;
  catalog: Record<string, unknown[]>;
};
export function Insights({
  data,
  occupations,
  run,
  busy,
}: {
  data: InsightsData;
  occupations: Occupation[];
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  busy: boolean;
}) {
  const [tab, setTab] = useState("overview");
  const [entity, setEntity] = useState("occupations");
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [version, setVersion] = useState("");
  const [occupation, setOccupation] = useState("");
  const [page, setPage] = useState(0);
  const [inspection, setInspection] = useState<unknown>(null);
  const records = (data.catalog[entity] || []) as Record<string, unknown>[];
  const filtered = records.filter(
    (row) =>
      (!query ||
        JSON.stringify(row).toLowerCase().includes(query.toLowerCase())) &&
      (!country || row.country === country || row.code === country) &&
      (!status || row.evidence_status === status) &&
      (!version || row.dataset_version === version) &&
      (!occupation ||
        row.occupation_id === occupation ||
        row.id === occupation),
  );
  const statuses = [
    ...new Set(records.map((r) => r.evidence_status).filter(Boolean)),
  ] as string[];
  const versions = [
    ...new Set(records.map((r) => r.dataset_version).filter(Boolean)),
  ] as string[];
  async function inspect(kind: string) {
    const profile: Profile = {
      ...blankProfile,
      skill_ids: ["excel", "communication", "sql"],
      interests: ["analytics", "business"],
      background:
        "Synthetic test profile: classroom reporting with Excel. SQL studied, not assessed.",
    };
    const route =
      kind === "matching"
        ? "insights/explain-career-score"
        : kind === "assessment"
          ? "insights/explain-skill-assessment"
          : kind === "impact"
            ? "insights/explain-ai-impact"
            : "scenarios/compare";
    const result = await run(() =>
      api<Recommendations | Impact | Scenarios>(route, {
        profile,
        occupation_id: "data-analyst",
        scenario: "moderate",
      }),
    );
    if (result) setInspection(result);
  }
  return (
    <div className="stack">
      <Note title="For the project team">
        This area shows the data and calculations used by the demo. All test
        profiles are made-up examples. Private CV content is not shown here. You
        do not need this page to make a career plan.
      </Note>
      <div className="subnav" aria-label="System insights sections">
        {[
          "overview",
          "datasets",
          "matching",
          "assessment",
          "impact",
          "scenarios",
        ].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              setInspection(null);
            }}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <>
          <Panel>
            <div className="row-between">
              <h2>System health</h2>
              <Tag tone="blue">{data.backend_status}</Tag>
            </div>
            <div className="stats-row">
              {Object.entries(data.counts).map(([name, count]) => (
                <div key={name}>
                  <strong>{count}</strong>
                  <span>{name.replaceAll("_", " ")}</span>
                </div>
              ))}
            </div>
            <div className="detail-grid">
              <div>
                <h3>Scoring version</h3>
                <code>{data.model_version}</code>
                <h3>Scoring weights</h3>
                <pre>{JSON.stringify(data.scoring_weights, null, 2)}</pre>
              </div>
              <div>
                <h3>Dataset versions</h3>
                <pre>{JSON.stringify(data.dataset_versions, null, 2)}</pre>
                <h3>Last import</h3>
                <pre>{JSON.stringify(data.last_import, null, 2)}</pre>
              </div>
            </div>
            <details>
              <summary>Safe connectivity diagnostics</summary>
              <pre>
                {JSON.stringify(
                  { database: data.database, diagnostics: data.diagnostics },
                  null,
                  2,
                )}
              </pre>
            </details>
          </Panel>
          <Panel>
            <h2>Country coverage</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Dataset coverage</th>
                    <th>Evidence status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.countries.map((c) => (
                    <tr key={c.code}>
                      <td>
                        {c.name} ({c.code})
                      </td>
                      <td>
                        {c.code === "MY"
                          ? "Operational illustrative catalog"
                          : "Local datasets unavailable"}
                      </td>
                      <td>{c.evidence_status || "Unavailable"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel>
            <h2>Known limitations</h2>
            <ul className="simple-list">
              {data.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </Panel>
        </>
      ) : tab === "datasets" ? (
        <Panel>
          <h2>Dataset explorer</h2>
          <p>Browse non-private reference records. Ten records per page.</p>
          <div className="dataset-filters">
            <Field label="Dataset" htmlFor="entity">
              <select
                id="entity"
                value={entity}
                onChange={(e) => {
                  setEntity(e.target.value);
                  setPage(0);
                  setStatus("");
                  setVersion("");
                }}
              >
                {Object.keys(data.catalog).map((k) => (
                  <option value={k} key={k}>
                    {k.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Search records" htmlFor="dataset-search">
              <div className="search-field">
                <input
                  id="dataset-search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Find an ID, title, or source"
                />
                {query && (
                  <button
                    aria-label="Clear record search"
                    onClick={() => {
                      setQuery("");
                      setPage(0);
                      document.getElementById("dataset-search")?.focus();
                    }}
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            </Field>
            <Field label="Country" htmlFor="data-country">
              <select
                id="data-country"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All countries</option>
                {data.countries.map((c) => (
                  <option value={c.code} key={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Evidence status" htmlFor="data-status">
              <select
                id="data-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option value={s} key={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dataset version" htmlFor="data-version">
              <select
                id="data-version"
                value={version}
                onChange={(e) => {
                  setVersion(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All versions</option>
                {versions.map((s) => (
                  <option value={s} key={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Occupation" htmlFor="data-occ">
              <select
                id="data-occ"
                value={occupation}
                onChange={(e) => {
                  setOccupation(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All occupations</option>
                {occupations.map((o) => (
                  <option value={o.id} key={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="record-list">
            {filtered.slice(page * 10, page * 10 + 10).map((r, i) => (
              <details key={String(r.id || i)}>
                <summary>
                  {String(
                    r.title ||
                      r.name ||
                      r.description ||
                      r.id ||
                      `Record ${page * 10 + i + 1}`,
                  )}
                </summary>
                <pre>{JSON.stringify(r, null, 2)}</pre>
              </details>
            ))}
            {!filtered.length && (
              <Empty>
                No records match these filters. Clear the search or choose
                another dataset.
              </Empty>
            )}
          </div>
          <div className="row-between">
            <p>
              {filtered.length
                ? `${page * 10 + 1}–${Math.min(page * 10 + 10, filtered.length)} of ${filtered.length}`
                : "0 records"}
            </p>
            <div className="button-group">
              <Button
                small
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                small
                disabled={(page + 1) * 10 >= filtered.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Panel>
      ) : (
        <Panel>
          <h2>
            {tab === "matching"
              ? "Career matching inspector"
              : tab === "assessment"
                ? "Skill assessment inspector"
                : tab === "impact"
                  ? "AI impact inspector"
                  : "Scenario inspector"}
          </h2>
          <p>
            Run a reproducible inspection for a synthetic career starter
            interested in analytics, with self-reported Excel, communication,
            and SQL familiarity.
          </p>
          <p className="hint">
            Target occupation: Data Analyst. No professional experience; six
            study hours per week; no assessment results.
          </p>
          <Button
            primary
            disabled={busy}
            onClick={() => {
              void inspect(tab);
            }}
          >
            Run {tab} inspection
          </Button>
          {inspection ? (
            <pre className="inspector-output">
              {JSON.stringify(inspection, null, 2)}
            </pre>
          ) : (
            <Empty>
              Run the inspector to see factors, weights, evidence status,
              assumptions, and the calculated output.
            </Empty>
          )}
        </Panel>
      )}
    </div>
  );
}
