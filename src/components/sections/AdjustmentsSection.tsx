import { useEditorStore } from '@/store/editorStore'
import { DEFAULT_ADJUSTMENTS } from '@/lib/defaults'
import { getFilterPresets } from '@/lib/registry'
import { Slider } from '../ui/Slider'
import { RotateCcw } from 'lucide-react'
import type { Adjustments } from '@/types'
import { useI18n } from '@/hooks/useI18n'

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-md border px-2 py-1 text-[12px] transition-colors ${
        on
          ? 'border-ps-accent/50 bg-ps-accentSoft text-ps-accent2'
          : 'border-ps-border bg-ps-panel3 text-ps-dim hover:text-ps-text'
      }`}
    >
      {label}
    </button>
  )
}

export function AdjustmentsSection() {
  const { t } = useI18n()
  const targetId = useEditorStore((s) => s.adjustTargetId)
  const adjustments = useEditorStore((s) => s.adjustments)
  const setAdjustment = useEditorStore((s) => s.setAdjustment)
  const engine = useEditorStore((s) => s.engine)

  const adj = targetId ? (adjustments[targetId] ?? DEFAULT_ADJUSTMENTS) : null
  const presets = getFilterPresets()

  const patch = (p: Partial<Adjustments>, commit = true) => {
    if (!targetId) return
    const next = { ...(adjustments[targetId] ?? DEFAULT_ADJUSTMENTS), ...p }
    setAdjustment(targetId, p)
    engine?.applyAdjustments(targetId, next, false)
    if (commit) engine?.pushHistoryState()
  }

  if (!targetId || !adj) {
    return (
      <div className="px-3 py-3 text-[12px] leading-relaxed text-ps-muted">
        {t('选中一个图片图层后可在此实时调整亮度、对比度、饱和度等参数。')}
      </div>
    )
  }

  return (
    <div>
      <div className="px-3 pb-1.5">
        <div className="mb-1.5 text-[12px] text-ps-dim">{t('滤镜预设')}</div>
        <div className="grid grid-cols-4 gap-1.5">
          {presets.map((p) => {
            const active = adj.preset === p.id || (p.id === 'none' && !adj.preset)
            return (
              <button
                key={p.id}
                onClick={() => patch({ preset: p.id === 'none' ? null : p.id })}
                className={`group overflow-hidden rounded-md border transition-colors ${
                  active ? 'border-ps-accent' : 'border-ps-border hover:border-ps-border2'
                }`}
                title={t(p.label)}
              >
                <span
                  className="block h-8 w-full"
                  style={{
                    filter: p.cssPreview,
                    background:
                      'linear-gradient(135deg,#f59e0b 0%,#ef4444 32%,#a855f7 58%,#3d7eff 82%,#22c55e 100%)',
                  }}
                />
                <span
                  className={`block truncate px-0.5 py-0.5 text-[10px] ${
                    active ? 'bg-ps-accentSoft text-ps-accent2' : 'bg-ps-panel3 text-ps-muted'
                  }`}
                >
                  {t(p.label)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <Slider label={t('曝光')} value={adj.exposure} min={-100} max={100} resetTo={0} onChange={(v) => patch({ exposure: v }, false)} onCommit={() => engine?.pushHistoryState()} />
      <Slider label={t('亮度')} value={adj.brightness} min={-100} max={100} resetTo={0} onChange={(v) => patch({ brightness: v }, false)} onCommit={() => engine?.pushHistoryState()} />
      <Slider label={t('对比度')} value={adj.contrast} min={-100} max={100} resetTo={0} onChange={(v) => patch({ contrast: v }, false)} onCommit={() => engine?.pushHistoryState()} />
      <Slider label={t('饱和度')} value={adj.saturation} min={-100} max={100} resetTo={0} onChange={(v) => patch({ saturation: v }, false)} onCommit={() => engine?.pushHistoryState()} />
      <Slider label={t('色温')} value={adj.temperature} min={-100} max={100} resetTo={0} onChange={(v) => patch({ temperature: v }, false)} onCommit={() => engine?.pushHistoryState()} suffix="" />
      <Slider label={t('模糊')} value={adj.blur} min={0} max={100} resetTo={0} onChange={(v) => patch({ blur: v }, false)} onCommit={() => engine?.pushHistoryState()} />

      <div className="flex gap-1.5 px-3 py-2">
        <Toggle on={adj.grayscale} label={t('灰度')} onClick={() => patch({ grayscale: !adj.grayscale })} />
        <Toggle on={adj.blackwhite} label={t('黑白')} onClick={() => patch({ blackwhite: !adj.blackwhite })} />
        <Toggle on={adj.vintage} label={t('复古')} onClick={() => patch({ vintage: !adj.vintage })} />
      </div>

      <div className="px-3 pb-2">
        <button className="btn btn-ghost w-full py-1.5" onClick={() => engine?.resetAdjustments(targetId)}>
          <RotateCcw size={12} />
          {t('重置全部调整')}
        </button>
      </div>
    </div>
  )
}
