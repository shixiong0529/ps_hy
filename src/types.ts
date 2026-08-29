import type * as fabric from 'fabric'

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

export type ToolId =
  | 'select'
  | 'hand'
  | 'crop'
  | 'brush'
  | 'eraser'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'triangle'

export type LayerType =
  | 'image'
  | 'text'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'triangle'
  | 'path'
  | 'group'
  | 'unknown'

export interface ToolDefinition {
  id: ToolId
  label: string
  hint: string
  shortcut?: string
  /** 属于"绘制类"工具：在画布上按下拖拽即创建图元 */
  drawKind?: 'rect' | 'ellipse' | 'line' | 'triangle' | null
}

/* ------------------------------------------------------------------ */
/* 图层                                                                */
/* ------------------------------------------------------------------ */

export interface LayerMeta {
  id: string
  name: string
  type: LayerType
  visible: boolean
  locked: boolean
  opacity: number
  active: boolean
}

/* ------------------------------------------------------------------ */
/* 图像调整                                                            */
/* ------------------------------------------------------------------ */

export interface Adjustments {
  brightness: number // -100 ~ 100
  contrast: number // -100 ~ 100
  saturation: number // -100 ~ 100
  temperature: number // -100 ~ 100
  exposure: number // -100 ~ 100
  blur: number // 0 ~ 100
  grayscale: boolean
  blackwhite: boolean
  vintage: boolean
  /** 一键预设（可选，叠加在基础调整之上） */
  preset: string | null
}

/* ------------------------------------------------------------------ */
/* 选中对象快照                                                        */
/* ------------------------------------------------------------------ */

export interface SelectionSnapshot {
  id: string
  type: LayerType
  left: number
  top: number
  width: number
  height: number
  angle: number
  opacity: number
  flipX: boolean
  flipY: boolean
  fill: string
  stroke: string
  strokeWidth: number
  rx: number
  /* text */
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  fontStyle?: string
  underline?: boolean
  linethrough?: boolean
  textAlign?: string
  lineHeight?: number
  charSpacing?: number
}

/* ------------------------------------------------------------------ */
/* 导出                                                                */
/* ------------------------------------------------------------------ */

export type ExportFormat = 'png' | 'jpeg' | 'webp'

export interface ExportOptions {
  format: ExportFormat
  quality: number
  scale: number
  filename: string
  transparent: boolean
}

/* ------------------------------------------------------------------ */
/* 滤镜预设（可扩展）                                                  */
/* ------------------------------------------------------------------ */

export interface FilterPreset {
  id: string
  label: string
  /** 预览用的 CSS filter，仅用于 UI 展示 */
  cssPreview: string
  /** 真正应用到 fabric 对象上的构建函数 */
  build: (filters: FabricFilterNamespace) => unknown[]
}

export type FabricFilterNamespace = Record<string, new (opts?: unknown) => unknown>

/* ------------------------------------------------------------------ */
/* Fabric 对象扩展                                                     */
/* ------------------------------------------------------------------ */

export type AnyObject = fabric.FabricObject & {
  layerId?: string
  layerName?: string
  layerType?: LayerType
  locked?: boolean
  isMask?: boolean
}

export interface Snapshot {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  json: Record<string, any>
  doc: { width: number; height: number }
  adjustments: Record<string, Adjustments>
}
