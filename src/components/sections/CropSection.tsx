import { useEditorStore } from '@/store/editorStore'
import { Check, X } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

export function CropSection() {
  const { t } = useI18n()
  const engine = useEditorStore((s) => s.engine)
  const doc = useEditorStore((s) => s.doc)
  const view = useEditorStore((s) => s.view)

  return (
    <div className="px-3 py-2">
      <p className="mb-3 text-[11px] leading-relaxed text-ps-dim">
        {t('在画布上按住鼠标拖出保留区域，之后可拖拽控制点微调；按住 Shift 可等比框选或缩放。当前画板尺寸 {width} × {height} px。', {
          width: Math.round(doc.width),
          height: Math.round(doc.height),
        })}
      </p>
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1 py-1.5" onClick={() => engine?.applyCrop()}>
          <Check size={14} />
          {t('应用裁剪')}
        </button>
        <button className="btn btn-ghost flex-1 py-1.5" onClick={() => engine?.setTool('select')}>
          <X size={14} />
          {t('取消')}
        </button>
      </div>
      <div className="mt-3 rounded-md border border-ps-border bg-ps-panel3 px-2 py-1.5 text-[10px] text-ps-muted">
        {view.zoom < 1
          ? t('提示：框内双击或回车键应用裁剪，Esc 取消（当前视图 {zoom}%）', { zoom: Math.round(view.zoom * 100) })
          : t('提示：框内双击或回车键应用裁剪，Esc 取消')}
      </div>
    </div>
  )
}
