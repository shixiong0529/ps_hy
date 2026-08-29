import { useEffect, useRef } from 'react'
import { Download, Languages, Moon, Redo2, Sun, Undo2 } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { modKey } from '@/lib/defaults'
import { useI18n } from '@/hooks/useI18n'

interface MenuItem {
  label: string
  shortcut?: string
  onClick?: () => void
  disabled?: boolean
  divider?: boolean
}

function Dropdown({ label, items }: { label: string; items: MenuItem[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const anyOpen = useEditorStore((s) => s.openMenu)
  const open = anyOpen === label

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        useEditorStore.setState({ openMenu: null })
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        className={`rounded px-2 py-1 text-[14px] font-medium transition-colors ${
          open ? 'bg-ps-panel3 text-ps-text' : 'text-ps-dim hover:text-ps-text'
        }`}
        onMouseEnter={() => anyOpen && useEditorStore.setState({ openMenu: label })}
        onClick={() => useEditorStore.setState({ openMenu: open ? null : label })}
      >
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[90] mt-1 min-w-[204px] rounded-lg border border-ps-border2 bg-ps-panel2 p-1 shadow-pop">
          {items.map((it, i) =>
            it.divider ? (
              <div key={`d${i}`} className="my-1 h-px bg-ps-border" />
            ) : (
              <button
                key={it.label}
                disabled={it.disabled}
                className="flex w-full items-center justify-between gap-6 rounded px-2 py-1.5 text-left text-xs text-ps-dim transition-colors hover:bg-ps-accentSoft hover:text-ps-text disabled:pointer-events-none disabled:opacity-30"
                onClick={() => {
                  useEditorStore.setState({ openMenu: null })
                  it.onClick?.()
                }}
              >
                <span>{it.label}</span>
                {it.shortcut && <span className="font-mono text-[11px] text-ps-muted">{it.shortcut}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2 pr-3">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="url(#pf-g1)" />
        <path d="M12 4.5l6.2 3.6v7.8L12 19.5 5.8 15.9V8.1L12 4.5z" stroke="#0b0d11" strokeWidth="1.3" opacity=".5" />
        <path d="M12 4.5l6.2 3.6L12 11.7 5.8 8.1 12 4.5z" fill="#0b0d11" opacity=".35" />
        <defs>
          <linearGradient id="pf-g1" x1="0" y1="0" x2="24" y2="24">
            <stop stopColor="#5a90ff" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-[14px] font-semibold tracking-wide text-ps-text">
        Pixel<span className="text-ps-accent2">Forge</span>
      </span>
    </div>
  )
}

export function TopMenu() {
  const { language, t } = useI18n()
  const engine = useEditorStore((s) => s.engine)
  const canUndo = useEditorStore((s) => s.canUndo)
  const canRedo = useEditorStore((s) => s.canRedo)
  const activeIds = useEditorStore((s) => s.activeIds)
  const setExportOpen = useEditorStore((s) => s.setExportOpen)
  const setExportOptions = useEditorStore((s) => s.setExportOptions)
  const setShortcutsOpen = useEditorStore((s) => s.setShortcutsOpen)
  const theme = useEditorStore((s) => s.theme)
  const setTheme = useEditorStore((s) => s.setTheme)
  const setLanguage = useEditorStore((s) => s.setLanguage)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasSel = activeIds.length > 0
  const oneSel = activeIds.length === 1 ? activeIds[0] : null
  const quickExport = (format: 'png' | 'jpeg') => {
    setExportOptions({ format })
    setExportOpen(true)
  }

  const menus: Array<{ label: string; items: MenuItem[] }> = [
    {
      label: t('文件'),
      items: [
        { label: t('新建画布'), onClick: () => engine?.newDocument() },
        { label: t('打开图片…'), shortcut: `${modKey()}+O`, onClick: () => fileRef.current?.click() },
        { divider: true, label: '' },
        { label: t('导出为 PNG'), onClick: () => quickExport('png') },
        { label: t('导出为 JPG'), onClick: () => quickExport('jpeg') },
        { divider: true, label: '' },
        { label: t('导出…'), shortcut: `${modKey()}+S`, onClick: () => setExportOpen(true) },
      ],
    },
    {
      label: t('编辑'),
      items: [
        { label: t('撤销'), shortcut: `${modKey()}+Z`, disabled: !canUndo, onClick: () => engine?.undo() },
        { label: t('重做'), shortcut: `${modKey()}+⇧Z`, disabled: !canRedo, onClick: () => engine?.redo() },
        { divider: true, label: '' },
        { label: t('复制图层'), shortcut: `${modKey()}+J`, disabled: !hasSel, onClick: () => engine?.duplicateActive() },
        { label: t('删除所选'), shortcut: 'Del', disabled: !hasSel, onClick: () => engine?.deleteActive() },
        { divider: true, label: '' },
        { label: t('全选图层'), shortcut: `${modKey()}+A`, onClick: () => engine?.selectAll() },
        { label: t('取消选择'), shortcut: `${modKey()}+D`, disabled: !hasSel, onClick: () => engine?.deselect() },
      ],
    },
    {
      label: t('图像'),
      items: [
        { label: t('画布左转 90°'), onClick: () => engine?.rotateDocument(-90) },
        { label: t('画布右转 90°'), onClick: () => engine?.rotateDocument(90) },
        { divider: true, label: '' },
        { label: t('裁剪画布'), shortcut: 'C', onClick: () => engine?.setTool('crop') },
        { divider: true, label: '' },
        { label: t('适应屏幕'), shortcut: `${modKey()}+0`, onClick: () => engine?.fitToScreen() },
        { label: t('放大'), shortcut: `${modKey()}+=`, onClick: () => engine?.zoomBy(1.2) },
        { label: t('缩小'), shortcut: `${modKey()}+-`, onClick: () => engine?.zoomBy(1 / 1.2) },
      ],
    },
    {
      label: t('图层'),
      items: [
        { label: t('上移一层'), disabled: !oneSel, onClick: () => oneSel && engine?.reorderLayer(oneSel, 'up') },
        { label: t('下移一层'), disabled: !oneSel, onClick: () => oneSel && engine?.reorderLayer(oneSel, 'down') },
        { label: t('置于顶层'), disabled: !oneSel, onClick: () => oneSel && engine?.reorderLayer(oneSel, 'top') },
        { label: t('置于底层'), disabled: !oneSel, onClick: () => oneSel && engine?.reorderLayer(oneSel, 'bottom') },
        { divider: true, label: '' },
        { label: t('复制图层'), disabled: !hasSel, onClick: () => engine?.duplicateActive() },
        { label: t('删除图层'), disabled: !oneSel, onClick: () => oneSel && engine?.deleteLayer(oneSel) },
      ],
    },
    {
      label: t('帮助'),
      items: [{ label: t('快捷键一览'), shortcut: '?', onClick: () => setShortcutsOpen(true) }],
    },
  ]

  return (
    <div className="top-menu-bar flex h-11 shrink-0 items-center gap-1 border-b border-ps-border px-3">
      <Brand />
      <div className="mx-1 h-5 w-px bg-ps-border" />
      {menus.map((m) => (
        <Dropdown key={m.label} label={m.label} items={m.items} />
      ))}

      <div className="ml-auto flex items-center gap-1">
        <button
          className="btn h-7 min-w-7 px-1.5"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={t(theme === 'dark' ? '切换到浅色模式' : '切换到深色模式')}
          aria-label={t(theme === 'dark' ? '切换到浅色模式' : '切换到深色模式')}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          className="btn h-7 gap-1 px-1.5"
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
          title={t(language === 'zh' ? '切换到英文' : '切换到中文')}
          aria-label={t(language === 'zh' ? '切换到英文' : '切换到中文')}
        >
          <Languages size={14} />
          <span className="text-[11px] font-semibold">{language === 'zh' ? 'EN' : '中'}</span>
        </button>
        <div className="mx-1 h-5 w-px bg-ps-border" />
        <button className="btn h-7 px-2" disabled={!canUndo} onClick={() => engine?.undo()} title={`${t('撤销')} ${modKey()}+Z`}>
          <Undo2 size={15} />
        </button>
        <button
          className="btn h-7 px-2"
          disabled={!canRedo}
          onClick={() => engine?.redo()}
          title={`${t('重做')} ${modKey()}+Shift+Z`}
        >
          <Redo2 size={15} />
        </button>
        <div className="mx-1 h-5 w-px bg-ps-border" />
        <button className="btn btn-primary h-7 px-3" onClick={() => setExportOpen(true)}>
          <Download size={14} />
          {t('导出')}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f && engine) void engine.addImageFromFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
