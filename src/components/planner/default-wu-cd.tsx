import { Input } from "@/components/ui/input"

interface DefaultWuCdProps {
  defaultWu: number
  defaultCd: number
  onDefaultWuChange: (v: number) => void
  onDefaultCdChange: (v: number) => void
}

function DefaultWuCd({
  defaultWu,
  defaultCd,
  onDefaultWuChange,
  onDefaultCdChange,
}: DefaultWuCdProps) {
  const inputClassName =
    "w-11 text-center font-mono text-xs h-6 px-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-2.5"
      style={{
        background: "var(--color-session-easy-bg)",
        border: "1px solid color-mix(in srgb, var(--color-session-easy) 25%, transparent)",
      }}
    >
      <span
        className="text-xs font-medium"
        style={{ color: "var(--color-session-easy-text)" }}
      >
        Default WU/CD
      </span>

      <div className="flex items-center gap-1">
        <span
          className="text-xs"
          style={{ color: "var(--color-session-easy-text)" }}
        >
          WU
        </span>
        <Input
          type="number"
          min={0}
          max={20}
          value={defaultWu}
          onChange={(e) => onDefaultWuChange(Number(e.target.value))}
          className={inputClassName}
          style={{
            borderColor: "var(--color-session-easy)",
            color: "var(--color-session-easy-text)",
          }}
        />
        <span
          className="text-xs"
          style={{ color: "var(--color-session-easy-text)" }}
        >
          min
        </span>
      </div>

      <div className="flex items-center gap-1">
        <span
          className="text-xs"
          style={{ color: "var(--color-session-easy-text)" }}
        >
          CD
        </span>
        <Input
          type="number"
          min={0}
          max={20}
          value={defaultCd}
          onChange={(e) => onDefaultCdChange(Number(e.target.value))}
          className={inputClassName}
          style={{
            borderColor: "var(--color-session-easy)",
            color: "var(--color-session-easy-text)",
          }}
        />
        <span
          className="text-xs"
          style={{ color: "var(--color-session-easy-text)" }}
        >
          min
        </span>
      </div>

      <span
        className="ml-auto text-[0.65rem]"
        style={{ color: "var(--color-session-easy)" }}
      >
        Applies to all Q sessions
      </span>
    </div>
  )
}

export { DefaultWuCd }
export type { DefaultWuCdProps }
