import {
  Brush,
  Circle,
  Crop,
  Eraser,
  Hand,
  Minus,
  MousePointer2,
  Square,
  Triangle,
  Type,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { TOOLS } from '@/lib/defaults'
import { Hint } from './ui/Hint'
import type { ToolId } from '@/types'
import { useI18n } from '@/hooks/useI18n'

const ICONS: Record<ToolId, LucideIcon> = {
  select: MousePointer2,
  hand: Hand,
  crop: Crop,
  brush: Brush,
  eraser: Eraser,
  text: Type,
  rect: Square,
  ellipse: Circle,
  line: Minus,
  triangle: Triangle,
}

export function Toolbar() {
  const { t } = useI18n()
  const tool = useEditorStore((s) => s.tool)
  const engine = useEditorStore((s) => s.engine)
  const brush = useEditorStore((s) => s.brush)
  const setBrush = useEditorStore((s) => s.setBrush)
  const setTextStyle = useEditorStore((s) => s.setTextStyle)
  const setShapeStyle = useEditorStore((s) => s.setShapeStyle)

  return (
    <div className="flex w-12 shrink-0 flex-col items-center border-r border-ps-border bg-ps-panel py-2">
      {TOOLS.map((toolDef, i) => {
        const Icon = ICONS[toolDef.id]
        const active = tool === toolDef.id
        return (
          <div key={toolDef.id} className="group relative flex w-full flex-col items-center">
            {i === 3 && <div className="my-1.5 h-px w-6 bg-ps-border" />}
            {i === 6 && <div className="my-1.5 h-px w-6 bg-ps-border" />}
            <Hint label={t(toolDef.label)} shortcut={toolDef.shortcut}>
              <button
                className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors
                  ${
                    active
                      ? 'bg-ps-accentSoft text-ps-accent2'
                      : 'text-ps-dim hover:bg-ps-panel3 hover:text-ps-text'
                  }`}
                onClick={() => engine?.setTool(toolDef.id)}
                title={`${t(toolDef.label)}${toolDef.shortcut ? ` (${toolDef.shortcut})` : ''}`}
              >
                <Icon size={17} strokeWidth={1.8} />
                {active && (
                  <span className="absolute -left-[7px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-ps-accent" />
                )}
              </button>
            </Hint>
          </div>
        )
      })}

      <div className="my-2 h-px w-6 bg-ps-border" />

      {/* 前景色（画笔 / 文字 / 图形共用） */}
      <Hint label={t('前景色')}>
        <div className="relative h-7 w-7 overflow-hidden rounded-md border border-ps-border2">
          <input
            type="color"
            className="absolute -left-1 -top-1 h-10 w-10"
            value={brush.color}
            onChange={(e) => {
              const color = e.target.value
              setBrush({ color })
              setTextStyle({ fill: color })
              setShapeStyle({ fill: color })
              engine?.setActiveForegroundColor(color, false)
              engine?.refreshBrush()
            }}
          />
        </div>
      </Hint>
    </div>
  )
}
