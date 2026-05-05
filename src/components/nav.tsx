import { useState, useEffect, useRef } from "react"
import { Link, useLocation } from "react-router"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/lib/auth-context"
import { LogIn, LogOut, User as UserIcon } from "lucide-react"

export function Nav() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [menuOpen])

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

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{dark ? "Dark" : "Light"}</span>
        <Switch checked={dark} onCheckedChange={setDark} />

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full bg-foreground text-background text-xs font-semibold flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
            >
              {user.email[0].toUpperCase()}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg p-1 min-w-[160px] z-50">
                <div className="text-xs text-muted-foreground px-2 py-1">{user.email}</div>
                <div className="border-t border-border my-1" />
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-foreground hover:bg-foreground/5 rounded-md transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => { logout(); setMenuOpen(false) }}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm text-foreground hover:bg-foreground/5 rounded-md transition-colors w-full text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-border bg-gradient-to-b from-background to-muted/50 text-xs font-medium text-foreground hover:border-foreground/20 hover:shadow-md transition-all"
          >
            <LogIn size={13} />
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}
