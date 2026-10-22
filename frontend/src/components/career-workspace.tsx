"use client";
import { useEffect, useRef, useState } from "react";
import type {
  Profile,
  Skill,
  Occupation,
  Recommendations,
  Gaps,
  Impact,
  Scenarios,
  Roadmap,
  Simulation,
} from "@/lib/types";
import { Button, Icon, Tag, Field } from "./ui";

type Props = {
  profile: Profile;
  skills: Skill[];
  occupations: Occupation[];
  recommendations: Recommendations;
  gaps: Gaps;
  impact: Impact;
  scenarios: Scenarios | null;
  selected: string;
  scenario: string;
  onCareer: (id: string) => void;
  onScenario: (s: string) => void;
  roadmap: Roadmap | null;
  loadRoadmap: () => void;
  simulation: Simulation | null;
  simulate: (id: string, level: number) => void;
  busy: boolean;
  onBack: () => void;
};
export function CareerWorkspace({
  profile,
  skills,
  occupations,
  recommendations,
  gaps,
  impact,
  scenarios,
  selected,
  scenario,
  onCareer,
  onScenario,
  roadmap,
  loadRoadmap,
  simulation,
  simulate,
  busy,
  onBack,
}: Props) {
  const [all, setAll] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [simSkill, setSimSkill] = useState(skills[0]?.id || "excel");
  const [simLevel, setSimLevel] = useState(3);
  const roadmapRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const previousSelection = useRef(selected);
  useEffect(() => {
    setShowRoadmap(false);
    if (previousSelection.current !== selected) {
      detailRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
      previousSelection.current = selected;
    }
  }, [selected, scenario]);
  useEffect(() => {
    if (roadmap && showRoadmap)
      roadmapRef.current?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [roadmap, showRoadmap]);
  const careers = recommendations.careers;
  const target =
    profile.direction === "target"
      ? careers.find((c) => c.occupation_id === profile.occupation_id)
      : null;
  const featured = target || careers[0];
  const career = careers.find((c) => c.occupation_id === selected) || featured;
  if (!career || !featured)
    return <p>No careers found. Go back and update your profile.</p>;
  const alternatives = careers.filter(
    (c) => c.occupation_id !== featured.occupation_id,
  );
  const visible = all ? alternatives : alternatives.slice(0, target ? 5 : 4);
  const occupation = occupations.find((o) => o.id === selected);
  const reported = new Set(profile.skill_ids);
  const known = gaps.skills.filter((g) => reported.has(g.skill_id));
  const improve = gaps.skills.filter(
    (g) =>
      g.provisional_level === null || g.provisional_level < g.required_level,
  );
  const jobUrl = `/jobs?career=${encodeURIComponent(career.title)}&arrangement=${encodeURIComponent(profile.work_arrangement)}`;
  const choose = (id: string) => {
    if (id !== selected) onCareer(id);
    else
      detailRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
  };
  function openRoadmap() {
    setShowRoadmap(true);
    if (!roadmap) loadRoadmap();
  }
  return (
    <div className="career-page">
      <div className="page-intro">
        <span className="eyebrow">03 / YOUR NEXT CHAPTER</span>
        <div className="results-intro">
          <div>
            <h1>
              {target
                ? "Your goal. Your way forward."
                : "You have possibilities."}
            </h1>
            <p>
              {target
                ? "A closer look at your target career, with other possibilities to explore."
                : "Here’s where your skills and interests could take you. Choose a career to explore."}
            </p>
          </div>
          <span className="results-count">
            {careers.length} careers explored
            <br />
            <strong>One next step is enough.</strong>
          </span>
        </div>
      </div>
      <section className="featured-career">
        <div className="featured-main">
          <div className="featured-kicker">
            <span>
              {target ? "YOUR TARGET CAREER" : "01 / YOUR LEADING MATCH"}
            </span>
            <Tag>{target ? "Chosen by you" : "Best fit in this catalogue"}</Tag>
          </div>
          <h2>{featured.title}</h2>
          <p>
            {occupations.find((o) => o.id === featured.occupation_id)
              ?.description ||
              "Explore how your background connects to this career."}
          </p>
          <button
            className="featured-link"
            disabled={busy}
            onClick={() => choose(featured.occupation_id)}
          >
            {selected === featured.occupation_id
              ? "Explore your match below"
              : "Explore this career"}
            <Icon name="arrow" size={19} />
          </button>
        </div>
        <div className="featured-score">
          <span>YOUR CAREER FIT</span>
          <strong>
            {featured.fit}
            <small>%</small>
          </strong>
          <div className="featured-meter">
            <span style={{ width: `${featured.fit}%` }} />
          </div>
          <p>
            Planning estimate
            <br />
            Range: {featured.fit_range.join("–")}%
          </p>
        </div>
      </section>
      {alternatives.length > 0 && (
        <section className="alternative-careers">
          <div className="row-between">
            <h2>
              {target ? "Explore other careers" : "More directions to consider"}
            </h2>
            <span className="hint">
              {all ? careers.length : Math.min(careers.length, target ? 6 : 5)}{" "}
              of {careers.length} shown
            </span>
          </div>
          <div className="career-card-grid">
            {visible.map((c) => (
              <button
                type="button"
                key={c.occupation_id}
                disabled={busy}
                aria-pressed={selected === c.occupation_id}
                className={`career-match-card ${selected === c.occupation_id ? "selected" : ""}`}
                onClick={() => choose(c.occupation_id)}
              >
                <span className="match-rank">
                  {String(careers.indexOf(c) + 1).padStart(2, "0")} /{" "}
                  {selected === c.occupation_id ? "SELECTED" : "EXPLORE"}
                </span>
                <h3>{c.title}</h3>
                <div className="match-card-bottom">
                  <span>
                    <strong>{c.fit}%</strong> career fit
                  </span>
                  <Icon name="arrow" size={19} />
                </div>
              </button>
            ))}
          </div>
          {alternatives.length > (target ? 5 : 4) && (
            <button className="view-all-link" onClick={() => setAll(!all)}>
              {all
                ? "Show fewer careers"
                : `View all ${careers.length} career matches`}{" "}
              <span>{all ? "−" : "+"}</span>
            </button>
          )}
        </section>
      )}
      <section className="career-detail" ref={detailRef}>
        <div className="detail-heading">
          <span className="eyebrow">LET’S TAKE A CLOSER LOOK</span>
          <div className="row-between">
            <h2>{career.title}</h2>
            <Tag tone="blue">
              {target?.occupation_id === career.occupation_id
                ? "Your target"
                : "Your selected career"}
            </Tag>
          </div>
          <p>{occupation?.description}</p>
        </div>
        <div className="fit-metrics">
          <div>
            <span>Career fit</span>
            <strong>{career.fit}%</strong>
            <p>Skills, interests & learning feasibility</p>
          </div>
          <div>
            <span>Estimated skill alignment</span>
            <strong>{Math.round(career.factors.skills)}%</strong>
            <p>Includes your estimates & quiz evidence</p>
          </div>
          <div className="ai-metric">
            <span>AI task exposure</span>
            <strong>
              {impact.exposure_index === null
                ? "N/A"
                : `${impact.exposure_index}%`}
            </strong>
            <p>Illustrative task exposure, not job-loss probability</p>
          </div>
        </div>
        <div className="career-explanation">
          <h3>Why this could work for you</h3>
          <p>
            {profile.direction === "target" &&
            profile.occupation_id === career.occupation_id
              ? "This is the career you chose to work towards. "
              : "This career connects with your profile through your skills, interests and the time you can give to learning. "}
            {known.length
              ? `You already bring experience or interest in ${known.map((s) => s.name).join(", ")}. `
              : "You can build a starting point with the learning roadmap below. "}
            {improve.length
              ? `Your next opportunity is to develop ${improve
                  .slice(0, 3)
                  .map((s) => s.name)
                  .join(", ")}.`
              : "Your estimates cover the listed skills; use practical projects to strengthen that evidence."}
          </p>
        </div>
        <div className="skills-comparison">
          <div>
            <h3>
              <span className="skill-status-dot" />
              What you already bring
            </h3>
            <p className="hint">
              Skills you listed or found in your CV. Levels may still need
              checking.
            </p>
            <div className="result-chips">
              {known.length ? (
                known.map((s) => (
                  <Tag tone="blue" key={s.skill_id}>
                    {s.name}
                  </Tag>
                ))
              ) : (
                <p>
                  No matching skills listed yet. Every skill can be a place to
                  start.
                </p>
              )}
            </div>
          </div>
          <div>
            <h3>
              <span className="skill-status-dot outline" />
              Your next skills to build
            </h3>
            <p className="hint">
              Skills to learn, improve or verify for this career.
            </p>
            <div className="result-chips">
              {improve.length ? (
                improve.map((s) => (
                  <Tag key={s.skill_id}>
                    {s.name} · goal {s.required_level}/5
                  </Tag>
                ))
              ) : (
                <p>Your current estimates cover the listed requirements.</p>
              )}
            </div>
          </div>
        </div>
        <details className="career-method">
          <summary>Understand the fit, skill evidence & AI exposure</summary>
          <p>{career.explanation}</p>
          <p>
            Quiz-supported coverage: {career.coverage}%. Self estimates are
            included in planning but do not count as tested evidence. Career fit
            is a comparison index, not the probability of getting hired.
          </p>
          <p>{impact.uncertainty.join(" ")}</p>
          <p>
            AI exposure reflects the tasks AI could assist with or change. The
            catalogue is illustrative and cannot establish a percentage chance
            that this job will be replaced.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Starting estimate</th>
                  <th>Career needs</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {gaps.skills.map((g) => (
                  <tr key={g.skill_id}>
                    <td>{g.name}</td>
                    <td>{g.provisional_level ?? "Unknown"}</td>
                    <td>Level {g.required_level}</td>
                    <td>{g.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {impact.augmentation.length > 0 && (
            <>
              <h3>Where AI may help</h3>
              <ul>
                {impact.augmentation.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {impact.human_judgment.length > 0 && (
            <>
              <h3>Where human judgment matters</h3>
              <ul>
                {impact.human_judgment.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </details>
        <div className="career-next-actions">
          <div>
            <Icon name="roadmap" size={28} />
            <div>
              <h3>Make this possibility a plan.</h3>
              <p>A roadmap from where you are to where you want to be.</p>
            </div>
          </div>
          <Button primary onClick={openRoadmap} disabled={busy}>
            <Icon name="book" size={18} />
            {showRoadmap
              ? "View learning roadmap"
              : "Build my learning roadmap"}
          </Button>
          <a className="button" href={jobUrl} target="_blank" rel="noreferrer">
            Find jobs online <Icon name="link" size={16} />
          </a>
        </div>
      </section>
      {showRoadmap && (
        <div className="roadmap-section" ref={roadmapRef}>
          {roadmap ? (
            <LearningRoadmap roadmap={roadmap} jobUrl={jobUrl} />
          ) : (
            <div className="roadmap-loading">
              <Icon name="roadmap" size={30} />
              <h2>
                {busy
                  ? "Building your next steps…"
                  : "Your roadmap couldn’t be loaded."}
              </h2>
              {!busy && <Button onClick={loadRoadmap}>Try again</Button>}
            </div>
          )}
        </div>
      )}
      <details className="bonus-information career-tools">
        <summary>
          <span>Explore the assumptions</span>
          <span>AI scenarios & one-skill simulation</span>
        </summary>
        <div className="bonus-body">
          <Field label="AI adoption scenario" htmlFor="scenario">
            <select
              id="scenario"
              value={scenario}
              disabled={busy}
              onChange={(e) => onScenario(e.target.value)}
            >
              <option value="moderate">Moderate adoption</option>
              <option value="accelerated">Accelerated adoption</option>
            </select>
          </Field>
          {scenarios && (
            <p className="hint">
              {scenarios.scenarios
                .find((s) => s.id === scenario)
                ?.assumptions.join(" ")}
            </p>
          )}
          <div className="field-grid">
            <Field label="Skill to explore" htmlFor="sim-skill">
              <select
                id="sim-skill"
                value={simSkill}
                disabled={busy}
                onChange={(e) => setSimSkill(e.target.value)}
              >
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Possible future level" htmlFor="sim-level">
              <select
                id="sim-level"
                value={simLevel}
                disabled={busy}
                onChange={(e) => setSimLevel(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    Level {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Button disabled={busy} onClick={() => simulate(simSkill, simLevel)}>
            See what could change
          </Button>
          {simulation && (
            <div className="table-scroll">
              <p>
                This separate simulation changes one skill only. It does not
                update your profile or roadmap.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Career</th>
                    <th>Before</th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.occupations.map((o) => (
                    <tr key={o.occupation_id}>
                      <td>{o.title}</td>
                      <td>{o.before}%</td>
                      <td>{o.after}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>
      <div className="journey-actions">
        <Button onClick={onBack} disabled={busy}>
          Back to my skills
        </Button>
        <span>
          These are planning estimates based on an illustrative career
          catalogue.
        </span>
      </div>
    </div>
  );
}

function LearningRoadmap({
  roadmap,
  jobUrl,
}: {
  roadmap: Roadmap;
  jobUrl: string;
}) {
  function downloadJpg() {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    const context = canvas.getContext("2d");
    if (!context) return;
    const lines: { text: string; size: number; bold?: boolean }[] = [];
    function add(text: string, size = 23, bold = false) {
      context!.font = `${bold ? "bold " : ""}${size}px Arial`;
      const words = text.split(/\s+/);
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (context!.measureText(next).width > 1200) {
          lines.push({ text: line, size, bold });
          line = word;
        } else line = next;
      }
      if (line) lines.push({ text: line, size, bold });
      lines.push({ text: "", size: 12 });
    }
    add("SHIFT//OS  /  YOUR LEARNING ROADMAP", 22, true);
    add(roadmap.title, 46, true);
    add(
      `${roadmap.total_weeks} estimated weeks · ${roadmap.weekly_hours} hours per week · ${roadmap.total_hours} learning hours`,
    );
    let hours = 0;
    roadmap.milestones.forEach((m, i) => {
      const start = Math.floor(hours / roadmap.weekly_hours) + 1;
      hours += m.hours;
      add(
        `${i + 1}. ${m.skill_name} · Week ${start}–${Math.max(start, Math.ceil(hours / roadmap.weekly_hours))}`,
        30,
        true,
      );
      add(`Learn: ${m.resources[0]?.title || m.title}`);
      if (m.resources[0]) add(m.resources[0].url, 20);
      add(`Practise: ${m.exercise}`);
      add(`Check: ${m.verification}`);
    });
    add("Final project", 30, true);
    add(roadmap.portfolio_project);
    add(
      "Planning estimates, not deadlines. Allow additional time for the final project. Foundational quiz evidence and self estimates remain provisional.",
      19,
    );
    canvas.height = 160 + lines.reduce((n, l) => n + l.size * 1.55, 0);
    context.fillStyle = "#f5feff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0e2f76";
    context.fillRect(0, 0, canvas.width, 18);
    let y = 95;
    for (const line of lines) {
      context.font = `${line.bold ? "bold " : ""}${line.size}px Arial`;
      context.fillStyle = "#0e2f76";
      context.fillText(line.text, 100, y);
      y += line.size * 1.55;
    }
    const a = document.createElement("a");
    a.download = `shiftos-${roadmap.occupation_id}-roadmap.jpg`;
    a.href = canvas.toDataURL("image/jpeg", 0.95);
    a.click();
  }
  let hours = 0;
  return (
    <section className="roadmap-print">
      <div className="roadmap-heading">
        <div>
          <span className="eyebrow">FROM POSSIBILITY TO PROGRESS</span>
          <h2>Your learning roadmap</h2>
          <p>
            {roadmap.title} · {roadmap.weekly_hours} hours a week
          </p>
        </div>
        <div className="roadmap-export">
          <Button onClick={() => window.print()}>
            Save as PDF <Icon name="link" size={15} />
          </Button>
          <Button onClick={downloadJpg}>Download JPG</Button>
        </div>
      </div>
      <div className="roadmap-summary">
        <span>
          <strong>{roadmap.total_weeks}</strong> estimated weeks
        </span>
        <span>
          <strong>{roadmap.milestones.length}</strong> learning steps
        </span>
        <span>
          <strong>1</strong> portfolio project
        </span>
      </div>
      <div className="roadmap-timeline">
        {roadmap.milestones.map((m, i) => {
          const start = Math.floor(hours / roadmap.weekly_hours) + 1;
          hours += m.hours;
          return (
            <article className="roadmap-step" key={m.id}>
              <div className="roadmap-node">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="roadmap-step-body">
                <div className="row-between">
                  <span className="eyebrow">
                    WEEK {start}–
                    {Math.max(start, Math.ceil(hours / roadmap.weekly_hours))}
                  </span>
                  <span className="hint">
                    ~{m.hours} hours · goal level {m.target_level}
                  </span>
                </div>
                <h3>{m.skill_name}</h3>
                <div className="roadmap-step-grid">
                  <div>
                    <h4>Learn</h4>
                    {m.resources[0] ? (
                      <a
                        href={m.resources[0].url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {m.resources[0].title} <Icon name="link" size={14} />
                      </a>
                    ) : (
                      <p>Use guided practice for {m.skill_name}.</p>
                    )}
                    {m.resources[0] && (
                      <p className="hint">
                        {m.resources[0].provider} ·{" "}
                        {m.resources[0].cost || "See provider"}
                      </p>
                    )}
                    {m.resources.length > 1 && (
                      <details>
                        <summary>More learning resources</summary>
                        {m.resources.slice(1).map((r, j) => (
                          <p key={j}>
                            <a href={r.url} target="_blank" rel="noreferrer">
                              {r.title}
                            </a>
                          </p>
                        ))}
                      </details>
                    )}
                  </div>
                  <div>
                    <h4>Put it into practice</h4>
                    <p>{m.exercise}</p>
                  </div>
                </div>
                <div className="roadmap-check">
                  <Icon name="check" size={16} />
                  <p>
                    <strong>Ready for the next step?</strong> {m.verification}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
        <article className="roadmap-step portfolio-step">
          <div className="roadmap-node">
            <Icon name="career" size={20} />
          </div>
          <div className="roadmap-step-body">
            <span className="eyebrow">BRING IT ALL TOGETHER</span>
            <h3>Your portfolio project</h3>
            <p>{roadmap.portfolio_project}</p>
            <p className="hint">
              Save your work, explain your decisions and ask someone to review
              it.
            </p>
          </div>
        </article>
      </div>
      <p className="roadmap-time-note">
        Follow the steps in order. Times are estimates; allow extra time for the
        final project. Week ranges use your weekly learning hours.
      </p>
      <div className="roadmap-job-action">
        <span>Ready to see what’s out there?</span>
        <a
          className="button primary"
          href={jobUrl}
          target="_blank"
          rel="noreferrer"
        >
          Explore jobs online <Icon name="link" size={16} />
        </a>
      </div>
    </section>
  );
}
