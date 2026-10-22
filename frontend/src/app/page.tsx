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
  type Assessment,
  type Task,
} from "@/lib/types";
import { Button, Icon } from "@/components/ui";
import { ProfileSetup, SkillReview } from "@/components/journey-profile";
import { CareerWorkspace } from "@/components/career-workspace";
import { Insights, type InsightsData } from "@/components/insights";

const steps = ["Your background", "Your skills", "Your next chapter"];
export default function Home() {
  const [stage, setStage] = useState(-1);
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
  const [selected, setSelected] = useState("");
  const [scenario, setScenario] = useState("moderate");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
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
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function bootstrap() {
    setLoading(true);
    await run(async () => {
      const [s, o, i] = await Promise.all([
        api<{ skills: Skill[] }>("skills"),
        api<{ occupations: Occupation[] }>("occupations"),
        api<InsightsData>("system/insights"),
      ]);
      setSkills(s.skills);
      setOccupations(o.occupations);
      setSystem(i);
    });
    setLoading(false);
  }
  useEffect(() => {
    void bootstrap();
  }, []);
  useEffect(() => {
    document.title = `${stage < 0 ? "Your next chapter" : stage === 3 ? "System data" : steps[stage]} | SHIFT//OS`;
  }, [stage]);
  function go(next: number) {
    setStage(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function setProfile(p: Profile) {
    latest.current++;
    setProfileState(p);
    if (stage !== 1) setAnalysis(null);
    setRecommendations(null);
    setGaps(null);
    setImpact(null);
    setRoadmap(null);
    setSimulation(null);
  }
  const request = (id = selected, p = profile, s = scenario) => ({
    profile: p,
    occupation_id: id || null,
    scenario: s,
  });
  async function upload(file?: File) {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
      setError("Choose a PDF, DOCX or TXT file under 5 MB.");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    const result = await run(() =>
      api<{
        skills: { skill_id: string; source_phrase: string }[];
        sections: Record<string, string[]>;
        profile_fields: Partial<Profile>;
      }>("cv/extract", body),
    );
    if (result) {
      const sections = result.sections;

      setProfile({
        ...profile,
        ...result.profile_fields,
        skill_ids: [
          ...new Set([
            ...profile.skill_ids,
            ...result.skills.map((s) => s.skill_id),
          ]),
        ],
        cv_evidence: result.skills.map((s) => ({
          skill_id: s.skill_id,
          source_phrase: s.source_phrase,
        })),
        education:
          profile.education ||
          sections.education?.join("; ").slice(0, 500) ||
          "",
        projects: profile.projects || sections.projects?.join("\n") || "",
        background:
          profile.background ||
          [
            ...(sections.experience || []),
            ...(sections.responsibilities || []),
          ].join("\n"),
      });
      setUploadName(file.name);
      setUploadMessage(
        `We found ${result.skills.length} skills and filled in the sections we could read. Review them and complete anything missing. Your CV file is not retained.`,
      );
      go(0);
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  async function reviewSkills() {
    if (profile.direction === "target" && !profile.occupation_id) {
      setError("Choose your target career to continue.");
      return;
    }
    if (
      !Number.isFinite(profile.weekly_hours) ||
      profile.weekly_hours < 1 ||
      profile.weekly_hours > 60
    ) {
      setError("Enter between 1 and 60 learning hours per week.");
      return;
    }
    const result = await run(() =>
      api<Analysis>("profiles/analyze", { profile }),
    );
    if (result) {
      const ids = [
        ...new Set([
          ...profile.skill_ids,
          ...result.skills.map((s) => s.skill_id),
        ]),
      ];
      setProfileState({ ...profile, skill_ids: ids });
      setAnalysis(result);
      go(1);
    }
  }
  async function careerData(id = "", s = scenario) {
    const generation = ++latest.current;
    const result = await run(async () => {
      const rec = await api<Recommendations>(
        "careers/recommend",
        request(id, profile, s),
      );
      const actual =
        id ||
        (profile.direction === "target" ? profile.occupation_id : null) ||
        rec.selected_occupation_id;
      const [gap, ai, compare] = await Promise.all([
        api<Gaps>("careers/skill-gaps", request(actual, profile, s)),
        api<Impact>(
          "ai-impact/analyze",
          request(
            actual,
            {
              ...profile,
              current_occupation_id: null,
              occupation_id: actual,
              task_ids: [],
            },
            s,
          ),
        ),
        api<Scenarios>("scenarios/compare", request(actual, profile, s)),
      ]);
      return { rec, actual, gap, ai, compare };
    });
    if (result && generation === latest.current) {
      setRecommendations(result.rec);
      setSelected(result.actual);
      setGaps(result.gap);
      setImpact(result.ai);
      setScenarios(result.compare);
      setScenario(s);
      setRoadmap(null);
      setSimulation(null);
      if (stage !== 2) go(2);
    }
  }
  async function assessed(a: Assessment) {
    const p = {
      ...profile,
      assessment_ids: [...profile.assessment_ids, a.assessment_id].slice(-20),
    };
    setProfile(p);
    const result = await run(() =>
      api<Analysis>("profiles/analyze", { profile: p }),
    );
    if (result) setAnalysis(result);
  }
  async function loadRoadmap() {
    const r = await run(() => api<Roadmap>("roadmaps/generate", request()));
    if (r) setRoadmap(r);
  }
  async function simulate(skill_id: string, target_level: number) {
    const r = await run(() =>
      api<Simulation>("skills/impact", {
        ...request(),
        skill_id,
        target_level,
      }),
    );
    if (r) setSimulation(r);
  }
  const progress = stage === 0 ? 12 : stage === 1 ? 50 : 100;
  return (
    <div className="shift-app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="wordmark"
            onClick={() => go(-1)}
            disabled={busy}
            aria-label="SHIFT OS home"
          >
            SHIFT<span>//</span>OS<span className="logo-dot">.</span>
          </button>
          <span className="header-caption">
            A little clarity. A better next step.
          </span>
          <button
            className="header-link"
            onClick={() => go(stage === -1 ? 0 : -1)}
            disabled={busy || loading}
          >
            {stage === -1 ? "Start your journey" : "Back to home"}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </header>
      {stage >= 0 && stage < 3 && (
        <div className="journey-strip">
          <div className="journey-inner">
            <div className="journey-caption">
              <span>YOUR CAREER JOURNEY</span>
              <span>{stage + 1} of 3</span>
            </div>
            <nav className="journey-steps" aria-label="Your progress">
              {steps.map((name, i) => (
                <button
                  key={name}
                  className={
                    stage === i ? "current" : stage > i ? "complete" : ""
                  }
                  aria-current={stage === i ? "step" : undefined}
                  disabled={busy || i > stage}
                  onClick={() => go(i)}
                >
                  <span>
                    {stage > i ? <Icon name="check" size={12} /> : `0${i + 1}`}
                  </span>
                  {name}
                </button>
              ))}
            </nav>
            <div
              className="journey-track"
              role="progressbar"
              aria-label="Career journey"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}
      <main
        id="main"
        className={stage === -1 ? "landing-main" : "journey-main"}
      >
        <div className="request-status" aria-live="polite">
          {busy && (
            <span>
              <span className="spinner" />{" "}
              {loading ? "Getting things ready…" : "Working on your next step…"}
            </span>
          )}
        </div>
        {error && (
          <div className="error-banner" role="alert">
            <div>{error}</div>
            <Button
              onClick={() =>
                loading || skills.length === 0 ? void bootstrap() : setError("")
              }
            >
              Try again
            </Button>
          </div>
        )}
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          aria-label="Upload your CV"
          accept=".pdf,.docx,.txt"
          onChange={(e) => void upload(e.target.files?.[0])}
          disabled={busy}
        />
        {stage === -1 && (
          <>
            <section className="landing-hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="tiny-star">✳</span> BUILT AROUND YOU
                </span>
                <h1>
                  Your next chapter
                  <br />
                  starts with <em>you.</em>
                </h1>
                <p>
                  You have more potential than a job title can say.
                  <br className="desktop-break" /> Discover where your skills
                  could take you—and how to get there.
                </p>
                <div className="hero-actions">
                  <Button
                    primary
                    onClick={() => fileInput.current?.click()}
                    disabled={busy || loading}
                  >
                    <Icon name="upload" size={18} /> Upload CV · quick start
                  </Button>
                  <Button onClick={() => go(0)} disabled={busy || loading}>
                    Start from scratch <Icon name="arrow" size={17} />
                  </Button>
                </div>
                <span className="hero-footnote">
                  PDF, DOCX or TXT · No account needed · Your CV stays private
                </span>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="orb orb-one" />
                <div className="orb orb-two" />
                <span className="art-cross">+</span>
                <div className="art-caption">THE FUTURE ISN’T FIXED.</div>
                <div className="future-card">
                  <div className="future-card-top">
                    <span className="mini-mark">S//</span>
                    <span>YOUR NEXT CHAPTER</span>
                    <span>↗</span>
                  </div>
                  <div className="future-card-body">
                    <div className="art-person">
                      <Icon name="profile" size={33} />
                    </div>
                    <div>
                      <span>Made for your potential</span>
                      <strong>A career that fits.</strong>
                    </div>
                  </div>
                  <div className="art-path">
                    <span />
                    <i />
                    <span />
                    <i />
                    <span />
                  </div>
                  <div className="art-card-bottom">
                    <span>Your skills</span>
                    <span>Your possibilities</span>
                    <span>Your plan</span>
                  </div>
                </div>
                <div className="art-note">
                  <Icon name="check" size={18} />
                  <span>
                    A clear next step.
                    <br />
                    <strong>A future on your terms.</strong>
                  </span>
                </div>
                <span className="art-index">01 / EXPLORE WHAT’S POSSIBLE</span>
              </div>
            </section>
            <section className="how-it-works" aria-label="How it works">
              <div className="how-heading">
                <span className="eyebrow">SMALL STEPS. REAL DIRECTION.</span>
                <h2>From “what now?” to “what’s next.”</h2>
              </div>
              <div className="how-grid">
                {[
                  {
                    title: "Start with your story",
                    text: "Upload your CV or fill in a few details. We’ll work with what you already know.",
                    icon: "profile",
                  },
                  {
                    title: "Get to know your skills",
                    text: "Rate your confidence. Take an optional short quiz for a clearer starting point.",
                    icon: "check",
                  },
                  {
                    title: "Find your next move",
                    text: "Explore career matches, build a learning roadmap and find places to apply.",
                    icon: "roadmap",
                  },
                ].map((item, i) => (
                  <div key={item.title} className="how-card">
                    <div className="how-card-top">
                      <Icon name={item.icon} size={23} />
                      <span>0{i + 1}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            </section>
            <div className="landing-note">
              <Icon name="info" size={17} />
              <p>
                Starting in Malaysia. Career matches are planning estimates to
                help you explore your options.
              </p>
            </div>
          </>
        )}
        {stage === 0 && (
          <ProfileSetup
            profile={profile}
            setProfile={setProfile}
            skills={skills}
            occupations={occupations}
            tasks={(system?.catalog?.tasks || []) as Task[]}
            busy={busy || loading}
            uploadName={uploadName}
            uploadMessage={uploadMessage}
            onUpload={() => fileInput.current?.click()}
            onContinue={() => void reviewSkills()}
          />
        )}
        {stage === 1 && (
          <SkillReview
            profile={profile}
            setProfile={setProfile}
            skills={skills}
            analysis={analysis}
            busy={busy}
            run={run}
            onAssessment={assessed}
            onBack={() => go(0)}
            onContinue={() => void careerData()}
          />
        )}
        {stage === 2 && recommendations && gaps && impact && (
          <CareerWorkspace
            profile={profile}
            skills={skills}
            occupations={occupations}
            recommendations={recommendations}
            gaps={gaps}
            impact={impact}
            scenarios={scenarios}
            selected={selected}
            scenario={scenario}
            onCareer={(id) => void careerData(id)}
            onScenario={(s) => void careerData(selected, s)}
            roadmap={roadmap}
            loadRoadmap={() => void loadRoadmap()}
            simulation={simulation}
            simulate={(id, level) => void simulate(id, level)}
            busy={busy}
            onBack={() => go(1)}
          />
        )}
        {stage === 3 && system && (
          <>
            <div className="page-intro">
              <span className="eyebrow">BEHIND THE RESULTS</span>
              <h1>System data</h1>
              <p>
                Explore the catalogue and the calculations behind your plan.
              </p>
            </div>
            <Insights
              data={system}
              occupations={occupations}
              run={run}
              busy={busy}
            />
          </>
        )}
      </main>
      <footer className="site-footer">
        <div>
          <span className="footer-brand">SHIFT//OS</span>
          <span>Your potential. Your direction.</span>
        </div>
        <button onClick={() => go(3)} disabled={busy}>
          System data & methodology <Icon name="link" size={13} />
        </button>
        <span>Made for your next chapter.</span>
      </footer>
    </div>
  );
}
