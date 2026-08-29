import { create } from 'zustand'
import type { EditorEngine } from '@/lib/engine'
import { DEFAULT_ADJUSTMENTS, DEFAULT_DOC } from '@/lib/defaults'
import type {
  Adjustments,
  ExportOptions,
  LayerMeta,
  SelectionSnapshot,
  ToolId,
} from '@/types'
import type { Language, ThemeMode } from '@/lib/i18n'

const getStoredPreference = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const saved = window.localStorage.getItem(key) as T | null
    return saved && allowed.includes(saved) ? saved : fallback
  } catch {
    return fallback
  }
}

const setStoredPreference = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 存储不可用时仍允许本次会话切换主题与语言。
  }
}

const initialTheme = getStoredPreference<ThemeMode>('pixelforge-theme', ['dark', 'light'], 'dark')
const initialLanguage = getStoredPreference<Language>('pixelforge-language', ['zh', 'en'], 'zh')

const applyPreferences = (theme: ThemeMode, language: Language) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  document.title = language === 'zh' ? 'PixelForge · 网页图片编辑器' : 'PixelForge · Web Image Editor'
}

applyPreferences(initialTheme, initialLanguage)

export interface Toast {
  id: number
  text: string
  kind: 'info' | 'success' | 'error'
}

export interface BrushState {
  color: string
  width: number
  opacity: number
}

export interface TextState {
  fill: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  textAlign: string
}

export interface ShapeState {
  fill: string
  stroke: string
  strokeWidth: number
  rx: number
}

interface EditorState {
  /* 引擎 */
  engine: EditorEngine | null
  ready: boolean

  /* 文档 */
  doc: { width: number; height: number }
  view: { zoom: number; panX: number; panY: number }
  dirty: boolean
  /** 图层结构版本号，用于触发缩略图重算 */
  layerRevision: number

  /* 工具与选区 */
  tool: ToolId
  layers: LayerMeta[]
  activeIds: string[]
  selection: SelectionSnapshot | null

  /* 工具参数 */
  brush: BrushState
  text: TextState
  shape: ShapeState

  /* 调整（按图层保存） */
  adjustments: Record<string, Adjustments>
  adjustTargetId: string | null

  /* 历史 */
  canUndo: boolean
  canRedo: boolean

  /* UI */
  theme: ThemeMode
  language: Language
  exportOpen: boolean
  shortcutsOpen: boolean
  /** 当前展开的顶部菜单标题 */
  openMenu: string | null
  exportOptions: ExportOptions
  toasts: Toast[]

  /* actions */
  setEngine: (e: EditorEngine | null) => void
  setTool: (t: ToolId) => void
  setLayers: (l: LayerMeta[]) => void
  setActiveIds: (ids: string[]) => void
  setSelection: (s: SelectionSnapshot | null) => void
  setDoc: (d: { width: number; height: number }) => void
  setView: (v: { zoom: number; panX: number; panY: number }) => void
  setHistory: (canUndo: boolean, canRedo: boolean) => void
  setBrush: (p: Partial<BrushState>) => void
  setTextStyle: (p: Partial<TextState>) => void
  setShapeStyle: (p: Partial<ShapeState>) => void
  setAdjustment: (layerId: string, patch: Partial<Adjustments>) => void
  setAdjustTarget: (id: string | null) => void
  resetAdjustments: (layerId: string) => void
  setTheme: (theme: ThemeMode) => void
  setLanguage: (language: Language) => void
  setExportOpen: (v: boolean) => void
  setShortcutsOpen: (v: boolean) => void
  setExportOptions: (p: Partial<ExportOptions>) => void
  toast: (text: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
}

let toastSeq = 0

export const useEditorStore = create<EditorState>((set, get) => ({
  engine: null,
  ready: false,

  doc: { ...DEFAULT_DOC },
  view: { zoom: 1, panX: 0, panY: 0 },
  dirty: false,
  layerRevision: 0,

  tool: 'select',
  layers: [],
  activeIds: [],
  selection: null,

  brush: { color: '#ffffff', width: 8, opacity: 100 },
  text: {
    fill: '#ffffff',
    fontSize: 48,
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
    fontWeight: 'normal',
    textAlign: 'left',
  },
  shape: { fill: '#3d7eff', stroke: '#ffffff', strokeWidth: 0, rx: 0 },

  adjustments: {},
  adjustTargetId: null,

  canUndo: false,
  canRedo: false,

  theme: initialTheme,
  language: initialLanguage,
  exportOpen: false,
  shortcutsOpen: false,
  openMenu: null,
  exportOptions: {
    format: 'png',
    quality: 0.92,
    scale: 1,
    filename: 'pixelforge-export',
    transparent: true,
  },
  toasts: [],

  setEngine: (e) => set({ engine: e, ready: !!e }),
  setTool: (t) => set({ tool: t }),
  setLayers: (l) =>
    set((s) => ({ layers: l, dirty: s.dirty || l.length > 0, layerRevision: s.layerRevision + 1 })),
  setActiveIds: (ids) => set({ activeIds: ids }),
  setSelection: (sel) => set({ selection: sel }),
  setDoc: (d) => set({ doc: d }),
  setView: (v) => set({ view: v }),
  setHistory: (canUndo, canRedo) => set({ canUndo, canRedo }),

  setBrush: (p) => set((s) => ({ brush: { ...s.brush, ...p } })),
  setTextStyle: (p) => set((s) => ({ text: { ...s.text, ...p } })),
  setShapeStyle: (p) => set((s) => ({ shape: { ...s.shape, ...p } })),

  setAdjustment: (layerId, patch) =>
    set((s) => ({
      adjustments: {
        ...s.adjustments,
        [layerId]: { ...(s.adjustments[layerId] ?? DEFAULT_ADJUSTMENTS), ...patch },
      },
    })),
  setAdjustTarget: (id) =>
    set((s) => ({
      adjustTargetId: id,
      adjustments:
        id && !s.adjustments[id]
          ? { ...s.adjustments, [id]: { ...DEFAULT_ADJUSTMENTS } }
          : s.adjustments,
    })),
  resetAdjustments: (layerId) =>
    set((s) => ({
      adjustments: { ...s.adjustments, [layerId]: { ...DEFAULT_ADJUSTMENTS } },
    })),

  setTheme: (theme) => {
    setStoredPreference('pixelforge-theme', theme)
    applyPreferences(theme, get().language)
    set({ theme })
  },
  setLanguage: (language) => {
    setStoredPreference('pixelforge-language', language)
    applyPreferences(get().theme, language)
    set({ language, openMenu: null })
  },

  setExportOpen: (v) => set({ exportOpen: v }),
  setShortcutsOpen: (v) => set({ shortcutsOpen: v }),
  setExportOptions: (p) => set((s) => ({ exportOptions: { ...s.exportOptions, ...p } })),

  toast: (text, kind = 'info') => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }))
    setTimeout(() => get().dismissToast(id), 2600)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** 组件外部（引擎 / 快捷键）便捷访问 */
export const editorStore = useEditorStore
