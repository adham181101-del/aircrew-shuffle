import { cn } from '@/lib/utils'

type CircularProgressProps = {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  label?: string
}

export function CircularProgress({
  value,
  size = 96,
  strokeWidth = 8,
  className,
  label,
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className={cn('flex flex-col items-center gap-2', className)} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <svg width={size} height={size} className="text-primary">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-foreground text-sm font-semibold"
          fontSize={size * 0.2}
        >
          {Math.round(clamped)}%
        </text>
      </svg>
      {label ? <p className="text-sm text-muted-foreground text-center">{label}</p> : null}
    </div>
  )
}
