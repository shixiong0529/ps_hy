import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { EditorEngine } from '@/lib/engine'
import { CROP_CURSOR, isAcceptedImageFile } from '@/lib/defaults'
import { ImagePlus, MousePointerClick } from 'lucide-react'

export function EditorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engine = useEditorStore((s) => s.engine)
  const setEngine = useEditorStore((s) => s.setEngine)
  const doc = useEditorStore((s) => s.doc)
  const view = useEditorStore((s) => s.view)
  const layers = useEditorStore((s) => s.layers)
  const tool = useEditorStore((s) => s.tool)
  const toast = useEditorStore((s) => s.toast)

  /* 初始化引擎 */
  useEffect(() => {
    if (!canvasRef.current) return
    const e = new EditorEngine(canvasRef.current)
    setEngine(e)
    e.setTool('select')
    return () => {
      e.dispose()
      setEngine(null)
    }
  }, [setEngine])

  /* 视口尺寸跟随容器 */
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || !engine) return
    const apply = () => {
      const r = wrap.getBoundingClientRect()
      engine.setViewportSize(r.width, r.height)
    }
    let frame = window.requestAnimationFrame(apply)
    const scheduleApply = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(apply)
    }
    const ro = new ResizeObserver(scheduleApply)
    ro.observe(wrap)
    return () => {
      window.cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [engine])

  /* 拖拽上传 */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files ?? [])
    const img = files.find(isAcceptedImageFile)
    if (img && engine) void engine.addImageFromFile(img)
    else if (files.length) toast('请拖入 JPG / PNG / WebP 图片', 'error')
  }

  const isEmpty = layers.length === 0
  const artW = doc.width * view.zoom
  const artH = doc.height * view.zoom

  // 需与 EditorEngine.setTool 中的 canvas 光标保持一致：
  // Fabric 会给 upper-canvas 元素自己写 style.cursor，画布内以引擎设置的为准。
  const cursor =
    tool === 'hand'
      ? 'grab'
      : tool === 'crop'
        ? CROP_CURSOR
        : tool === 'text'
          ? 'text'
          : ['rect', 'ellipse', 'line', 'triangle', 'brush', 'eraser'].includes(tool)
            ? 'crosshair'
            : 'default'

  return (
    <div
      ref={wrapRef}
      className="workspace-grid relative min-w-0 flex-1 overflow-hidden"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{ cursor }}
    >
      {/* 画板（文档边界） */}
      <div
        className="checkerboard absolute shadow-[0_10px_60px_rgba(0,0,0,.65)] ring-1 ring-white/10"
        style={{ left: view.panX, top: view.panY, width: artW, height: artH }}
      />
      {/* React 只管理宿主；Fabric 可在宿主内安全创建 wrapper/upperCanvas。 */}
      <div className="absolute inset-0">
        <canvas ref={canvasRef} />
      </div>

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto flex w-[420px] max-w-[86%] flex-col items-center rounded-2xl border border-dashed border-ps-border2 bg-ps-panel/70 px-10 py-10 text-center backdrop-blur-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ps-accentSoft text-ps-accent2">
              <ImagePlus size={26} />
            </div>
            <h2 className="mb-1.5 text-sm font-medium text-ps-text">拖拽图片到这里开始编辑</h2>
            <p className="mb-5 text-xs leading-relaxed text-ps-muted">
              支持 JPG / PNG / WebP，也可以直接 Ctrl/⌘ + V 粘贴剪贴板图片
            </p>
            <label className="btn btn-primary cursor-pointer px-4 py-1.5">
              <MousePointerClick size={14} />
              选择图片
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f && engine) void engine.addImageFromFile(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
