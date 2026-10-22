"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Field, Icon } from "@/components/ui";

type Source = { platform: string; name: string; url: string };
type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  posted_at: string | null;
  posted_label: string | null;
  salary: string | null;
  employment_type: string | null;
  arrangement: string | null;
  description: string | null;
  sources: Source[];
};
type Results = {
  jobs: Job[];
  providers: {
    name: string;
    status: "available" | "unavailable" | "not_configured";
    message: string;
  }[];
  fetched_at: string;
  cached: boolean;
  notice: string;
};
const labels: Record<string, string> = {
  all: "All levels",
  junior: "Junior",
  senior: "Senior",
  lead: "Lead",
  freelance: "Freelance",
  internship: "Internship",
};
const platformMarks: Record<string, string> = {
  linkedin: "in",
  jobstreet: "JS",
  indeed: "i",
  seek: "S",
};

function SourceBadge({ source }: { source: Source }) {
  return (
    <a
      className={`listing-source source-${source.platform}`}
      href={source.url}
      target="_blank"
      rel="noreferrer"
      title={`Open the original listing on ${source.name}`}
    >
      <span className="source-mark" aria-hidden="true">
        {platformMarks[source.platform] || <Icon name="employer" size={12} />}
      </span>
      <span>{source.name}</span>
      <Icon name="link" size={12} />
    </a>
  );
}

export default function JobsPage() {
  const [career, setCareer] = useState("Data Analyst");
  const [location, setLocation] = useState("Malaysia");
  const [level, setLevel] = useState("all");
  const [arrangement, setArrangement] = useState("any");
  const [platform, setPlatform] = useState("all");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCareer(params.get("career") || "Data Analyst");
    const value = params.get("arrangement") || "any";
    setArrangement(
      ["any", "remote", "hybrid", "onsite"].includes(value) ? value : "any",
    );
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setLoading(true);
    setResults(null);
    setError("");
    setExpanded(null);
    setPlatform("all");
    const timer = setTimeout(async () => {
      if (career.trim().length < 2 || location.trim().length < 2) {
        setError("Enter a career and location with at least two characters.");
        setLoading(false);
        return;
      }
      try {
        const data = await api<Results>(
          "jobs/search",
          {
            career: career.trim(),
            location: location.trim(),
            level,
            arrangement,
          },
          controller.signal,
        );
        if (!controller.signal.aborted) setResults(data);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error
              ? e.message
              : "We couldn’t retrieve job listings. Please try again.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [career, location, level, arrangement, ready, revision]);
  const jobs =
    results?.jobs.filter(
      (job) =>
        platform === "all" ||
        job.sources.some((source) => source.platform === platform),
    ) || [];
  const sources = [
    ...new Map(
      (results?.jobs || []).flatMap((job) =>
        job.sources.map((source) => [source.platform, source.name] as const),
      ),
    ).entries(),
  ];
  const unavailable =
    results?.providers.filter((p) => p.status === "unavailable") || [];
  const allUnavailable =
    results && !results.providers.some((p) => p.status === "available");
  return (
    <div className="shift-app jobs-app">
      <a href="#job-results" className="skip-link">
        Skip to job results
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="wordmark" href="/">
            SHIFT<span>//</span>OS<span className="logo-dot">.</span>
          </a>
          <span className="header-caption">
            Your next chapter. Real opportunities.
          </span>
          <Button
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else {
                window.close();
                setTimeout(() => {
                  window.location.href = "/";
                }, 100);
              }
            }}
          >
            Back to my career plan
          </Button>
        </div>
      </header>
      <main className="journey-main jobs-main">
        <div className="page-intro">
          <span className="eyebrow">YOUR CAREER, OUT IN THE WORLD</span>
          <h1>Find your next opportunity.</h1>
          <p>
            Explore openings related to your selected career. Every job takes
            you straight to the platform where it was found.
          </p>
        </div>
        <section className="job-search-panel">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setRevision((n) => n + 1);
            }}
          >
            <div className="job-search-fields">
              <Field label="Career or job title" htmlFor="job-title">
                <input
                  id="job-title"
                  value={career}
                  onChange={(e) => setCareer(e.target.value)}
                  minLength={2}
                  maxLength={150}
                />
              </Field>
              <Field label="Location" htmlFor="job-location">
                <input
                  id="job-location"
                  placeholder="Malaysia"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  minLength={2}
                  maxLength={150}
                />
              </Field>
              <Field label="Work arrangement" htmlFor="job-arrangement">
                <select
                  id="job-arrangement"
                  value={arrangement}
                  onChange={(e) => setArrangement(e.target.value)}
                >
                  <option value="any">Any arrangement</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On site</option>
                </select>
              </Field>
            </div>
            <div className="job-search-bottom">
              <fieldset>
                <legend>What kind of opportunity?</legend>
                <div className="job-filters">
                  {Object.entries(labels).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={level === id ? "selected" : ""}
                      aria-pressed={level === id}
                      onClick={() => setLevel(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Button primary type="submit">
                <Icon name="career" size={17} /> Search jobs
              </Button>
            </div>
          </form>
        </section>
        <section
          id="job-results"
          className="discovered-jobs"
          aria-label="Discovered job listings"
          aria-busy={loading}
        >
          <div className="job-results-heading">
            <div>
              <span className="eyebrow">OPPORTUNITIES TO EXPLORE</span>
              <h2>
                Openings for <span>{career || "your next career"}</span>
              </h2>
            </div>
            <span aria-live="polite">
              {loading
                ? "Searching job sources…"
                : `${jobs.length} ${jobs.length === 1 ? "opening" : "openings"} found`}
            </span>
          </div>
          {results && !loading && sources.length > 0 && (
            <div className="listing-toolbar">
              <div
                className="platform-tabs"
                role="group"
                aria-label="Filter listings by platform"
              >
                <button
                  aria-pressed={platform === "all"}
                  className={platform === "all" ? "selected" : ""}
                  onClick={() => setPlatform("all")}
                >
                  All platforms <span>{results.jobs.length}</span>
                </button>
                {sources.map(([id, name]) => (
                  <button
                    key={id}
                    aria-pressed={platform === id}
                    className={platform === id ? "selected" : ""}
                    onClick={() => setPlatform(id)}
                  >
                    <span
                      className={`platform-tab-mark source-${id}`}
                      aria-hidden="true"
                    >
                      {platformMarks[id] || "↗"}
                    </span>
                    {name}
                    <span>
                      {
                        results.jobs.filter((job) =>
                          job.sources.some((s) => s.platform === id),
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </div>
              <span className="retrieved-time">
                {results.cached ? "Recently retrieved" : "Retrieved"}{" "}
                {new Date(results.fetched_at).toLocaleTimeString("en-MY", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          {loading && (
            <div className="listing-loading" role="status">
              <span className="spinner" />
              <div>
                <strong>Looking for your next opportunity…</strong>
                <p>
                  Finding related openings and their original listing pages.
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="listing-empty" role="alert">
              <Icon name="info" size={28} />
              <h3>We couldn’t load the openings.</h3>
              <p>{error}</p>
              <Button onClick={() => setRevision((n) => n + 1)}>
                Try again
              </Button>
            </div>
          )}
          {!loading && !error && jobs.length === 0 && (
            <div className="listing-empty">
              <Icon name={allUnavailable ? "info" : "career"} size={30} />
              <h3>
                {allUnavailable
                  ? "Job sources are temporarily unavailable."
                  : "No matching openings this time."}
              </h3>
              <p>
                {allUnavailable
                  ? "We couldn’t retrieve listings from the connected sources. Try again in a moment."
                  : "Try another location, a broader job title or a different experience level."}
              </p>
              <Button onClick={() => setRevision((n) => n + 1)}>
                Search again
              </Button>
            </div>
          )}
          {!loading && !error && jobs.length > 0 && (
            <div className="job-listings">
              {jobs.map((job) => (
                <article className="job-listing" key={job.id}>
                  <div className="listing-company-icon" aria-hidden="true">
                    {job.company
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="listing-body">
                    <div className="listing-topline">
                      <span className="listing-company">{job.company}</span>
                      {(job.posted_label || job.posted_at) && (
                        <time dateTime={job.posted_at || undefined}>
                          {job.posted_label || job.posted_at}
                        </time>
                      )}
                    </div>
                    <h3>
                      <a
                        href={job.sources[0].url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {job.title}
                      </a>
                    </h3>
                    <div className="listing-metadata">
                      <span>
                        <Icon name="employer" size={14} />
                        {job.location}
                      </span>
                      {job.employment_type && (
                        <span>{job.employment_type}</span>
                      )}
                      {job.arrangement && <span>{job.arrangement}</span>}
                      {job.salary && (
                        <span className="listing-salary">{job.salary}</span>
                      )}
                    </div>
                    {job.description && (
                      <>
                        <p
                          className={`listing-description ${expanded === job.id ? "expanded" : ""}`}
                        >
                          {job.description}
                        </p>
                        <button
                          className="listing-expand"
                          onClick={() =>
                            setExpanded(expanded === job.id ? null : job.id)
                          }
                          aria-expanded={expanded === job.id}
                        >
                          {expanded === job.id
                            ? "Show less"
                            : "More about this role"}
                        </button>
                      </>
                    )}
                    <div className="listing-footer">
                      <div className="listing-sources">
                        <span className="found-on-label">Found on</span>
                        {job.sources.map((source) => (
                          <SourceBadge key={source.url} source={source} />
                        ))}
                      </div>
                      <a
                        className="listing-apply"
                        href={job.sources[0].url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View opening <Icon name="link" size={15} />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {!loading && results && unavailable.length > 0 && (
            <div className="listing-source-notice" role="status">
              <Icon name="info" size={17} />
              <p>
                {unavailable.map((p) => p.message).join(" ")}
                {jobs.length
                  ? " Showing openings from the sources that responded."
                  : ""}
              </p>
            </div>
          )}
        </section>
        <div className="job-search-note">
          <Icon name="info" size={21} />
          <div>
            <strong>Real listings. A clear source.</strong>
            <p>
              {results?.notice ||
                "Each opening shows its employer, location and original platform. Availability can change, so confirm details on the source page before applying."}{" "}
              {level === "freelance"
                ? "Freelance searches also include contract opportunities. "
                : ""}
              Some sources may require sign-in. Only information supplied by the
              source is shown.
            </p>
          </div>
        </div>
        <section className="application-tips">
          <span className="eyebrow">BEFORE YOU HIT APPLY</span>
          <div>
            <h2>A good match goes both ways.</h2>
            <p>
              Compare the responsibilities with your learning roadmap, tailor
              your CV to the role and check the employer’s own careers page
              before sharing personal details.
            </p>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <span className="footer-brand">SHIFT//OS</span>
          <span>Your potential. Your direction.</span>
        </div>
        <a href="/">
          Start a new career plan <Icon name="arrow" size={15} />
        </a>
        <span>Made for your next chapter.</span>
      </footer>
    </div>
  );
}
