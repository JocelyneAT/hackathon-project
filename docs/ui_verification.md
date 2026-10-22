# UI verification record

Verification date: 22 October 2026. Runtime: the compiled Next.js production frontend, FastAPI and SQLite, without an LLM key. Browser: installed Microsoft Edge through Playwright. This record covers the local MVP and does not claim a complete assistive-technology or cross-browser certification.

Latest rerun after the plain-English update: all nine Playwright tests passed in 25.2 seconds. Test-file formatting and TypeScript checks also passed. The 390px profile screenshot was inspected: labels were clear, with no charts, clipping or horizontal overflow. Automated checks covered the full journey at 390px and 760px.

The current UI rule is simple English, direct instructions and no complex analogies or charts. The four steps are **Your profile**, **Career options**, **Learning plan** and **Job options**. Results use short text and small tables. Earlier records or technical API documentation may use terms such as "provisional level" or "pathway"; the user interface now says "Estimated level" and "career options". Backend field names and calculation meanings are unchanged.

## Executed interaction coverage

The workflow specification is `frontend/tests/workflow.spec.ts`; browser configuration is `frontend/playwright.config.ts`.

| Controls or state | Recorded outcome |
|---|---|
| Synthetic starter / professional / target profiles | Loaded distinct editable profiles; actual backend results returned |
| Career starter / Working professional and career-choice controls | Adapted fields, preserved selected target and separate current job |
| Residence, employment country, study hours, budget, work arrangement | Updated profile; unsupported market disabled planning; invalid hours showed a correction and received focus |
| Every skill and interest toggle | Changed pressed state and profile inputs; mentioning a skill did not establish its level |
| Experience context selectors | Retained self-reports separately from assessed evidence |
| Four interest questions and show/hide | Updated interests; remained optional and separate from skill checks |
| TXT upload, section review/copy, invalid file/PDF | Extracted real content, supported correction, showed recoverable extraction errors |
| All five skill-check entry points and close controls | Opened the correct skill questions and closed without mandatory completion |
| SQL answer submission | Three adaptive questions produced "Estimated level 2"; downstream skill comparisons updated |
| Career selection and scenario switch | Recomputed through the backend; changed hypothetical scores while preserving target intent |
| "Where this information comes from" disclosure | Native expandable details exposed the score method, assumptions and sources |
| "Make my learning plan" and "Include in my plan" | Generated role-specific resources; sent only selected milestone IDs to employer projection; backward navigation preserved choices |
| "See what could change" | Backend changed only the selected skill and recalculated job requirement coverage |
| Job options and "Your career plan" | Rendered clearly labelled example jobs, remaining requirements, portfolio work and a next action |
| "Print my career plan" | Called print through a test-only spy; no printer job was sent |
| System data sections | All four inspectors returned real calculated example diagnostics without answer keys |
| Dataset filtering, search, clear, Previous / Next | Correct ranges, no-results state, immediate clear and focus restoration |
| Backend failure, reconnect and delayed requests | Retained inputs, recovered connection and disabled edits while calculating |
| Failed scenario / career switches | Regression coverage verifies previously committed labels, scores and roadmap remain consistent until a successful calculation |
| Keyboard and native select | Skip link focused main; native popup opened/dismissed through keyboard; visible focus outline present |
| 390px / 760px layouts | Latest full-journey tests, including System data, passed without document horizontal overflow; earlier 1440px desktop inspection remains recorded |
| Reduced motion and foregrounds | Activity spinner became static; visible application text computed black across all five areas |
| No charts in career and result screens | Assertions found no `.recharts-wrapper`, `.chart` or `[role="meter"]` elements |

## Design gate

Gate status: PASS. The supplied brief and the user's latest plain-English/no-charts instruction are the design authority. `DESIGN.md` records the purpose of type, light surfaces, black text, blue selection, numbering, shape and spacing. Dials are ENERGY 1 / RHYTHM 2 / MOTION 1. The four-stage journey and double-slash wordmark supply product identity.

Each line records the applicable Anti Slop rule and its evidence. User-authorised illustrative numeric examples remain explicitly labelled and are calculated by the backend.

- R-01 PASS: no gradients or glows; surfaces and selection encode hierarchy.
- R-02 PASS: source scan finds no em dash in authored interface text.
- R-03 PASS: full journeys at 390px and 760px assert no document overflow; wide tables own internal scrolling.
- R-04 PASS: small authored navigation icons depict profiles, work, learning and employers; labels remain visible.
- R-05 PASS: four functional planning stages follow the actual user journey, with no marketing template sections.
- R-06 PASS: Arial, heading tracking and small utility text have documented readability purposes.
- R-07 PASS: no decorative grids, blueprints or dot backgrounds.
- R-08 PASS: arrows mark actual progression to the next planning stage or next action.
- R-09 PASS: rectangular evidence/status tags communicate real state; no promotional capsules.
- R-10 PASS: no glass or blur surfaces.
- R-11 PASS: panels, controls and evidence tags use distinct documented corner sizes.
- R-12 PASS: hierarchy uses borders and tone without floating component shadows.
- R-13 PASS: no glow effects.
- R-14 PASS: comparable careers/employer records use consistent comparison structures; forms, tasks, scenarios and learning use content-specific layouts.
- R-15 PASS: action labels name the result: "Review my skills", "Make my learning plan" and "See job options".
- R-16 PASS: no generic AI promotional copy; AI labels describe task analysis and declared scenarios.
- R-17 PASS: displayed planning numbers come from backend calculations or the actual database; evidence assumptions are visible.
- R-18 PASS: no testimonials, invented users or human avatars.
- R-19 PASS: motion is limited to activity feedback and short hover transitions; reduced motion is tested.
- R-20 PASS: persistent four-stage career planning, evidence semantics and user-supplied slash wordmark establish subject-specific identity.
- R-21 PASS: the brief explicitly requires the light workspace; no dark theme is shipped.
- R-22 PASS: no decorative illustrations.
- R-23 PASS: the product name and navigation come from the brief; no unauthorised identity assets or external trust claims.
- R-24 PASS: navigation controls reach implemented areas; resource/source links use curated catalogue URLs.
- R-25 PASS: black foregrounds are tested. Contrast is 21:1 on white, 19.76:1 on the page background and 17.12:1 on primary pale blue; the primary hover fill remains 14.6:1.
- R-26 PASS: the source audit finds no actionless controls; the interaction ledger records real actions and results.
- R-27 PASS: empty profile/results, initial and delayed loading, backend failure, extraction errors and recovery were exercised.
- R-28 PASS: no generic FAQ is included.
- R-29 PASS: neutral surfaces plus a single blue accent follow the documented palette.
- R-30 PASS: the design is derived from the supplied career planning brief, without imitating another product's shell or brand.
- R-31 PASS: major visual choices and token ownership have written reasons in `DESIGN.md`.
- R-32 PASS: native semantics, skip navigation, keyboard selection/dismissal and focus styling are exercised.
- R-33 PASS: source/CSS were authored directly; no source-rewriting feature scripts are used.
- R-34 PASS: all delivered surfaces use the tested light theme; no unsupported theme toggle exists.
- R-35 PASS: production compilation and real-browser interaction tests passed; desktop/mobile captures were visually inspected.
- R-36 PASS: no fabricated security, compliance, performance, customer or hiring claims.
- R-37 PASS: the user's visual direction was recorded before UI generation, with declared dials and rationale.
- R-38 PASS: synthetic employer/market examples and curated exposure assumptions are labelled throughout, as explicitly requested.

Craftsmanship locks C-1 through C-5: PASS, supported by the written design rationale, interaction ledger, content-specific sections, responsive/error checks and explicit provenance. The focal point on each stage is its next planning decision. Whitespace separates that decision from evidence; blue is reserved for selected/action states.

## Static and build evidence

- Premium strict audit: zero errors, warnings or unresolved findings (`premium-audit.json`).
- Official DESIGN.md lint: zero errors; advisory missing-primary/component-reference warnings do not affect runtime tokens.
- TypeScript and source formatting checks passed.
- Latest targeted rerun: `npx prettier --check tests/workflow.spec.ts` and `npx tsc --noEmit` passed from `frontend/`; `npm run test:e2e` passed all nine tests against the updated production build.
- Production compilation passed using Next.js's supported Webpack option.
- No native alert/confirm/prompt, clickable non-semantic containers, placeholder navigation links or uncancelled remote searches were found. Dataset search is local and explicitly clearable.

The raw screenshots are in `.local/screenshots/`. Docker, PostgreSQL, live LLM calls, full screen-reader evaluation and additional browser/device platforms remain unverified; see `delivery_status.md` and `limitations.md`.
