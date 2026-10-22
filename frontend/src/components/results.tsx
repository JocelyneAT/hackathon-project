"use client";
import { useState } from "react";
import type {
  Recommendations,
  Gaps,
  Impact,
  Scenarios,
  Roadmap,
  Simulation,
  Employers,
  Skill,
} from "@/lib/types";
import { Button, Panel, Tag, Icon, Note, Empty, List, Field } from "./ui";

const label = (id: string, skills: Skill[]) =>
  skills.find((s) => s.id === id)?.name || id;
const levelNames: Record<number, string> = {
  1: "Know the basics",
  2: "Use with some help",
  3: "Do common tasks on your own",
  4: "Solve harder problems",
  5: "Design advanced solutions",
};
const plainMilestone = (name: string) =>
  name
    .replace(/^Verify, then develop /, "Check and learn ")
    .replace(/^Develop /, "Improve ");

export function CareerResults({
  recommendations,
  gaps,
  impact,
  scenarios,
  selected,
  select,
  scenario,
  setScenario,
  busy,
  skills,
  onContinue,
}: {
  recommendations: Recommendations;
  gaps: Gaps | null;
  impact: Impact | null;
  scenarios: Scenarios | null;
  selected: string;
  select: (id: string) => void;
  scenario: string;
  setScenario: (v: string) => void;
  busy: boolean;
  skills: Skill[];
  onContinue: () => void;
}) {
  const career = recommendations.careers.find(
    (c) => c.occupation_id === selected,
  );
  const comparison = scenarios?.comparisons.find(
    (c) => c.occupation_id === selected,
  );
  return (
    <div className="stack">
      <div className="row-between scenario-toolbar">
        <div>
          <span className="overline">How fast could AI use grow?</span>
          <p>Try two examples to see how your plan could change.</p>
        </div>
        <div className="segmented">
          <button
            disabled={busy}
            aria-pressed={scenario === "moderate"}
            onClick={() => setScenario("moderate")}
          >
            Gradual change
          </button>
          <button
            disabled={busy}
            aria-pressed={scenario === "accelerated"}
            onClick={() => setScenario("accelerated")}
          >
            Faster change
          </button>
        </div>
      </div>
      <Note title="About these results">
        These scores help you compare career options. They do not tell you
        whether you will get a job. Some skills still need to be checked. The
        job and AI task details are examples for this demo.
      </Note>
      <div className="career-layout">
        <Panel className="career-list">
          <div className="row-between">
            <h2>Jobs to consider</h2>
            <Tag>{recommendations.careers.length} options</Tag>
          </div>
          <p>Choose a job to see the skills it needs.</p>
          {recommendations.careers.map((c, i) => (
            <button
              key={c.occupation_id}
              className={`career-option ${selected === c.occupation_id ? "selected" : ""}`}
              onClick={() => select(c.occupation_id)}
              disabled={busy}
              aria-pressed={selected === c.occupation_id}
            >
              <span className="career-rank">{i + 1}</span>
              <div>
                <strong>{c.title}</strong>
                <span>Career fit score</span>
              </div>
              <b>{c.fit}%</b>
            </button>
          ))}
        </Panel>
        {career && (
          <Panel className="career-detail">
            <div className="row-between">
              <Tag tone="blue">Selected job</Tag>
              <Icon name="career" size={24} />
            </div>
            <h2 className="role-title">{career.title}</h2>
            <p>
              Based on your skill evidence, interests, and time available to
              learn.
            </p>
            <div className="fit-block">
              <div>
                <strong>
                  {career.fit}
                  <small>%</small>
                </strong>
                <span>Career fit</span>
              </div>
              <div>
                <strong>
                  {career.coverage}
                  <small>%</small>
                </strong>
                <span>Job skills covered</span>
              </div>
            </div>
            <p className="hint">
              A short skill check gives an estimate. Skills you have not checked
              remain unknown.
            </p>
            <h3>Skills you can build on</h3>
            <List
              items={career.matching_skills.map((id) => label(id, skills))}
              empty="Check a skill to get a clearer result. Your interests and study time still help us suggest options."
            />
            <h3>Skills to check</h3>
            <div className="skill-options">
              {career.unverified_skills.map((s) => (
                <Tag key={s}>{label(s, skills)} · not checked</Tag>
              ))}
            </div>
            <h3>What we know about job demand</h3>
            <p>We do not have verified job-demand data for this role yet.</p>
            <p className="hint">
              You do not need work experience to consider this career. Each
              employer may have its own entry requirements.
            </p>
          </Panel>
        )}
      </div>
      {gaps && (
        <Panel>
          <div className="section-heading">
            <span className="section-number">01</span>
            <div>
              <h2>Skills this job needs</h2>
              <p>See what to check or practise next.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Job needs</th>
                  <th>Your level</th>
                  <th>Next step</th>
                </tr>
              </thead>
              <tbody>
                {gaps.skills.map((s) => (
                  <tr key={s.skill_id}>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td>
                      Level {s.required_level}
                      <br />
                      <span className="hint">
                        {levelNames[s.required_level]}
                      </span>
                    </td>
                    <td>
                      {s.provisional_level === null
                        ? "Not checked"
                        : `Estimated level ${s.provisional_level}`}
                    </td>
                    <td>
                      <Tag
                        tone={s.status === "provisional" ? "blue" : "neutral"}
                      >
                        {s.status === "unverified"
                          ? "Check this skill"
                          : s.status === "provisional"
                            ? "Likely meets this need"
                            : "Keep practising"}
                      </Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">
            Levels go from 1 (basic concepts) to 5 (advanced work). Our short
            checks cover only basic skills. They do not prove that you can do
            the whole job.
          </p>
        </Panel>
      )}
      {impact && (
        <Panel>
          <div className="section-heading">
            <span className="section-number">02</span>
            <div>
              <h2>How AI may affect this work</h2>
              <p>Tasks for: {impact.title}</p>
            </div>
            <Tag>Example ratings</Tag>
          </div>
          <div className="impact-layout">
            <div className="exposure-block">
              <strong>
                {impact.exposure_index === null
                  ? "Not enough data"
                  : impact.exposure_index}
                <small>{impact.exposure_index === null ? "" : "/100"}</small>
              </strong>
              <h3>AI task score</h3>
              <p>
                A higher score means AI may be able to do more of these example
                tasks. It does not tell you whether your job will disappear.
              </p>
            </div>
            <div>
              <h3>How AI can help</h3>
              <List items={impact.augmentation} />
              <h3>Where people still make decisions</h3>
              <List items={impact.human_judgment} />
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>AI task rating</th>
                </tr>
              </thead>
              <tbody>
                {impact.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>{t.description}</td>
                    <td>{Math.round(t.exposure * 100)} / 100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details>
            <summary>How this score is worked out</summary>
            <p>
              Each task has an example AI rating. More important tasks count
              more towards the total. These are planning examples, not measured
              job-loss rates.
            </p>
          </details>
        </Panel>
      )}
      {comparison && (
        <Panel>
          <div className="section-heading">
            <span className="section-number">03</span>
            <div>
              <h2>How the plan could change</h2>
              <p>Two examples for {comparison.title}. Neither is a forecast.</p>
            </div>
          </div>
          <div className="scenario-columns">
            <div>
              <h3>Gradual change</h3>
              <p>
                AI use grows more slowly. You have more time to learn and adapt.
              </p>
              <p className="scenario-score">
                Career fit: <strong>{comparison.moderate}%</strong>
              </p>
              <h4>Skills to focus on</h4>
              <List
                items={(scenarios?.priorities.moderate || [])
                  .slice(0, 3)
                  .map((id) => label(id, skills))}
              />
            </div>
            <div>
              <h3>Faster change</h3>
              <p>
                AI use grows faster. The plan gives more attention to checking
                AI results and working with new tools.
              </p>
              <p className="scenario-score">
                Career fit: <strong>{comparison.accelerated}%</strong>
              </p>
              <h4>Skills to focus on</h4>
              <List
                items={(scenarios?.priorities.accelerated || [])
                  .slice(0, 3)
                  .map((id) => label(id, skills))}
              />
            </div>
          </div>
          <p className="hint">
            Score change: {comparison.difference > 0 ? "+" : ""}
            {comparison.difference} points. These examples change the learning
            priorities and study time used in the calculation.
          </p>
        </Panel>
      )}
      {career && career.sdgs.length > 0 && (
        <Panel>
          <h2>How this can help others</h2>
          <div className="sdg-list">
            {career.sdgs.map((sdg, i) => (
              <div key={i}>
                <Tag>
                  UN Goal {String(sdg.sdg || sdg.sdg_number || sdg.goal || "")}{" "}
                  · Target {String(sdg.target || sdg.target_id || "")}
                </Tag>
                <p>
                  {String(sdg.sdg || sdg.sdg_number || sdg.goal) === "4"
                    ? "Learning useful skills can help people prepare for work."
                    : String(sdg.explanation || sdg.rationale || "")}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Panel>
        <details>
          <summary>Where this information comes from</summary>
          <p className="hint">
            Score method: {recommendations.model_version}. Unknown skills use a
            broad planning range, so a short skill check can change the result.
          </p>
          <p className="hint">
            Possible career fit range for this job: {career?.fit_range[0]}–
            {career?.fit_range[1]}%. This is not a chance of getting hired.
          </p>
          {career?.sources.map((s, i) => (
            <p key={i}>
              {s.url || s.source_url ? (
                <a
                  href={s.url || s.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.name || s.title || s.id} <Icon name="link" size={13} />
                </a>
              ) : (
                s.name || s.title || s.id
              )}
            </p>
          ))}
        </details>
      </Panel>
      <div className="stage-footer">
        <p>
          Chosen job: <strong>{career?.title}</strong>
        </p>
        <Button primary disabled={busy} onClick={onContinue}>
          Make my learning plan
          <Icon name="arrow" size={17} />
        </Button>
      </div>
    </div>
  );
}

export function RoadmapResults({
  roadmap,
  selectedMilestones,
  toggleMilestone,
  simulation,
  simulate,
  busy,
  skills,
  onContinue,
}: {
  roadmap: Roadmap;
  selectedMilestones: string[];
  toggleMilestone: (id: string) => void;
  simulation: Simulation | null;
  simulate: (id: string, level: number) => void;
  busy: boolean;
  skills: Skill[];
  onContinue: () => void;
}) {
  const [simSkill, setSimSkill] = useState(
    roadmap.milestones[0]?.skill_id || "sql",
  );
  const [level, setLevel] = useState(3);
  return (
    <div className="stack">
      <Panel className="roadmap-overview">
        <div>
          <Tag tone="blue">Your chosen job</Tag>
          <h2 className="role-title">{roadmap.title}</h2>
          <p>Follow these steps to build the skills this job needs.</p>
        </div>
        <div className="duration">
          <strong>
            {roadmap.total_weeks}
            <small> weeks</small>
          </strong>
          <span>
            About {roadmap.total_hours} hours · {roadmap.weekly_hours} hours a
            week
          </span>
        </div>
      </Panel>
      <Note title="Choose what you plan to learn">
        Tick the steps you want to complete. We will use only those steps when
        comparing job options. Finishing a course does not automatically prove a
        skill.
      </Note>
      <div className="milestone-list">
        {roadmap.milestones.map((m, i) => (
          <Panel className="milestone" key={m.id}>
            <div className="milestone-index">{i + 1}</div>
            <div className="milestone-body">
              <div className="row-between">
                <Tag>
                  {m.current_level === null
                    ? "Check your level first"
                    : "More practice needed"}
                </Tag>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={selectedMilestones.includes(m.id)}
                    onChange={() => toggleMilestone(m.id)}
                  />
                  Include in my plan
                </label>
              </div>
              <h2>
                {m.current_level === null
                  ? `Check and learn ${m.skill_name}`
                  : `Improve ${m.skill_name}`}
              </h2>
              <div className="milestone-meta">
                <span>Goal: {levelNames[m.target_level]}</span>
                <span>
                  About {m.hours} hours · {m.weeks} weeks
                </span>
              </div>
              {m.prerequisites.length > 0 && (
                <p className="hint">
                  Learn these first:{" "}
                  {m.prerequisites.map((id) => label(id, skills)).join(", ")}
                </p>
              )}
              <p>
                <strong>Try this:</strong> Use {m.skill_name} in a small
                project. Show what you did and explain your choices.
              </p>
              <p>
                <strong>Check your progress:</strong> Take a skill check if one
                is available, or ask someone to review your work.
              </p>
              <div className="resource-list">
                {m.resources.length ? (
                  m.resources.map((r, j) => (
                    <a
                      className="resource"
                      key={j}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="book" />
                      <div>
                        <strong>{r.title}</strong>
                        <span>
                          {r.provider} ·{" "}
                          {r.cost?.toLowerCase() === "paid" ? "Paid" : "Free"}
                          {r.hours ? ` · about ${r.hours} hours` : ""}
                        </span>
                      </div>
                      <Icon name="link" size={16} />
                    </a>
                  ))
                ) : (
                  <p className="hint">
                    We have not added a course for this skill within your budget
                    yet. Start with the practice task above.
                  </p>
                )}
              </div>
            </div>
          </Panel>
        ))}
      </div>
      {!roadmap.milestones.length && (
        <Panel>
          <Empty>
            Your checked skills appear to cover the skills in this example job.
            Build a work sample and check the employer's other entry
            requirements.
          </Empty>
        </Panel>
      )}
      <Panel className="portfolio">
        <Icon name="career" size={28} />
        <div>
          <Tag>A project to try</Tag>
          <h2>Show what you can do</h2>
          <p>{roadmap.portfolio_project}</p>
          <p className="hint">
            Keep a work sample and explain what you did. It can help someone
            review your skills.
          </p>
        </div>
      </Panel>
      <Panel>
        <div className="section-heading">
          <span className="section-number">
            <Icon name="insights" size={17} />
          </span>
          <div>
            <h2>What if I learn this skill?</h2>
            <p>
              Choose one skill and a level to see which job needs it could
              cover.
            </p>
          </div>
        </div>
        <div className="simulator-controls">
          <Field label="Skill to learn" htmlFor="sim-skill">
            <select
              id="sim-skill"
              value={simSkill}
              onChange={(e) => setSimSkill(e.target.value)}
            >
              {skills.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Level you plan to reach" htmlFor="sim-level">
            <select
              id="sim-level"
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  Level {n}: {levelNames[n]}
                </option>
              ))}
            </select>
          </Field>
          <Button
            primary
            disabled={busy}
            onClick={() => simulate(simSkill, level)}
          >
            See what could change
          </Button>
        </div>
        {simulation && (
          <>
            <Note>
              This example changes only {label(simulation.skill_id, skills)} to
              level {simulation.target_level}. Your other skills stay the same.
              It does not change your checked skill record or promise a job.
            </Note>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Job skills covered now</th>
                    <th>After learning</th>
                    <th>Extra needs met</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.occupations.map((o) => (
                    <tr key={o.occupation_id}>
                      <td>{o.title}</td>
                      <td>{o.before}%</td>
                      <td>
                        <strong>{o.after}%</strong>
                      </td>
                      <td>{o.additional_requirements}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">
              Only{" "}
              {simulation.modified_skills
                .map((id) => label(id, skills))
                .join(", ")}{" "}
              changed in this example. Unknown skills remain unknown.
            </p>
          </>
        )}
      </Panel>
      <details className="standalone-details">
        <summary>How we estimate the time</summary>
        <p>
          These study times are estimates. For a skill you have not checked, we
          start with a basic level when planning the hours. A skill check may
          show that you need less study. The faster-change example includes more
          practice with AI tools.
        </p>
      </details>
      <div className="stage-footer">
        <p>
          <strong>{selectedMilestones.length}</strong> learning steps selected
        </p>
        <Button primary disabled={busy} onClick={onContinue}>
          See job options
          <Icon name="arrow" size={17} />
        </Button>
      </div>
    </div>
  );
}

export function EmployerResults({
  employers,
  skills,
}: {
  employers: Employers;
  skills: Skill[];
}) {
  const summary = employers.summary;
  return (
    <div className="stack">
      <Note title="Jobs to work towards">
        These example jobs assume you complete the learning steps you selected
        and can show the new skills. The companies and roles are made-up
        examples, not real job openings. The score is a skill match, not your
        chance of getting hired.
      </Note>
      <div className="employer-grid">
        {employers.roles.map((role) => (
          <Panel key={role.id} className="employer-card">
            <div className="row-between">
              <div className="company-mark">
                <Icon name="employer" size={24} />
              </div>
              <Tag>Example job</Tag>
            </div>
            <p className="company-name">{role.employer_name}</p>
            <h2>{role.title}</h2>
            <p>
              {role.location} · {role.country}
            </p>
            <div className="employer-fit">
              <strong>
                {role.fit === null ? "Not enough data" : `${role.fit}%`}
              </strong>
              <span>Skill match after your learning plan</span>
            </div>
            <h3>Skills your plan would cover</h3>
            <List
              items={role.requirements_satisfied}
              empty="Select learning steps to see which skills they would cover."
            />
            <h3>Skills still needed</h3>
            <List
              items={role.remaining_requirements}
              empty="Your selected plan covers the listed skills in this example."
            />
            <div className="eligibility">
              <p>
                <strong>Education:</strong>{" "}
                {role.education_eligibility.replace(
                  /^Review documented requirement: /,
                  "Check this requirement: ",
                )}
              </p>
              <p>
                <strong>Experience:</strong>{" "}
                {role.experience_eligibility ===
                "Meets the reported experience requirement"
                  ? "Your reported work experience meets this example requirement."
                  : role.experience_eligibility.replace(
                      "profile reports",
                      "you reported",
                    )}
              </p>
              <p>
                <strong>Right to work:</strong> You still need to check whether
                you can legally work in this country.
              </p>
              <p>
                <strong>Job opening:</strong> This is a made-up example, not an
                open vacancy.
              </p>
            </div>
            {role.source_url && (
              <a href={role.source_url} target="_blank" rel="noreferrer">
                Employer's careers page <Icon name="link" size={14} />
              </a>
            )}
          </Panel>
        ))}
      </div>
      {!employers.roles.length && (
        <Panel>
          <Empty>
            We have not added suitable job examples for this role and country
            yet. You can still follow your learning plan and check employers'
            own careers pages.
          </Empty>
        </Panel>
      )}
      <Panel className="action-summary">
        <Tag tone="blue">Your next steps</Tag>
        <h2>Your career plan</h2>
        <p className="summary-career">{summary.selected_career}</p>
        <div className="summary-grid">
          <div>
            <h3>Skills you can build on</h3>
            <List
              items={summary.supporting_competencies.map((id) =>
                label(id, skills).replace(" (provisional)", " (estimated)"),
              )}
              empty="Check an important skill to understand your starting level."
            />
            <h3>Skills to check</h3>
            <List
              items={summary.unverified_skills.map((id) => label(id, skills))}
            />
          </div>
          <div>
            <h3>Learn these next</h3>
            <List items={summary.priority_milestones.map(plainMilestone)} />
            <h3>Example jobs to consider</h3>
            <List items={summary.potential_roles} />
            <h3>A project to try</h3>
            <p>{summary.portfolio_project}</p>
          </div>
        </div>
        <div className="next-action">
          <Icon name="arrow" />
          <div>
            <strong>Start here</strong>
            <p>
              Check one important skill, then complete the first learning step
              you selected. Keep a work sample to show what you learned.
            </p>
          </div>
        </div>
        <div className="panel-action">
          <p className="hint">Save a printed copy of your plan.</p>
          <Button onClick={() => window.print()}>Print my career plan</Button>
        </div>
      </Panel>
    </div>
  );
}
