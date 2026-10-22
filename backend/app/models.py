"""Relational catalogue schema. Raw documents and private profiles are not stored."""

from sqlalchemy import CheckConstraint, Column, Float, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class Country(Base):
    __tablename__ = "countries"
    id = Column(String(2), primary_key=True)
    payload = Column(JSON, nullable=False)


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    id = Column(String, primary_key=True)
    checksum = Column(String(64), nullable=False)
    payload = Column(JSON, nullable=False)


class EvidenceSource(Base):
    __tablename__ = "evidence_sources"
    id = Column(String, primary_key=True)
    payload = Column(JSON, nullable=False)


class Skill(Base):
    __tablename__ = "skills"
    id = Column(String, primary_key=True)
    source_id = Column(String, ForeignKey("evidence_sources.id"), nullable=False, index=True)
    payload = Column(JSON, nullable=False)


class Occupation(Base):
    __tablename__ = "occupations"
    id = Column(String, primary_key=True)
    country = Column(String(2), ForeignKey("countries.id"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("evidence_sources.id"), nullable=False)
    payload = Column(JSON, nullable=False)


class OccupationSkill(Base):
    __tablename__ = "occupation_skills"
    occupation_id = Column(String, ForeignKey("occupations.id"), primary_key=True)
    skill_id = Column(String, ForeignKey("skills.id"), primary_key=True)
    required_level = Column(Integer, nullable=False)
    weight = Column(Float, nullable=False)
    __table_args__ = (CheckConstraint("required_level BETWEEN 1 AND 5"), CheckConstraint("weight > 0"))


class OccupationTask(Base):
    __tablename__ = "occupation_tasks"
    id = Column(String, primary_key=True)
    occupation_id = Column(String, ForeignKey("occupations.id"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("evidence_sources.id"), nullable=False)
    weight = Column(Float, nullable=False)
    exposure = Column(Float, nullable=False)
    payload = Column(JSON, nullable=False)
    __table_args__ = (CheckConstraint("weight > 0"), CheckConstraint("exposure BETWEEN 0 AND 1"))


class LearningResource(Base):
    __tablename__ = "learning_resources"
    id = Column(String, primary_key=True)
    source_id = Column(String, ForeignKey("evidence_sources.id"), nullable=False)
    payload = Column(JSON, nullable=False)


class ResourceSkill(Base):
    __tablename__ = "learning_resource_skills"
    resource_id = Column(String, ForeignKey("learning_resources.id"), primary_key=True)
    skill_id = Column(String, ForeignKey("skills.id"), primary_key=True)


class Employer(Base):
    __tablename__ = "employers"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    country = Column(String(2), ForeignKey("countries.id"), nullable=False)


class EmployerRole(Base):
    __tablename__ = "employer_roles"
    id = Column(String, primary_key=True)
    employer_id = Column(String, ForeignKey("employers.id"), nullable=False, index=True)
    occupation_id = Column(String, ForeignKey("occupations.id"), nullable=False, index=True)
    country = Column(String(2), ForeignKey("countries.id"), nullable=False)
    source_id = Column(String, ForeignKey("evidence_sources.id"), nullable=False)
    payload = Column(JSON, nullable=False)


class EmployerRequirement(Base):
    __tablename__ = "employer_role_requirements"
    role_id = Column(String, ForeignKey("employer_roles.id"), primary_key=True)
    skill_id = Column(String, ForeignKey("skills.id"), primary_key=True)
    required_level = Column(Integer, nullable=False)
    weight = Column(Float, nullable=False)
    __table_args__ = (CheckConstraint("required_level BETWEEN 1 AND 5"), CheckConstraint("weight > 0"))


class MarketSignal(Base):
    __tablename__ = "market_signals"
    id = Column(String, primary_key=True)
    occupation_id = Column(String, ForeignKey("occupations.id"), nullable=False, index=True)
    country = Column(String(2), ForeignKey("countries.id"), nullable=False)
    source_id = Column(String, ForeignKey("evidence_sources.id"), nullable=False)
    payload = Column(JSON, nullable=False)


class Scenario(Base):
    __tablename__ = "scenario_definitions"
    id = Column(String, primary_key=True)
    payload = Column(JSON, nullable=False)


class SdgMapping(Base):
    __tablename__ = "sdg_mappings"
    id = Column(String, primary_key=True)
    occupation_id = Column(String, ForeignKey("occupations.id"), nullable=False, index=True)
    source_id = Column(String, ForeignKey("evidence_sources.id"), nullable=False)
    payload = Column(JSON, nullable=False)


class OccupationMapping(Base):
    __tablename__ = "occupation_mappings"
    id = Column(String, primary_key=True)
    occupation_id = Column(String, ForeignKey("occupations.id"), nullable=False)
    payload = Column(JSON, nullable=False)


class AssessmentRubric(Base):
    __tablename__ = "assessment_rubrics"
    id = Column(String, primary_key=True)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=False)
    payload = Column(JSON, nullable=False)


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"
    id = Column(String, primary_key=True)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=False)
    rubric_id = Column(String, ForeignKey("assessment_rubrics.id"), nullable=True)
    payload = Column(JSON, nullable=False)


class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    id = Column(String, primary_key=True)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=False)
    payload = Column(JSON, nullable=False)


class SkillEvidence(Base):
    __tablename__ = "skill_evidence"
    id = Column(String, primary_key=True)
    skill_id = Column(String, ForeignKey("skills.id"), nullable=False)
    result_id = Column(String, ForeignKey("assessment_results.id"), nullable=True)
    payload = Column(JSON, nullable=False)


class ImportRecord(Base):
    __tablename__ = "dataset_imports"
    id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(String, nullable=False, index=True)
    checksum = Column(String(64), nullable=False, unique=True)
    imported_at = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    __table_args__ = (UniqueConstraint("version", "checksum"),)
