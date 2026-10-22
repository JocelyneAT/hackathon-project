# SHIFT//OS interaction contract

Business source: the user's complete master development prompt, sections 3-12, 16-17, 21, 24, and 28.

Canonical UI owners are shared components in frontend/src/components/ui.tsx and the single profile state in frontend/src/app/page.tsx. Native selects own all single-select popups. The global stylesheet owns colors, scrollbars, focus, responsive spacing, and reduced motion.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native HTML select, shared Field wrapper | DESIGN.md | native platform popup | Playwright keyboard and selection |
| Form | Personal component + shared Field + profile schema | user brief + backend schemas | starter / professional | workflow validation tests |
| Scrollbar | globals.css document baseline | DESIGN.md | default / forced colors | computed CSS + narrow overflow |

Table selection, date inputs, destructive CRUD, and modal/toast systems are not part of this planning workflow. Inline shared status/error regions own feedback. Reference tables intentionally render the small finite occupation catalog; the extensible dataset explorer paginates in ten-record pages.

The four stages share an in-memory profile. Navigation preserves input; reload intentionally clears private background and extracted document content. No accounts or browser-persistent profile storage. All scores come from FastAPI. Edits invalidate downstream results and selected milestones; returning to the results fetches fresh calculations. Target mode respects the user's occupation. Assessments are optional and server-owned.

Flow ledger: profile form -> analyze -> busy -> evidence review; failure keeps values with inline correction. Career/scenario selection -> backend computation -> result in same panel. Roadmap milestone selection -> employer request -> projected alignment. All screens use one busy/status/error treatment. Duplicate submits disabled. Dataset explorer uses local filters with explicit clear and bounded pagination; filters are transient diagnostics and excluded from shared URLs. Uploaded private text is never shown in System Insights.

Loading reserves content area; errors stay visible until correction or next operation. Offline requests fail with a retryable explanation. No optimistic score changes. No automatic retries of assessment submissions. Request timeouts are bounded. Stale responses are ignored. System Insights is read-only and displays synthetic diagnostics only.

Accessibility target WCAG 2.2 AA. Native semantics, black text, visible focus, 44px controls, skip link, aria-live status, keyboard navigation, mobile reflow. No custom modal, date picker, or destructive workflow. Native select popup geometry is intentionally accepted. All required actions remain available on narrow screens.
