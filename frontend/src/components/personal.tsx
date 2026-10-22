"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import type {
  Profile,
  Skill,
  Occupation,
  Analysis,
  Assessment,
  Task,
} from "@/lib/types";
import { countries } from "@/lib/types";
import { Button, Field, Icon, Panel, Tag, Note, Empty } from "./ui";

const interestQuestions = [
  {
    id: "problems",
    question: "Which problem would you most enjoy solving?",
    options: [
      ["analytics", "Understand what the data shows"],
      ["business", "Improve how a business works"],
      ["people", "Help someone solve a problem"],
      ["sustainability", "Help reduce waste and pollution"],
    ],
  },
  {
    id: "work",
    question: "What kind of work keeps you interested?",
    options: [
      ["technology", "Building tools that save time"],
      ["analytics", "Finding patterns and explaining results"],
      ["people", "Working with people and sharing ideas"],
      ["business", "Planning projects and improving daily work"],
    ],
  },
  {
    id: "learning",
    question: "What would you like to learn next?",
    options: [
      ["technology", "Programming and practical AI tools"],
      ["analytics", "Working with data and explaining results"],
      ["business", "Understanding business needs"],
      ["sustainability", "Measuring waste, energy use, and pollution"],
    ],
  },
  {
    id: "impact",
    question: "What would make your work feel meaningful?",
    options: [
      ["people", "Helping customers or colleagues"],
      ["business", "Making daily work easier"],
      ["sustainability", "Helping people and the environment"],
      ["technology", "Creating useful technology"],
    ],
  },
];

function plainEvidence(text: string) {
  if (text.startsWith("Manually reported skill;"))
    return "You selected this skill. Your level has not been checked.";
  if (text.startsWith("Profile mention: "))
    return (
      "Mentioned in your profile: " + text.slice("Profile mention: ".length)
    );
  if (text.startsWith("Self-reported experience: "))
    return (
      "Your experience: " + text.slice("Self-reported experience: ".length)
    );
  if (text.startsWith("User-reviewed CV mention: "))
    return (
      "Found in your CV: " + text.slice("User-reviewed CV mention: ".length)
    );
  if (text.startsWith("Curated assessment: "))
    return "Based on a short skill check. This is an estimate.";
  return text;
}

function plainWarning(text: string) {
  if (
    text ===
    "A skill mention or self-report does not establish demonstrated proficiency."
  )
    return "Listing a skill does not show how well you can use it.";
  if (text === "Short assessments cover foundational competencies only.")
    return "These short checks cover basic skills only.";
  if (
    text ===
    "Rule-based extraction identifies possible skills only. Review and correct these suggestions."
  )
    return "Check the skills we found. You can change the list.";
  if (
    text ===
    "The document is not retained. Upload streams and any framework temporary storage are closed after extraction."
  )
    return "We do not keep your CV file.";
  return text;
}

export function Personal({
  profile,
  setProfile,
  skills,
  occupations,
  analysis,
  onAnalyze,
  onContinue,
  busy,
  tasks,
  run,
  onAssessment,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  skills: Skill[];
  occupations: Occupation[];
  analysis: Analysis | null;
  onAnalyze: () => void;
  onContinue: () => void;
  busy: boolean;
  tasks: Task[];
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  onAssessment: (id: string) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answer, setAnswer] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [extracted, setExtracted] = useState<Record<string, string[]> | null>(
    null,
  );
  const [questionnaire, setQuestionnaire] = useState(false);
  const update = (patch: Partial<Profile>) =>
    setProfile({ ...profile, ...patch });
  const toggleSkill = (id: string) => {
    const removing = profile.skill_ids.includes(id);
    const reports = { ...profile.reported_experience };
    if (removing) delete reports[id];
    update({
      skill_ids: removing
        ? profile.skill_ids.filter((x) => x !== id)
        : [...profile.skill_ids, id],
      cv_evidence: removing
        ? profile.cv_evidence.filter((x) => x.skill_id !== id)
        : profile.cv_evidence,
      reported_experience: reports,
    });
  };
  async function upload(file?: File) {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
      setUploadStatus("Choose a PDF, DOCX, or TXT file under 5 MB.");
      return;
    }
    setUploadStatus("Reading the skills in your CV...");
    const body = new FormData();
    body.append("file", file);
    const result = await run(() =>
      api<{
        skills: { skill_id: string; name: string; source_phrase: string }[];
        warnings: string[];
        sections: Record<string, string[]>;
      }>("cv/extract", body),
    );
    if (result) {
      update({
        skill_ids: [
          ...new Set([
            ...profile.skill_ids,
            ...result.skills.map((x) => x.skill_id),
          ]),
        ],
        cv_evidence: result.skills.map((s) => ({
          skill_id: s.skill_id,
          source_phrase: s.source_phrase,
        })),
      });
      setExtracted(result.sections);
      setUploadStatus(
        `We found ${result.skills.length} possible skills. Check the list below. Your skill levels have not been checked. ${result.warnings.map(plainWarning).join(" ")}`,
      );
    } else
      setUploadStatus(
        "We could not read this file. Try a file with selectable text, or choose your skills below.",
      );
  }
  async function start(skill_id: string) {
    const next = await run(() =>
      api<Assessment>("assessments/start", { skill_id }),
    );
    if (next) {
      setAssessment(next);
      setAnswer("");
    }
  }
  async function submit() {
    if (!assessment?.question || !answer) return;
    const next = await run(() =>
      api<Assessment>("assessments/submit", {
        assessment_id: assessment.assessment_id,
        question_id: assessment.question!.id,
        answer,
      }),
    );
    if (next) {
      setAssessment(next);
      setAnswer("");
      if (next.status === "completed") await onAssessment(next.assessment_id);
    }
  }
  return (
    <fieldset disabled={busy} className="personal-controls">
      <div className="content-grid">
        <div className="stack">
          <Panel>
            <div className="section-heading">
              <span className="section-number">01</span>
              <div>
                <h2>A little about you</h2>
                <p>Tell us about your study, work, or projects.</p>
              </div>
            </div>
            <fieldset>
              <legend>Where are you in your career?</legend>
              <div className="choice-grid">
                <button
                  className={`choice ${profile.career_stage === "starter" ? "selected" : ""}`}
                  onClick={() =>
                    update({
                      career_stage: "starter",
                      experience_years: 0,
                      task_ids: [],
                    })
                  }
                  aria-pressed={profile.career_stage === "starter"}
                >
                  <span className="choice-top">
                    <Icon name="book" />
                    <span className="radio-dot" />
                  </span>
                  <strong>Career starter</strong>
                  <span>
                    You are studying, recently graduated, or looking for your
                    first job.
                  </span>
                </button>
                <button
                  className={`choice ${profile.career_stage === "professional" ? "selected" : ""}`}
                  onClick={() => update({ career_stage: "professional" })}
                  aria-pressed={profile.career_stage === "professional"}
                >
                  <span className="choice-top">
                    <Icon name="career" />
                    <span className="radio-dot" />
                  </span>
                  <strong>Working professional</strong>
                  <span>You already work and want to grow or change jobs.</span>
                </button>
              </div>
            </fieldset>
            <fieldset>
              <legend>What do you want help with?</legend>
              <div className="segmented">
                <button
                  aria-pressed={profile.direction === "explore"}
                  onClick={() => update({ direction: "explore" })}
                >
                  Help me choose a career
                </button>
                <button
                  aria-pressed={profile.direction === "target"}
                  onClick={() =>
                    update({
                      direction: "target",
                      occupation_id: profile.occupation_id || "data-analyst",
                    })
                  }
                >
                  I know the job I want
                </button>
              </div>
            </fieldset>
            {profile.direction === "target" && (
              <Field label="The job you want" htmlFor="target">
                <select
                  id="target"
                  value={profile.occupation_id || "data-analyst"}
                  onChange={(e) => update({ occupation_id: e.target.value })}
                >
                  {occupations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="form-grid">
              <Field label="Country you live in" htmlFor="residence">
                <select
                  id="residence"
                  value={profile.country}
                  onChange={(e) => update({ country: e.target.value })}
                >
                  {countries.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Country you want to work in"
                htmlFor="country"
                hint="This demo currently has example data for Malaysia only."
              >
                <select
                  id="country"
                  value={profile.employment_country}
                  onChange={(e) =>
                    update({ employment_country: e.target.value })
                  }
                >
                  {countries.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                      {code !== "MY" ? " · not available yet" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {profile.employment_country !== "MY" && (
              <Note title="This country is not available yet">
                We do not have job and employer data for this country yet.
                Choose Malaysia to try the demo. We will not use Malaysian data
                for another country.
              </Note>
            )}
            <Field
              label="Education or training"
              htmlFor="education"
              hint="Optional. Include school, university, skills training, or courses you took yourself."
            >
              <input
                id="education"
                value={profile.education}
                onChange={(e) => update({ education: e.target.value })}
                placeholder="e.g. Diploma in Business Administration"
                maxLength={500}
              />
            </Field>
            {profile.career_stage === "professional" && (
              <div className="form-grid">
                <Field label="Current job" htmlFor="current-role">
                  <select
                    id="current-role"
                    value={profile.current_occupation_id || ""}
                    onChange={(e) =>
                      update({
                        current_occupation_id: e.target.value,
                        task_ids: [],
                      })
                    }
                  >
                    <option value="">Choose your current job</option>
                    {occupations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Years of work experience" htmlFor="experience">
                  <input
                    id="experience"
                    type="number"
                    min="0"
                    max="60"
                    value={profile.experience_years}
                    onChange={(e) =>
                      update({ experience_years: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
            )}
            <Field
              label={
                profile.career_stage === "starter"
                  ? "What have you worked on?"
                  : "What do you do at work?"
              }
              htmlFor="background"
              hint="Optional. Projects, volunteering, internships, and everyday work all count."
            >
              <textarea
                className="resize-none"
                id="background"
                value={profile.background}
                onChange={(e) => update({ background: e.target.value })}
                placeholder={
                  profile.career_stage === "starter"
                    ? "Tell us about a class project, a volunteer role, or something you built..."
                    : "Describe the tasks you do and tools you use..."
                }
                maxLength={12000}
              />
            </Field>
            <Field
              label="A project you have worked on"
              htmlFor="projects"
              hint="Optional. Tell us what you did and what you made."
            >
              <textarea
                className="resize-none"
                id="projects"
                value={profile.projects}
                onChange={(e) => update({ projects: e.target.value })}
                placeholder="e.g. I used Excel to track a student club's money and explain how it was spent."
                maxLength={12000}
              />
            </Field>
            {profile.career_stage === "professional" &&
              tasks.filter(
                (t) => t.occupation_id === profile.current_occupation_id,
              ).length > 0 && (
                <fieldset>
                  <legend>Tasks you do at work</legend>
                  <p className="hint">
                    Choose the tasks you do. We will show how AI could affect
                    them.
                  </p>
                  {tasks
                    .filter(
                      (t) => t.occupation_id === profile.current_occupation_id,
                    )
                    .map((t) => (
                      <label className="check-row" key={t.id}>
                        <input
                          type="checkbox"
                          checked={profile.task_ids.includes(t.id)}
                          onChange={() =>
                            update({
                              task_ids: profile.task_ids.includes(t.id)
                                ? profile.task_ids.filter((id) => id !== t.id)
                                : [...profile.task_ids, t.id],
                            })
                          }
                        />
                        <span>{t.description}</span>
                      </label>
                    ))}
                </fieldset>
              )}
          </Panel>
          <Panel>
            <div className="section-heading">
              <span className="section-number">02</span>
              <div>
                <h2>Add your skills</h2>
                <p>Choose skills you have used or learned about.</p>
              </div>
              <Tag>Optional</Tag>
            </div>
            <div className="upload">
              <Icon name="upload" size={24} />
              <div>
                <strong>Upload your CV, if you have one</strong>
                <p>
                  PDF, DOCX, or TXT · up to 5 MB · PDFs must have selectable
                  text
                </p>
                <span className="hint">We do not keep your file.</span>
              </div>
              <label className="button upload-label">
                Choose file
                <input
                  aria-label="Choose CV file"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  disabled={busy}
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {uploadStatus && (
              <p role="status" className="upload-status">
                {uploadStatus}
              </p>
            )}
            {extracted && (
              <details>
                <summary>Check what we found in your CV</summary>
                <p className="hint">
                  Check this information before adding it to your profile.
                </p>
                {Object.entries(extracted)
                  .filter(([, lines]) => lines.length > 0)
                  .map(([section, lines]) => (
                    <div key={section} className="extracted-section">
                      <h3>{section[0].toUpperCase() + section.slice(1)}</h3>
                      <p>{lines.join(" · ")}</p>
                      <Button
                        small
                        onClick={() =>
                          update(
                            section === "education"
                              ? { education: lines.join("; ").slice(0, 500) }
                              : section === "projects"
                                ? {
                                    projects: [
                                      profile.projects,
                                      lines.join("\n"),
                                    ]
                                      .filter(Boolean)
                                      .join("\n")
                                      .slice(0, 12000),
                                  }
                                : {
                                    background: [
                                      profile.background,
                                      lines.join("\n"),
                                    ]
                                      .filter(Boolean)
                                      .join("\n")
                                      .slice(0, 12000),
                                  },
                          )
                        }
                      >
                        Add to{" "}
                        {section === "education"
                          ? "education"
                          : section === "projects"
                            ? "projects"
                            : "background"}
                      </Button>
                    </div>
                  ))}
              </details>
            )}
            <fieldset>
              <legend>Which skills have you used or learned about?</legend>
              <div className="skill-options">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    className={`skill-option ${profile.skill_ids.includes(skill.id) ? "selected" : ""}`}
                    aria-pressed={profile.skill_ids.includes(skill.id)}
                    onClick={() => toggleSkill(skill.id)}
                  >
                    {profile.skill_ids.includes(skill.id) && (
                      <Icon name="check" size={14} />
                    )}{" "}
                    {skill.name}
                  </button>
                ))}
              </div>
            </fieldset>
            {profile.skill_ids.length > 0 && (
              <details>
                <summary>
                  Tell us how you have used these skills{" "}
                  <span className="hint">
                    Your answers have not been checked
                  </span>
                </summary>
                <div className="stack compact">
                  {skills
                    .filter((s) => profile.skill_ids.includes(s.id))
                    .map((s) => (
                      <Field
                        key={s.id}
                        label={`Your experience with ${s.name}`}
                        htmlFor={`exp-${s.id}`}
                      >
                        <select
                          id={`exp-${s.id}`}
                          value={profile.reported_experience[s.id] || ""}
                          onChange={(e) =>
                            update({
                              reported_experience: {
                                ...profile.reported_experience,
                                [s.id]: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">Choose an answer</option>
                          <option value="awareness">
                            I have only heard about it
                          </option>
                          <option value="studied">I have studied it</option>
                          <option value="guided">
                            I have used it with help
                          </option>
                          <option value="independent">
                            I have used it on my own in a project
                          </option>
                          <option value="professional">
                            I have used it at work
                          </option>
                        </select>
                      </Field>
                    ))}
                </div>
              </details>
            )}
          </Panel>
          <Panel>
            <div className="section-heading">
              <span className="section-number">03</span>
              <div>
                <h2>Your interests and study time</h2>
                <p>
                  Choose what you enjoy and how much time you can spend
                  learning.
                </p>
              </div>
            </div>
            <fieldset>
              <legend>What are you interested in?</legend>
              <div className="skill-options">
                {[
                  "analytics",
                  "business",
                  "technology",
                  "people",
                  "sustainability",
                ].map((item) => (
                  <button
                    className={`skill-option ${profile.interests.includes(item) ? "selected" : ""}`}
                    key={item}
                    aria-pressed={profile.interests.includes(item)}
                    onClick={() =>
                      update({
                        interests: profile.interests.includes(item)
                          ? profile.interests.filter((x) => x !== item)
                          : [...profile.interests, item],
                      })
                    }
                  >
                    {
                      {
                        analytics: "Working with data",
                        business: "Business",
                        technology: "Technology",
                        people: "Working with people",
                        sustainability: "The environment",
                      }[item]
                    }
                  </button>
                ))}
              </div>
            </fieldset>
            <Button
              small
              onClick={() => setQuestionnaire(!questionnaire)}
              aria-expanded={questionnaire}
            >
              {questionnaire
                ? "Hide interest questions"
                : "Answer four questions about your interests"}
            </Button>
            {questionnaire && (
              <div className="questionnaire">
                {interestQuestions.map((q, i) => (
                  <fieldset key={q.id}>
                    <legend>
                      {i + 1}. {q.question}
                    </legend>
                    <div className="question-options">
                      {q.options.map(([value, label]) => (
                        <label className="check-row" key={value}>
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === value}
                            onChange={() => {
                              const a = { ...answers, [q.id]: value };
                              setAnswers(a);
                              update({
                                interests: [...new Set(Object.values(a))],
                              });
                            }}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <p className="hint">
                  These questions help us understand what you enjoy. They do not
                  test your skills. You can skip any question.
                </p>
              </div>
            )}
            <div className="form-grid three">
              <Field label="Study hours per week" htmlFor="hours">
                <input
                  id="hours"
                  type="number"
                  min="1"
                  max="60"
                  aria-invalid={
                    profile.weekly_hours < 1 || profile.weekly_hours > 60
                  }
                  aria-describedby="hours-help"
                  value={profile.weekly_hours}
                  onChange={(e) =>
                    update({ weekly_hours: Number(e.target.value) })
                  }
                />
                <span id="hours-help" className="hint">
                  Choose between 1 and 60 hours per week.
                </span>
              </Field>
              <Field label="Course budget" htmlFor="budget">
                <select
                  id="budget"
                  value={profile.budget}
                  onChange={(e) =>
                    update({ budget: e.target.value as Profile["budget"] })
                  }
                >
                  <option value="free">Free courses only</option>
                  <option value="paid">I can pay for courses</option>
                </select>
              </Field>
              <Field label="Where you want to work" htmlFor="arrangement">
                <select
                  id="arrangement"
                  value={profile.work_arrangement}
                  onChange={(e) => update({ work_arrangement: e.target.value })}
                >
                  <option value="any">Any location</option>
                  <option value="remote">From home</option>
                  <option value="hybrid">
                    Some days at home, some at work
                  </option>
                  <option value="onsite">At the workplace</option>
                </select>
              </Field>
            </div>
            <div className="panel-action">
              <p className="hint">No CV or work experience required.</p>
              <Button
                primary
                disabled={busy || profile.employment_country !== "MY"}
                onClick={onAnalyze}
              >
                {busy ? "Reviewing your skills..." : "Review my skills"}
                <Icon name="arrow" size={17} />
              </Button>
            </div>
          </Panel>
          {analysis && (
            <Panel className="evidence-panel">
              <div className="section-heading">
                <span className="section-number">
                  <Icon name="check" size={17} />
                </span>
                <div>
                  <h2>Your skills</h2>
                  <p>
                    Here is what you told us. A short check can help estimate
                    your skill level.
                  </p>
                </div>
                <Tag tone="blue">Ready to review</Tag>
              </div>
              {analysis.skills.length ? (
                <div className="evidence-list">
                  {analysis.skills.map((s) => (
                    <div className="evidence-row" key={s.skill_id}>
                      <div>
                        <strong>{s.name}</strong>
                        <p>
                          {s.evidence.map(plainEvidence).join(" · ") ||
                            "You told us you know this skill."}
                        </p>
                      </div>
                      <div>
                        <Tag>
                          {s.estimated_proficiency === null
                            ? "Skill level unknown"
                            : `Estimated level ${s.estimated_proficiency}`}
                        </Tag>
                        <p>
                          Confidence: {s.confidence} ·{" "}
                          {s.estimated_proficiency === null
                            ? "Not checked"
                            : "Based on a short check"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty>
                  No skills added yet. We can still suggest careers using your
                  interests and study time.
                </Empty>
              )}
              {analysis.warnings.map((w, i) => (
                <p className="hint" key={i}>
                  {plainWarning(w)}
                </p>
              ))}
              <div className="assessment-section">
                <h3>Want to check a skill?</h3>
                <p>
                  Try a short check of the basics. It is optional, and you can
                  continue without it.
                </p>
                <div className="skill-options">
                  {[
                    "sql",
                    "python",
                    "excel",
                    "statistics",
                    "business-analysis",
                  ].map((id) => (
                    <Button
                      small
                      disabled={busy}
                      key={id}
                      onClick={() => {
                        void start(id);
                      }}
                    >
                      Check {skills.find((s) => s.id === id)?.name || id}
                    </Button>
                  ))}
                </div>
              </div>
              {assessment && (
                <div className="assessment" aria-live="polite">
                  <div className="row-between">
                    <h3>
                      {skills.find((s) => s.id === assessment.skill_id)?.name}{" "}
                      skill check
                    </h3>
                    <Button small onClick={() => setAssessment(null)}>
                      Close skill check
                    </Button>
                  </div>
                  {assessment.question ? (
                    <>
                      <Tag>Short skill check</Tag>
                      <h3 className="question-prompt">
                        {assessment.question.prompt}
                      </h3>
                      <fieldset>
                        <legend className="sr-only">Choose your answer</legend>
                        {assessment.question.options.map((o) => (
                          <label key={o.id} className="answer-option">
                            <input
                              type="radio"
                              name="assessment-answer"
                              value={o.id}
                              checked={answer === o.id}
                              onChange={() => setAnswer(o.id)}
                            />
                            <span>{o.text}</span>
                          </label>
                        ))}
                      </fieldset>
                      <Button
                        primary
                        disabled={!answer || busy}
                        onClick={() => {
                          void submit();
                        }}
                      >
                        Check answer
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3>Skill check complete</h3>
                      <p>
                        You answered {assessment.result?.correct_count} of{" "}
                        {assessment.result?.questions_attempted} questions
                        correctly.
                      </p>
                      <p>
                        {assessment.result?.estimated_proficiency === null
                          ? "We do not have enough information to estimate your level yet."
                          : `Estimated level ${assessment.result?.estimated_proficiency}`}{" "}
                        · {assessment.result?.confidence} confidence
                      </p>
                      <p className="hint">
                        This result only covers the basics in these questions.
                        It does not prove that you are ready for a job.
                      </p>
                    </>
                  )}
                </div>
              )}
              <div className="panel-action">
                <p className="hint">You can do these checks later.</p>
                <Button primary disabled={busy} onClick={onContinue}>
                  See career options
                  <Icon name="arrow" size={17} />
                </Button>
              </div>
            </Panel>
          )}
        </div>
        <aside className="context-rail">
          <Panel className="rail-intro">
            <span className="rail-index">FOUR SIMPLE STEPS</span>
            <h2>What happens next</h2>
            <p>
              Start with your experience. Then choose a job and make a learning
              plan.
            </p>
            <div className="path-preview">
              <div>
                <span>1</span>
                <p>Tell us about yourself</p>
              </div>
              <div>
                <span>2</span>
                <p>See career options and AI changes</p>
              </div>
              <div>
                <span>3</span>
                <p>Choose what to learn</p>
              </div>
              <div>
                <span>4</span>
                <p>See example jobs and employers</p>
              </div>
            </div>
          </Panel>
          <div className="rail-note">
            <Icon name="info" />
            <div>
              <strong>It is fine if you are not sure yet.</strong>
              <p>
                Tell us what you can. You do not need a CV or work experience.
                The skill checks are optional.
              </p>
            </div>
          </div>
          <div className="rail-foot">
            <span>We will be clear about what we know.</span>
            <p>
              Listing a skill in your CV does not show your skill level.
              Finishing a course does not prove that you can use the skill at
              work.
            </p>
          </div>
        </aside>
      </div>
    </fieldset>
  );
}
