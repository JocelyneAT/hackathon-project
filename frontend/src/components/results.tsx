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
  Resource,
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
    .replace(/^Verify, then develop /, "Learn ")
    .replace(/^Develop /, "Learn ");

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
      <div className="stage-footer">
        <p>
          Chosen job: <strong>{career?.title}</strong>
        </p>
        <Button primary disabled={busy} onClick={onContinue}>
          Make my learning plan
          <Icon name="arrow" size={17} />
        </Button>
      </div>
      <details className="standalone-details career-extra-details">
        <summary>AI changes and other details</summary>
        <div className="stack">
          <div className="row-between scenario-toolbar">
            <div>
              <h2>How fast could AI use grow?</h2>
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
          {impact && (
            <Panel>
              <div className="section-heading">
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
                    <small>
                      {impact.exposure_index === null ? "" : "/100"}
                    </small>
                  </strong>
                  <h3>AI task score</h3>
                  <p>
                    A higher score means AI may be able to do more of these
                    example tasks. It does not tell you whether your job will
                    disappear.
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
                  more towards the total. These are planning examples, not
                  measured job-loss rates.
                </p>
              </details>
            </Panel>
          )}
          {comparison && (
            <Panel>
              <div className="section-heading">
                <div>
                  <h2>How the plan could change</h2>
                  <p>
                    Two examples for {comparison.title}. Neither is a forecast.
                  </p>
                </div>
              </div>
              <div className="scenario-columns">
                <div>
                  <h3>Gradual change</h3>
                  <p>
                    AI use grows more slowly. You have more time to learn and
                    adapt.
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
                    AI use grows faster. The plan gives more attention to
                    checking AI results and working with new tools.
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
                {comparison.difference} points. These examples change the
                learning priorities and study time used in the calculation.
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
                      UN Goal{" "}
                      {String(sdg.sdg || sdg.sdg_number || sdg.goal || "")} ·
                      Target {String(sdg.target || sdg.target_id || "")}
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
                Score method: {recommendations.model_version}. Unknown skills
                use a broad planning range, so a short skill check can change
                the result.
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
        </div>
      </details>
    </div>
  );
}

function LearningMaterial({ resource }: { resource: Resource }) {
  return (
    <a
      className="resource"
      href={resource.url}
      target="_blank"
      rel="noreferrer"
    >
      <Icon name="book" />
      <div>
        <strong>{resource.title}</strong>
        <span>
          {resource.provider} ·{" "}
          {resource.cost?.toLowerCase() === "paid" ? "Paid" : "Free"}
          {resource.hours ? ` · about ${resource.hours} hours` : ""}
        </span>
        <span>Open learning material</span>
      </div>
      <Icon name="link" size={16} />
    </a>
  );
}

export function RoadmapResults({
  roadmap,
  simulation,
  simulate,
  busy,
  skills,
  onContinue,
}: {
  roadmap: Roadmap;
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
  let cumulativeHours = 0;
  const plannedSteps = roadmap.milestones.map((milestone) => {
    const startWeek = Math.floor(cumulativeHours / roadmap.weekly_hours) + 1;
    cumulativeHours += milestone.hours;
    const endWeek = Math.max(
      startWeek,
      Math.ceil(cumulativeHours / roadmap.weekly_hours),
    );
    return {
      ...milestone,
      weekLabel:
        startWeek === endWeek
          ? `Week ${startWeek}`
          : `Weeks ${startWeek}–${endWeek}`,
    };
  });
  return (
    <div className="stack">
      <Panel className="roadmap-overview">
        <div>
          <Tag tone="blue">Your chosen job</Tag>
          <h2 className="role-title">{roadmap.title}</h2>
          <p>One plan to follow, from the first skill to your final project.</p>
        </div>
        {plannedSteps.length > 0 && (
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
        )}
      </Panel>
      <Note title="Follow this plan in order">
        Start with step 1. Finish each learning step, then make your final
        project. The job examples will use this whole plan.
      </Note>
      <div className="milestone-list">
        {plannedSteps.map((m, i) => (
          <Panel
            className={`milestone${i === 0 ? " start-step" : ""}`}
            key={m.id}
          >
            <div className="milestone-index">{i + 1}</div>
            <div className="milestone-body">
              <div className="row-between">
                {i === 0 ? (
                  <Tag tone="blue">Start here</Tag>
                ) : (
                  <Tag>Next step</Tag>
                )}
                <span className="hint">
                  {m.weekLabel} · about {m.hours} hours
                </span>
              </div>
              <h2>
                Step {i + 1}: Learn {m.skill_name}
              </h2>
              <p className="hint">
                Your current level:{" "}
                {m.current_level === null
                  ? "Not checked"
                  : `Estimated level ${m.current_level}`}
                . Goal: {levelNames[m.target_level]}.
              </p>
              {m.prerequisites.length > 0 && (
                <p className="hint">
                  Use what you learned in{" "}
                  {m.prerequisites.map((id) => label(id, skills)).join(", ")}.
                </p>
              )}
              <h3>Learn</h3>
              <div className="resource-list">
                {m.resources[0] ? (
                  <LearningMaterial resource={m.resources[0]} />
                ) : (
                  <p className="hint">
                    No learning material has been added for this skill within
                    your budget. Use the practice task below and ask someone
                    with this skill to guide you.
                  </p>
                )}
              </div>
              {m.resources.length > 1 && (
                <details>
                  <summary>More learning materials</summary>
                  <div className="resource-list">
                    {m.resources.slice(1).map((resource, resourceIndex) => (
                      <LearningMaterial
                        key={resource.id || resourceIndex}
                        resource={resource}
                      />
                    ))}
                  </div>
                </details>
              )}
              <h3>Practise</h3>
              <p>{m.exercise}</p>
              <h3>Before moving on</h3>
              <p>{m.verification}</p>
            </div>
          </Panel>
        ))}
        <Panel
          className={`milestone final-project${plannedSteps.length === 0 ? " start-step" : ""}`}
        >
          <div className="milestone-index">{plannedSteps.length + 1}</div>
          <div className="milestone-body">
            <Tag tone="blue">
              {plannedSteps.length === 0 ? "Start here" : "Final step"}
            </Tag>
            <h2>Step {plannedSteps.length + 1}: Make your final project</h2>
            <p>{roadmap.portfolio_project}</p>
            <p className="hint">
              Save your work and explain what you did. Ask someone to review it
              before using it as evidence of your skills.
            </p>
          </div>
        </Panel>
      </div>
      <p className="hint plan-time-note">
        These times are estimates, not deadlines. Week ranges use{" "}
        {roadmap.weekly_hours} study hours per week, so two steps may share a
        week. The estimate covers the learning steps; allow extra time for your
        final project.
      </p>
      <div className="stage-footer">
        <p>
          {plannedSteps.length > 0
            ? `Your plan includes all ${plannedSteps.length} learning ${plannedSteps.length === 1 ? "step" : "steps"} and the final project.`
            : "Your next step is the final project shown above."}
        </p>
        <Button primary disabled={busy} onClick={onContinue}>
          See job options
          <Icon name="arrow" size={17} />
        </Button>
      </div>
      <details className="standalone-details optional-tool">
        <summary>Optional: explore one skill</summary>
        <div className="stack">
          <p>
            Try a separate example for one skill. This does not change your
            learning plan.
          </p>
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
            <Button disabled={busy} onClick={() => simulate(simSkill, level)}>
              See what could change
            </Button>
          </div>
          {simulation && (
            <>
              <Note>
                This example changes only {label(simulation.skill_id, skills)}{" "}
                to level {simulation.target_level}. Your other skills stay the
                same. It does not change your checked skill record or promise a
                job.
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
        </div>
      </details>
      <details className="standalone-details">
        <summary>How we estimate the time</summary>
        <p>
          A skill you have not checked is planned from a basic starting level. A
          skill check may show that you need less study. The faster-change
          example includes more practice with AI tools. Finishing a course does
          not automatically prove a skill.
        </p>
      </details>
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
        These example jobs assume you complete your whole learning plan and can
        show the new skills. The companies and roles are made-up examples, not
        real job openings. The score is a skill match, not your chance of
        getting hired.
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
              empty="The learning plan does not cover a listed skill for this example."
            />
            <h3>Skills still needed</h3>
            <List
              items={role.remaining_requirements}
              empty="Your full plan covers the listed skills in this example."
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
            <h3>Your final project</h3>
            <p>{summary.portfolio_project}</p>
          </div>
        </div>
        <div className="next-action">
          <Icon name="arrow" />
          <div>
            <strong>Start here</strong>
            <p>
              Follow step 1 of your learning plan. Complete the steps in order,
              then save your final project to show what you learned.
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
