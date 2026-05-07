import { createContext, useContext, useCallback, useState, type ReactNode } from "react"
import type { AssessmentResult, WeekPlan } from "./block-types"
import { buildEvents } from "./block-utils"
import { apiFetch } from "./api"

type WizardStep = 1 | 2 | 3 | 4 | 5
type ActiveWeek = 1 | 2 | 3 | 4

interface BlockWizardState {
  step: WizardStep
  assessment: AssessmentResult | null
  startDate: string | null      // YYYY-MM-DD (always a Monday)
  endDate: string | null        // YYYY-MM-DD (startDate + 27 days)
  activeWeek: ActiveWeek
  weeks: [WeekPlan | null, WeekPlan | null, WeekPlan | null, WeekPlan | null]
  blockId: string | null        // set after first save to backend
  pushStatus: "idle" | "checking" | "pushing" | "done" | "error"
  error: string | null
}

interface BlockWizardActions {
  runAssessment: () => Promise<void>
  setStartDate: (date: string) => void
  saveWeek: (week: WeekPlan) => void
  goToWeek: (n: ActiveWeek) => void
  editWeek: (n: ActiveWeek) => void
  confirmBlock: () => Promise<void>
  saveDraft: () => Promise<void>
  pushBlock: (mode: "override" | "add_alongside") => Promise<void>
  goToStep: (step: WizardStep) => void
  reset: () => void
}

type BlockWizardContextValue = BlockWizardState & BlockWizardActions

const BlockWizardContext = createContext<BlockWizardContextValue | null>(null)

const INITIAL_STATE: BlockWizardState = {
  step: 1,
  assessment: null,
  startDate: null,
  endDate: null,
  activeWeek: 1,
  weeks: [null, null, null, null],
  blockId: null,
  pushStatus: "idle",
  error: null,
}

export function BlockWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BlockWizardState>(INITIAL_STATE)

  const runAssessment = useCallback(async () => {
    try {
      setState(s => ({ ...s, error: null }))
      const result = await apiFetch<AssessmentResult>("/api/block/assess", { method: "POST" })
      setState(s => ({ ...s, assessment: result, step: 2, error: null }))
    } catch (e) {
      setState(s => ({ ...s, error: (e as Error).message }))
    }
  }, [])

  const setStartDate = useCallback((date: string) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day  // Sunday snaps back, others snap to Monday
    d.setDate(d.getDate() + diff)
    const start = d.toISOString().slice(0, 10)
    const end = new Date(d.getTime() + 27 * 86400000).toISOString().slice(0, 10)
    setState(s => ({ ...s, startDate: start, endDate: end, step: 3 }))
  }, [])

  const saveWeek = useCallback((week: WeekPlan) => {
    setState(s => {
      const weeks = [...s.weeks] as typeof s.weeks
      weeks[week.weekNumber - 1] = week
      const nextWeek = week.weekNumber < 4 ? ((week.weekNumber + 1) as ActiveWeek) : s.activeWeek
      const nextStep: WizardStep = week.weekNumber === 4 ? 4 : s.step
      return { ...s, weeks, activeWeek: nextWeek, step: nextStep }
    })
  }, [])

  const goToWeek = useCallback((n: ActiveWeek) => {
    setState(s => ({ ...s, activeWeek: n }))
  }, [])

  const editWeek = useCallback((n: ActiveWeek) => {
    setState(s => ({
      ...s,
      step: 3,
      activeWeek: n,
      weeks: s.weeks.map((w, i) => (i >= n ? null : w)) as typeof s.weeks,
    }))
  }, [])

  const confirmBlock = useCallback(async () => {
    try {
      setState(s => ({ ...s, error: null }))
      const events = buildEvents(state.weeks, state.startDate!)
      const body = {
        start_date: state.startDate,
        end_date: state.endDate,
        status: "confirmed",
        block_type: "nsa_4week",
        assessment: state.assessment,
        weeks: state.weeks,
        events,
      }
      const result = await apiFetch<{ id: string }>("/api/block", {
        method: "POST",
        body: JSON.stringify(body),
      })
      setState(s => ({ ...s, blockId: result.id, step: 5, error: null }))
    } catch (e) {
      setState(s => ({ ...s, error: (e as Error).message }))
    }
  }, [state.startDate, state.endDate, state.assessment, state.weeks])

  const saveDraft = useCallback(async () => {
    try {
      setState(s => ({ ...s, error: null }))
      const events = buildEvents(state.weeks, state.startDate!)
      const body = {
        start_date: state.startDate,
        end_date: state.endDate,
        status: "draft",
        block_type: "nsa_4week",
        assessment: state.assessment,
        weeks: state.weeks,
        events,
      }
      const result = await apiFetch<{ id: string }>("/api/block", {
        method: "POST",
        body: JSON.stringify(body),
      })
      setState(s => ({ ...s, blockId: result.id, error: null }))
    } catch (e) {
      setState(s => ({ ...s, error: (e as Error).message }))
    }
  }, [state.startDate, state.endDate, state.assessment, state.weeks])

  const pushBlock = useCallback(async (mode: "override" | "add_alongside") => {
    if (!state.blockId) return
    setState(s => ({ ...s, pushStatus: "pushing" }))
    try {
      await apiFetch(`/api/block/${state.blockId}/push`, {
        method: "POST",
        body: JSON.stringify({ mode }),
      })
      setState(s => ({ ...s, pushStatus: "done", error: null }))
    } catch (e) {
      setState(s => ({ ...s, pushStatus: "error", error: (e as Error).message }))
    }
  }, [state.blockId])

  const goToStep = useCallback((step: WizardStep) => {
    setState(s => ({ ...s, step }))
  }, [])

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return (
    <BlockWizardContext value={{
      ...state,
      runAssessment,
      setStartDate,
      saveWeek,
      goToWeek,
      editWeek,
      confirmBlock,
      saveDraft,
      pushBlock,
      goToStep,
      reset,
    }}>
      {children}
    </BlockWizardContext>
  )
}

export function useBlockWizard() {
  const ctx = useContext(BlockWizardContext)
  if (!ctx) throw new Error("useBlockWizard must be used within BlockWizardProvider")
  return ctx
}
