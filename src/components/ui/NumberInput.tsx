interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  onCommit?: () => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  disabled?: boolean
}

export function NumberInput({ label, value, onChange, onCommit, min, max, step = 1, suffix, disabled }: Props) {
  return (
    <label className={`flex min-w-0 flex-1 flex-col gap-1 ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-[10px] uppercase tracking-wide text-ps-muted">{label}</span>
      <span className="relative flex items-center">
        <input
          type="number"
          className="w-full bg-ps-panel3 border border-ps-border rounded px-2 py-1 font-mono text-[11px] outline-none focus:border-ps-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onCommit?.()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
        {suffix && <span className="pointer-events-none absolute right-2 text-[10px] text-ps-muted">{suffix}</span>}
      </span>
    </label>
  )
}
