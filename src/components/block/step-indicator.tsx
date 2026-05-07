import { Check } from "lucide-react"

const STEPS = [
  { num: 1, label: "Assess" },
  { num: 2, label: "Dates" },
  { num: 3, label: "Build Weeks" },
  { num: 4, label: "Review" },
  { num: 5, label: "Push" },
]

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between w-full">
      {STEPS.map((step, i) => {
        const isCompleted = step.num < currentStep
        const isCurrent = step.num === currentStep
        return (
          <div key={step.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                  isCompleted
                    ? "bg-green-600 border-green-600 text-white"
                    : isCurrent
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-muted border-border text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.num}
              </div>
              <span
                className={`text-xs ${
                  isCurrent
                    ? "font-medium text-foreground"
                    : isCompleted
                      ? "text-green-600"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${
                  step.num < currentStep ? "bg-green-600" : "bg-border"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
