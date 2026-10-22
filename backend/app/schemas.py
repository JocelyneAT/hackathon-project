from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


COUNTRIES = {"MY", "SG", "ID", "PH", "TH", "VN", "BN", "KH", "LA", "MM", "TL"}


class CVEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    skill_id: str = Field(min_length=1, max_length=100)
    source_phrase: str = Field(min_length=1, max_length=200)


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    career_stage: Literal["starter", "professional"] = "starter"
    direction: Literal["explore", "target"] = "explore"
    country: str = "MY"
    employment_country: str = "MY"
    education: str = Field(default="", max_length=500)
    occupation_id: str | None = None
    current_occupation_id: str | None = None
    experience_years: float = Field(default=0, ge=0, le=65)
    background: str = Field(default="", max_length=12000)
    projects: str = Field(default="", max_length=12000)
    skill_ids: list[str] = Field(default_factory=list, max_length=100)
    cv_evidence: list[CVEvidence] = Field(default_factory=list, max_length=100)
    reported_experience: dict[str, str] = Field(default_factory=dict, max_length=100)
    interests: list[str] = Field(default_factory=list, max_length=30)
    weekly_hours: float = Field(default=6, ge=1, le=60)
    budget: Literal["free", "paid"] = "free"
    work_arrangement: str = Field(default="flexible", max_length=100)
    task_ids: list[str] = Field(default_factory=list, max_length=100)
    assessment_ids: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("country", "employment_country")
    @classmethod
    def country_code(cls, value: str) -> str:
        if value not in COUNTRIES:
            raise ValueError("Choose a supported ASEAN country code")
        return value

    @field_validator("reported_experience")
    @classmethod
    def bounded_reports(cls, value: dict[str, str]) -> dict[str, str]:
        if any(len(key) > 100 or len(text) > 1000 for key, text in value.items()):
            raise ValueError("Experience context must be 1,000 characters or fewer per skill")
        return value


class IntelligenceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    profile: Profile = Field(default_factory=Profile)
    occupation_id: str | None = None
    scenario: Literal["moderate", "accelerated"] = "moderate"
    skill_id: str | None = None
    target_level: int = Field(default=3, ge=1, le=5)
    milestone_ids: list[str] | None = None

    @model_validator(mode="after")
    def target_is_selected(self):
        if self.profile.direction == "target" and not (self.occupation_id or self.profile.occupation_id):
            raise ValueError("Select an occupation for Target Career mode")
        return self


class TextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50000)


class AssessmentExplanationRequest(BaseModel):
    assessment_id: str


class APIResult(BaseModel):
    """Validated envelope for public structured engine outputs."""

    model_config = ConfigDict(extra="allow")
    model_version: str | None = None
    assumptions: list[str] = Field(default_factory=list)


class Explanation(BaseModel):
    text: str = Field(max_length=3000)
    source_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class PublicRecord(BaseModel):
    model_config = ConfigDict(extra="allow")


class SkillEvidence(PublicRecord):
    skill_id: str
    name: str
    detected: bool
    estimated_proficiency: int | None = Field(default=None, ge=1, le=5)
    confidence: str
    assessment_status: str
    evidence: list[str]


class ProfileAnalysis(APIResult):
    skills: list[SkillEvidence]
    assessment_priorities: list[str]
    warnings: list[str]


class CareerResult(PublicRecord):
    occupation_id: str
    title: str
    fit: int = Field(ge=0, le=100)
    fit_range: tuple[int, int]
    coverage: int = Field(ge=0, le=100)
    matching_skills: list[str]
    unverified_skills: list[str]
    missing_skills: list[str]
    factors: dict[str, float]
    explanation: str
    sdgs: list[dict[str, Any]]
    sources: list[dict[str, Any]]
    evidence_status: str


class RecommendationResult(APIResult):
    careers: list[CareerResult]
    selected_occupation_id: str | None
    scenario: Literal["moderate", "accelerated"]


class GapEntry(PublicRecord):
    skill_id: str
    name: str
    required_level: int = Field(ge=1, le=5)
    demonstrated_level: int | None = Field(default=None, ge=1, le=5)
    provisional_level: int | None = Field(default=None, ge=1, le=5)
    status: Literal["met", "unverified", "provisional", "gap"]
    gap: int | None = Field(default=None, ge=0, le=4)
    provisional_gap: int | None = Field(default=None, ge=0, le=4)
    confidence: str


class SkillGapResult(APIResult):
    occupation_id: str
    title: str
    skills: list[GapEntry]
    assessment_priorities: list[str]


class TaskResult(PublicRecord):
    id: str
    description: str
    weight: float = Field(ge=0)
    exposure: float = Field(ge=0, le=1)
    evidence_status: str


class AIImpactResult(APIResult):
    occupation_id: str
    title: str
    exposure_index: int | None = Field(default=None, ge=0, le=100)
    category: str
    tasks: list[TaskResult]
    augmentation: list[str]
    human_judgment: list[str]
    uncertainty: list[str]
    formula: str


class ResourceResult(PublicRecord):
    title: str
    provider: str
    url: str
    hours: float = Field(gt=0)
    cost: str


class MilestoneResult(PublicRecord):
    id: str
    skill_id: str
    skill_name: str
    title: str
    target_level: int = Field(ge=1, le=5)
    current_level: int | None = Field(default=None, ge=1, le=5)
    status: str
    hours: int = Field(ge=0)
    weeks: int = Field(ge=0)
    prerequisites: list[str]
    resources: list[ResourceResult]
    exercise: str
    verification: str
    priority: float


class RoadmapResult(APIResult):
    occupation_id: str
    title: str
    milestones: list[MilestoneResult]
    total_hours: int = Field(ge=0)
    total_weeks: int = Field(ge=0)
    weekly_hours: float = Field(gt=0)
    portfolio_project: str


class SimulationOccupation(PublicRecord):
    occupation_id: str
    title: str
    before: int = Field(ge=0, le=100)
    after: int = Field(ge=0, le=100)
    difference: int = Field(ge=0, le=100)
    additional_requirements: int = Field(ge=0)


class SkillImpactResult(APIResult):
    skill_id: str
    target_level: int = Field(ge=1, le=5)
    modified_skills: list[str]
    occupations: list[SimulationOccupation]


class EmployerResult(PublicRecord):
    id: str
    employer_name: str
    title: str
    country: str
    location: str
    fit: int | None = Field(default=None, ge=0, le=100)
    requirements_satisfied: list[str]
    remaining_requirements: list[str]
    education_eligibility: str
    experience_eligibility: str
    work_authorization: str
    vacancy_status: str
    source_status: str
    source_url: str | None


class EmployerMatches(APIResult):
    occupation_id: str
    title: str
    roles: list[EmployerResult]
    projection_assumption: str
    summary: dict[str, Any]


class ScenarioResult(APIResult):
    scenarios: list[dict[str, Any]]
    comparisons: list[dict[str, Any]]
    priorities: dict[str, list[str]]
