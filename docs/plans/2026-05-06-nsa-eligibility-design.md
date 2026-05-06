# NSA Eligibility Assessment — Design

## Summary

Auto-assess a runner's eligibility for the NSA sub-threshold training model based on their Intervals.icu activity data. Displayed below the training summary cards on the dashboard.

## Inputs (from TrainingSummary)

- `avg_weekly_hours` → converted to `baseline_min`
- `avg_weekly_km` → cross-reference for pace derivation
- `longest_run_km` → long run ceiling validation

## Derived values

- `avg_pace = baseline_min / avg_weekly_km` (min/km)
- `daily_avg_min = baseline_min / 7`
- `est_longest_run_min = longest_run_km × avg_pace`

## Tier thresholds

| Tier | baseline_min | Q sessions | Color |
|------|-------------|------------|-------|
| Not ready | < 180 | 0 | red |
| Foundation | 180–250 | 1 | amber |
| Transition | 250–300 | 2 | yellow |
| Full NSA | 300–420 | 3 | emerald |
| Advanced NSA | 420+ | 3 | blue |

## Long run validation

- `formula_lr = daily_avg_min × 3`
- `actual_lr = est_longest_run_min`
- If `formula_lr > actual_lr × 1.15` → warning: "Your calculated long run budget exceeds your longest run by >15%, build up gradually"

## Architecture

- **Pure logic**: `assessEligibility()` in `src/lib/budget.ts` — returns `EligibilityResult`
- **UI**: Rendered below the 3 metric cards in `src/components/training-summary.tsx`
- **Display**: Tier badge with color dot + label, one-line derived stats, optional LR warning

## Approach

Approach A (inline in TrainingSummary) — data already available in the component, pure logic extracted to budget.ts for testability.
