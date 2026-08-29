import type { ReactNode } from 'react'

interface Props {
  label: string
  shortcut?: string
  side?: 'right' | 'bottom' | 'left'
  disabled?: boolean
  children: ReactNode
}

const POS: Record<NonNullable<Props['side']>, string> = {
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2',
}

export function Hint({ label, shortcut, side = 'right', disabled, children }: Props) {
  return (
    <div className="relative flex">
      {children}
      {!disabled && (
        <div
          className={`pointer-events-none absolute z-[80] hidden whitespace-nowrap rounded-md border border-ps-border2 bg-ps-panel3 px-2 py-1 text-[11px] shadow-pop group-hover:flex ${POS[side]}`}
        >
          <span className="text-ps-text">{label}</span>
          {shortcut && <span className="ml-2 text-ps-muted">{shortcut}</span>}
        </div>
      )}
    </div>
  )
}
