import type { Adjustments, ExportFormat, LayerType, ToolDefinition, ToolId } from '@/types'

let seed = 0
export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${(seed++).toString(36)}`

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

export const modKey = () => (isMac() ? '⌘' : 'Ctrl')

/* ------------------------------------------------------------------ */
/* 默认参数                                                            */
/* ------------------------------------------------------------------ */

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  exposure: 0,
  blur: 0,
  grayscale: false,
  blackwhite: false,
  vintage: false,
  preset: null,
}

export const TOOLS: ToolDefinition[] = [
  { id: 'select', label: '移动 / 选择', hint: '选择、移动、缩放、旋转对象', shortcut: 'V', drawKind: null },
  { id: 'hand', label: '抓手', hint: '拖动画布视图（空格键可临时切换）', shortcut: 'H', drawKind: null },
  { id: 'crop', label: '裁剪', hint: '拖拽裁剪框后按回车或点击应用', shortcut: 'C', drawKind: null },
  { id: 'brush', label: '画笔', hint: '自由绘制笔迹', shortcut: 'B', drawKind: null },
  { id: 'eraser', label: '橡皮擦', hint: '擦除画笔与图形内容', shortcut: 'E', drawKind: null },
  { id: 'text', label: '文字', hint: '点击画布添加文字图层', shortcut: 'T', drawKind: null },
  { id: 'rect', label: '矩形', hint: '拖拽绘制矩形', shortcut: 'R', drawKind: 'rect' },
  { id: 'ellipse', label: '椭圆', hint: '拖拽绘制椭圆', shortcut: 'O', drawKind: 'ellipse' },
  { id: 'line', label: '直线', hint: '拖拽绘制直线', shortcut: 'L', drawKind: 'line' },
  { id: 'triangle', label: '三角形', hint: '拖拽绘制三角形', shortcut: 'Y', drawKind: 'triangle' },
]

export const SHAPE_TOOLS: ToolId[] = ['rect', 'ellipse', 'line', 'triangle']

export const LAYER_LABEL: Record<LayerType, string> = {
  image: '图片',
  text: '文字',
  rect: '矩形',
  ellipse: '椭圆',
  line: '直线',
  triangle: '三角形',
  path: '路径',
  group: '组',
  unknown: '对象',
}

export const FONT_FAMILIES = [
  { label: '思源黑体 / 系统默认', value: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif' },
  { label: '苹方 PingFang SC', value: '"PingFang SC", sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { label: 'Helvetica / Arial', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Georgia 衬线', value: 'Georgia, "Songti SC", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier 等宽', value: '"Courier New", monospace' },
  { label: 'Impact', value: 'Impact, "Arial Black", sans-serif' },
]

export const DEFAULT_DOC = { width: 1280, height: 800 }

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const isAcceptedImageFile = (file: File) =>
  ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(?:jpe?g|png|webp)$/i.test(file.name)

export const MAX_IMAGE_EDGE = 4096

export const EXPORT_EXT: Record<ExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

/* ------------------------------------------------------------------ */
/* 其它工具函数                                                        */
/* ------------------------------------------------------------------ */

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}
