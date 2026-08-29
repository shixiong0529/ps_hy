import * as fabric from 'fabric'
import type { Adjustments, AnyObject } from '@/types'
import { getFilterPreset, pick } from './registry'

/**
 * fabric 6 的滤镜命名空间（运行期取值，便于按可用能力优雅降级）
 */
export const FILTERS = fabric.filters as unknown as Record<string, new (o?: unknown) => unknown>

type FilterHost = {
  filters?: unknown[]
  applyFilters?: (filters?: unknown[]) => void
}

/** 由 Adjustments 参数构建 fabric 滤镜链 */
export function buildAdjustmentFilters(adj: Adjustments): unknown[] {
  const out: unknown[] = []
  const add = (names: string[], opts?: unknown) => {
    const f = pick(FILTERS, names, opts)
    if (f) out.push(f)
  }

  // 曝光：以 2 的幂次做 gamma 映射，接近相机档位手感
  if (adj.exposure !== 0) {
    const g = Math.pow(2, -(adj.exposure / 100) * 1.1)
    add(['Gamma'], { gamma: [g, g, g] })
  }
  if (adj.brightness !== 0) add(['Brightness'], { brightness: adj.brightness / 100 })
  if (adj.contrast !== 0) add(['Contrast'], { contrast: adj.contrast / 100 })
  if (adj.saturation !== 0) add(['Saturation'], { saturation: adj.saturation / 100 })

  // 色温：分通道 gamma，正值为暖调
  if (adj.temperature !== 0) {
    const t = (adj.temperature / 100) * 0.38
    add(['Gamma'], { gamma: [Math.pow(2, t), 1, Math.pow(2, -t)] })
  }

  if (adj.grayscale) add(['Grayscale'], { mode: 'luminosity' })
  if (adj.blackwhite) add(['BlackWhite'], {})
  if (adj.vintage) add(['Vintage'], {})

  // 预设（灰度/复古/柯达…）
  const preset = getFilterPreset(adj.preset)
  if (preset) {
    try {
      out.push(...preset.build(FILTERS))
    } catch {
      /* 预设构建失败时忽略，不阻断主流程 */
    }
  }

  // 模糊置于链尾
  if (adj.blur > 0) add(['Blur'], { blur: Math.min(1, adj.blur / 100) })

  return out
}

/** 将调整参数应用到 fabric 对象（仅图片对象支持滤镜） */
export function applyAdjustments(obj: AnyObject, adj: Adjustments) {
  const host = obj as unknown as FilterHost
  if (typeof host.applyFilters !== 'function') return false
  host.filters = buildAdjustmentFilters(adj)
  host.applyFilters()
  obj.set({ dirty: true } as never)
  return true
}

export function supportsFilters(obj: AnyObject | null | undefined) {
  return !!obj && typeof (obj as unknown as FilterHost).applyFilters === 'function'
}
