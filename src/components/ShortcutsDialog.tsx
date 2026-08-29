import { useEditorStore } from '@/store/editorStore'
import { X } from 'lucide-react'
import { modKey } from '@/lib/defaults'
import { useI18n } from '@/hooks/useI18n'

const GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: '文件与导出',
    items: [
      ['打开图片', `${modKey()} + O`],
      ['导出图片', `${modKey()} + S`],
    ],
  },
  {
    title: '编辑',
    items: [
      ['撤销', `${modKey()} + Z`],
      ['重做', `${modKey()} + Shift + Z / ${modKey()} + Y`],
      ['复制图层', `${modKey()} + J`],
      ['删除所选', 'Delete / Backspace'],
      ['全选图层', `${modKey()} + A`],
      ['取消选择', `${modKey()} + D`],
    ],
  },
  {
    title: '工具',
    items: [
      ['移动 / 选择', 'V'],
      ['抓手', 'H（或按住空格拖动）'],
      ['裁剪', 'C'],
      ['画笔', 'B'],
      ['橡皮擦', 'E'],
      ['文字', 'T'],
      ['矩形', 'R'],
      ['椭圆', 'O'],
      ['直线', 'L'],
      ['三角形', 'Y'],
    ],
  },
  {
    title: '视图',
    items: [
      ['滚轮缩放', '以光标为中心缩放'],
      ['Shift + 滚轮', '水平平移'],
      ['适应屏幕', `${modKey()} + 0`],
      ['放大 / 缩小', `${modKey()} + = / -`],
    ],
  },
  {
    title: '裁剪',
    items: [
      ['应用裁剪', 'Enter'],
      ['取消裁剪', 'Esc'],
    ],
  },
]

export function ShortcutsDialog() {
  const { t } = useI18n()
  const open = useEditorStore((s) => s.shortcutsOpen)
  const setOpen = useEditorStore((s) => s.setShortcutsOpen)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[560px] max-w-[92vw] overflow-hidden rounded-xl border border-ps-border2 bg-ps-panel shadow-pop">
        <div className="flex items-center justify-between border-b border-ps-border px-4 py-2.5">
          <h3 className="text-[14px] font-medium text-ps-text">{t('快捷键')}</h3>
          <button className="btn h-6 w-6 p-0" onClick={() => setOpen(false)}>
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ps-accent2">
                  {t(g.title)}
                </div>
                <div className="space-y-1">
                  {g.items.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4 text-[12px]">
                      <span className="text-ps-dim">{t(k)}</span>
                      <span className="shrink-0 font-mono text-[11px] text-ps-muted">{t(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
