import { describe, expect, it } from 'vitest'
import { mat2 } from '../math/mat'
import type { Viewport } from './coord'
import { gridIndexRange, MAX_GRID_POINTS } from './draw'

const vp: Viewport = { width: 800, height: 600, scale: 64, originX: 400, originY: 300 }

const points = (r: { kMin: number; kMax: number; jMin: number; jMax: number }): number =>
  (r.kMax - r.kMin + 1) * (r.jMax - r.jMin + 1)

describe('gridIndexRange', () => {
  it('单位矩阵：范围约等于视口，步长不变', () => {
    const r = gridIndexRange(vp, mat2(1, 0, 0, 1), 1)
    expect(r.step).toBe(1)
    expect(r.kMax - r.kMin).toBeLessThan(20)
    expect(r.jMax - r.jMin).toBeLessThan(20)
  })

  it('奇异矩阵（降维成线）：点数受限、步长保持 1', () => {
    const r = gridIndexRange(vp, mat2(1, 1, 1, 1), 1)
    expect(r.step).toBe(1)
    expect(points(r)).toBeLessThanOrEqual(MAX_GRID_POINTS)
  })

  it('小模长的奇异矩阵：塌缩线仍铺满视野（覆盖所需系数区间）', () => {
    const m = mat2(0.1, 0, 0.1, 0) // 图像塌缩到 x 轴，模长很小
    const r = gridIndexRange(vp, m, 1)
    expect(points(r)).toBeLessThanOrEqual(MAX_GRID_POINTS)
    const colScale = Math.hypot(m[0], m[2])
    const radius = 400 / 64 // 视口宽半径
    const covered = (r.kMax - r.kMin) * r.step * colScale
    expect(covered).toBeGreaterThanOrEqual(2 * radius)
  })

  it('近奇异矩阵（逆矩阵爆炸）：步长自动倍增，总点数被限制', () => {
    const r = gridIndexRange(vp, mat2(1, 1, 1, 0.9999), 1) // det ≈ 1e-4
    expect(r.step).toBeGreaterThan(1)
    expect(points(r)).toBeLessThanOrEqual(MAX_GRID_POINTS)
  })

  it('平移视图后范围随原点偏移移动', () => {
    const panned: Viewport = { ...vp, originX: 400 + 5 * 64 }
    const a = gridIndexRange(vp, mat2(1, 0, 0, 1), 1)
    const b = gridIndexRange(panned, mat2(1, 0, 0, 1), 1)
    // 原点右移 → 可见世界范围整体左移（更负）
    expect(b.kMin).toBeLessThan(a.kMin)
    expect(b.kMax).toBeLessThan(a.kMax)
  })
})
