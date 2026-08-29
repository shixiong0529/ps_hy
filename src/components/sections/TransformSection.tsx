import { useEditorStore } from '@/store/editorStore'
import { NumberInput } from '../ui/NumberInput'
import { Slider } from '../ui/Slider'
import { IconButton } from '../ui/IconButton'
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from 'lucide-react'
import { Hint } from '../ui/Hint'
import { useI18n } from '@/hooks/useI18n'

/**
 * 由目标显示尺寸反推 scale。面板显示的是 getScaledWidth()，它把描边算在内：
 * strokeUniform 时描边不随缩放变化（width * scale + stroke），否则一起缩放（(width + stroke) * scale）。
 */
const scaleFor = (target: number, base: number, stroke = 0, uniform = false) => {
  const b = base || 1
  const next = uniform ? (target - stroke) / b : target / (b + stroke)
  return Number.isFinite(next) && next > 0 ? next : 0.01
}

export function TransformSection() {
  const { t } = useI18n()
  const selection = useEditorStore((s) => s.selection)
  const engine = useEditorStore((s) => s.engine)
  if (!selection) return null

  const set = (patch: Record<string, unknown>, commit = true) => engine?.updateActive(patch, commit)
  const ratio = selection.width && selection.height ? selection.width / selection.height : 1

  return (
    <div>
      <div className="flex gap-2 px-3 pb-1 pt-1.5">
        <NumberInput label="X" value={selection.left} onChange={(v) => set({ left: v }, false)} onCommit={() => engine?.pushHistoryState()} suffix="px" />
        <NumberInput label="Y" value={selection.top} onChange={(v) => set({ top: v }, false)} onCommit={() => engine?.pushHistoryState()} suffix="px" />
      </div>
      <div className="flex gap-2 px-3 pb-1">
        <NumberInput
          label={t('宽')}
          value={selection.width}
          min={1}
          onChange={(v) => {
            const o = engine?.canvas.getActiveObject()
            if (!o) return
            set({ scaleX: scaleFor(v, o.width, o.strokeWidth, o.strokeUniform) }, false)
          }}
          onCommit={() => engine?.pushHistoryState()}
          suffix="px"
        />
        <NumberInput
          label={t('高')}
          value={selection.height}
          min={1}
          onChange={(v) => {
            const o = engine?.canvas.getActiveObject()
            if (!o) return
            set({ scaleY: scaleFor(v, o.height, o.strokeWidth, o.strokeUniform) }, false)
          }}
          onCommit={() => engine?.pushHistoryState()}
          suffix="px"
        />
      </div>
      <div className="px-3 pb-1 text-[10px] text-ps-muted">{t('宽高比 {ratio}', { ratio: ratio.toFixed(3) })}</div>

      <Slider
        label={t('旋转')}
        value={selection.angle}
        min={-180}
        max={180}
        onChange={(v) => set({ angle: v }, false)}
        onCommit={() => engine?.pushHistoryState()}
        resetTo={0}
        suffix="°"
      />
      <Slider
        label={t('不透明度')}
        value={Math.round(selection.opacity * 100)}
        min={0}
        max={100}
        onChange={(v) => set({ opacity: v / 100 }, false)}
        onCommit={() => engine?.pushHistoryState()}
        resetTo={100}
        suffix="%"
      />

      <div className="flex items-center gap-1 px-3 py-1.5">
        <Hint label={t('逆时针 90°')} side="bottom">
          <IconButton onClick={() => engine?.rotateActive(-90)}>
            <RotateCcw size={15} />
          </IconButton>
        </Hint>
        <Hint label={t('顺时针 90°')} side="bottom">
          <IconButton onClick={() => engine?.rotateActive(90)}>
            <RotateCw size={15} />
          </IconButton>
        </Hint>
        <Hint label={t('水平翻转')} side="bottom">
          <IconButton active={selection.flipX} onClick={() => engine?.flipActive('x')}>
            <FlipHorizontal2 size={15} />
          </IconButton>
        </Hint>
        <Hint label={t('垂直翻转')} side="bottom">
          <IconButton active={selection.flipY} onClick={() => engine?.flipActive('y')}>
            <FlipVertical2 size={15} />
          </IconButton>
        </Hint>
      </div>
    </div>
  )
}
