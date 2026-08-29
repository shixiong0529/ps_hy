import { useEffect, useState } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { NumberInput } from '../ui/NumberInput'
import { Check } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

export function DocumentSection() {
  const { t } = useI18n()
  const doc = useEditorStore((s) => s.doc)
  const engine = useEditorStore((s) => s.engine)
  const [w, setW] = useState(doc.width)
  const [h, setH] = useState(doc.height)

  useEffect(() => {
    setW(doc.width)
    setH(doc.height)
  }, [doc.height, doc.width])

  const apply = () => {
    const nw = Math.max(16, Math.round(w))
    const nh = Math.max(16, Math.round(h))
    if (nw === doc.width && nh === doc.height) return
    engine?.newDocument(nw, nh)
  }

  return (
    <div>
      <div className="flex gap-2 px-3 py-1.5">
        <NumberInput label={t('画板宽')} value={w} min={16} onChange={setW} suffix="px" />
        <NumberInput label={t('画板高')} value={h} min={16} onChange={setH} suffix="px" />
      </div>
      <div className="px-3 pb-2">
        <button className="btn btn-ghost w-full py-1.5" onClick={apply}>
          <Check size={12} />
          {t('应用为新画板（会清空内容）')}
        </button>
      </div>
      <div className="px-3 pb-2 text-[10px] leading-relaxed text-ps-muted">
        {t('如需改变画布范围而不清空内容，请使用「裁剪画布」或「图像 → 画布旋转 90°」。')}
      </div>
    </div>
  )
}
