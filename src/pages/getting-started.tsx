export default function GettingStartedPage() {
  return (
    <div className="max-w-[680px] mx-auto px-5 py-8 pb-12">
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
          <div className="text-xs text-muted-foreground leading-relaxed">
            Get three anchor values before you start:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <div className="bg-muted rounded-lg p-2.5">
              <div className="text-[0.65rem] text-muted-foreground">Threshold pace</div>
              <div className="text-xs font-medium mt-0.5">From 5K race or 30-min TT</div>
            </div>
            <div className="bg-muted rounded-lg p-2.5">
              <div className="text-[0.65rem] text-muted-foreground">LTHR</div>
              <div className="text-xs font-medium mt-0.5">89% of max HR (Friel)</div>
            </div>
            <div className="bg-muted rounded-lg p-2.5">
              <div className="text-[0.65rem] text-muted-foreground">Current volume</div>
              <div className="text-xs font-medium mt-0.5">Need 5–8.5 hrs/wk base</div>
            </div>
          </div>
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
              <span className="text-muted-foreground">1 NSA session — learn the feel, calibrate pace vs HR</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium min-w-[40px] text-blue-500 dark:text-blue-400">Wk 2</span>
              <span className="text-muted-foreground">2 NSA sessions — start with short intervals (7×3min)</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium min-w-[40px] text-blue-500 dark:text-blue-400">Wk 3</span>
              <span className="text-muted-foreground">3 NSA sessions — full structure locked in</span>
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
          <div className="text-sm font-medium mb-1">Lock the pattern (weeks 4–8)</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Pick a weekly structure and stick to it. Rotate short / medium / long across 3 quality days.
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
            Sub-T volume: 20–30 min/session. 75% easy / 25% quality ratio.
          </div>
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
            Progress sub-T volume ~3 min/session every 1–2 weeks. Follow this load order:
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium text-emerald-500 dark:text-emerald-400">1.</span>
              <span className="text-muted-foreground">Add reps (8×3min → 9×3min → 10×3min)</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium text-emerald-500 dark:text-emerald-400">2.</span>
              <span className="text-muted-foreground">Increase rep duration (12×3min → 5×8min)</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium text-emerald-500 dark:text-emerald-400">3.</span>
              <span className="text-muted-foreground">Extend warmup/cooldown</span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="font-medium text-emerald-500 dark:text-emerald-400">4.</span>
              <span className="text-muted-foreground">Extend long run</span>
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
          <div className="text-sm font-medium mb-1">Maintain and re-test</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            At steady state, the structure stays the same indefinitely. Re-test with a 5K every 4–6 weeks to recalculate paces as fitness improves.
          </div>
        </div>
      </div>

      {/* Rules card */}
      <div className="bg-muted/50 rounded-xl p-4 mt-5">
        <div className="text-sm font-medium mb-3">The three rules</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
              Never cross LTHR
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
              Set alert at 98%. Even 5s/km too fast wrecks recovery exponentially.
            </div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
              Easy must be easy
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
              Under 70% max HR. People will pass you. Let them.
            </div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              When in doubt, slower
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
              90% of LT pace = 97% of benefit. Zero cost to being cautious.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
