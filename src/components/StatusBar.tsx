import { useEditorStore } from '@/store/editorStore'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { TOOLS } from '@/lib/defaults'
import { Hint } from './ui/Hint'
import { useI18n } from '@/hooks/useI18n'

export function StatusBar() {
  const { language, t } = useI18n()
  const view = useEditorStore((s) => s.view)
  const doc = useEditorStore((s) => s.doc)
  const tool = useEditorStore((s) => s.tool)
  const layers = useEditorStore((s) => s.layers)
  const engine = useEditorStore((s) => s.engine)

  const def = TOOLS.find((t) => t.id === tool)
  const selected = layers.filter((l) => l.active).length
  const layerCountKey = language === 'en' && layers.length === 1 ? '1 图层' : '{count} 图层'
  const selectedCountKey = language === 'en' && layers.length === 1
    ? '1 图层 · 选中 {selected}'
    : '{count} 图层 · 选中 {selected}'

  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t border-ps-border bg-ps-panel px-3 text-[11px] text-ps-muted">
      <span className="text-ps-dim">{def ? t(def.label) : ''}</span>
      <span className="hidden text-ps-muted md:inline">{def ? t(def.hint) : ''}</span>

      <div className="ml-auto flex items-center gap-3">
        <span>{t(selected > 0 ? selectedCountKey : layerCountKey, { count: layers.length, selected })}</span>
        <span>{t('画板 {width} × {height} px', { width: Math.round(doc.width), height: Math.round(doc.height) })}</span>
        <div className="flex items-center gap-0.5">
          <Hint label={t('缩小')} side="bottom">
            <button className="btn h-5 w-5 p-0" onClick={() => engine?.zoomBy(1 / 1.2)}>
              <Minus size={12} />
            </button>
          </Hint>
          <span className="w-12 text-center font-mono text-ps-text">{Math.round(view.zoom * 100)}%</span>
          <Hint label={t('放大')} side="bottom">
            <button className="btn h-5 w-5 p-0" onClick={() => engine?.zoomBy(1.2)}>
              <Plus size={12} />
            </button>
          </Hint>
          <Hint label={t('适应屏幕')} side="bottom">
            <button className="btn h-5 w-5 p-0" onClick={() => engine?.fitToScreen()}>
              <Maximize2 size={12} />
            </button>
          </Hint>
        </div>
      </div>
    </div>
  )
}
