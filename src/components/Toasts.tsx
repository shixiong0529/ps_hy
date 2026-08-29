import { useEditorStore } from '@/store/editorStore'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

export function Toasts() {
  const toasts = useEditorStore((s) => s.toasts)
  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[110] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-pop backdrop-blur ${
            t.kind === 'error'
              ? 'border-ps-danger/40 bg-ps-danger/15 text-red-200'
              : t.kind === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                : 'border-ps-border2 bg-ps-panel3/90 text-ps-text'
          }`}
        >
          {t.kind === 'error' ? (
            <AlertCircle size={14} />
          ) : t.kind === 'success' ? (
            <CheckCircle2 size={14} />
          ) : (
            <Info size={14} />
          )}
          {t.text}
        </div>
      ))}
    </div>
  )
}
