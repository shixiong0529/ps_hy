import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  action?: ReactNode
}

export function Section({ title, children, defaultOpen = true, action }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => setOpen(defaultOpen), [defaultOpen])
  return (
    <div className="border-b border-ps-border">
      <div className="section-title">
        <button
          className="flex flex-1 items-center gap-1 text-left hover:text-ps-text"
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown
            size={12}
            className={`transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <span>{title}</span>
        </button>
        {action}
      </div>
      {open && <div className="py-1">{children}</div>}
    </div>
  )
}
