import { useEditorStore } from '@/store/editorStore'
import { Section } from './ui/Section'
import { TransformSection } from './sections/TransformSection'
import { TextSection } from './sections/TextSection'
import { ShapeSection } from './sections/ShapeSection'
import { AdjustmentsSection } from './sections/AdjustmentsSection'
import { BrushSection } from './sections/BrushSection'
import { CropSection } from './sections/CropSection'
import { DocumentSection } from './sections/DocumentSection'
import { useI18n } from '@/hooks/useI18n'

export function PropertiesPanel() {
  const { t } = useI18n()
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
            <Section title={t('裁剪画布')}>
              <CropSection />
            </Section>
            <Section title={t('画板')}>
              <DocumentSection />
            </Section>
          </>
        ) : (
          <>
            {activeCount > 1 && (
              <div className="border-b border-ps-border px-3 py-2 text-[11px] text-ps-dim">
                {t('已选中 {count} 个对象，可整体移动 / 缩放 / 旋转 / 删除', { count: activeCount })}
              </div>
            )}

            {selection && (
              <Section title={t('变换')}>
                <TransformSection />
              </Section>
            )}

            {isText && (
              <Section title={t('文字')}>
                <TextSection />
              </Section>
            )}

            {isShape && (
              <Section title={t('图形与笔迹')}>
                <ShapeSection />
              </Section>
            )}

            <Section title={t('图像调整')}>
              <AdjustmentsSection />
            </Section>

            <Section title={t('画笔 / 橡皮擦')} defaultOpen={tool === 'brush' || tool === 'eraser'}>
              <BrushSection />
            </Section>

            <Section title={t('画板')} defaultOpen={false}>
              <DocumentSection />
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
