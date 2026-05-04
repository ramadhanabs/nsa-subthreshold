# Homepage & Content Pages — Design

## Overview

Homepage at `/` serving as the hub for the NSA Calculator app. Brief explainer content with links to dedicated tool pages (Calculator, Planner) and content pages (Getting Started, Comparison).

## Routes

- `/` → HomePage (new)
- `/calculator` → CalculatorPage (moved from `/`)
- `/planner` → PlannerPage (existing)
- `/getting-started` → GettingStartedPage (new)
- `/comparison` → ComparisonPage (new)

## Homepage Sections

1. **Hero**: Large logo, "Norwegian Singles Approach" tagline, one-liner about sub-threshold training
2. **Quick links**: Two cards — Calculator and Planner — with brief descriptions
3. **What is NSA?**: 3-4 paragraphs covering core principle (75/25 ratio, sub-T work, never cross LTHR), why it works (volume > intensity), who it's for
4. **Getting Started summary**: Compact 5-step list, link to `/getting-started`
5. **NSA vs VO2max summary**: Key takeaway + link to `/comparison`

## Getting Started Page

Convert `nsa-getting-started.html` to React/Tailwind:
- Timeline with numbered dots and connecting lines
- 5 steps: Establish numbers, Transition in, Lock pattern, Build load, Maintain
- "Three rules" card at bottom
- Monochromatic styling matching app theme, subtle color accents for step dots

## Comparison Page

Convert `nsa-vs-vo2max-comparison.html` to React:
- Header with title/description
- Step controls (dots + back/next buttons)
- Two side-by-side SVG charts (NSA vs VO2max lactate curves)
- 6 phases with animated transitions between them
- Legend row, summary card on final step
- All the SVG drawing logic (axes, curves, zones, markers, badges) ported to React

## Styling

- All pages use Tailwind + existing theme tokens
- Homepage max-width 740px
- Getting Started max-width 680px
- Comparison max-width 760px
- Nav updated with links to new pages

## Nav Updates

Add "Getting Started" and "Comparison" links, or keep nav minimal (Calculator, Planner) and let homepage link to the content pages. Recommend: keep nav with just Calculator + Planner, homepage accessible via logo click.
