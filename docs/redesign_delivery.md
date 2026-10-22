# Career journey redesign

Implemented locally on 22 October 2026. The running development app is at http://127.0.0.1:3000. This work does not publish changes to the hosted Render site.

## Delivered

- The supplied #F5FEFF / #AAC0E1 / #0E2F76 palette, responsive landing page and a compact three-stage progress strip.
- CV quick start or manual entry, editable prefilled fields, optional demographics excluded from ranking, and collapsed bonus information.
- Self-rating sliders and optional ten-question quizzes for eleven skills, including HTML and C++. Latest quiz results override self estimates and previous attempts.
- Optional structured AI quiz generation with a curated fallback. Only the public skill name reaches the provider; keys stay on the server. Live provider calls were not made because no provider key is configured.
- A featured leading career or original target, five visible careers by default (target plus five alternatives in target mode), view all, selected-career detail and illustrative AI task exposure.
- Integrated prerequisite-ordered learning roadmaps, practice tasks, output checks, final project, browser PDF export and JPEG download.
- A separate job-search page with junior, senior, lead, freelance and internship filters, location and arrangement controls, and direct provider searches on LinkedIn, JobStreet and Indeed. Live vacancies are viewed on those providers, not imported into this app.
- Existing System data, scenario comparison, single-skill simulation and employer-match APIs preserved.
- Versioned catalogue expansion imported into the local database. The existing eight occupation definitions remain unchanged.

## Verification

- Backend suite: 143 passed. Additional final roadmap regression: all 16 redesigned-journey tests passed.
- Browser workflow suite: 8 passed in installed Microsoft Edge. Covers manual flow, CV prefill, ten-question completion, target preservation, job-search filters, mobile overflow, failed-request recovery and exports.
- TypeScript check and production Webpack build passed.
- Ruff checks and formatting passed. Prettier passed for every changed frontend source/test file. The whole-source format command still flags five untouched legacy files (insights.tsx, personal.tsx, results.tsx, ui.tsx and api.ts).
- Desktop and 390px screenshots reviewed. PDF text checked for content on every page; the exported JPEG was visually reviewed. Evidence is in the ignored `.local/screenshots` directory.

## Limits

Career scores remain illustrative planning indices. AI task exposure cannot be interpreted as a calibrated replacement probability. Quiz questions cover foundational knowledge only and cannot award levels 3-5 or certify practical performance. Generated-question scoring was tested using a mocked generator; an actual paid provider response remains unverified. Job-board results, availability and final filtering are controlled by the external providers.

Profile data stays in memory and clears on reload. Optional demographics never affect scoring. This remains the existing local MVP without accounts, durable assessment storage or a verified labour-market feed.
