import { useEffect, useState } from 'react'
import { useI18n } from '@/hooks/useI18n'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  allowTransparent?: boolean
}

const SWATCHES = [
  '#ffffff',
  '#000000',
  '#3d7eff',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#06b6d4',
]

export function ColorInput({ label, value, onChange, allowTransparent }: Props) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(value)
  const safe = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : '#ffffff'
  const valid = (v: string) =>
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) || (allowTransparent && v === 'transparent')

  useEffect(() => setDraft(value), [value])

  const commitDraft = () => {
    if (valid(draft)) onChange(draft)
    else setDraft(value)
  }

  return (
    <div className="px-3 py-1.5">
      <div className="mb-1 text-[12px] text-ps-dim">{label}</div>
      <div className="flex items-center gap-1.5">
        <div
          className="h-6 w-6 shrink-0 overflow-hidden rounded border border-ps-border2"
          style={{
            backgroundImage:
              'linear-gradient(45deg,#2a2f3a 25%,transparent 25%),linear-gradient(-45deg,#2a2f3a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2a2f3a 75%),linear-gradient(-45deg,transparent 75%,#2a2f3a 75%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0,0 4px,4px -4px,-4px 0',
          }}
        >
          <input
            type="color"
            className="h-6 w-6"
            value={safe}
            onChange={(e) => {
              setDraft(e.target.value)
              onChange(e.target.value)
            }}
          />
        </div>
        <input
          type="text"
          className="min-w-0 flex-1 bg-ps-panel3 border border-ps-border rounded px-2 py-1 font-mono text-[12px] uppercase outline-none focus:border-ps-accent"
          value={draft}
          onChange={(e) => {
            const next = e.target.value
            setDraft(next)
            if (valid(next)) onChange(next)
          }}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') {
              setDraft(value)
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
        {allowTransparent && (
          <button
            className="btn btn-ghost shrink-0 px-1.5 text-[11px]"
            onClick={() => {
              setDraft('transparent')
              onChange('transparent')
            }}
            title={t('无填充')}
          >
            {t('无')}
          </button>
        )}
      </div>
      <div className="mt-1.5 flex gap-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            className="h-4 w-4 rounded-sm border border-black/40 hover:scale-110 transition-transform"
            style={{ background: c }}
            onClick={() => {
              setDraft(c)
              onChange(c)
            }}
            title={c}
          />
        ))}
      </div>
    </div>
  )
}
