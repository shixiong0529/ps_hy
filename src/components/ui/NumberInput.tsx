import { useState } from 'react'

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
  // 编辑过程中保留用户的原始文本：清空输入框时 Number('') === 0 会把宽高直接压成 0，
  // 对象当场从画布上消失；负数同理会翻转对象，HTML 的 min/max 并不拦键盘输入。
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(Number.isFinite(value) ? Math.round(value * 100) / 100 : 0)

  const emit = (raw: string) => {
    setDraft(raw)
    if (raw.trim() === '') return
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    let next = n
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    onChange(next)
  }

  return (
    <label className={`flex min-w-0 flex-1 flex-col gap-1 ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-[11px] uppercase tracking-wide text-ps-muted">{label}</span>
      <span className="relative flex items-center">
        <input
          type="number"
          className="w-full bg-ps-panel3 border border-ps-border rounded px-2 py-1 font-mono text-[12px] outline-none focus:border-ps-accent [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          value={shown}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => emit(e.target.value)}
          onBlur={() => {
            setDraft(null)
            onCommit?.()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
        {suffix && <span className="pointer-events-none absolute right-2 text-[11px] text-ps-muted">{suffix}</span>}
      </span>
    </label>
  )
}
