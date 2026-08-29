import { useEditorStore } from '@/store/editorStore'
import { Check, X } from 'lucide-react'

export function CropSection() {
  const engine = useEditorStore((s) => s.engine)
  const doc = useEditorStore((s) => s.doc)
  const view = useEditorStore((s) => s.view)

  return (
    <div className="px-3 py-2">
      <p className="mb-3 text-[11px] leading-relaxed text-ps-dim">
        拖拽裁剪框的控制点选择保留区域，按住 Shift 可等比缩放。当前画板尺寸 {Math.round(doc.width)} ×{' '}
        {Math.round(doc.height)} px。
      </p>
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1 py-1.5" onClick={() => engine?.applyCrop()}>
          <Check size={14} />
          应用裁剪
        </button>
        <button className="btn btn-ghost flex-1 py-1.5" onClick={() => engine?.setTool('select')}>
          <X size={14} />
          取消
        </button>
      </div>
      <div className="mt-3 rounded-md border border-ps-border bg-ps-panel3 px-2 py-1.5 text-[10px] text-ps-muted">
        提示：回车键应用裁剪，Esc 取消{view.zoom < 1 ? `（当前视图 ${Math.round(view.zoom * 100)}%）` : ''}
      </div>
    </div>
  )
}
