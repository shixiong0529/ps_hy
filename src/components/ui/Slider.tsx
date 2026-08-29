import { useId, type CSSProperties } from 'react'
import { useI18n } from '@/hooks/useI18n'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  onCommit?: () => void
  format?: (v: number) => string
  resetTo?: number
  disabled?: boolean
  suffix?: string
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  format,
  resetTo,
  disabled,
  suffix,
}: SliderProps) {
  const { t } = useI18n()
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  const canReset = resetTo !== undefined && value !== resetTo

  return (
    <div className={`px-3 py-1.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="mb-1 flex items-center justify-between">
        <label
          htmlFor={id}
          title={canReset ? t('双击重置') : undefined}
          onDoubleClick={() => {
            if (!canReset) return
            onChange(resetTo)
            onCommit?.()
          }}
          className="cursor-default select-none text-[11px] text-ps-dim"
        >
          {label}
        </label>
        <span className="font-mono text-[11px] text-ps-text">
          {format ? format(value) : Math.round(value)}
          {suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="ps-range"
        style={{ '--pct': `${pct}%` } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
    </div>
  )
}
