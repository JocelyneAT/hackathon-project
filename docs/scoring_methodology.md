# Planning and matching methodology

The active scoring version is `shiftos-rules-1.0`. These are reproducible, team-authored planning rules, not a validated prediction model. A pathway-fit index, provisional evidence coverage, market outlook and vacancy eligibility describe different things and must remain separate.

## Evidence normalization

Aliases normalize mentions to stable skill IDs. For example, `Structured Query Language` maps to `sql`; the original phrase is retained in extraction results. A user-reviewed CV phrase can be submitted as `profile.cv_evidence`. It is recorded as a document mention, never proof of proficiency. Profile/project mentions and self-reported experience also leave `estimated_proficiency` null.

The API accepts assessment IDs, not client-provided assessed levels. The assessment service resolves completed, unexpired IDs against server-held evidence. Short curated knowledge checks can establish only provisional Levels 1 or 2. A null result remains unknown. The current MVP has no human-reviewed practical evidence path, so `demonstrated_level` stays null; an available short-assessment estimate appears separately as `provisional_level` and `provisional_gap`.

For ranking only, an unassessed skill uses a disclosed exploratory level range of 1 to 3 and a point assumption of 1.5. These assumptions are never written to the user's skill evidence. They are conditional planning inputs, not a claim about the person. The displayed range varies the unknown-skill contribution while holding interests and scheduling assumptions fixed; it is not a statistical confidence interval.

## Career pathway fit

For each occupation requirement `i`, let `r_i` be the required level, `w_i` its curated importance, and `m_i` the selected scenario's skill-specific priority multiplier. Let `e_i` be a provisional assessment estimate or the declared exploratory assumption.

```text
adjusted_weight_i = w_i × m_i
skill_component = 100 × Σ(adjusted_weight_i × min(1, e_i / r_i)) / Σ(adjusted_weight_i)
fit = round(0.55 × skill_component + 0.25 × interest_component + 0.20 × feasibility_component)
```

The default weights are skills 0.55, interests 0.25 and feasibility 0.20. `SCORING_WEIGHTS` may override them with a JSON object containing those three finite, nonnegative values summing to 1. Invalid configuration fails startup. The active values and individual factor contributions are exposed in System Insights and recommendation output. Changing weights requires a documented model evaluation and version decision before claiming comparative improvement.

Interest matching compares profile preferences to occupation tags. `analysis` maps to `analytics`; the broad UI preference `business` matches operations, organisation or problem-solving; `people` matches people, collaboration or communication. Other tags match directly. The interest component is `100 × matched preferences / min(number of preferences, 3)`, capped at 100. With no preferences it is a neutral 50. These questions measure preferences, not professional competence.

Feasibility uses the same estimated study hours as the roadmap: `max(20, 100 − 2 × estimated_hours / weekly_hours)`. The floor avoids making a longer pathway categorically unsuitable. Experience years do not enter pathway fit. Therefore a career starter is not penalised simply for having no job history. Actual employer experience requirements remain separate.

There is no demand contribution until verified market evidence and a defined weighting rule are available. The synthetic market snapshots are excluded from career ranking. Explicit Target Career mode preserves the chosen occupation even when another role ranks higher.

## Provisional evidence coverage and skill gaps

Coverage is the weighted share of requirements whose available provisional estimate meets the required level. Unknown proficiency does not meet a documented requirement, but it is not set to Level 0. A zero coverage result therefore means no supported requirements were established by the available evidence, not that the person has no skills.

Gap rows expose required level, nullable demonstrated and provisional levels, qualitative confidence and assessment status. For an unknown skill, both gap values are null and verification is suggested. If a foundational estimate exists, `provisional_gap = max(0, required − provisional estimate)`. `gap` is reserved for a confirmed practical gap and remains null in this MVP. The UI must describe provisional gaps accordingly.

## Scenarios

Imported `scenarios` records are the single source for active assumptions. `priority_multipliers` changes skill weighting in career matching and milestone prioritisation. `learning_multiplier` changes estimated adaptation effort and therefore learning duration and feasibility. Missing skill multipliers default to 1. The seed's legacy `adaptation_weight` and `exposure_multiplier` fields are not applied; System Insights explicitly exposes `applied_fields`.

Moderate and accelerated assumptions are hypothetical team-authored planning alternatives. They do not predict when adoption will occur. Occupational task exposure indicators remain unchanged. The comparison endpoint returns both scores, their difference, declared assumptions and recalculated learning priorities; it does not just replace prose.

## Learning roadmap

Requirements provisionally satisfied by a supported short assessment do not receive an automatic beginner course. Remaining unknown skills receive an optional verification-first milestone. Study scheduling assumes Level 1 for an unknown skill, without recording that assumption as evidence.

```text
hours_i = ceil(max(1, required_level_i − scheduling_level_i) × skill.hours_per_level × scenario.learning_multiplier)
transferability_i = number of seeded occupations requiring skill_i
priority_i = importance_i × (required − scheduling_level + 1)
             × (1 + transferability_i / occupation_count) / sqrt(hours_i)
             × scenario.priority_multiplier_i
weeks_total = ceil(sum(hours_i) / weekly_hours)
```

The prerequisite graph orders milestones before dependant skills. The importer rejects cycles and unknown prerequisite IDs. Resources come from the curated catalogue and free-budget profiles exclude paid records. Hours and target-level mappings are illustrative estimates, not provider promises. Milestones include practice, evidence review and a portfolio project; merely finishing a course never updates assessed proficiency.

## Skill-to-Opportunity simulation

The simulator copies the evidence-derived level map and changes exactly one selected skill to the declared target. A target at or below an existing provisional estimate is rejected because it is not an improvement. The engine recalculates the weighted requirement coverage and counts additional satisfied requirements for every supported occupation requiring that skill. Other skills, stored evidence and assessment results remain unchanged.

Before coverage may use provisional short-assessment evidence; after coverage also uses the explicitly projected skill level. Both are planning assumptions. The result is neither a job count nor a probability of employment.

## Employer-role alignment

The engine builds a separate projected profile. When `milestone_ids` is supplied, only those selected milestones are projected to their target levels. An empty list grants no new skill. Omitted `milestone_ids` explicitly means planning for the whole proposed roadmap. Unknown or foreign milestone IDs are rejected. Existing provisional estimates remain provisional.

```text
projected_skill_alignment = round(100 × Σ(weights of skill requirements met in projection) / Σ(all skill requirement weights))
```

Education, experience, work authorisation and vacancy availability are returned separately. Education needs manual review; a free-form education phrase is not treated as a verified qualification. Experience eligibility compares reported years to the role's requirement and stays separate from skill alignment. Work authorisation is not inferred.

All seeded employer organisations and roles are fictional, explicitly labelled synthetic demonstrations and have no invented official careers links. A displayed 100% therefore means alignment with an illustrative skill list under stated assumptions. It is not complete job eligibility, a live vacancy or an offer likelihood. Missing role requirements produce no invented score.

## Validation and future evaluation

Backend tests check unknown evidence, no-experience users, score contributions, target preservation, assessment updates, scenario recalculation, study duration, prerequisite order, single-skill isolation, selected-milestone isolation and separate eligibility outputs. Those checks validate implementation consistency; they do not validate occupational assumptions or predictive usefulness. Representative user studies and reviewed Malaysian datasets are required before a pilot.
