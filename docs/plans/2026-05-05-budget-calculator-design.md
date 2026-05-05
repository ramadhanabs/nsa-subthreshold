# Budget Calculator — Design

## Overview

A training budget section on the user dashboard that calculates weekly, long run, and Q session time budgets from a 42-day running baseline. Two input modes: auto from Intervals.icu or manual entry. Three independent risk profile selectors. Full budget breakdown with validation warnings.

## Baseline

Two modes:
- **Intervals.icu**: sum moving_time from last 42 days of running activities, ÷42 ×7 = weekly average
- **Manual**: user types average weekly running minutes directly

Toggle between modes. Auto-calculate when Intervals.icu is connected and activities are synced.

## Risk Profiles (independent per budget)

### Weekly budget
| Label | Adjustment | Color |
|-------|-----------|-------|
| Recovery / taper | > -10% | blue |
| Deload | -3% to -10% | blue |
| Maintenance | 0% | white |
| Safe build | +3% to +8% | green |
| Confident recovery | +8% to +15% | yellow |
| High risk | +15% to +25% | orange |
| Very high risk | +25%+ | red |

Formula: `baseline × (1 + adjustment%)`

### Long run budget
| Label | Multiplier | Color |
|-------|-----------|-------|
| Safe | 1.00–1.04 | green |
| Confident recovery | 1.05–1.09 | yellow |
| High risk | 1.10–1.14 | orange |
| Very high risk | 1.15+ | red |

Formula: `(baseline / 7) × 3 × multiplier`
Constraint: `≤ weekly_budget × 0.30`

### Q session budget
| Label | Multiplier | Color |
|-------|-----------|-------|
| Safe | 1.1–1.3 | green |
| Confident recovery | 1.3–1.5 | yellow |
| High risk | 1.5–2.0 | orange |

Formula: `(baseline / 7) × multiplier`

## Budget Summary

Displays:
- Baseline (min + h:m)
- Weekly budget (profile + adjustment%)
- Long run budget (multiplier)
- Q session budget (multiplier)
- Easy run estimate: `(weekly - 3×Q - LR) / 3`
- 75/25 ratio check
- Stacked bar: Q / Easy / LR distribution

## Validation Warnings

1. Easy run < 20 min → "Q sessions or long run too aggressive for budget"
2. Long run > 30% of weekly → cap and warn
3. 75/25 ratio outside 70-80% easy
4. Orange/red profiles → "Ensure adequate recovery, nutrition, and sleep"

## Components

- `src/lib/budget.ts` — pure calculation functions
- `src/lib/budget.test.ts` — unit tests for all formulas
- `src/components/budget-calculator.tsx` — dashboard section component

## Data Flow

- No new backend changes
- Uses existing `GET /api/activities` for baseline auto-calculation
- Risk profiles stored as local component state (no persistence for now)
- Future: integrate into `/advanced-planner` (auth-gated) with inline budget checks on day slots
