---
version: alpha
name: "SHIFT//OS"
description: "A simple four-step career planning app with plain English, black text, and clear next actions."
colors:
  text: "#000000"
  background: "#F7F8FA"
  surface: "#FFFFFF"
  accent: "#DCE9FD"
  border: "#D9DEE7"
  focus: "#3269BB"
typography:
  sans:
    fontFamily: "Arial, Helvetica, sans-serif"
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
  mono:
    fontFamily: "Consolas, monospace"
rounded:
  DEFAULT: "0.5rem"
  sm: "0.25rem"
  lg: "0.875rem"
spacing:
  section-gap: "2rem"
  page-max: "78rem"
components:
  button: {}
  card: {}
  input: {}
  navigation: {}
---

# SHIFT//OS design system

## Overview

The audience is ASEAN career starters and professionals. The first operational market is Malaysia, with English content and en-MY number conventions. Product register throughout. The supplied development brief owns all business behavior.

The user's latest instruction is plain English with no complex analogies or charts. The four steps are Your profile, Career options, Learning plan and Job options. Each page explains what to do next using short direct sentences. Numbers use plain text or small tables. No charts, bars, meters, or chapter/pathway metaphors. ENERGY 1 / RHYTHM 2 / MOTION 1.

The signature is the doubled slash in the user-supplied product name, repeated as quiet separators in the journey and section metadata. No invented logo, photos, decorative graphs, or marketing statistics.

Runtime token owner: CSS custom properties in frontend/src/app/globals.css mirror this frontmatter. Shared Button, Panel, Field and Tag components use those properties. Tailwind is enabled for layout utilities; no independent theme colors.

## Colors

Black text is mandatory, including descriptions, disabled controls, buttons and numbers. White surfaces and a cool light background keep long forms readable. Pale blue marks selection and primary actions. Border gray separates content without adding floating shadows. Blue focus outlines identify keyboard position. High contrast mode uses system outlines.

## Typography

Arial provides compact, predictable forms without network font swaps. Headings use negative tracking and restrained weight, giving the product name its technical character without futuristic decoration. Consolas is reserved for IDs, formulas, and methodology. Numeric comparisons use tabular figures. Body text is 14-16px with 1.5 line height.

## Layout

Desktop: 248px journey sidebar and natural-height content capped at 78rem. Main sections use a flexible content column and a narrow evidence note. On screens under 900px, navigation becomes a horizontal journey, then a two-column compact navigation under 600px. Forms always scroll with the document. Dataset tables own horizontal overflow. Spacing ranges from 8px control gaps to 32px sections, based on information grouping.

## Elevation & Depth

Borders and surface tone establish hierarchy. No blur, gradients, or ambient shadows. Selected cards use a stronger border. No dark theme is shipped because the brief requires light surfaces and black text.

## Shapes

14px panel corners distinguish sections; 8px controls and 4px status labels preserve utility. Circular progress markers represent ordered steps only. No decorative pills.

## Components

Native buttons own actions; native selects intentionally delegate popup geometry and keyboard behavior to the operating system. Inputs have explicit labels. Every async operation uses the same busy indicator, accessible status area, inline error, and retry via the original action. Empty results explain the missing prerequisite.

Primary buttons use pale blue fill with black text; secondary buttons use white fill and border; tertiary actions use transparent fill. All targets are at least 44px high. Disabled opacity never reduces black text contrast. Focus is a 3px outline. Selected states use aria-pressed or aria-current.

Cards group actual decisions. Tables use native semantics. Do not use charts or visual score bars. Explain scores in short everyday sentences. Say estimated level or not checked instead of provisional proficiency. The separate System data area remains available for the project team.

Forms use noValidate with inline field errors, and retain values on failure. Search is local, capped by dataset size, with a clear button. Uploaded documents are not retained. Skill checks appear inline, avoiding modal focus complexity.

Iconography uses small geometric SVGs for navigation concepts with adjacent text labels. No general AI icons. Motion is limited to 120ms hover feedback and an activity spinner; reduced motion disables animation.

## Do's and Don'ts

- Do connect every displayed score to backend calculations and visible assumptions.
- Do preserve the profile when changing stage, scenario, or occupation.
- Do use whitespace to distinguish decisions from supporting evidence.
- Don't present synthetic records as market findings or real vacancies.
- Don't substitute decorative KPI tiles for practical next actions.
