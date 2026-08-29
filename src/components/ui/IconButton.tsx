import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  children: ReactNode
  size?: 'sm' | 'md'
}

export function IconButton({ active, children, size = 'md', className = '', ...rest }: Props) {
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  return (
    <button
      type="button"
      className={`inline-flex ${dim} items-center justify-center rounded-md transition-colors
        ${
          active
            ? 'bg-ps-accentSoft text-ps-accent2 ring-1 ring-ps-accent/40'
            : 'text-ps-dim hover:bg-ps-panel3 hover:text-ps-text'
        }
        disabled:pointer-events-none disabled:opacity-30 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
