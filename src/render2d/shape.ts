import type { Vec2, Vec3 } from '../math/vec'
import { vec2, vec3 } from '../math/vec'

/** 二维自定义图形：参数方程 x(t), y(t)，t ∈ [tMin, tMax] */
export interface ShapeSpec {
  xFn: (t: number) => number
  yFn: (t: number) => number
  tMin: number
  tMax: number
}

/** 三维自定义图形：空间参数曲线 x(t), y(t), z(t) */
export interface ShapeSpec3 {
  xFn: (t: number) => number
  yFn: (t: number) => number
  zFn: (t: number) => number
  tMin: number
  tMax: number
}

/** 把图形采样为世界坐标点列（含两端，共 samples+1 个点） */
export function sampleShape(shape: ShapeSpec, samples = 256): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i <= samples; i++) {
    const t = shape.tMin + ((shape.tMax - shape.tMin) * i) / samples
    pts.push(vec2(shape.xFn(t), shape.yFn(t)))
  }
  return pts
}

/** 把三维图形采样为世界坐标点列 */
export function sampleShape3(shape: ShapeSpec3, samples = 256): Vec3[] {
  const pts: Vec3[] = []
  for (let i = 0; i <= samples; i++) {
    const t = shape.tMin + ((shape.tMax - shape.tMin) * i) / samples
    pts.push(vec3(shape.xFn(t), shape.yFn(t), shape.zFn(t)))
  }
  return pts
}
