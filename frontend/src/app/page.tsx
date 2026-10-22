"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  blankProfile,
  type Profile,
  type Skill,
  type Occupation,
  type Analysis,
  type Recommendations,
  type Gaps,
  type Impact,
  type Scenarios,
  type Roadmap,
  type Simulation,
  type Employers,
  type Task,
} from "@/lib/types";
import { Personal } from "@/components/personal";
import {
  CareerResults,
  RoadmapResults,
  EmployerResults,
} from "@/components/results";
import { Insights, type InsightsData } from "@/components/insights";
import { Button, Icon, Tag, Empty } from "@/components/ui";

const stages = [
  {
    title: "Your profile",
    sub: "Tell us about yourself",
    icon: "profile",
  },
  {
    title: "Career options",
    sub: "Compare jobs and skills",
    icon: "career",
  },
  {
    title: "Learning plan",
    sub: "Choose what to learn",
    icon: "roadmap",
  },
  {
    title: "Job options",
    sub: "See jobs to work towards",
    icon: "employer",
  },
];
const headings = [
  {
    kicker: "Step 1 of 4",
    title: "Find a career that fits you.",
    description:
      "Tell us about your skills, interests, and experience. We will help you choose what to do next.",
  },
  {
    kicker: "Step 2 of 4",
    title: "Compare career options.",
    description:
      "See which jobs may suit you, what skills they need, and how AI may change the work.",
  },
  {
    kicker: "Step 3 of 4",
    title: "Build your learning plan.",
    description:
      "Choose what to learn and how much time you can spend each week.",
  },
  {
    kicker: "Step 4 of 4",
    title: "Find jobs to work towards.",
    description:
      "See how the skills in your plan match example jobs. These are not real job openings.",
  },
];

export default function Home() {
  const [stage, setStage] = useState(0);
  const [profile, setProfileState] = useState<Profile>({ ...blankProfile });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  const [system, setSystem] = useState<InsightsData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recommendations, setRecommendations] =
    useState<Recommendations | null>(null);
  const [gaps, setGaps] = useState<Gaps | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [scenarios, setScenarios] = useState<Scenarios | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [employers, setEmployers] = useState<Employers | null>(null);
  const [selected, setSelected] = useState("");
  const [scenario, setScenario] = useState("moderate");
  const [milestones, setMilestones] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [initial, setInitial] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [demo, setDemo] = useState("");
  const latest = useRef(0);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The app could not connect. Try again.",
      );
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  async function bootstrap() {
    setInitial(true);
    await run(async () => {
      const [o, s, i] = await Promise.all([
        api<{ occupations: Occupation[] }>("occupations"),
        api<{ skills: Skill[] }>("skills"),
        api<InsightsData>("system/insights"),
      ]);
      setOccupations(o.occupations);
      setSkills(s.skills);
      setSystem(i);
    });
    setInitial(false);
  }
  useEffect(() => {
    void bootstrap();
  }, []); // Initial catalog load is read-only and repeatable.
  useEffect(() => {
    document.title =
      stage === 4
        ? "System data | SHIFT//OS"
        : `${stages[stage].title} | SHIFT//OS`;
  }, [stage]);
  function invalidate() {
    latest.current++;
    setRecommendations(null);
    setGaps(null);
    setImpact(null);
    setScenarios(null);
    setRoadmap(null);
    setSimulation(null);
    setEmployers(null);
    setMilestones([]);
  }
  function setProfile(p: Profile) {
    setProfileState(p);
    setAnalysis(null);
    setSelected("");
    invalidate();
    setMessage("");
  }
  const request = (p = profile, id = selected, s = scenario) => ({
    profile: p,
    occupation_id: id,
    scenario: s,
  });
  async function analyze(p = profile) {
    if (
      !Number.isFinite(p.weekly_hours) ||
      p.weekly_hours < 1 ||
      p.weekly_hours > 60
    ) {
      setError("Enter between 1 and 60 study hours per week.");
      document.getElementById("hours")?.focus();
      return;
    }
    if (p.employment_country !== "MY") {
      setError(
        "We do not have data for this country yet. Choose Malaysia to continue.",
      );
      return;
    }
    const result = await run(() =>
      api<Analysis>("profiles/analyze", { profile: p }),
    );
    if (result) {
      setAnalysis(result);
      setMessage(
        "Your profile is ready. Check your skill details, or continue without a skill test.",
      );
      setTimeout(
        () =>
          document.querySelector(".evidence-panel")?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
            block: "start",
          }),
        80,
      );
    }
  }
  async function careerData(id = selected, s = scenario, p = profile) {
    const generation = ++latest.current;
    const result = await run(async () => {
      const rec = await api<Recommendations>("careers/recommend", {
        profile: p,
        occupation_id: id || null,
        scenario: s,
      });
      const actual =
        p.direction === "target" && p.occupation_id
          ? p.occupation_id
          : id || rec.selected_occupation_id;
      const [gap, ai, compare] = await Promise.all([
        api<Gaps>("careers/skill-gaps", request(p, actual, s)),
        api<Impact>("ai-impact/analyze", request(p, actual, s)),
        api<Scenarios>("scenarios/compare", request(p, actual, s)),
      ]);
      return { rec, actual, gap, ai, compare };
    });
    if (result && generation === latest.current) {
      setRecommendations(result.rec);
      setSelected(result.actual);
      setGaps(result.gap);
      setImpact(result.ai);
      setScenarios(result.compare);
      return true;
    }
    return false;
  }
  function scrollTop() {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.getElementById("main")?.focus();
  }
  async function navigate(next: number) {
    if (busy) return;
    if (next === 0 || next === 4) {
      setStage(next);
      scrollTop();
      return;
    }
    if (!analysis) {
      setError("Create your profile in step 1 before continuing.");
      setStage(0);
      return;
    }
    if (next === 1) {
      if (await careerData()) {
        setStage(1);
        scrollTop();
      }
    }
    if (next === 2) {
      if (roadmap) {
        setStage(2);
        scrollTop();
        return;
      }
      const result = await run(() =>
        api<Roadmap>("roadmaps/generate", request()),
      );
      if (result) {
        setSelected(result.occupation_id);
        setRoadmap(result);
        setMilestones(result.milestones.map((m) => m.id));
        setSimulation(null);
        setEmployers(null);
        setStage(2);
        scrollTop();
      }
    }
    if (next === 3) {
      if (!roadmap) {
        setError("Create your learning plan before viewing job options.");
        return;
      }
      const result = await run(() =>
        api<Employers>("employers/match", {
          ...request(),
          milestone_ids: milestones,
        }),
      );
      if (result) {
        setEmployers(result);
        setStage(3);
        scrollTop();
      }
    }
  }
  async function changeCareer(id: string) {
    let p = profile;
    if (profile.direction === "target") {
      p = { ...profile, occupation_id: id };
    }
    if (await careerData(id, scenario, p)) {
      setProfileState(p);
      setRoadmap(null);
      setEmployers(null);
      setSimulation(null);
      setMilestones([]);
    }
  }
  async function changeScenario(s: string) {
    if (await careerData(selected, s)) {
      setScenario(s);
      setRoadmap(null);
      setEmployers(null);
      setSimulation(null);
      setMilestones([]);
    }
  }
  async function assessed(id: string) {
    const p = {
      ...profile,
      assessment_ids: [...new Set([...profile.assessment_ids, id])],
    };
    setProfileState(p);
    invalidate();
    const result = await run(() =>
      api<Analysis>("profiles/analyze", { profile: p }),
    );
    if (result) {
      setAnalysis(result);
      setMessage(
        "Your skill test result is saved. Your career options will use this result.",
      );
    } else {
      setMessage(
        "Your skill test is complete. Check your profile again to see the result.",
      );
    }
  }
  async function simulate(skill_id: string, target_level: number) {
    const result = await run(() =>
      api<Simulation>("skills/impact", {
        ...request(),
        skill_id,
        target_level,
      }),
    );
    if (result) setSimulation(result);
  }
  function loadDemo(value: string) {
    setDemo(value);
    if (!value) return;
    const p: Profile = {
      ...blankProfile,
      reported_experience: {},
      skill_ids: ["excel", "communication"],
      interests: ["analytics"],
      education: "Undergraduate business student",
      background:
        "Example student profile. Used Excel to manage a student club budget.",
      projects: "Used Excel tables in a class project.",
    };
    if (value === "professional")
      Object.assign(p, {
        career_stage: "professional",
        education: "Diploma in Business Administration",
        experience_years: 4,
        current_occupation_id: "admin-assistant",
        background:
          "Example office worker. I prepare reports in Excel, arrange meetings, and speak with colleagues. I have studied SQL with help.",
        skill_ids: ["excel", "communication", "sql"],
        reported_experience: { sql: "studied" },
        interests: ["business", "analytics"],
      });
    if (value === "target")
      Object.assign(p, {
        direction: "target",
        occupation_id: "data-analyst",
        education: "Recent computing graduate",
        background:
          "Example graduate profile. I built a Python project and studied SQL.",
        projects: "Used Python to clean and summarise a public dataset.",
        skill_ids: ["python", "sql", "excel"],
        interests: ["analytics", "technology"],
      });
    setProfile(p);
    setStage(0);
    setMessage(
      "An example profile is ready. You can change any detail before checking it.",
    );
  }
  const heading =
    stage === 4
      ? {
          kicker: "System data",
          title: "See how the app works.",
          description:
            "Check the example data and the rules used to compare careers and skills.",
        }
      : headings[stage];
  const tasks = (system?.catalog?.tasks || []) as Task[];
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          type="button"
          onClick={() => {
            void navigate(0);
          }}
          aria-label="SHIFT OS home"
          disabled={busy}
        >
          SHIFT<span>//</span>OS<span className="brand-period">.</span>
        </button>
        <div className="sidebar-caption">Career planning</div>
        <div className="journey-label">YOUR CAREER PLAN</div>
        <nav aria-label="Career planning steps">
          {stages.map((s, i) => (
            <button
              key={s.title}
              className={`nav-item ${stage === i ? "active" : ""}`}
              aria-current={stage === i ? "step" : undefined}
              onClick={() => {
                void navigate(i);
              }}
              disabled={busy}
            >
              <span className="nav-icon">
                <Icon name={s.icon} />
              </span>
              <span>
                <strong>{s.title}</strong>
                <small>{s.sub}</small>
              </span>
              <span className="nav-step">{i + 1}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`insights-link ${stage === 4 ? "active" : ""}`}
            onClick={() => {
              void navigate(4);
            }}
            disabled={busy}
          >
            <Icon name="insights" />
            System data
          </button>
          <div className="workspace-note">
            <span className="status-dot" />
            <div>
              <strong>Malaysia</strong>
              <small>Example data</small>
            </div>
          </div>
          <p className="sidebar-version">SHIFT//OS · Hackathon edition</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Career plan <span>/</span>{" "}
            {stage === 4 ? "System data" : stages[stage].title}
          </span>
          <div className="topbar-right">
            <span className="market-label">
              Malaysia <Tag>MY</Tag>
            </span>
            <span className="session-label">This session</span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">{heading.kicker}</p>
              <h1>{heading.title}</h1>
              <p className="page-description">{heading.description}</p>
            </div>
            {stage < 4 && (
              <div className="stage-indicator">
                <span>{String(stage + 1).padStart(2, "0")}</span>
                <span> / 04</span>
              </div>
            )}
          </div>
          {stage === 0 && (
            <div className="demo-toolbar">
              <p>
                <Icon name="info" size={16} /> Want to try the app? Use an
                example profile.
              </p>
              <select
                aria-label="Load example profile"
                value={demo}
                disabled={busy}
                onChange={(e) => loadDemo(e.target.value)}
              >
                <option value="">Choose an example</option>
                <option value="starter">Student or first job</option>
                <option value="professional">Office worker</option>
                <option value="target">Wants to be a Data Analyst</option>
              </select>
            </div>
          )}
          <div className="status-area" aria-live="polite" aria-atomic="true">
            {busy ? (
              <div className="status-message">
                <span className="spinner" />
                Checking your details...
              </div>
            ) : message ? (
              <div className="status-message">
                <Icon name="check" size={16} />
                {message}
              </div>
            ) : null}
          </div>
          {error && (
            <div className="error-banner" id="profile-error" role="alert">
              <Icon name="info" />
              <div>
                <strong>This step did not work.</strong>
                <p>{error}</p>
              </div>
              <Button small onClick={() => setError("")}>
                Close message
              </Button>
            </div>
          )}
          {initial ? (
            <div className="initial-loading">
              <span className="spinner" />
              <h2>Loading the app</h2>
              <p>Getting the job and skill information.</p>
            </div>
          ) : !system ? (
            <div className="empty">
              <h2>The app could not load</h2>
              <p>Your entries are still here. Try again in a moment.</p>
              <Button
                primary
                onClick={() => {
                  void bootstrap();
                }}
                disabled={busy}
              >
                Try again
              </Button>
            </div>
          ) : (
            <>
              {stage === 0 && (
                <Personal
                  key={demo}
                  profile={profile}
                  setProfile={setProfile}
                  skills={skills}
                  occupations={occupations}
                  analysis={analysis}
                  onAnalyze={() => {
                    void analyze();
                  }}
                  onContinue={() => {
                    void navigate(1);
                  }}
                  busy={busy}
                  tasks={tasks}
                  run={run}
                  onAssessment={assessed}
                />
              )}
              {stage === 1 &&
                (recommendations ? (
                  <CareerResults
                    recommendations={recommendations}
                    gaps={gaps}
                    impact={impact}
                    scenarios={scenarios}
                    selected={selected}
                    select={(id) => {
                      void changeCareer(id);
                    }}
                    scenario={scenario}
                    setScenario={(s) => {
                      void changeScenario(s);
                    }}
                    busy={busy}
                    skills={skills}
                    onContinue={() => {
                      void navigate(2);
                    }}
                  />
                ) : (
                  <Empty>Complete your profile to see career options.</Empty>
                ))}
              {stage === 2 && roadmap && (
                <RoadmapResults
                  roadmap={roadmap}
                  selectedMilestones={milestones}
                  toggleMilestone={(id) => {
                    setMilestones((m) =>
                      m.includes(id) ? m.filter((x) => x !== id) : [...m, id],
                    );
                    setEmployers(null);
                  }}
                  simulation={simulation}
                  simulate={(id, level) => {
                    void simulate(id, level);
                  }}
                  busy={busy}
                  skills={skills}
                  onContinue={() => {
                    void navigate(3);
                  }}
                />
              )}
              {stage === 3 && employers && (
                <EmployerResults employers={employers} skills={skills} />
              )}
              {stage === 4 && (
                <Insights
                  data={system}
                  occupations={occupations}
                  run={run}
                  busy={busy}
                />
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>SHIFT//OS</span>
            <span>Plan your career with clear information.</span>
            <span>Malaysia · English</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
