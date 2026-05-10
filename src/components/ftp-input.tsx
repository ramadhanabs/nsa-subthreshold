import { Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"

interface FtpInputProps {
  ftp: number
  onFtpChange: (v: number) => void
}

export function FtpInput({ ftp, onFtpChange }: FtpInputProps) {
  // Standard 7-zone power model (% of FTP)
  const easyMax = Math.round(ftp * 0.75)
  const subTLow = Math.round(ftp * 0.90)
  const subTHigh = Math.round(ftp * 1.05)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Zap size={14} className="text-muted-foreground" />
          Running FTP
          <Tooltip>
            <TooltipTrigger className="cursor-help">
              <Info className="w-3 h-3 text-muted-foreground/50" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-xs leading-relaxed">
              Functional Threshold Power for running — the highest power you can sustain for ~1 hour. Set in Intervals.icu or enter manually.
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground min-w-8">FTP</label>
          <Slider
            value={[ftp]}
            onValueChange={(v) => onFtpChange(Array.isArray(v) ? v[0] : v)}
            min={150}
            max={450}
            step={1}
            className="flex-1"
          />
          <span className="text-base font-medium font-mono min-w-12 text-right">{ftp}W</span>
        </div>
        <div className="flex gap-3.5 text-xs text-muted-foreground">
          <span>Easy: <strong className="font-medium text-foreground">&lt;{easyMax}W</strong></span>
          <span>Sub-T: <strong className="font-medium text-foreground">{subTLow}–{subTHigh}W</strong></span>
        </div>
      </CardContent>
    </Card>
  )
}
