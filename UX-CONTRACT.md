# SHIFT//OS interaction contract

The latest user redesign request owns this workflow. The original four-stage sidebar is replaced by landing -> background -> skill estimates and optional quizzes -> career results. Roadmaps belong to the selected career; job search is a separate route opened in a new tab.

## Canonical owners

| Capability | Owner | Contract |
| --- | --- | --- |
| Profile and request state | frontend/src/app/page.tsx | One in-memory profile; bounded errors; downstream invalidation |
| Background and CV review | components/journey-profile.tsx | Extracted values are editable; missing fields can be filled manually |
| Skill sliders and quizzes | components/journey-profile.tsx | Self ratings stay separate from server-owned assessment evidence |
| Career ranking and roadmap | components/career-workspace.tsx | Featured leading match or original target, finite alternatives, integrated exportable plan |
| Job discovery | app/jobs/page.tsx + backend/app/jobs.py | Individual retrieved openings with source platform badges and original listing links |
| Buttons and fields | components/ui.tsx | Native semantics, clear labels and visible focus |
| Palette and layout | app/journey.css | Supplied white/blue/navy palette, compact progress, responsive reflow |
| Scores and assessment keys | backend/app | Deterministic numeric rules; no client-supplied quiz scores |

## Flow and evidence

CV extraction fills recognised skills, education, projects, experience snippets and explicitly labelled country, age, gender and experience years. No demographic inference from names. The form is still the user's review point. Optional age and gender never influence career ranking. Employment-country coverage remains Malaysia; country of origin can differ.

Skill sliders are estimates, not demonstrated abilities. A completed quiz supersedes the self estimate, including an insufficient-evidence result. Retakes use the latest completed result. Existing three-question API callers remain supported; the interface requests ten unique questions. Optional AI generation receives only a public skill name, stores no provider response externally and falls back to an honestly labelled curated bank. Answer keys never leave the server. Assessments remain temporary server sessions. Foundational results are capped at level 2.

Changing input invalidates career results, roadmaps and simulations. Returning to earlier steps preserves fields in memory. Choosing an alternative career preserves the original target and changes only the detail/roadmap selection. Scenario changes refresh backend calculations. The default exploration list contains the leading feature and four alternatives; target mode includes the target and five alternatives. View all expands the catalogue without inventing careers.

Roadmaps use every backend milestone in prerequisite order with cumulative week ranges, a primary learning link, practice task and output check. Include the final project without inventing its duration. PDF uses browser print and isolates the roadmap; JPEG exports all steps. Optional skill simulations change only their requested skill and leave the profile and roadmap intact.

Job discovery requests contain only public title/location/preferences and no profile text or CV evidence. The backend retrieves public LinkedIn listings and optionally additional platforms through the configured search provider. Each card identifies its actual source from the listing URL; badges must never infer platform from an untrusted label. Source links open the individual listing in a new tab. Deduplicate matching title/company/location records while preserving every source link. Show supplied metadata only. Distinguish provider failure, valid empty results and partial results; cancel obsolete searches and ignore stale responses. Keep illustrative employer API outputs separate from real job discovery.

Loading and errors use shared visible feedback. Errors keep entered data and allow resubmission. Do not retry assessment submissions automatically. Keyboard access, responsive reflow, reduced motion and forced colors are supported. Native selects retain operating-system popup behaviour. Reload intentionally clears private profile fields. System data remains read-only.
