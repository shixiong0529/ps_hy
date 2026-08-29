import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Square,
  Trash2,
  Triangle,
  Type,
  PencilLine,
  Unlock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { LAYER_LABEL } from '@/lib/defaults'
import type { LayerType } from '@/types'
import { Hint } from './ui/Hint'
import { useI18n } from '@/hooks/useI18n'

const TYPE_ICON: Record<LayerType, LucideIcon> = {
  image: ImageIcon,
  text: Type,
  rect: Square,
  ellipse: Square,
  line: Square,
  triangle: Triangle,
  path: Square,
  group: Square,
  unknown: Square,
}

export function LayersPanel() {
  const { t } = useI18n()
  const layers = useEditorStore((s) => s.layers)
  const engine = useEditorStore((s) => s.engine)
  const revision = useEditorStore((s) => s.layerRevision)
  const toast = useEditorStore((s) => s.toast)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overPos, setOverPos] = useState<'before' | 'after'>('before')
  const timer = useRef<number | null>(null)

  /* 缩略图：结构变化后防抖重算 */
  useEffect(() => {
    if (!engine) return
    let cancelled = false
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      void Promise.all(
        layers.map(async (l) => [l.id, await engine.getThumbnail(l.id, 56)] as const),
      ).then((items) => {
        if (cancelled) return
        const next: Record<string, string> = {}
        items.forEach(([id, url]) => {
          if (url) next[id] = url
        })
        setThumbs(next)
      })
    }, 260)
    return () => {
      cancelled = true
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [revision, engine, layers])

  return (
    <div className="flex h-full min-h-0 flex-col bg-ps-panel">
      <div className="section-title">
        <span>{t('图层')} {layers.length > 0 && <span className="text-ps-muted">({layers.length})</span>}</span>
        <div className="flex items-center gap-0.5">
          <Hint label={t('上移一层')} side="left">
            <button
              className="btn h-5 w-5 p-0"
              disabled={layers.length < 2}
              onClick={() => {
                const id = layers.find((l) => l.active)?.id
                if (id) engine?.reorderLayer(id, 'up')
              }}
            >
              <ChevronUp size={13} />
            </button>
          </Hint>
          <Hint label={t('下移一层')} side="left">
            <button
              className="btn h-5 w-5 p-0"
              disabled={layers.length < 2}
              onClick={() => {
                const id = layers.find((l) => l.active)?.id
                if (id) engine?.reorderLayer(id, 'down')
              }}
            >
              <ChevronDown size={13} />
            </button>
          </Hint>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {layers.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] leading-relaxed text-ps-muted">
            {t('暂无图层')}
            <br />
            {t('上传图片或添加文字后显示')}
          </div>
        )}

        {layers.map((l) => {
          const Icon = TYPE_ICON[l.type] ?? Square
          return (
            <div
              key={l.id}
              draggable={editingId !== l.id}
              onDragStart={() => setDragId(l.id)}
              onDragEnd={() => {
                setDragId(null)
                setOverId(null)
              }}
              onDragOver={(e) => {
                if (!dragId || dragId === l.id) return
                e.preventDefault()
                const rect = e.currentTarget.getBoundingClientRect()
                setOverPos(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
                setOverId(l.id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId && overId && dragId !== overId) engine?.moveLayerTo(dragId, overId, overPos)
                setDragId(null)
                setOverId(null)
              }}
              onClick={() => engine?.selectLayer(l.id)}
              className={`group relative flex cursor-default items-center gap-2 border-b border-ps-border/60 px-2 py-1.5 transition-colors
                ${l.active ? 'bg-ps-accentSoft' : 'hover:bg-ps-panel3'}
                ${overId === l.id ? (overPos === 'before' ? 'border-t-2 border-t-ps-accent' : 'border-b-2 border-b-ps-accent') : ''}
                ${dragId === l.id ? 'opacity-40' : ''}`}
            >
              <button
                className="shrink-0 text-ps-muted hover:text-ps-text"
                onClick={(e) => {
                  e.stopPropagation()
                  engine?.setLayerVisible(l.id, !l.visible)
                }}
                title={t(l.visible ? '隐藏图层' : '显示图层')}
              >
                {l.visible ? <Eye size={14} /> : <EyeOff size={14} className="text-ps-muted/50" />}
              </button>

              <div
                className="checkerboard flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-ps-border"
                style={{ opacity: l.visible ? 1 : 0.4 }}
              >
                {thumbs[l.id] ? (
                  <img src={thumbs[l.id]} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Icon size={14} className="text-ps-muted" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                {editingId === l.id ? (
                  <input
                    autoFocus
                    defaultValue={l.name}
                    className="w-full bg-ps-panel3 border border-ps-accent px-1 py-0.5 text-[11px] outline-none"
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      engine?.renameLayer(l.id, e.target.value.trim() || l.name)
                      setEditingId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                ) : (
                  <div
                    className="truncate text-[11px] text-ps-text"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingId(l.id)
                    }}
                    title={t('双击重命名')}
                  >
                    {l.name}
                  </div>
                )}
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wide text-ps-muted">{t(LAYER_LABEL[l.type])}</span>
                  <input
                    type="range"
                    className={`ps-range h-2 flex-1 ${l.locked ? 'pointer-events-none opacity-40' : ''}`}
                    disabled={l.locked}
                    min={0}
                    max={100}
                    value={Math.round(l.opacity * 100)}
                    style={{ '--pct': `${l.opacity * 100}%` } as CSSProperties}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => engine?.setLayerOpacity(l.id, Number(e.target.value) / 100, false)}
                    onPointerUp={() => engine?.pushHistoryState()}
                    onKeyUp={() => engine?.pushHistoryState()}
                    onBlur={() => engine?.pushHistoryState()}
                    title={t('图层不透明度')}
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                {l.type === 'text' && (
                  <button
                    className="btn h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!engine?.editText(l.id)) {
                        toast(t(l.locked ? '图层已锁定，请先解锁' : '图层已隐藏，请先显示'), 'error')
                      }
                    }}
                    title={t('编辑文字')}
                  >
                    <PencilLine size={12} />
                  </button>
                )}
                <button
                  className="btn h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (engine?.selectLayer(l.id)) engine.duplicateActive()
                    else toast(t(l.locked ? '图层已锁定，请先解锁' : '图层已隐藏，请先显示'), 'error')
                  }}
                  title={t('复制图层')}
                >
                  <Copy size={12} />
                </button>
                <button
                  className="btn h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    engine?.setLayerLocked(l.id, !l.locked)
                  }}
                  title={t(l.locked ? '解锁图层' : '锁定图层')}
                >
                  {l.locked ? <Lock size={12} className="text-ps-accent2" /> : <Unlock size={12} />}
                </button>
                <button
                  className="btn h-5 w-5 p-0 hover:text-ps-danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    engine?.deleteLayer(l.id)
                  }}
                  title={t('删除图层')}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {l.locked && (
                <Lock size={11} className="absolute right-1 top-1 text-ps-accent2 group-hover:hidden" />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-0.5 border-t border-ps-border px-2 py-1.5">
        <Hint label={t('置于顶层')} side="left">
          <button
            className="btn h-6 px-1.5"
            onClick={() => {
              const id = layers.find((l) => l.active)?.id
              if (id) engine?.reorderLayer(id, 'top')
            }}
          >
            <ArrowUpToLine size={13} />
          </button>
        </Hint>
        <Hint label={t('置于底层')} side="left">
          <button
            className="btn h-6 px-1.5"
            onClick={() => {
              const id = layers.find((l) => l.active)?.id
              if (id) engine?.reorderLayer(id, 'bottom')
            }}
          >
            <ArrowDownToLine size={13} />
          </button>
        </Hint>
        <div className="ml-auto">
          <button
            className="btn h-6 px-1.5 hover:text-ps-danger"
            onClick={() => {
              const id = layers.find((l) => l.active)?.id
              if (id) engine?.deleteLayer(id)
            }}
            title={t('删除选中图层')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
