import { useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { EXPORT_EXT, downloadDataUrl, formatBytes } from '@/lib/defaults'
import { Slider } from './ui/Slider'
import type { ExportFormat } from '@/types'

const FORMATS: Array<{ id: ExportFormat; label: string }> = [
  { id: 'png', label: 'PNG · 无损' },
  { id: 'jpeg', label: 'JPG · 有损' },
  { id: 'webp', label: 'WebP' },
]

const SCALES = [1, 2, 3]

export function ExportDialog() {
  const open = useEditorStore((s) => s.exportOpen)
  const setOpen = useEditorStore((s) => s.setExportOpen)
  const opts = useEditorStore((s) => s.exportOptions)
  const setOpts = useEditorStore((s) => s.setExportOptions)
  const engine = useEditorStore((s) => s.engine)
  const doc = useEditorStore((s) => s.doc)
  const toast = useEditorStore((s) => s.toast)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const exportSize = engine?.getExportDimensions(opts.scale)
  const outW = exportSize?.width ?? Math.round(doc.width * opts.scale)
  const outH = exportSize?.height ?? Math.round(doc.height * opts.scale)

  const doExport = () => {
    if (!engine) return
    setBusy(true)
    // 让 loading 状态先渲染出来
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const res = engine.exportImage(opts)
          const name = `${opts.filename || 'pixelforge-export'}.${EXPORT_EXT[opts.format]}`
          downloadDataUrl(res.dataUrl, name)
          toast(`已导出 ${name} · ${res.width}×${res.height} · ${formatBytes(res.bytes)}`, 'success')
          setOpen(false)
        } catch {
          toast('导出失败，请重试', 'error')
        } finally {
          setBusy(false)
        }
      }, 16)
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] max-w-[92vw] overflow-hidden rounded-xl border border-ps-border2 bg-ps-panel shadow-pop">
        <div className="flex items-center justify-between border-b border-ps-border px-4 py-2.5">
          <h3 className="text-[13px] font-medium text-ps-text">导出图片</h3>
          <button className="btn h-6 w-6 p-0" onClick={() => setOpen(false)}>
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="mb-3 text-[11px] text-ps-dim">格式</div>
          <div className="mb-4 grid grid-cols-3 gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setOpts({ format: f.id })}
                className={`rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                  opts.format === f.id
                    ? 'border-ps-accent bg-ps-accentSoft text-ps-accent2'
                    : 'border-ps-border bg-ps-panel3 text-ps-dim hover:text-ps-text'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {opts.format === 'png' && (
            <label className="mb-3 flex items-center gap-2 text-[11px] text-ps-dim">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-[#3d7eff]"
                checked={opts.transparent}
                onChange={(e) => setOpts({ transparent: e.target.checked })}
              />
              保留透明背景（关闭则用白色填充）
            </label>
          )}

          {opts.format !== 'png' && (
            <Slider
              label="图片质量"
              value={Math.round(opts.quality * 100)}
              min={10}
              max={100}
              suffix="%"
              onChange={(v) => setOpts({ quality: v / 100 })}
            />
          )}

          <div className="mb-3 mt-2 text-[11px] text-ps-dim">输出倍率</div>
          <div className="mb-4 grid grid-cols-3 gap-1.5">
            {SCALES.map((s) => (
              <button
                key={s}
                onClick={() => setOpts({ scale: s })}
                className={`rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                  opts.scale === s
                    ? 'border-ps-accent bg-ps-accentSoft text-ps-accent2'
                    : 'border-ps-border bg-ps-panel3 text-ps-dim hover:text-ps-text'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="mb-1 text-[11px] text-ps-dim">文件名</div>
          <div className="flex items-center gap-1 rounded-md border border-ps-border bg-ps-panel3 px-2 py-1">
            <input
              type="text"
              className="min-w-0 flex-1 border-none bg-transparent p-0 text-[11px] outline-none"
              value={opts.filename}
              onChange={(e) => setOpts({ filename: e.target.value })}
            />
            <span className="shrink-0 font-mono text-[11px] text-ps-muted">.{EXPORT_EXT[opts.format]}</span>
          </div>

          <div className="mt-3 rounded-md border border-ps-border bg-ps-panel2 px-3 py-2 text-[11px] text-ps-muted">
            输出尺寸 <span className="font-mono text-ps-text">{outW} × {outH}</span> px
            <br />
            仅包含画板内的图像内容，不含编辑器界面
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-ps-border px-4 py-3">
          <button className="btn btn-ghost flex-1 py-1.5" onClick={() => setOpen(false)}>
            取消
          </button>
          <button className="btn btn-primary flex-1 py-1.5" disabled={busy} onClick={doExport}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            导出图片
          </button>
        </div>
      </div>
    </div>
  )
}
