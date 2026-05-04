import { Zap, TrendingUp, Heart, BookOpen, Globe, ExternalLink } from "lucide-react"
import GettingStartedPage from "./getting-started"
import ComparisonPage from "./comparison"

export default function HomePage() {
  return (
    <div className="max-w-[740px] mx-auto px-5 py-8 pb-12 space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden py-14 px-6 text-center">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1670970426602-8eb825ec23f9?q=60&w=1197&auto=format&fit=crop')" }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-background/70" />

        {/* Content */}
        <div className="relative">
          <img src="/logo-dark.png" alt="NSA" className="h-10 mx-auto mb-5 dark:hidden" />
          <img src="/logo-light.png" alt="NSA" className="h-10 mx-auto mb-5 hidden dark:block" />
          <h1 className="text-4xl font-semibold tracking-tight">Norwegian Singles Approach</h1>
          <p className="text-base text-muted-foreground mt-2 max-w-[480px] mx-auto">
            Sub-threshold training tools — calculate your paces, plan your training week
          </p>

          {/* Key stats */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="text-center">
              <div className="text-2xl font-semibold font-mono">75/25</div>
              <div className="text-[0.65rem] text-muted-foreground">easy / quality</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-2xl font-semibold font-mono">3×</div>
              <div className="text-[0.65rem] text-muted-foreground">sessions / week</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-2xl font-semibold font-mono">&lt;LT2</div>
              <div className="text-[0.65rem] text-muted-foreground">always sub-threshold</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick links - hidden, accessible via nav */}

      {/* What is NSA? */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">What is NSA?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Zap size={16} className="text-foreground" />
              </div>
              <div className="text-xs font-medium">Sub-threshold</div>
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
              3 quality sessions per week just below lactate threshold — high volume, zero supra-threshold stress.
            </div>
          </div>
          <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <TrendingUp size={16} className="text-foreground" />
              </div>
              <div className="text-xs font-medium">Volume wins</div>
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
              Lower recovery cost → more sessions → more total stimulus. The garden hose that never stops.
            </div>
          </div>
          <div className="rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Heart size={16} className="text-foreground" />
              </div>
              <div className="text-xs font-medium">Never cross LTHR</div>
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed">
              75% easy, 25% quality. Works for runners with 5–8+ hours/week base. Calibrate from a 5K or threshold test.
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started — embedded */}
      <GettingStartedPage embedded />

      {/* NSA vs VO2max — embedded */}
      <ComparisonPage embedded />

      {/* References */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">References & further reading</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="https://norwegiansingles.run/"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-4 transition-all hover:border-foreground/20 hover:shadow-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Globe size={16} className="text-foreground" />
              </div>
              <div className="text-xs font-medium">norwegiansingles.run</div>
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed mb-2">
              The definitive NSA resource — workout library, pace calculator, and community discussion from Sirpoc84's LetsRun posts.
            </div>
            <div className="flex items-center gap-1 text-[0.65rem] font-medium group-hover:underline">
              <ExternalLink size={10} />
              Visit site →
            </div>
          </a>
          <a
            href="https://www.amazon.com/Norwegian-Method-Applied-Threshold-Intensity/dp/8269471100"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-4 transition-all hover:border-foreground/20 hover:shadow-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <BookOpen size={16} className="text-foreground" />
              </div>
              <div className="text-xs font-medium">Marius Bakken</div>
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed mb-2">
              <span className="italic">The Norwegian Method Applied: Threshold Training and Intensity Control for Faster, More Durable Running at Every Level</span>
            </div>
            <div className="flex items-center gap-1 text-[0.65rem] font-medium group-hover:underline">
              <ExternalLink size={10} />
              View book →
            </div>
          </a>
          <a
            href="https://www.amazon.com/dp/B0G4D8438Z"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-border bg-gradient-to-b from-background to-muted/50 p-4 transition-all hover:border-foreground/20 hover:shadow-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <BookOpen size={16} className="text-foreground" />
              </div>
              <div className="text-xs font-medium">James Copeland</div>
            </div>
            <div className="text-[0.65rem] text-muted-foreground leading-relaxed mb-2">
              <span className="italic">Norwegian Singles Method: Subthreshold Running Kept Simple</span> — practical guide to implementing sub-threshold sessions for distance runners.
            </div>
            <div className="flex items-center gap-1 text-[0.65rem] font-medium group-hover:underline">
              <ExternalLink size={10} />
              View book →
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
