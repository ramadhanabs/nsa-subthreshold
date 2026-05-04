import { Link } from "react-router"
import { Calculator, LayoutGrid } from "lucide-react"

export default function GettingStartedPage({ embedded }: { embedded?: boolean } = {}) {
  return (
    <div className={embedded ? "" : "max-w-[680px] mx-auto px-5 py-8 pb-12"}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          Getting started with NSA
        </h1>
        <p className="text-sm text-muted-foreground">
          A step-by-step protocol to implement the Norwegian Singles approach
        </p>
      </header>

      <div className="grid grid-cols-[32px_1fr]">
        {/* Step 0 */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-full border-2 border-purple-500 text-purple-500 dark:border-purple-400 dark:text-purple-400 text-xs font-medium flex items-center justify-center shrink-0 bg-muted">
            0
          </div>
          <div className="w-0.5 flex-1 bg-border" />
        </div>
        <div className="pb-6 pl-3">
          <div className="text-sm font-medium mb-1">Establish your numbers</div>
          <div className="text-xs text-muted-foreground leading-relaxed mb-2">
            Use the{" "}
            <Link to="/calculator" className="font-medium text-foreground underline underline-offset-2">
              Calculator
            </Link>{" "}
            to derive your training zones from a recent race or time trial:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
            <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500 dark:text-purple-400"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <div className="text-xs font-medium">Threshold pace</div>
              </div>
              <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
                Enter a 5K, 10K, half, or marathon time — your CV pace is derived automatically
              </div>
            </div>
            <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 dark:text-red-400"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </div>
                <div className="text-xs font-medium">HR zones</div>
              </div>
              <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
                Set your max HR — LTHR, easy ceiling, and sub-T range are derived instantly
              </div>
            </div>
            <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500 dark:text-amber-400"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                </div>
                <div className="text-xs font-medium">Pace zones</div>
              </div>
              <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
                Short, medium, and long interval pace ranges — ready for your Planner sessions
              </div>
            </div>
          </div>
          <Link
            to="/calculator"
            className="inline-flex items-center gap-1.5 text-[0.65rem] font-medium text-foreground mt-2 hover:underline"
          >
            <Calculator size={12} />
            Open Calculator →
          </Link>
        </div>

        {/* Step 1 */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-full border-2 border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400 text-xs font-medium flex items-center justify-center shrink-0 bg-muted">
            1
          </div>
          <div className="w-0.5 flex-1 bg-border" />
        </div>
        <div className="pb-6 pl-3">
          <div className="text-sm font-medium mb-1">Transition in (weeks 1–3)</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Don't jump to 3 sessions. Add one NSA workout per week:
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium min-w-[40px] text-blue-500 dark:text-blue-400">Wk 1</span>
              <span className="text-muted-foreground">1 NSA session — pick a short template from the Planner, learn the feel</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium min-w-[40px] text-blue-500 dark:text-blue-400">Wk 2</span>
              <span className="text-muted-foreground">2 NSA sessions — compare pace vs HR, adjust if needed in Calculator</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium min-w-[40px] text-blue-500 dark:text-blue-400">Wk 3</span>
              <span className="text-muted-foreground">3 NSA sessions — full structure, use Planner to verify 75/25 ratio</span>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-full border-2 border-amber-500 text-amber-500 dark:border-amber-400 dark:text-amber-400 text-xs font-medium flex items-center justify-center shrink-0 bg-muted">
            2
          </div>
          <div className="w-0.5 flex-1 bg-border" />
        </div>
        <div className="pb-6 pl-3">
          <div className="text-sm font-medium mb-1">Plan your week (weeks 4–8)</div>
          <div className="text-xs text-muted-foreground leading-relaxed mb-2">
            Use the{" "}
            <Link to="/planner" className="font-medium text-foreground underline underline-offset-2">
              Planner
            </Link>{" "}
            to build your weekly structure. Drag quality sessions to days, fill easy and long runs, and watch the ratio bar:
          </div>
          <div className="flex gap-1 mt-2">
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300">E</span>
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">Q</span>
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300">E</span>
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">Q</span>
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300">E</span>
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">Q</span>
            <span className="px-2 py-0.5 rounded text-[0.65rem] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300">LR</span>
          </div>
          <div className="text-[0.65rem] text-muted-foreground mt-1.5">
            The Planner tracks sub-T volume and the 75% easy / 25% quality ratio automatically.
          </div>
          <Link
            to="/planner"
            className="inline-flex items-center gap-1.5 text-[0.65rem] font-medium text-foreground mt-2 hover:underline"
          >
            <LayoutGrid size={12} />
            Open Planner →
          </Link>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-full border-2 border-emerald-500 text-emerald-500 dark:border-emerald-400 dark:text-emerald-400 text-xs font-medium flex items-center justify-center shrink-0 bg-muted">
            3
          </div>
          <div className="w-0.5 flex-1 bg-border" />
        </div>
        <div className="pb-6 pl-3">
          <div className="text-sm font-medium mb-1">Build load (weeks 8+)</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Progress sub-T volume ~3 min/session every 1–2 weeks. Use the Planner to try different templates and see total volume change:
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium text-emerald-500 dark:text-emerald-400">1.</span>
              <span className="text-muted-foreground">Add reps (drag a bigger template — 8×3min → 9×3min → 10×3min)</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium text-emerald-500 dark:text-emerald-400">2.</span>
              <span className="text-muted-foreground">Increase rep duration (switch to medium/long templates — 5×8min)</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium text-emerald-500 dark:text-emerald-400">3.</span>
              <span className="text-muted-foreground">Extend warmup/cooldown (adjust via the cog icon in Planner)</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium text-emerald-500 dark:text-emerald-400">4.</span>
              <span className="text-muted-foreground">Extend long run duration</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium text-emerald-500 dark:text-emerald-400">5.</span>
              <span className="text-muted-foreground">Extend easy runs (last resort)</span>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-full border-2 border-orange-500 text-orange-500 dark:border-orange-400 dark:text-orange-400 text-xs font-medium flex items-center justify-center shrink-0 bg-muted">
            4
          </div>
        </div>
        <div className="pb-6 pl-3">
          <div className="text-sm font-medium mb-1">Re-test and recalculate</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Every 4–6 weeks, race a 5K or run a 30-min time trial. Enter the new result in the{" "}
            <Link to="/calculator" className="font-medium text-foreground underline underline-offset-2">
              Calculator
            </Link>{" "}
            to update your pace zones — they'll automatically reflect in the Planner's workout cards. The structure stays the same; only the paces get faster.
          </div>
        </div>
      </div>

      {/* Rules card */}
      <div className="bg-muted/50 rounded-xl p-4 mt-5">
        <div className="text-sm font-medium mb-3">The three rules</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 dark:text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </div>
              <div className="text-xs font-medium text-red-600 dark:text-red-400">Never cross LTHR</div>
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
              Set alert at 98%. The Calculator shows your exact LTHR — even 5s/km too fast wrecks recovery exponentially.
            </div>
          </div>
          <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 dark:text-blue-400"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Easy must be easy</div>
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
              Under 70% max HR. The Calculator shows your easy ceiling — stay below it. People will pass you. Let them.
            </div>
          </div>
          <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 dark:text-emerald-400"><path d="m9 18 6-6-6-6"/></svg>
              </div>
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">When in doubt, slower</div>
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
              90% of LT pace = 97% of benefit. Zero cost to being cautious. The Planner shows estimated distance so you know what to expect.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
