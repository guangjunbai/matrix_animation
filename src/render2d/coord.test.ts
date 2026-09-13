import { describe, expect, it } from 'vitest'
import type { Viewport } from './coord'
import { screenToWorld, worldToScreen } from './coord'

describe('worldToScreen', () => {
  const vp: Viewport = { width: 800, height: 600, scale: 60, originX: 400, originY: 300 }

  it('原点映射到视图原点（默认在画布中心）', () => {
    expect(worldToScreen(vp, 0, 0)).toEqual({ x: 400, y: 300 })
  })

  it('y 轴方向反转（数学坐标向上）', () => {
    expect(worldToScreen(vp, 0, 1)).toEqual({ x: 400, y: 240 })
  })

  it('按缩放比例映射', () => {
    expect(worldToScreen(vp, 2, -1)).toEqual({ x: 520, y: 360 })
  })

  it('平移（原点偏移）后映射随之移动', () => {
    const panned: Viewport = { ...vp, originX: 500, originY: 250 }
    expect(worldToScreen(panned, 0, 0)).toEqual({ x: 500, y: 250 })
  })
})

describe('screenToWorld', () => {
  it('是 worldToScreen 的逆映射', () => {
    const vp: Viewport = { width: 800, height: 600, scale: 60, originX: 400, originY: 300 }
    const p = worldToScreen(vp, 1.5, -2)
    const w = screenToWorld(vp, p.x, p.y)
    expect(w.x).toBeCloseTo(1.5)
    expect(w.y).toBeCloseTo(-2)
  })
})
