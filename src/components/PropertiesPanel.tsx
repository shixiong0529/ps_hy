import { useEditorStore } from '@/store/editorStore'
import { Section } from './ui/Section'
import { TransformSection } from './sections/TransformSection'
import { TextSection } from './sections/TextSection'
import { ShapeSection } from './sections/ShapeSection'
import { AdjustmentsSection } from './sections/AdjustmentsSection'
import { BrushSection } from './sections/BrushSection'
import { CropSection } from './sections/CropSection'
import { DocumentSection } from './sections/DocumentSection'

export function PropertiesPanel() {
  const tool = useEditorStore((s) => s.tool)
  const selection = useEditorStore((s) => s.selection)
  const activeCount = useEditorStore((s) => s.activeIds.length)

  const isText = selection?.type === 'text'
  const isShape = selection ? ['rect', 'ellipse', 'triangle', 'line', 'path'].includes(selection.type) : false

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-ps-border bg-ps-panel">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tool === 'crop' ? (
          <>
            <Section title="裁剪画布">
              <CropSection />
            </Section>
            <Section title="画板">
              <DocumentSection />
            </Section>
          </>
        ) : (
          <>
            {activeCount > 1 && (
              <div className="border-b border-ps-border px-3 py-2 text-[11px] text-ps-dim">
                已选中 <b className="text-ps-text">{activeCount}</b> 个对象，可整体移动 / 缩放 / 旋转 / 删除
              </div>
            )}

            {selection && (
              <Section title="变换">
                <TransformSection />
              </Section>
            )}

            {isText && (
              <Section title="文字">
                <TextSection />
              </Section>
            )}

            {isShape && (
              <Section title="图形与笔迹">
                <ShapeSection />
              </Section>
            )}

            <Section title="图像调整">
              <AdjustmentsSection />
            </Section>

            <Section title="画笔 / 橡皮擦" defaultOpen={tool === 'brush' || tool === 'eraser'}>
              <BrushSection />
            </Section>

            <Section title="画板" defaultOpen={false}>
              <DocumentSection />
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
