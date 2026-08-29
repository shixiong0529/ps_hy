/**
 * 扩展注册中心
 * ------------------------------------------------------------------
 * 这里是编辑器对外预留的扩展接口：
 *   1. registerFilterPreset  —— 新增滤镜 / 一键调色（后续可接入 AI 抠图、AI 修图结果）
 *   2. registerTool          —— 新增画布工具
 *   3. registerAdjustment    —— 新增可调参数（滑块）
 * 新增能力时无需改动引擎与 UI，只需在模块加载时调用注册函数。
 */
import type { FilterPreset, ToolDefinition } from '@/types'

/* ------------------------------ 滤镜预设 ------------------------------ */

const presetRegistry = new Map<string, FilterPreset>()

export function registerFilterPreset(preset: FilterPreset) {
  presetRegistry.set(preset.id, preset)
}

export function getFilterPresets(): FilterPreset[] {
  return [...presetRegistry.values()]
}

export function getFilterPreset(id: string | null | undefined): FilterPreset | null {
  return id ? presetRegistry.get(id) ?? null : null
}

/* ------------------------------- 工具 -------------------------------- */

const toolRegistry = new Map<string, ToolDefinition>()

export function registerTool(tool: ToolDefinition) {
  toolRegistry.set(tool.id, tool)
}

export function getRegisteredTools(): ToolDefinition[] {
  return [...toolRegistry.values()]
}

/* ---------------------------- 调整项元数据 ---------------------------- */

export interface AdjustmentDef {
  id: keyof import('@/types').Adjustments
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
  /** 数值显示后缀 */
  unit?: string
  /** 中间值（一般为 0）用于双击复位 */
  resetTo: number
}

const adjustmentRegistry: AdjustmentDef[] = []

export function registerAdjustment(def: AdjustmentDef) {
  adjustmentRegistry.push(def)
}

export function getAdjustments(): AdjustmentDef[] {
  return adjustmentRegistry
}

/* ------------------------- 内置滤镜预设（默认值） ------------------------- */

export const BUILTIN_PRESETS: FilterPreset[] = [
  { id: 'none', label: '原图', cssPreview: 'none', build: () => [] },
  {
    id: 'mono',
    label: '黑白',
    cssPreview: 'grayscale(1)',
    build: (F) => [pick(F, ['BlackWhite', 'Grayscale'])].filter(Boolean),
  },
  {
    id: 'vintage',
    label: '复古',
    cssPreview: 'sepia(.55) saturate(1.25) contrast(1.08) brightness(1.05)',
    build: (F) => [pick(F, ['Vintage']), pick(F, ['Sepia'], { mode: 'colored' })].filter(Boolean),
  },
  {
    id: 'sepia',
    label: '棕褐',
    cssPreview: 'sepia(.8)',
    build: (F) => [pick(F, ['Sepia'])].filter(Boolean),
  },
  {
    id: 'kodachrome',
    label: '柯达',
    cssPreview: 'saturate(1.5) contrast(1.15) hue-rotate(-8deg)',
    build: (F) => [pick(F, ['Kodachrome']), pick(F, ['Vibrance'], { vibrance: 0.4 })].filter(Boolean),
  },
  {
    id: 'polaroid',
    label: '宝丽来',
    cssPreview: 'sepia(.25) contrast(1.12) brightness(1.1)',
    build: (F) => [pick(F, ['Polaroid']), pick(F, ['Brightness'], { brightness: 0.06 })].filter(Boolean),
  },
  {
    id: 'cool',
    label: '冷调',
    cssPreview: 'saturate(1.1) hue-rotate(12deg) brightness(1.03)',
    build: (F) => [
      pick(F, ['Gamma'], { gamma: [0.94, 1, 1.1] }),
      pick(F, ['Saturation'], { saturation: 0.12 }),
    ].filter(Boolean),
  },
  {
    id: 'warm',
    label: '暖调',
    cssPreview: 'saturate(1.12) hue-rotate(-12deg) brightness(1.04)',
    build: (F) => [
      pick(F, ['Gamma'], { gamma: [1.1, 1, 0.93] }),
      pick(F, ['Saturation'], { saturation: 0.14 }),
    ].filter(Boolean),
  },
  {
    id: 'invert',
    label: '反相',
    cssPreview: 'invert(1)',
    build: (F) => [pick(F, ['Invert'])].filter(Boolean),
  },
  {
    id: 'fade',
    label: '褪色',
    cssPreview: 'contrast(.85) brightness(1.08) saturate(.75)',
    build: (F) => [
      pick(F, ['Contrast'], { contrast: -0.16 }),
      pick(F, ['Brightness'], { brightness: 0.07 }),
      pick(F, ['Saturation'], { saturation: -0.25 }),
    ].filter(Boolean),
  },
  {
    id: 'hdr',
    label: '强对比',
    cssPreview: 'contrast(1.35) saturate(1.2)',
    build: (F) => [
      pick(F, ['Contrast'], { contrast: 0.34 }),
      pick(F, ['Vibrance'], { vibrance: 0.35 }),
    ].filter(Boolean),
  },
  {
    id: 'pixelate',
    label: '像素化',
    cssPreview: 'contrast(1.1) saturate(1.15)',
    build: (F) => [pick(F, ['Pixelate'], { blocksize: 8 })].filter(Boolean),
  },
]

/** 按候选名依次尝试构造 fabric filter，全部不可用时返回 null（优雅降级） */
export function pick(F: Record<string, new (o?: unknown) => unknown>, names: string[], opts?: unknown) {
  for (const n of names) {
    const Ctor = F[n]
    if (typeof Ctor === 'function') {
      try {
        return new Ctor(opts ?? {})
      } catch {
        /* 继续尝试下一个候选 */
      }
    }
  }
  return null
}
