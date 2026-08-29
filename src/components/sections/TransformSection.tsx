import { useEditorStore } from '@/store/editorStore'
import { NumberInput } from '../ui/NumberInput'
import { Slider } from '../ui/Slider'
import { IconButton } from '../ui/IconButton'
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from 'lucide-react'
import { Hint } from '../ui/Hint'

export function TransformSection() {
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
          label="宽"
          value={selection.width}
          min={1}
          onChange={(v) => {
            const o = engine?.canvas.getActiveObject()
            if (!o) return
            set({ scaleX: v / (o.width || 1) }, false)
          }}
          onCommit={() => engine?.pushHistoryState()}
          suffix="px"
        />
        <NumberInput
          label="高"
          value={selection.height}
          min={1}
          onChange={(v) => {
            const o = engine?.canvas.getActiveObject()
            if (!o) return
            set({ scaleY: v / (o.height || 1) }, false)
          }}
          onCommit={() => engine?.pushHistoryState()}
          suffix="px"
        />
      </div>
      <div className="px-3 pb-1 text-[10px] text-ps-muted">宽高比 {ratio.toFixed(3)}</div>

      <Slider
        label="旋转"
        value={selection.angle}
        min={-180}
        max={180}
        onChange={(v) => set({ angle: v }, false)}
        onCommit={() => engine?.pushHistoryState()}
        resetTo={0}
        suffix="°"
      />
      <Slider
        label="不透明度"
        value={Math.round(selection.opacity * 100)}
        min={0}
        max={100}
        onChange={(v) => set({ opacity: v / 100 }, false)}
        onCommit={() => engine?.pushHistoryState()}
        resetTo={100}
        suffix="%"
      />

      <div className="flex items-center gap-1 px-3 py-1.5">
        <Hint label="逆时针 90°" side="bottom">
          <IconButton onClick={() => engine?.rotateActive(-90)}>
            <RotateCcw size={15} />
          </IconButton>
        </Hint>
        <Hint label="顺时针 90°" side="bottom">
          <IconButton onClick={() => engine?.rotateActive(90)}>
            <RotateCw size={15} />
          </IconButton>
        </Hint>
        <Hint label="水平翻转" side="bottom">
          <IconButton active={selection.flipX} onClick={() => engine?.flipActive('x')}>
            <FlipHorizontal2 size={15} />
          </IconButton>
        </Hint>
        <Hint label="垂直翻转" side="bottom">
          <IconButton active={selection.flipY} onClick={() => engine?.flipActive('y')}>
            <FlipVertical2 size={15} />
          </IconButton>
        </Hint>
      </div>
    </div>
  )
}
