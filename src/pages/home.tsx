import { Link } from "react-router"

export default function HomePage() {
  return (
    <div className="max-w-[740px] mx-auto px-5 py-8 pb-12 space-y-8">
      {/* Hero */}
      <div className="text-center">
        <img src="/logo-dark.png" alt="NSA" className="h-8 mx-auto mb-4 dark:hidden" />
        <img src="/logo-light.png" alt="NSA" className="h-8 mx-auto mb-4 hidden dark:block" />
        <h1 className="text-3xl font-semibold tracking-tight">Norwegian Singles Approach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sub-threshold training tools — calculate your paces, plan your week
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/calculator">
          <div className="bg-muted rounded-xl p-5 hover:bg-muted/80 transition-colors">
            <h3 className="text-sm font-medium mb-1">Calculator</h3>
            <p className="text-xs text-muted-foreground">
              Derive your sub-threshold paces and HR zones from a race result →
            </p>
          </div>
        </Link>
        <Link to="/planner">
          <div className="bg-muted rounded-xl p-5 hover:bg-muted/80 transition-colors">
            <h3 className="text-sm font-medium mb-1">Planner</h3>
            <p className="text-xs text-muted-foreground">
              Plan your NSA training week with drag-and-drop quality sessions →
            </p>
          </div>
        </Link>
      </div>

      {/* What is NSA? */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-3">What is NSA?</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
          <p>
            The Norwegian Singles Approach is a sub-threshold training method. Instead of running
            hard VO2max intervals, you run 3 quality sessions per week just below your lactate
            threshold — accumulating volume without crossing into supra-threshold territory.
          </p>
          <p>
            The core principle: 75% of your weekly training time at easy pace, 25% at sub-threshold
            pace. Never cross your LTHR. The lower recovery cost means you can run quality sessions 3
            times per week instead of 2, and more total stimulus compounds into faster improvement.
          </p>
          <p>
            It works for runners of all levels who have a base of 5–8+ hours per week. You need a
            recent 5K time or threshold test to calibrate your paces.
          </p>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-muted rounded-xl p-5">
        <h3 className="text-sm font-medium mb-3">Getting Started</h3>
        <ol className="space-y-1.5 text-xs text-muted-foreground">
          <li>1. Establish your numbers</li>
          <li>2. Transition in (weeks 1–3)</li>
          <li>3. Lock the pattern (weeks 4–8)</li>
          <li>4. Build load (weeks 8+)</li>
          <li>5. Maintain and re-test</li>
        </ol>
        <Link
          to="/getting-started"
          className="text-xs font-medium text-foreground mt-3 inline-block hover:underline"
        >
          Read the full guide →
        </Link>
      </div>

      {/* NSA vs VO2max */}
      <div className="bg-muted rounded-xl p-5">
        <h3 className="text-sm font-medium mb-2">NSA vs VO2max</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          NSA doesn't produce a bigger per-session stimulus than VO2max. It wins on volume — lower
          recovery cost enables 3 sessions instead of 2. Over months, more sessions means a bigger
          rightward shift of your lactate curve.
        </p>
        <Link
          to="/comparison"
          className="text-xs font-medium text-foreground mt-3 inline-block hover:underline"
        >
          See the comparison →
        </Link>
      </div>
    </div>
  )
}
