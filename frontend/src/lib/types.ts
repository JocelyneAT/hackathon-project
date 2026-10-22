export type Profile = {
  career_stage: "starter" | "professional";
  direction: "explore" | "target";
  country: string;
  employment_country: string;
  education: string;
  age?: number | null;
  gender?: string;
  occupation_id: string | null;
  current_occupation_id: string | null;
  experience_years: number;
  background: string;
  projects: string;
  cv_evidence: { skill_id: string; source_phrase: string }[];
  skill_ids: string[];
  reported_experience: Record<string, string>;
  self_ratings: Record<string, number>;
  interests: string[];
  weekly_hours: number;
  budget: "free" | "paid";
  work_arrangement: string;
  task_ids: string[];
  assessment_ids: string[];
};
export type Skill = { id: string; name: string; description?: string };
export type Occupation = {
  id: string;
  title: string;
  description: string;
  requirements: { skill_id: string; required_level: number; weight: number }[];
};
export type Evidence = {
  skill_id: string;
  name: string;
  detected: boolean;
  reported_experience: string | null;
  estimated_proficiency: number | null;
  confidence: string;
  assessment_status: string;
  evidence: string[];
};
export type Analysis = {
  skills: Evidence[];
  assessment_priorities: string[];
  warnings: string[];
  model_version: string;
};
export type Source = {
  id?: string;
  name?: string;
  title?: string;
  url?: string;
  source_url?: string;
  evidence_status?: string;
  methodology_notes?: string;
};
export type Career = {
  occupation_id: string;
  title: string;
  fit: number;
  fit_range: [number, number];
  coverage: number;
  matching_skills: string[];
  unverified_skills: string[];
  missing_skills: string[];
  market_outlook: string;
  explanation: string;
  factors: Record<string, number>;
  sdgs: Record<string, unknown>[];
  sources: Source[];
  evidence_status: string;
};
export type Recommendations = {
  careers: Career[];
  selected_occupation_id: string;
  model_version: string;
  assumptions: string[];
};
export type Gap = {
  skill_id: string;
  name: string;
  required_level: number;
  demonstrated_level: number | null;
  provisional_level: number | null;
  provisional_gap: number | null;
  status: string;
  gap: number | null;
  confidence: string;
};
export type Gaps = {
  occupation_id: string;
  title: string;
  skills: Gap[];
  assessment_priorities: string[];
};
export type Task = {
  id: string;
  occupation_id?: string;
  description: string;
  weight: number;
  exposure: number;
  evidence_status?: string;
  source_id?: string;
};
export type Impact = {
  occupation_id: string;
  title: string;
  exposure_index: number | null;
  category: string;
  tasks: Task[];
  augmentation: string[];
  human_judgment: string[];
  uncertainty: string[];
  formula: string;
};
export type Scenarios = {
  scenarios: {
    id: string;
    name: string;
    assumptions: string[];
    careers: Career[];
  }[];
  comparisons: {
    occupation_id: string;
    title: string;
    moderate: number;
    accelerated: number;
    difference: number;
  }[];
  priorities: Record<string, string[]>;
};
export type Resource = {
  id?: string;
  title: string;
  provider: string;
  url: string;
  hours?: number;
  cost?: string;
};
export type Milestone = {
  id: string;
  skill_id: string;
  skill_name: string;
  title: string;
  target_level: number;
  current_level: number | null;
  status: string;
  hours: number;
  weeks: number;
  prerequisites: string[];
  resources: Resource[];
  exercise: string;
  verification: string;
  priority: number;
};
export type Roadmap = {
  occupation_id: string;
  title: string;
  milestones: Milestone[];
  total_hours: number;
  total_weeks: number;
  weekly_hours: number;
  portfolio_project: string;
  assumptions: string[];
};
export type Simulation = {
  skill_id: string;
  target_level: number;
  assumptions: string[];
  occupations: {
    occupation_id: string;
    title: string;
    before: number;
    after: number;
    difference: number;
    additional_requirements: number;
  }[];
  modified_skills: string[];
};
export type Employer = {
  id: string;
  employer_name: string;
  title: string;
  location: string;
  country: string;
  fit: number | null;
  requirements_satisfied: string[];
  remaining_requirements: string[];
  education_eligibility: string;
  experience_eligibility: string;
  work_authorization: string;
  vacancy_status: string;
  source_status: string;
  source_url: string | null;
};
export type Employers = {
  occupation_id: string;
  title: string;
  projection_assumption: string;
  roles: Employer[];
  summary: {
    selected_career: string;
    supporting_competencies: string[];
    unverified_skills: string[];
    priority_milestones: string[];
    portfolio_project: string;
    potential_roles: string[];
    next_action: string;
  };
};
export type Question = {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  difficulty: number;
  competency: string;
  type: string;
};
export type Assessment = {
  progress: { answered: number; total: number };
  source?: string;
  assessment_id: string;
  skill_id: string;
  status: string;
  question: Question | null;
  result?: {
    estimated_proficiency: number | null;
    confidence: string;
    assessment_status: string;
    questions_attempted: number;
    correct_count: number;
    explanation: string;
    tested_competencies: string[];
    limitations: string[];
  };
};
export const blankProfile: Profile = {
  career_stage: "starter",
  direction: "explore",
  country: "MY",
  employment_country: "MY",
  education: "",
  occupation_id: null,
  current_occupation_id: null,
  cv_evidence: [],
  experience_years: 0,
  background: "",
  projects: "",
  skill_ids: [],
  reported_experience: {},
  self_ratings: {},
  interests: [],
  weekly_hours: 6,
  budget: "free",
  work_arrangement: "any",
  task_ids: [],
  assessment_ids: [],
};
export const countries = [
  ["MY", "Malaysia"],
  ["SG", "Singapore"],
  ["ID", "Indonesia"],
  ["PH", "Philippines"],
  ["TH", "Thailand"],
  ["VN", "Vietnam"],
  ["BN", "Brunei"],
  ["KH", "Cambodia"],
  ["LA", "Laos"],
  ["MM", "Myanmar"],
  ["TL", "Timor-Leste"],
];
