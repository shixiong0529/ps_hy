import { useEditorStore } from '@/store/editorStore'
import { FONT_FAMILIES } from '@/lib/defaults'
import { ColorInput } from '../ui/ColorInput'
import { Slider } from '../ui/Slider'
import { IconButton } from '../ui/IconButton'
import { Hint } from '../ui/Hint'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Strikethrough,
  Underline,
} from 'lucide-react'

export function TextSection() {
  const selection = useEditorStore((s) => s.selection)
  const engine = useEditorStore((s) => s.engine)
  const textStyle = useEditorStore((s) => s.text)
  const setTextStyle = useEditorStore((s) => s.setTextStyle)

  if (!selection || selection.type !== 'text') return null

  const set = (patch: Record<string, unknown>, commit = true) => engine?.updateActive(patch, commit)

  return (
    <div>
      <div className="px-3 py-1.5">
        <div className="mb-1 text-[11px] text-ps-dim">内容</div>
        <textarea
          className="w-full resize-y bg-ps-panel3 border border-ps-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-ps-accent"
          rows={3}
          value={selection.text ?? ''}
          onChange={(e) => set({ text: e.target.value }, false)}
          onBlur={() => engine?.pushHistoryState()}
        />
      </div>

      <div className="px-3 py-1.5">
        <div className="mb-1 text-[11px] text-ps-dim">字体</div>
        <select
          className="w-full bg-ps-panel3 border border-ps-border rounded px-2 py-1 text-[11px] outline-none focus:border-ps-accent"
          value={selection.fontFamily ?? textStyle.fontFamily}
          onChange={(e) => {
            setTextStyle({ fontFamily: e.target.value })
            set({ fontFamily: e.target.value })
          }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <Slider
        label="字号"
        value={selection.fontSize ?? textStyle.fontSize}
        min={8}
        max={300}
        onChange={(v) => {
          setTextStyle({ fontSize: v })
          set({ fontSize: v }, false)
        }}
        onCommit={() => engine?.pushHistoryState()}
        suffix="px"
      />
      <Slider
        label="行距"
        value={(selection.lineHeight ?? 1.16) * 100}
        min={50}
        max={300}
        onChange={(v) => set({ lineHeight: v / 100 }, false)}
        onCommit={() => engine?.pushHistoryState()}
        resetTo={116}
        format={(v) => (v / 100).toFixed(2)}
      />
      <Slider
        label="字间距"
        value={selection.charSpacing ?? 0}
        min={-100}
        max={800}
        onChange={(v) => set({ charSpacing: v }, false)}
        onCommit={() => engine?.pushHistoryState()}
        resetTo={0}
      />

      <ColorInput
        label="文字颜色"
        value={typeof selection.fill === 'string' ? selection.fill : textStyle.fill}
        onChange={(v) => {
          setTextStyle({ fill: v })
          set({ fill: v }, false)
          engine?.scheduleHistory()
        }}
      />

      <div className="flex items-center gap-1 px-3 py-1.5">
        <Hint label="加粗" side="bottom">
          <IconButton active={selection.fontWeight === 'bold'} onClick={() => set({ fontWeight: selection.fontWeight === 'bold' ? 'normal' : 'bold' })}>
            <Bold size={15} />
          </IconButton>
        </Hint>
        <Hint label="斜体" side="bottom">
          <IconButton active={selection.fontStyle === 'italic'} onClick={() => set({ fontStyle: selection.fontStyle === 'italic' ? 'normal' : 'italic' })}>
            <Italic size={15} />
          </IconButton>
        </Hint>
        <Hint label="下划线" side="bottom">
          <IconButton active={!!selection.underline} onClick={() => set({ underline: !selection.underline })}>
            <Underline size={15} />
          </IconButton>
        </Hint>
        <Hint label="删除线" side="bottom">
          <IconButton active={!!selection.linethrough} onClick={() => set({ linethrough: !selection.linethrough })}>
            <Strikethrough size={15} />
          </IconButton>
        </Hint>

        <div className="mx-1 h-5 w-px bg-ps-border" />

        <Hint label="左对齐" side="bottom">
          <IconButton active={selection.textAlign === 'left'} onClick={() => set({ textAlign: 'left' })}>
            <AlignLeft size={15} />
          </IconButton>
        </Hint>
        <Hint label="居中" side="bottom">
          <IconButton active={selection.textAlign === 'center'} onClick={() => set({ textAlign: 'center' })}>
            <AlignCenter size={15} />
          </IconButton>
        </Hint>
        <Hint label="右对齐" side="bottom">
          <IconButton active={selection.textAlign === 'right'} onClick={() => set({ textAlign: 'right' })}>
            <AlignRight size={15} />
          </IconButton>
        </Hint>
      </div>
    </div>
  )
}
