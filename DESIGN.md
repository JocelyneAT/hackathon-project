---
version: beta
name: SHIFT//OS
description: A personal career journey using the user's white and blue palette.
colors:
  background: "#F5FEFF"
  supporting-blue: "#AAC0E1"
  navy: "#0E2F76"
  text: "#182E50"
  muted: "#526681"
  surface: "#FFFFFF"
  border: "#D1DEEC"
typography:
  sans: Arial, Helvetica, sans-serif
  editorial-accent: Georgia, Times New Roman, serif
---

# SHIFT//OS design system

The latest user brief replaces the former sidebar and four-page workflow. Use a welcoming landing page, a compact three-stage progress strip, editable profile fields, skill sliders with optional quizzes, and career results with integrated roadmaps. Job search opens a separate page. Preserve System data and optional scenarios and simulations.

## Palette and typography

The supplied reference owns the palette: #F5FEFF, #AAC0E1 and #0E2F76. Navy anchors headings, primary buttons and the featured career. Pale blue provides quieter supporting sections. White groups form content and comparison cards. Muted slate text remains readable against pale surfaces. The runtime tokens and journey styles live in frontend/src/app/journey.css, loaded after the original shared stylesheet. Reuse Button, Field, Panel, Icon and Tag from components/ui.tsx.

Use Arial for predictable, local typography. A single Georgia italic word on the landing page adds warmth. Larger, lighter headings and restrained metadata establish hierarchy. No external font requests, stock photographs or decorative performance statistics.

## Layout and interactions

The desktop container is 1240px including 32px gutters. The header contains the wordmark and one clear action. The three-stage strip has numbered steps and a filling line; it is never a large sidebar. A smaller contextual panel accompanies the profile on wide screens. Mobile uses natural document scrolling, one-column forms where necessary and two-column alternative career cards.

The landing page gives CV quick start and manual entry equal clarity. CV results fill recognised fields and remain editable. Age and gender are optional and excluded from all scoring. Advanced background, projects, current tasks and learning preferences live in Bonus information.

Each skill has a labelled slider and a ten-question quiz action. A completed quiz returns to the sliders with a provisional result. Explicitly distinguish self estimates, quiz evidence and unknown levels. Foundational knowledge quizzes do not award independent or advanced practical proficiency.

The leading career is a larger navy feature. Target mode features the user's original target even while another career is explored. Show five careers initially in exploration mode; target mode shows the target and five alternatives. View all expands the finite catalogue. Selected-career details include description, fit, estimated skill alignment, listed skills, learning needs and AI task exposure. Never describe exposure as a measured probability of losing a job.

Learning roadmaps open inside career results. Keep every generated step and its primary learning link, practice task and verification, followed by the final project. Optional additional materials remain collapsed. Export buttons invoke browser Save as PDF and a readable JPEG download. Print styles isolate the roadmap. Job search opens in another tab so private profile state remains available in the original tab.

Job search offers title, location, arrangement and role-level filters, then individual retrieved openings. Each card includes a small source platform icon/name linked to that exact listing, plus employer, location and source-supplied metadata. Use platform tabs to filter results. Merge duplicates without discarding their source links. Never invent vacancy cards, counts, salaries or employer claims. Loading, empty searches and unavailable sources must be distinct. Providers own final listing availability.

## Accessibility and state

Native controls, labelled fields, visible focus, keyboard access, status/error regions and reduced-motion support remain required. Async controls are disabled while requests run; failures preserve input. Numeric indices must come from backend calculations. Keep personal profile data in memory rather than browser storage. System data is read-only and excludes private profile content. Use responsive layouts and forced-color overrides. Maintain current browser workflow tests when changing these interactions.
