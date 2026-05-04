import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router"
import { Switch } from "@/components/ui/switch"

export function Nav() {
  const { pathname } = useLocation()
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  )

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  return (
    <nav className="max-w-[1280px] mx-auto px-5 pt-4 pb-2 flex items-center gap-4 text-sm">
      <Link to="/" className="shrink-0">
        <img
          src={dark ? "/logo-light.png" : "/logo-dark.png"}
          alt="NSA"
          className="h-5"
        />
      </Link>
      <Link
        to="/calculator"
        className={pathname === "/calculator" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}
      >
        Calculator
      </Link>
      <Link
        to="/planner"
        className={pathname === "/planner" ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground transition-colors"}
      >
        Planner
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{dark ? "Dark" : "Light"}</span>
        <Switch checked={dark} onCheckedChange={setDark} />
      </div>
    </nav>
  )
}
