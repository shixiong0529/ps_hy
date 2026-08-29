import { useEditorStore } from '@/store/editorStore'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { TOOLS } from '@/lib/defaults'
import { Hint } from './ui/Hint'

export function StatusBar() {
  const view = useEditorStore((s) => s.view)
  const doc = useEditorStore((s) => s.doc)
  const tool = useEditorStore((s) => s.tool)
  const layers = useEditorStore((s) => s.layers)
  const engine = useEditorStore((s) => s.engine)

  const def = TOOLS.find((t) => t.id === tool)
  const selected = layers.filter((l) => l.active).length

  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t border-ps-border bg-ps-panel px-3 text-[11px] text-ps-muted">
      <span className="text-ps-dim">{def?.label ?? ''}</span>
      <span className="hidden text-ps-muted md:inline">{def?.hint}</span>

      <div className="ml-auto flex items-center gap-3">
        <span>
          {layers.length} 图层{selected > 0 ? ` · 选中 ${selected}` : ''}
        </span>
        <span>
          画板 {Math.round(doc.width)} × {Math.round(doc.height)} px
        </span>
        <div className="flex items-center gap-0.5">
          <Hint label="缩小" side="bottom">
            <button className="btn h-5 w-5 p-0" onClick={() => engine?.zoomBy(1 / 1.2)}>
              <Minus size={12} />
            </button>
          </Hint>
          <span className="w-12 text-center font-mono text-ps-text">{Math.round(view.zoom * 100)}%</span>
          <Hint label="放大" side="bottom">
            <button className="btn h-5 w-5 p-0" onClick={() => engine?.zoomBy(1.2)}>
              <Plus size={12} />
            </button>
          </Hint>
          <Hint label="适应屏幕" side="bottom">
            <button className="btn h-5 w-5 p-0" onClick={() => engine?.fitToScreen()}>
              <Maximize2 size={12} />
            </button>
          </Hint>
        </div>
      </div>
    </div>
  )
}
