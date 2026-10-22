"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  countries,
  type Profile,
  type Skill,
  type Occupation,
  type Analysis,
  type Assessment,
  type Task,
} from "@/lib/types";
import { Button, Field, Icon, Panel, Tag } from "./ui";

type Shared = {
  profile: Profile;
  setProfile: (p: Profile) => void;
  skills: Skill[];
  busy: boolean;
};
const interests = [
  ["analytics", "Data & patterns"],
  ["technology", "Technology"],
  ["business", "Business & operations"],
  ["people", "Working with people"],
  ["sustainability", "Sustainability"],
];
export function ProfileSetup({
  profile,
  setProfile,
  skills,
  occupations,
  tasks,
  busy,
  uploadName,
  uploadMessage,
  onUpload,
  onContinue,
}: Shared & {
  occupations: Occupation[];
  tasks: Task[];
  uploadName: string;
  uploadMessage: string;
  onUpload: () => void;
  onContinue: () => void;
}) {
  const update = (p: Partial<Profile>) => setProfile({ ...profile, ...p });
  function toggleSkill(id: string) {
    const ratings = { ...profile.self_ratings };
    const reports = { ...profile.reported_experience };
    const remove = profile.skill_ids.includes(id);
    if (remove) {
      delete ratings[id];
      delete reports[id];
    }
    update({
      skill_ids: remove
        ? profile.skill_ids.filter((s) => s !== id)
        : [...profile.skill_ids, id],
      self_ratings: ratings,
      reported_experience: reports,
      cv_evidence: remove
        ? profile.cv_evidence.filter((s) => s.skill_id !== id)
        : profile.cv_evidence,
    });
  }
  return (
    <div className="setup-layout">
      <div className="page-intro">
        <span className="eyebrow">01 / YOUR BACKGROUND</span>
        <h1>Let’s start with your story.</h1>
        <p>
          A few details help us see where you are—and where you’d like to go.
        </p>
      </div>
      <fieldset disabled={busy} className="setup-fieldset">
        <div className={`cv-review ${uploadName ? "uploaded" : ""}`}>
          <div className="cv-icon">
            <Icon name={uploadName ? "check" : "upload"} size={24} />
          </div>
          <div>
            <strong>
              {uploadName || "Have a CV? Save yourself some typing."}
            </strong>
            <p>
              {uploadMessage ||
                "We’ll fill in your education, experience, projects and skills where we can. You can edit everything."}
            </p>
          </div>
          <Button onClick={onUpload}>
            {uploadName ? "Replace CV" : "Upload CV"}
          </Button>
        </div>
        <div className="profile-columns">
          <div className="stack">
            <Panel>
              <div className="section-heading">
                <span className="section-number">01</span>
                <div>
                  <h2>The essentials</h2>
                  <p>Start here. Fill only what you’re comfortable sharing.</p>
                </div>
              </div>
              <div className="field-grid">
                <Field label="Country of origin" htmlFor="country">
                  <select
                    id="country"
                    value={profile.country}
                    onChange={(e) => update({ country: e.target.value })}
                  >
                    {countries.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Where you want to work"
                  htmlFor="employment-country"
                  hint="Career planning data currently covers Malaysia."
                >
                  <select
                    id="employment-country"
                    value={profile.employment_country}
                    onChange={(e) =>
                      update({ employment_country: e.target.value })
                    }
                  >
                    <option value="MY">Malaysia</option>
                  </select>
                </Field>
                <Field
                  label="Age (optional)"
                  htmlFor="age"
                  hint="Not used to rank careers."
                >
                  <input
                    id="age"
                    type="number"
                    min={16}
                    max={100}
                    value={profile.age ?? ""}
                    onChange={(e) =>
                      update({
                        age: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </Field>
                <Field
                  label="Gender (optional)"
                  htmlFor="gender"
                  hint="Not used to rank careers."
                >
                  <select
                    id="gender"
                    value={profile.gender || ""}
                    onChange={(e) => update({ gender: e.target.value })}
                  >
                    <option value="">Prefer not to say</option>
                    <option>Woman</option>
                    <option>Man</option>
                    <option>Non-binary</option>
                    <option>Self-described</option>
                  </select>
                </Field>
              </div>
              <Field
                label="Education or qualification"
                htmlFor="education"
                hint={
                  uploadName && profile.education
                    ? "Filled from your CV. Please review."
                    : "For example: Diploma in IT or currently studying Business."
                }
              >
                <input
                  id="education"
                  maxLength={500}
                  placeholder="What have you studied?"
                  value={profile.education}
                  onChange={(e) => update({ education: e.target.value })}
                />
              </Field>
              <fieldset className="field">
                <legend>Where are you in your career?</legend>
                <div className="segment-control">
                  {[
                    ["starter", "Starting my career"],
                    ["professional", "Already working"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={profile.career_stage === id}
                      className={profile.career_stage === id ? "selected" : ""}
                      onClick={() =>
                        update({
                          career_stage: id as Profile["career_stage"],
                          ...(id === "starter"
                            ? { experience_years: 0, task_ids: [] }
                            : {}),
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {profile.career_stage === "professional" && (
                <div className="field-grid">
                  <Field label="Years of experience" htmlFor="experience">
                    <input
                      type="number"
                      min={0}
                      max={65}
                      id="experience"
                      value={profile.experience_years}
                      onChange={(e) =>
                        update({ experience_years: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field
                    label="Current occupation"
                    htmlFor="current-occupation"
                  >
                    <select
                      id="current-occupation"
                      value={profile.current_occupation_id || ""}
                      onChange={(e) =>
                        update({
                          current_occupation_id: e.target.value || null,
                          task_ids: [],
                        })
                      }
                    >
                      <option value="">Select if listed</option>
                      {occupations.map((o) => (
                        <option value={o.id} key={o.id}>
                          {o.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </Panel>
            <Panel>
              <div className="section-heading">
                <span className="section-number">02</span>
                <div>
                  <h2>The skills you bring</h2>
                  <p>
                    {uploadName
                      ? "We selected skills found in your CV. Add or remove any below."
                      : "Select skills you’ve used or started learning. You’ll rate them next."}
                  </p>
                </div>
              </div>
              <div className="skill-chips">
                {skills.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`skill-chip ${profile.skill_ids.includes(s.id) ? "selected" : ""}`}
                    aria-pressed={profile.skill_ids.includes(s.id)}
                    onClick={() => toggleSkill(s.id)}
                  >
                    <span>{profile.skill_ids.includes(s.id) ? "✓" : "+"}</span>
                    {s.name}
                    {profile.cv_evidence.some((e) => e.skill_id === s.id) && (
                      <small>CV</small>
                    )}
                  </button>
                ))}
              </div>
              <p className="hint">
                No experience yet? You can continue and explore a starting
                point.
              </p>
            </Panel>
            <Panel>
              <div className="section-heading">
                <span className="section-number">03</span>
                <div>
                  <h2>A direction, or an open mind?</h2>
                  <p>Both are good places to begin.</p>
                </div>
              </div>
              <div className="direction-options">
                <button
                  type="button"
                  className={`direction-card ${profile.direction === "explore" ? "selected" : ""}`}
                  aria-pressed={profile.direction === "explore"}
                  onClick={() =>
                    update({ direction: "explore", occupation_id: null })
                  }
                >
                  <Icon name="career" />
                  <strong>Show me what’s possible</strong>
                  <span>Explore careers that could fit your skills.</span>
                </button>
                <button
                  type="button"
                  className={`direction-card ${profile.direction === "target" ? "selected" : ""}`}
                  aria-pressed={profile.direction === "target"}
                  onClick={() => update({ direction: "target" })}
                >
                  <Icon name="roadmap" />
                  <strong>I have a career in mind</strong>
                  <span>See how you fit and what to learn next.</span>
                </button>
              </div>
              {profile.direction === "target" && (
                <Field label="Your target career" htmlFor="target-career">
                  <select
                    id="target-career"
                    value={profile.occupation_id || ""}
                    onChange={(e) =>
                      update({ occupation_id: e.target.value || null })
                    }
                  >
                    <option value="">Choose a career</option>
                    {occupations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <fieldset className="field interest-field">
                <legend>
                  What interests you? <span className="hint">Choose any.</span>
                </legend>
                <div className="skill-chips">
                  {interests.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`skill-chip ${profile.interests.includes(id) ? "selected" : ""}`}
                      aria-pressed={profile.interests.includes(id)}
                      onClick={() =>
                        update({
                          interests: profile.interests.includes(id)
                            ? profile.interests.filter((x) => x !== id)
                            : [...profile.interests, id],
                        })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </Panel>
            <details className="bonus-information">
              <summary>
                <span>Bonus information</span>
                <span>Experience, projects & learning preferences</span>
              </summary>
              <div className="bonus-body">
                <Field
                  label="A little more about your experience"
                  htmlFor="background"
                >
                  <textarea
                    id="background"
                    rows={4}
                    maxLength={12000}
                    value={profile.background}
                    placeholder="Work, volunteering, responsibilities, or anything you’d like us to know."
                    onChange={(e) => update({ background: e.target.value })}
                  />
                </Field>
                <Field label="Projects or achievements" htmlFor="projects">
                  <textarea
                    id="projects"
                    rows={3}
                    maxLength={12000}
                    value={profile.projects}
                    onChange={(e) => update({ projects: e.target.value })}
                  />
                </Field>
                <div className="field-grid">
                  <Field label="Learning hours per week" htmlFor="hours">
                    <input
                      id="hours"
                      type="number"
                      min={1}
                      max={60}
                      value={profile.weekly_hours}
                      onChange={(e) =>
                        update({ weekly_hours: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Learning budget" htmlFor="budget">
                    <select
                      id="budget"
                      value={profile.budget}
                      onChange={(e) =>
                        update({ budget: e.target.value as Profile["budget"] })
                      }
                    >
                      <option value="free">Free resources</option>
                      <option value="paid">Free and paid resources</option>
                    </select>
                  </Field>
                  <Field
                    label="Preferred work arrangement"
                    htmlFor="arrangement"
                  >
                    <select
                      id="arrangement"
                      value={profile.work_arrangement}
                      onChange={(e) =>
                        update({ work_arrangement: e.target.value })
                      }
                    >
                      <option value="any">Open to anything</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On site</option>
                    </select>
                  </Field>
                </div>
                {profile.career_stage === "professional" &&
                  tasks.filter(
                    (t) => t.occupation_id === profile.current_occupation_id,
                  ).length > 0 && (
                    <fieldset>
                      <legend>Tasks you do in your current job</legend>
                      {tasks
                        .filter(
                          (t) =>
                            t.occupation_id === profile.current_occupation_id,
                        )
                        .map((t) => (
                          <label className="task-check" key={t.id}>
                            <input
                              type="checkbox"
                              checked={profile.task_ids.includes(t.id)}
                              onChange={() =>
                                update({
                                  task_ids: profile.task_ids.includes(t.id)
                                    ? profile.task_ids.filter((x) => x !== t.id)
                                    : [...profile.task_ids, t.id],
                                })
                              }
                            />
                            {t.description}
                          </label>
                        ))}
                    </fieldset>
                  )}
              </div>
            </details>
          </div>
          <aside className="profile-aside">
            <span className="eyebrow">A STARTING POINT, NOT A BOX.</span>
            <h2>
              You’re more than
              <br />
              your last job.
            </h2>
            <p>
              Student, career changer, or finding your feet—we’ll help you
              connect what you know with what comes next.
            </p>
            <div className="aside-rule" />
            <div className="aside-tip">
              <Icon name="check" size={18} />
              <span>Every field stays editable.</span>
            </div>
            <div className="aside-tip">
              <Icon name="check" size={18} />
              <span>No CV? No problem.</span>
            </div>
            <div className="aside-tip">
              <Icon name="check" size={18} />
              <span>Your profile stays in this session.</span>
            </div>
            <span className="aside-footnote">
              No account. No perfect answers needed.
            </span>
          </aside>
        </div>
        <div className="journey-actions">
          <span>Next: a closer look at your skills</span>
          <Button primary onClick={onContinue} disabled={busy}>
            Continue to skills <Icon name="arrow" size={18} />
          </Button>
        </div>
      </fieldset>
    </div>
  );
}

const levelNames = [
  "Not rated",
  "Getting started",
  "Basic application",
  "Independent",
  "Confident",
  "Advanced",
];
export function SkillReview({
  profile,
  setProfile,
  skills,
  analysis,
  busy,
  run,
  onAssessment,
  onBack,
  onContinue,
}: Shared & {
  analysis: Analysis | null;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  onAssessment: (a: Assessment) => Promise<void>;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answer, setAnswer] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [addSkill, setAddSkill] = useState("");
  const quizRef = useRef<HTMLDivElement>(null);
  async function start(id: string) {
    const r = await run(() =>
      api<Assessment>("assessments/start", {
        skill_id: id,
        question_count: 10,
        generate: true,
      }),
    );
    if (r) {
      setAssessment(r);
      setAnswer("");
      setResultMessage("");
      setTimeout(() => {
        quizRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        });
        quizRef.current?.focus();
      }, 60);
    }
  }
  async function submit() {
    if (!assessment?.question || !answer) return;
    const r = await run(() =>
      api<Assessment>("assessments/submit", {
        assessment_id: assessment.assessment_id,
        question_id: assessment.question!.id,
        answer,
      }),
    );
    if (!r) return;
    setAssessment(r);
    setAnswer("");
    if (r.status === "completed") {
      await onAssessment(r);
      setResultMessage(
        `${skills.find((s) => s.id === r.skill_id)?.name}: ${r.result?.correct_count} of ${r.result?.questions_attempted} correct. ${r.result?.estimated_proficiency ? `Your slider now shows estimated level ${r.result.estimated_proficiency}.` : "Your level remains unknown; the quiz did not establish a starting level."} Short knowledge quizzes cover foundational levels 1–2 only.`,
      );
      setAssessment(null);
    }
  }
  return (
    <div className="skills-page">
      <div className="page-intro">
        <span className="eyebrow">02 / YOUR SKILLS</span>
        <h1>A little confidence check.</h1>
        <p>
          Start with your own estimate. Want a clearer picture? Take a short
          quiz for any skill.
        </p>
      </div>
      <div className="skill-guide">
        <Icon name="info" size={20} />
        <p>
          Sliders are your own estimates. A quiz replaces the estimate with a
          provisional knowledge result. You can skip quizzes and continue.
        </p>
      </div>
      {resultMessage && (
        <div className="success-message" role="status">
          <Icon name="check" />
          <p>{resultMessage}</p>
        </div>
      )}
      {assessment?.question ? (
        <div className="quiz-panel" ref={quizRef} tabIndex={-1}>
          <div className="quiz-heading">
            <div>
              <span className="eyebrow">
                {assessment.source || "PRACTICE QUIZ"}
              </span>
              <h2>
                {skills.find((s) => s.id === assessment.skill_id)?.name} skill
                check
              </h2>
            </div>
            <Button onClick={() => setAssessment(null)} disabled={busy}>
              Leave quiz
            </Button>
          </div>
          <div className="quiz-progress">
            <span>
              Question {assessment.progress.answered + 1} of{" "}
              {assessment.progress.total}
            </span>
            <span>
              {Math.round(
                (assessment.progress.answered / assessment.progress.total) *
                  100,
              )}
              % complete
            </span>
          </div>
          <div className="journey-track">
            <span
              style={{
                width: `${(assessment.progress.answered / assessment.progress.total) * 100}%`,
              }}
            />
          </div>
          <h3 className="quiz-prompt">{assessment.question.prompt}</h3>
          <fieldset disabled={busy}>
            <legend className="sr-only">Choose your answer</legend>
            <div className="quiz-answers">
              {assessment.question.options.map((o, i) => (
                <label key={o.id} className={answer === o.id ? "chosen" : ""}>
                  <input
                    type="radio"
                    name="quiz-answer"
                    value={o.id}
                    checked={answer === o.id}
                    onChange={() => setAnswer(o.id)}
                  />
                  <span className="option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{o.text}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="journey-actions">
            <span>Knowledge check · not a professional certification</span>
            <Button
              primary
              onClick={() => void submit()}
              disabled={busy || !answer}
            >
              {assessment.progress.answered === assessment.progress.total - 1
                ? "Finish & update my level"
                : "Next question"}
              <Icon name="arrow" size={17} />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="skill-slider-list">
            {profile.skill_ids.map((id, i) => {
              const skill = skills.find((s) => s.id === id);
              if (!skill) return null;
              const evidence = analysis?.skills.find((s) => s.skill_id === id);
              const tested =
                evidence?.assessment_status === "provisional" ||
                evidence?.assessment_status === "insufficient_evidence";
              const level = tested
                ? evidence?.estimated_proficiency || 0
                : profile.self_ratings[id] || 0;
              return (
                <section className="skill-slider-card" key={id}>
                  <div className="slider-title">
                    <div className="skill-initial">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h2>{skill.name}</h2>
                      <span>
                        {tested
                          ? "Quiz estimate"
                          : profile.cv_evidence.some((e) => e.skill_id === id)
                            ? "Found in your CV · self estimate"
                            : "Your estimate"}
                      </span>
                    </div>
                    <Tag tone={tested ? "blue" : "neutral"}>
                      {levelNames[level]}
                    </Tag>
                  </div>
                  <div className="slider-control">
                    <label className="sr-only" htmlFor={`level-${id}`}>
                      {skill.name} skill level
                    </label>
                    <input
                      id={`level-${id}`}
                      type="range"
                      min={0}
                      max={5}
                      step={1}
                      value={level}
                      disabled={busy || tested}
                      aria-valuetext={levelNames[level]}
                      onChange={(e) => {
                        const ratings = { ...profile.self_ratings };
                        const value = Number(e.target.value);
                        if (value) ratings[id] = value;
                        else delete ratings[id];
                        setProfile({ ...profile, self_ratings: ratings });
                      }}
                    />
                    <div className="slider-labels">
                      <span>Not rated</span>
                      <span>Getting started</span>
                      <span>Independent</span>
                      <span>Advanced</span>
                    </div>
                  </div>
                  <div className="slider-footer">
                    <p>
                      {tested
                        ? "Based on a foundational knowledge quiz. Retake to update this estimate."
                        : "Unsure where you stand? A quiz can help find your starting point."}
                    </p>
                    <Button
                      small
                      onClick={() => void start(id)}
                      disabled={busy}
                    >
                      <Icon name="check" size={16} />
                      {tested ? "Retake quiz" : "Check my level"}
                      <span className="quiz-count">10 questions</span>
                    </Button>
                  </div>
                </section>
              );
            })}
          </div>
          {profile.skill_ids.length === 0 && (
            <Panel>
              <h2>Everyone starts somewhere.</h2>
              <p>
                Add a skill you’d like to rate, or continue to discover careers
                and what they involve.
              </p>
            </Panel>
          )}
          <div className="add-skill-row">
            <Field
              label="Anything missing? Add another skill"
              htmlFor="add-skill"
            >
              <select
                id="add-skill"
                value={addSkill}
                onChange={(e) => setAddSkill(e.target.value)}
                disabled={busy}
              >
                <option value="">Choose a skill</option>
                {skills
                  .filter((s) => !profile.skill_ids.includes(s.id))
                  .map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Button
              disabled={!addSkill || busy}
              onClick={() => {
                setProfile({
                  ...profile,
                  skill_ids: [...profile.skill_ids, addSkill],
                });
                setAddSkill("");
              }}
            >
              + Add skill
            </Button>
          </div>
          <div className="journey-actions">
            <Button onClick={onBack} disabled={busy}>
              Back to background
            </Button>
            <Button primary onClick={onContinue} disabled={busy}>
              Find my career matches <Icon name="arrow" size={18} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
