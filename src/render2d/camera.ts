import type { Viewport } from './coord'

/** 缩放范围（每数学单位的像素数） */
export const MIN_SCALE = 5
export const MAX_SCALE = 5000

/** 首次打开时的缩放范围 */
const INITIAL_SCALE_MIN = 30
const INITIAL_SCALE_MAX = 120

/** 滚轮缩放系数 */
export const ZOOM_FACTOR = 1.15

/** 网格步长候选序列：1/2/5 × 10^k */
const NICE_STEPS = [1, 2, 5, 10] as const

/** 目标：每格约 64px */
const TARGET_CELL_PX = 64

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** 建立默认视图：原点在画布中心，视野约覆盖 ±6 个数学单位 */
export function createCamera(width: number, height: number): Viewport {
  const scale = clamp(Math.min(width, height) / 12, INITIAL_SCALE_MIN, INITIAL_SCALE_MAX)
  return { width, height, scale, originX: width / 2, originY: height / 2 }
}

/** 以屏幕点 (mx, my) 为锚点缩放：锚点下的世界点保持不动 */
export function zoomAt(cam: Viewport, mx: number, my: number, factor: number): Viewport {
  const scale = clamp(cam.scale * factor, MIN_SCALE, MAX_SCALE)
  const k = scale / cam.scale
  return {
    ...cam,
    scale,
    originX: mx - (mx - cam.originX) * k,
    originY: my - (my - cam.originY) * k,
  }
}

/** 平移视图：世界原点随屏幕位移移动 */
export function panBy(cam: Viewport, dx: number, dy: number): Viewport {
  return { ...cam, originX: cam.originX + dx, originY: cam.originY + dy }
}

/**
 * 按当前缩放选择"好看"的网格步长（1/2/5 × 10^k），
 * 使每格像素尽量接近 64px：放大时单位细分，缩小时单位合并。
 */
export function gridStep(scale: number): number {
  const target = TARGET_CELL_PX / scale
  const mag = 10 ** Math.floor(Math.log10(target))
  let best = mag * NICE_STEPS[0]
  let bestDiff = Math.abs(best - target)
  for (const n of NICE_STEPS.slice(1)) {
    const cand = mag * n
    const diff = Math.abs(cand - target)
    if (diff < bestDiff) {
      best = cand
      bestDiff = diff
    }
  }
  return best
}
