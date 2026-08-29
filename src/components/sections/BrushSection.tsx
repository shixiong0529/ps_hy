import { useEditorStore } from '@/store/editorStore'
import { ColorInput } from '../ui/ColorInput'
import { Slider } from '../ui/Slider'
import { useI18n } from '@/hooks/useI18n'

export function BrushSection() {
  const { t } = useI18n()
  const tool = useEditorStore((s) => s.tool)
  const brush = useEditorStore((s) => s.brush)
  const setBrush = useEditorStore((s) => s.setBrush)
  const engine = useEditorStore((s) => s.engine)

  const drawing = tool === 'brush' || tool === 'eraser'

  return (
    <div>
      {!drawing && (
        <div className="px-3 pb-1 text-[10px] leading-relaxed text-ps-muted">
          {t('选择画笔 / 橡皮擦工具后，此处参数将作用于新绘制的笔迹。')}
        </div>
      )}
      {tool !== 'eraser' && (
        <ColorInput
          label={t('画笔颜色')}
          value={brush.color}
          onChange={(v) => {
            setBrush({ color: v })
            engine?.refreshBrush()
          }}
        />
      )}
      <Slider
        label={t('笔刷大小')}
        value={brush.width}
        min={1}
        max={200}
        suffix="px"
        onChange={(v) => {
          setBrush({ width: v })
          engine?.refreshBrush()
        }}
      />
      <Slider
        label={t('笔刷不透明度')}
        value={brush.opacity}
        min={1}
        max={100}
        suffix="%"
        onChange={(v) => {
          setBrush({ opacity: v })
          engine?.refreshBrush()
        }}
      />
      <div className="flex items-center gap-2 px-3 py-2">
        <div
          className="checkerboard flex h-10 flex-1 items-center justify-center rounded border border-ps-border"
          title={t('笔刷预览')}
        >
          <span
            className="block rounded-full"
            style={{
              width: Math.min(30, brush.width),
              height: Math.min(30, brush.width),
              background: tool === 'eraser' ? '#94a3b8' : brush.color,
            }}
          />
        </div>
      </div>
    </div>
  )
}
