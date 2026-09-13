import { describe, expect, it } from 'vitest'
import { vec2, vec3 } from '../math/vec'
import type { ShapeSpec, ShapeSpec3 } from './shape'
import { sampleShape, sampleShape3 } from './shape'

describe('sampleShape', () => {
  const shape: ShapeSpec = {
    xFn: (t) => t,
    yFn: (t) => t * t,
    tMin: 0,
    tMax: 1,
  }

  it('包含两端点，共 samples+1 个点', () => {
    const pts = sampleShape(shape, 4)
    expect(pts).toHaveLength(5)
    expect(pts[0]).toEqual(vec2(0, 0))
    expect(pts[4]).toEqual(vec2(1, 1))
  })

  it('中点参数正确', () => {
    const pts = sampleShape(shape, 2)
    expect(pts[1]).toEqual(vec2(0.5, 0.25))
  })
})

describe('sampleShape3', () => {
  const helix: ShapeSpec3 = {
    xFn: (t) => Math.cos(t),
    yFn: (t) => Math.sin(t),
    zFn: (t) => t / 4,
    tMin: -Math.PI,
    tMax: Math.PI,
  }

  it('包含两端点，共 samples+1 个点', () => {
    const pts = sampleShape3(helix, 8)
    expect(pts).toHaveLength(9)
    expect(pts[0].x).toBeCloseTo(-1)
    expect(pts[0].z).toBeCloseTo(-Math.PI / 4)
    expect(pts[8].z).toBeCloseTo(Math.PI / 4)
  })

  it('点落在圆柱面上（螺线半径恒为 1）', () => {
    for (const p of sampleShape3(helix, 32)) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(1)
    }
  })

  it('z 恒为 0 时退化为平面曲线', () => {
    const circle: ShapeSpec3 = { ...helix, zFn: () => 0 }
    for (const p of sampleShape3(circle, 16)) {
      expect(p).toEqual(vec3(p.x, p.y, 0))
    }
  })
})
