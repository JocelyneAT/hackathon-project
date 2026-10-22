"""Author the transparent demonstration catalogue. Run once when revising seed fixtures."""

import json
from pathlib import Path

DATE = "2026-10-21"
VERSION = "my-demo-2026.10.21-v1"
ILLUSTRATIVE = "curated illustrative"
SYNTHETIC = "synthetic demonstration"


def source(
    identifier,
    name,
    url=None,
    status="source-backed",
    methodology="Official reference; no labour-market quantities imported.",
):
    return {
        "id": identifier,
        "name": name,
        "url": url,
        "source_url": url,
        "publication_date": None,
        "verified_at": DATE,
        "retrieved_at": DATE,
        "country": "GLOBAL",
        "dataset_version": VERSION,
        "evidence_status": status,
        "methodology": methodology,
    }


sources = [
    source(
        "shiftos-curated",
        "SHIFT//OS author-curated occupation framework",
        status=ILLUSTRATIVE,
        methodology="Team-authored skill requirements, learning effort and task exposure assumptions for testing. Not a national classification, validated proficiency standard, demand forecast or research estimate.",
    ),
    source(
        "shiftos-synthetic",
        "SHIFT//OS fictional employer and market fixtures",
        status=SYNTHETIC,
        methodology="Fictional organisations, role requirements and dated observations for algorithm demonstrations; never actual vacancies or labour-market evidence.",
    ),
    source("sqlbolt", "SQLBolt", "https://sqlbolt.com/"),
    source(
        "kaggle-python", "Kaggle Learn Python", "https://www.kaggle.com/learn/python"
    ),
    source(
        "ms-excel",
        "Microsoft Excel help and learning",
        "https://support.microsoft.com/en-us/excel/",
    ),
    source(
        "khan-statistics",
        "Khan Academy Statistics and probability",
        "https://www.khanacademy.org/math/statistics-probability",
    ),
    source(
        "ms-requirements",
        "Microsoft Learn requirements module",
        "https://learn.microsoft.com/en-us/training/modules/work-with-requirements/",
    ),
    source(
        "ms-powerbi",
        "Microsoft Learn Power BI",
        "https://learn.microsoft.com/en-us/training/powerplatform/power-bi",
    ),
    source(
        "ms-automate",
        "Microsoft Learn Power Automate",
        "https://learn.microsoft.com/en-us/training/powerplatform/power-automate",
    ),
    source(
        "ms-teams",
        "Microsoft Teams help and learning",
        "https://support.microsoft.com/en-us/teams/",
    ),
    source(
        "un-sdg4", "United Nations SDG 4 targets", "https://sdgs.un.org/goals/goal4"
    ),
    source(
        "un-sdg8", "United Nations SDG 8 targets", "https://sdgs.un.org/goals/goal8"
    ),
    source(
        "un-sdg12", "United Nations SDG 12 targets", "https://sdgs.un.org/goals/goal12"
    ),
    source(
        "esco-context",
        "European Commission ESCO occupation classification",
        "https://esco.ec.europa.eu/en/classification/occupation_main",
        methodology="Architecture context only. No ESCO taxonomy export or verified crosswalk has been imported; local occupation requirements remain illustrative.",
    ),
]

country_names = {
    "MY": "Malaysia",
    "SG": "Singapore",
    "ID": "Indonesia",
    "PH": "Philippines",
    "TH": "Thailand",
    "VN": "Vietnam",
    "BN": "Brunei",
    "KH": "Cambodia",
    "LA": "Laos",
    "MM": "Myanmar",
    "TL": "Timor-Leste",
}
countries = [
    {
        "id": code,
        "code": code,
        "name": name,
        "supported": code == "MY",
        "capabilities": [
            "curated occupations",
            "skill assessments",
            "learning pathways",
            "illustrative employer alignment",
        ]
        if code == "MY"
        else [],
        "market_data": "unavailable",
        "evidence_status": ILLUSTRATIVE if code == "MY" else "unavailable",
        "notes": "Operational planning with illustrative local requirements. No verified Malaysian demand or vacancies."
        if code == "MY"
        else "Local datasets have not been imported. Malaysian figures are never substituted.",
    }
    for code, name in country_names.items()
]

skill_defs = [
    (
        "sql",
        "SQL",
        ["Structured Query Language", "SQL queries"],
        16,
        [],
        "Retrieve and filter records",
        "Join and aggregate tables",
        "Write independent multi-table queries",
        "Optimise complex queries",
        "Design and evaluate data-access strategies",
    ),
    (
        "python",
        "Python",
        ["Python programming", "pandas"],
        22,
        [],
        "Recognise variables and expressions",
        "Use loops and functions",
        "Build tested data-processing scripts",
        "Troubleshoot complex programs",
        "Design robust software architectures",
    ),
    (
        "excel",
        "Microsoft Excel",
        ["Excel", "MS Excel", "spreadsheets"],
        12,
        [],
        "Recognise cell references",
        "Apply formulas and filters",
        "Build repeatable analyses and PivotTables",
        "Audit complex models",
        "Design governed analytical workbooks",
    ),
    (
        "statistics",
        "Statistics",
        ["statistical analysis", "probability"],
        18,
        [],
        "Interpret mean and median",
        "Calculate descriptive summaries",
        "Select and interpret common statistical methods",
        "Evaluate study assumptions",
        "Design rigorous analytical studies",
    ),
    (
        "business-analysis",
        "Business Analysis",
        ["requirements analysis", "requirements gathering", "business analyst"],
        16,
        [],
        "Recognise stakeholders and requirements",
        "Write testable acceptance criteria",
        "Elicit and validate competing needs",
        "Model complex business processes",
        "Lead enterprise change evaluation",
    ),
    (
        "power-bi",
        "Power BI",
        ["PowerBI", "Microsoft Power BI", "dashboard"],
        16,
        ["excel"],
        "Read dashboard visuals",
        "Create connected charts",
        "Build data models and reports",
        "Optimise semantic models",
        "Design governed enterprise BI",
    ),
    (
        "communication",
        "Communication",
        ["presentation", "presentations", "stakeholder communication"],
        10,
        [],
        "Identify audience and purpose",
        "Write clear structured updates",
        "Explain evidence to different audiences",
        "Resolve complex stakeholder disagreements",
        "Design communication strategies",
    ),
    (
        "automation",
        "Workflow Automation",
        ["Power Automate", "process automation", "RPA"],
        20,
        [],
        "Recognise repeatable workflows",
        "Build a simple trigger and action",
        "Create tested automated workflows",
        "Troubleshoot resilient integrations",
        "Govern enterprise automation portfolios",
    ),
    (
        "sustainability",
        "Sustainability Reporting",
        ["ESG", "sustainability", "carbon reporting"],
        18,
        [],
        "Recognise resource and reporting concepts",
        "Collect traceable sustainability metrics",
        "Prepare transparent performance analyses",
        "Evaluate reporting boundaries",
        "Design auditable reporting systems",
    ),
]
skills = [
    {
        "id": sid,
        "name": name,
        "aliases": aliases,
        "hours_per_level": hours,
        "prerequisites": prereq,
        "levels": {str(i + 1): desc for i, desc in enumerate(descriptors)},
        "source_id": "shiftos-curated",
        "evidence_status": ILLUSTRATIVE,
        "country": "MY",
        "dataset_version": VERSION,
    }
    for sid, name, aliases, hours, prereq, *descriptors in skill_defs
]


def requirements(values):
    return [
        {"skill_id": sid, "required_level": level, "weight": weight}
        for sid, level, weight in values
    ]


occ_defs = [
    (
        "admin-assistant",
        "Administrative Assistant",
        "Coordinate records, scheduling and clear operational communication.",
        ["organisation", "collaboration", "operations"],
        [
            ("excel", 2, 3),
            ("communication", 3, 4),
            ("business-analysis", 1, 1),
            ("automation", 2, 2),
        ],
        "Create a documented scheduling and reporting workflow with a checked spreadsheet.",
    ),
    (
        "customer-support",
        "Customer Support Specialist",
        "Resolve customer enquiries and document recurring service issues.",
        ["collaboration", "people", "communication"],
        [
            ("communication", 3, 4),
            ("excel", 2, 2),
            ("business-analysis", 2, 2),
            ("automation", 1, 1),
        ],
        "Analyse a fictional support-ticket log and write an escalation guide.",
    ),
    (
        "data-analyst",
        "Data Analyst",
        "Turn reliable data into decisions through queries, analysis and communication.",
        ["analytics", "technology", "problem-solving"],
        [
            ("sql", 3, 4),
            ("excel", 3, 3),
            ("statistics", 3, 3),
            ("python", 2, 2),
            ("communication", 3, 2),
        ],
        "Analyse a public dataset with SQL, validate the results and present a dashboard with limitations.",
    ),
    (
        "business-analyst",
        "Business Analyst",
        "Translate stakeholder needs into clear, testable business requirements.",
        ["collaboration", "problem-solving", "operations"],
        [
            ("business-analysis", 3, 4),
            ("communication", 3, 4),
            ("excel", 2, 2),
            ("sql", 2, 1),
        ],
        "Interview a volunteer stakeholder, map a process and write acceptance criteria for an improvement.",
    ),
    (
        "bi-analyst",
        "Business Intelligence Analyst",
        "Build trusted reporting models and dashboards for business teams.",
        ["analytics", "technology", "organisation"],
        [
            ("sql", 3, 4),
            ("power-bi", 3, 4),
            ("excel", 3, 2),
            ("statistics", 2, 2),
            ("communication", 3, 2),
        ],
        "Create a small star schema, a Power BI report and a reproducible data-quality checklist.",
    ),
    (
        "operations-analyst",
        "Operations Analyst",
        "Investigate operational bottlenecks and measure practical improvements.",
        ["operations", "analytics", "problem-solving"],
        [
            ("excel", 3, 4),
            ("statistics", 2, 2),
            ("business-analysis", 3, 3),
            ("sql", 2, 2),
            ("communication", 3, 2),
        ],
        "Measure a fictional order workflow, locate bottlenecks and propose a tested process change.",
    ),
    (
        "ai-automation",
        "AI Automation Specialist",
        "Develop supervised workflow automations with checks and human review.",
        ["technology", "problem-solving", "innovation"],
        [
            ("automation", 3, 4),
            ("python", 3, 4),
            ("sql", 2, 2),
            ("business-analysis", 3, 2),
            ("communication", 2, 1),
        ],
        "Automate a document-routing workflow with an audit log, failure recovery and human approval.",
    ),
    (
        "sustainability-analyst",
        "Sustainability Data Analyst",
        "Prepare traceable resource-use metrics and explain sustainability findings.",
        ["sustainability", "analytics", "impact"],
        [
            ("sustainability", 3, 4),
            ("excel", 3, 3),
            ("statistics", 3, 3),
            ("sql", 2, 2),
            ("communication", 3, 2),
        ],
        "Build a resource-use dashboard with metric definitions, reporting boundaries and source traceability.",
    ),
]
occupations = [
    {
        "id": oid,
        "name": name,
        "title": name,
        "description": desc,
        "interests": interests,
        "requirements": requirements(reqs),
        "portfolio_project": project,
        "country": "MY",
        "source_id": "shiftos-curated",
        "dataset_version": VERSION,
        "evidence_status": ILLUSTRATIVE,
        "market_outlook": {
            "status": "unavailable",
            "note": "No verified occupation-demand observations imported.",
        },
    }
    for oid, name, desc, interests, reqs, project in occ_defs
]

task_defs = {
    "admin-assistant": [
        (
            "Update records and compile routine reports",
            4,
            0.85,
            "Draft standard reports and flag inconsistent entries",
            False,
            ["excel", "automation"],
        ),
        (
            "Coordinate schedules and appointments",
            3,
            0.65,
            "Suggest schedules for human confirmation",
            False,
            ["automation"],
        ),
        (
            "Handle sensitive requests and exceptions",
            3,
            0.25,
            "Summarise context for a responsible human decision",
            True,
            ["communication"],
        ),
    ],
    "customer-support": [
        (
            "Answer repeat enquiries",
            4,
            0.8,
            "Draft responses grounded in an approved knowledge base",
            False,
            ["automation"],
        ),
        (
            "Investigate escalated customer issues",
            4,
            0.4,
            "Summarise case history for human resolution",
            True,
            ["communication", "business-analysis"],
        ),
        (
            "Document service trends",
            2,
            0.6,
            "Group common issues for review",
            False,
            ["excel"],
        ),
    ],
    "data-analyst": [
        (
            "Clean data and prepare repeatable queries",
            4,
            0.7,
            "Suggest queries and data-cleaning checks",
            False,
            ["sql", "python"],
        ),
        (
            "Interpret findings and challenge assumptions",
            4,
            0.35,
            "Generate alternative hypotheses for analyst review",
            True,
            ["statistics", "communication"],
        ),
        (
            "Prepare reports and explain limitations",
            2,
            0.6,
            "Draft chart descriptions using validated results",
            True,
            ["communication"],
        ),
    ],
    "business-analyst": [
        (
            "Elicit and negotiate stakeholder requirements",
            4,
            0.25,
            "Summarise interviews for stakeholder validation",
            True,
            ["communication", "business-analysis"],
        ),
        (
            "Draft process maps and acceptance criteria",
            3,
            0.65,
            "Draft criteria to check against agreed needs",
            False,
            ["business-analysis"],
        ),
        (
            "Evaluate tradeoffs and business cases",
            3,
            0.4,
            "Organise evidence for human decisions",
            True,
            ["business-analysis", "excel"],
        ),
    ],
    "bi-analyst": [
        (
            "Prepare data models and reporting queries",
            4,
            0.7,
            "Suggest measures and query transformations",
            False,
            ["sql", "power-bi"],
        ),
        (
            "Design dashboards with users",
            3,
            0.5,
            "Propose views for user testing",
            True,
            ["power-bi", "communication"],
        ),
        (
            "Audit metric definitions and quality",
            3,
            0.35,
            "Flag inconsistencies for analyst investigation",
            True,
            ["statistics"],
        ),
    ],
    "operations-analyst": [
        (
            "Compile operational performance reports",
            3,
            0.75,
            "Automate draft operational summaries",
            False,
            ["excel", "automation"],
        ),
        (
            "Investigate bottlenecks with process owners",
            4,
            0.35,
            "Organise process evidence for validation",
            True,
            ["business-analysis"],
        ),
        (
            "Evaluate improvements and measure effects",
            3,
            0.4,
            "Suggest comparison methods for review",
            True,
            ["statistics"],
        ),
    ],
    "ai-automation": [
        (
            "Build workflow integrations",
            4,
            0.65,
            "Draft integration code and test cases",
            False,
            ["automation", "python"],
        ),
        (
            "Test failures and design human controls",
            4,
            0.3,
            "Propose edge cases for engineer review",
            True,
            ["business-analysis", "python"],
        ),
        (
            "Monitor automated systems and exceptions",
            2,
            0.55,
            "Group alerts and suggest investigations",
            True,
            ["automation"],
        ),
    ],
    "sustainability-analyst": [
        (
            "Collect and clean resource-use metrics",
            4,
            0.65,
            "Identify missing records and inconsistent units",
            False,
            ["excel", "sql"],
        ),
        (
            "Define boundaries and assess evidence quality",
            3,
            0.25,
            "Organise source evidence for accountable review",
            True,
            ["sustainability", "statistics"],
        ),
        (
            "Communicate sustainability performance",
            3,
            0.5,
            "Draft narratives from verified metrics",
            True,
            ["communication", "sustainability"],
        ),
    ],
}
tasks = [
    {
        "id": f"{oid}-task-{i + 1}",
        "occupation_id": oid,
        "description": desc,
        "weight": weight,
        "exposure": exposure,
        "augmentation": augmentation,
        "human_judgment": human,
        "adaptation_skills": adaptation,
        "country": "MY",
        "source_id": "shiftos-curated",
        "evidence_status": ILLUSTRATIVE,
        "assessed_at": DATE,
        "dataset_version": VERSION,
        "methodology": "Team-authored illustrative task shares and technical exposure. Not measured displacement risk.",
    }
    for oid, items in task_defs.items()
    for i, (desc, weight, exposure, augmentation, human, adaptation) in enumerate(items)
]

resource_defs = [
    (
        "sqlbolt-foundations",
        "SQLBolt interactive SQL lessons",
        "SQLBolt",
        "sqlbolt",
        ["sql"],
        8,
        1,
        "interactive lessons",
    ),
    (
        "kaggle-python-foundations",
        "Python",
        "Kaggle Learn",
        "kaggle-python",
        ["python"],
        8,
        1,
        "course",
    ),
    (
        "excel-learning",
        "Excel help and learning",
        "Microsoft Support",
        "ms-excel",
        ["excel"],
        10,
        1,
        "reference and guided practice",
    ),
    (
        "statistics-foundations",
        "Statistics and probability",
        "Khan Academy",
        "khan-statistics",
        ["statistics"],
        14,
        1,
        "course collection",
    ),
    (
        "requirements-foundations",
        "Work with requirements for Microsoft Power Platform and Dynamics 365",
        "Microsoft Learn",
        "ms-requirements",
        ["business-analysis"],
        5,
        1,
        "training module",
    ),
    (
        "powerbi-learning",
        "Microsoft Power BI training",
        "Microsoft Learn",
        "ms-powerbi",
        ["power-bi"],
        12,
        1,
        "learning path collection",
    ),
    (
        "teams-communication",
        "Microsoft Teams help and learning",
        "Microsoft Support",
        "ms-teams",
        ["communication"],
        4,
        1,
        "collaboration tool reference",
    ),
    (
        "automation-learning",
        "Microsoft Power Automate training",
        "Microsoft Learn",
        "ms-automate",
        ["automation"],
        12,
        1,
        "learning path collection",
    ),
    (
        "sdg-reporting-reference",
        "SDG 12 targets and reporting context",
        "United Nations",
        "un-sdg12",
        ["sustainability"],
        6,
        1,
        "reference and applied metric exercise",
    ),
]
source_map = {s["id"]: s for s in sources}
resources = [
    {
        "id": rid,
        "title": title,
        "provider": provider,
        "url": source_map[src]["url"],
        "skill_ids": sids,
        "hours": hours,
        "level": level,
        "difficulty": "foundation",
        "cost": "free",
        "language": "en",
        "country": "GLOBAL",
        "source_id": src,
        "verified_at": DATE,
        "dataset_version": VERSION,
        "evidence_status": "source-backed",
        "type": kind,
        "duration_note": "SHIFT//OS planning estimate including practice; not a provider-certified duration.",
        "cost_note": "Learning content is free to access; product licences, exams or optional services may cost extra.",
    }
    for rid, title, provider, src, sids, hours, level, kind in resource_defs
]

employer_roles = []
for i, occ in enumerate(occupations):
    employer_roles.append(
        {
            "id": f"demo-{occ['id']}-graduate",
            "employer_id": f"demo-employer-{i + 1}",
            "employer_name": f"Example {['Office', 'Service', 'Analytics', 'Consulting', 'Insights', 'Operations', 'Automation', 'Sustainability'][i]} Lab (fictional)",
            "title": f"Graduate {occ['name']}",
            "occupation_id": occ["id"],
            "country": "MY",
            "location": "Kuala Lumpur (illustrative)",
            "requirements": occ["requirements"],
            "education": "Relevant diploma, degree or equivalent portfolio; manual review required",
            "experience_years": 0,
            "work_authorization": "Must independently confirm eligibility to work in Malaysia",
            "vacancy_status": "not a vacancy",
            "source_url": None,
            "source_id": "shiftos-synthetic",
            "source_status": SYNTHETIC,
            "evidence_status": SYNTHETIC,
            "verified_at": DATE,
            "dataset_version": VERSION,
            "notes": "Fictional role requirements for demonstration. No employer relationship or available vacancy is implied.",
        }
    )
employer_roles.append(
    {
        **employer_roles[2],
        "id": "demo-data-analyst-experienced",
        "title": "Data Analyst",
        "experience_years": 2,
        "requirements": requirements(
            [
                ("sql", 4, 4),
                ("python", 3, 3),
                ("statistics", 3, 3),
                ("communication", 3, 2),
            ]
        ),
    }
)

scenarios = [
    {
        "id": "moderate",
        "name": "Moderate AI adoption",
        "adaptation_weight": 0.1,
        "learning_multiplier": 1,
        "exposure_multiplier": 1,
        "priority_multipliers": {
            "automation": 1,
            "python": 1,
            "communication": 1,
            "statistics": 1,
        },
        "assumptions": [
            "Gradual adoption; existing occupational requirements remain the planning baseline.",
            "Technical exposure is distinct from observed adoption and job displacement.",
        ],
        "evidence_status": ILLUSTRATIVE,
    },
    {
        "id": "accelerated",
        "name": "Accelerated AI adoption",
        "adaptation_weight": 0.25,
        "learning_multiplier": 1.15,
        "exposure_multiplier": 1,
        "priority_multipliers": {
            "automation": 1.6,
            "python": 1.25,
            "communication": 1.15,
            "statistics": 1.2,
        },
        "assumptions": [
            "Faster adoption increases priority for workflow oversight, analytical validation and human review.",
            "Planning multipliers are hypothetical team-authored assumptions, not forecasts.",
        ],
        "evidence_status": ILLUSTRATIVE,
    },
]
sdg_mappings = []
for occ in occupations:
    sdg_mappings.append(
        {
            "id": f"{occ['id']}-sdg4",
            "occupation_id": occ["id"],
            "goal": 4,
            "target": "4.4",
            "name": "Quality Education",
            "explanation": "Optional assessments and practical learning milestones support relevant technical and vocational skill development.",
            "source_id": "un-sdg4",
            "source_url": source_map["un-sdg4"]["url"],
            "evidence_status": ILLUSTRATIVE,
            "country": "MY",
            "dataset_version": VERSION,
        }
    )
sdg_mappings.extend(
    [
        {
            "id": "ai-automation-sdg8",
            "occupation_id": "ai-automation",
            "goal": 8,
            "target": "8.2",
            "name": "Decent Work and Economic Growth",
            "explanation": "A supervised automation portfolio demonstrates technological process improvements while retaining accountable human decisions.",
            "source_id": "un-sdg8",
            "source_url": source_map["un-sdg8"]["url"],
            "evidence_status": ILLUSTRATIVE,
            "country": "MY",
            "dataset_version": VERSION,
        },
        {
            "id": "sustainability-analyst-sdg12",
            "occupation_id": "sustainability-analyst",
            "goal": 12,
            "target": "12.6",
            "name": "Responsible Consumption and Production",
            "explanation": "Traceable resource-use metrics and sustainability dashboards support transparent organisational reporting; impact is not quantified.",
            "source_id": "un-sdg12",
            "source_url": source_map["un-sdg12"]["url"],
            "evidence_status": ILLUSTRATIVE,
            "country": "MY",
            "dataset_version": VERSION,
        },
    ]
)
market_signals = [
    {
        "id": f"demo-data-analyst-{month}",
        "occupation_id": "data-analyst",
        "country": "MY",
        "date": f"2026-{month}-01",
        "value": value,
        "metric": "synthetic fixture index",
        "unit": "illustrative index points",
        "source_id": "shiftos-synthetic",
        "evidence_status": SYNTHETIC,
        "dataset_version": VERSION,
        "notes": "Fabricated test observations. Excluded from career scoring and market outlook.",
    }
    for month, value in [("09", 100), ("10", 105)]
]

catalog = {
    "countries": countries,
    "sources": sources,
    "skills": skills,
    "occupations": occupations,
    "tasks": tasks,
    "resources": resources,
    "employer_roles": employer_roles,
    "market_signals": market_signals,
    "scenarios": scenarios,
    "sdg_mappings": sdg_mappings,
    "dataset_versions": [
        {
            "id": VERSION,
            "name": "Malaysia demonstration catalogue",
            "created_at": DATE,
            "evidence_status": ILLUSTRATIVE,
            "notes": "Official learning links and SDG references; illustrative occupational assumptions and fictional employer fixtures.",
        }
    ],
}

if __name__ == "__main__":
    target = Path(__file__).resolve().parents[1] / "datasets" / "seed" / "catalog.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {target}")
