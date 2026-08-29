import { useEditorStore } from '@/store/editorStore'
import { ColorInput } from '../ui/ColorInput'
import { Slider } from '../ui/Slider'

const SHAPE_TYPES = ['rect', 'ellipse', 'triangle', 'line', 'path']

export function ShapeSection() {
  const selection = useEditorStore((s) => s.selection)
  const engine = useEditorStore((s) => s.engine)
  const shape = useEditorStore((s) => s.shape)
  const setShape = useEditorStore((s) => s.setShapeStyle)

  if (!selection || !SHAPE_TYPES.includes(selection.type)) return null

  const set = (patch: Record<string, unknown>, commit = true) => engine?.updateActive(patch, commit)
  const isStrokeOnly = selection.type === 'line'

  return (
    <div>
      {!isStrokeOnly && (
        <ColorInput
          label="填充"
          value={selection.fill || '#000000'}
          allowTransparent
          onChange={(v) => {
            setShape({ fill: v })
            set({ fill: v }, false)
            engine?.scheduleHistory()
          }}
        />
      )}

      <ColorInput
        label={isStrokeOnly ? '线条颜色' : '描边'}
        value={selection.stroke || (isStrokeOnly ? shape.stroke : '#ffffff')}
        onChange={(v) => {
          setShape({ stroke: v })
          set({ stroke: v }, false)
          engine?.scheduleHistory()
        }}
      />

      <Slider
        label="描边宽度"
        value={selection.strokeWidth}
        min={0}
        max={60}
        onChange={(v) => {
          setShape({ strokeWidth: v })
          set({ strokeWidth: v }, false)
        }}
        onCommit={() => engine?.pushHistoryState()}
        resetTo={0}
        suffix="px"
      />

      {selection.type === 'rect' && (
        <Slider
          label="圆角"
          value={selection.rx}
          min={0}
          max={200}
          onChange={(v) => {
            setShape({ rx: v })
            set({ rx: v, ry: v }, false)
          }}
          onCommit={() => engine?.pushHistoryState()}
          resetTo={0}
          suffix="px"
        />
      )}
    </div>
  )
}
