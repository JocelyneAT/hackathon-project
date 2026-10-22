# AI task impact methodology

The task-impact endpoint calculates a weighted technical exposure index for the tasks in the selected inventory:

```text
AI Task Exposure Index = 100 × Σ(task_weight × task_exposure) / Σ(task_weight)
```

Task exposure is stored between 0 and 1. Task weights must be positive in imported records. The engine ignores unavailable exposure or nonpositive weights when aggregating and returns a null estimate when there are no usable tasks, rather than dividing by zero. It also returns the included task records and each task's weighted contribution so the total can be inspected.

For a career starter, the inventory comes from the selected target occupation. For a professional with `current_occupation_id`, it comes from the current occupation; optional `task_ids` narrow it to their selected responsibilities. Selecting a new target pathway does not change the declared current occupation. If no current occupation is available, the result is explicitly named for the target occupation being analysed.

The category thresholds are team-authored display conventions: below 35 is lower technical exposure, 35 to 64 is moderate and 65 or above is higher. They do not correspond to validated displacement-risk bands.

Every seeded task includes a stable ID, occupation, description, importance weight, illustrative indicator, evidence status, source reference, assessment date, augmentation opportunity, human-judgment flag and adaptation skills. The seed's numeric indicators are curated illustrative assumptions. Research sources in the catalogue provide context, not validation of these task-level numbers. No ILO, OECD or national agency result is implied for the displayed index.

Moderate and accelerated adoption scenarios change occupational skill emphasis, effort and learning priorities. They do not change the technical exposure values. Faster adoption and technical feasibility are different concepts, so applying a universal exposure multiplier would imply an unsupported interpretation.

The endpoint separates the exposure index, possible AI assistance, tasks needing human judgment, adaptation skills and evidence limitations. Technical exposure does not establish actual adoption, demand decline, full automation, personal job-loss risk or employment probability. Actual market observations remain a separate import-based layer.

Tests reproduce the weighted formula directly, check a professional's selected tasks, preserve current and target occupation separation, handle an empty inventory and compare the inspector result to the public impact endpoint. Future improvements require reviewed task inventories, transparent research mappings and validation with workers who perform the actual responsibilities.
