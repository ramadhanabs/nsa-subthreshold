import { BlockWizardProvider, useBlockWizard } from "@/lib/block-wizard-context"
import { StepIndicator } from "@/components/block/step-indicator"
import { StepAssessment } from "@/components/block/step-assessment"
import { StepDates } from "@/components/block/step-dates"
import { StepReview } from "@/components/block/step-review"
import { StepPush } from "@/components/block/step-push"
import { StepWeeks } from "@/components/block/step-weeks"

export default function BlockGeneratorPage() {
  return (
    <BlockWizardProvider>
      <BlockGeneratorContent />
    </BlockWizardProvider>
  )
}

function BlockGeneratorContent() {
  const { step } = useBlockWizard()

  return (
    <div className="max-w-[960px] mx-auto px-5 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          NSA Block Generator
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a 4-week training block: 3 build weeks + 1 deload/test week.
        </p>
      </header>

      <StepIndicator currentStep={step} />

      {step === 1 && <StepAssessment />}
      {step === 2 && <StepDates />}
      {step === 3 && <StepWeeks />}
      {step === 4 && <StepReview />}
      {step === 5 && <StepPush />}
    </div>
  )
}
