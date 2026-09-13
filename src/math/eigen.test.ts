import { describe, expect, it } from 'vitest'
import { mat2, mat2Vec2 } from './mat'
import { eigen2D } from './eigen'

describe('eigen2D', () => {
  it('对角矩阵：特征向量为坐标轴', () => {
    const e = eigen2D(mat2(2, 0, 0, 3))
    if (e.kind !== 'two-real') throw new Error('应当有两个实特征值')
    // 次序经定向，保证 det(v₁, v₂) > 0
    expect(e.values[0]).toBeCloseTo(2)
    expect(e.vectors[0].x).toBeCloseTo(1)
    expect(e.vectors[0].y).toBeCloseTo(0)
    expect(e.values[1]).toBeCloseTo(3)
    expect(e.vectors[1].x).toBeCloseTo(0)
    expect(e.vectors[1].y).toBeCloseTo(1)
  })

  it('对称矩阵：特征向量正交', () => {
    const m = mat2(2, 1, 1, 2)
    const e = eigen2D(m)
    if (e.kind !== 'two-real') throw new Error('应当有两个实特征值')
    expect(e.values[0]).toBeCloseTo(1)
    expect(e.vectors[0].x).toBeCloseTo(-e.vectors[0].y) // (1,-1) 方向
    expect(e.values[1]).toBeCloseTo(3)
    expect(e.vectors[1].x).toBeCloseTo(e.vectors[1].y) // (1,1) 方向
  })

  it('特征向量对定向为右手系：det(v₁, v₂) > 0', () => {
    const samples = [
      mat2(2, 0, 0, 3),
      mat2(2, 1, 1, 2),
      mat2(1, 1, 1, 1),
      mat2(2, -1, -1, 2),
      mat2(1, 2, 3, 4),
    ]
    for (const m of samples) {
      const e = eigen2D(m)
      if (e.kind !== 'two-real') continue
      const [v1, v2] = e.vectors
      expect(v1.x * v2.y - v1.y * v2.x).toBeGreaterThan(0)
    }
  })

  it('一般矩阵：逐点验证 Mv = λv', () => {
    const m = mat2(2, 1, 0.5, -1)
    const e = eigen2D(m)
    if (e.kind !== 'two-real') throw new Error('应当有两个实特征值')
    e.values.forEach((lambda, i) => {
      const v = e.vectors[i]
      const mv = mat2Vec2(m, v)
      expect(mv.x).toBeCloseTo(lambda * v.x, 9)
      expect(mv.y).toBeCloseTo(lambda * v.y, 9)
    })
  })

  it('旋转矩阵：共轭复特征值，无实特征向量', () => {
    const e = eigen2D(mat2(0, -1, 1, 0))
    expect(e.kind).toBe('complex')
    if (e.kind !== 'complex') return
    expect(e.re).toBeCloseTo(0)
    expect(e.im).toBeCloseTo(1)
  })

  it('剪切矩阵：二重根但只有一个特征方向', () => {
    const e = eigen2D(mat2(1, 1, 0, 1))
    expect(e.kind).toBe('single')
    if (e.kind !== 'single') return
    expect(e.value).toBeCloseTo(1)
    expect(e.vector.x).toBeCloseTo(1)
    expect(e.vector.y).toBeCloseTo(0)
  })

  it('Jordan 块 [[2,1],[0,2]]：只有一个特征方向', () => {
    const e = eigen2D(mat2(2, 1, 0, 2))
    expect(e.kind).toBe('single')
    if (e.kind !== 'single') return
    expect(e.value).toBeCloseTo(2)
    expect(e.vector.x).toBeCloseTo(1)
  })

  it('λI：任意非零向量都是特征向量', () => {
    const e = eigen2D(mat2(3, 0, 0, 3))
    expect(e).toEqual({ kind: 'scaled-identity', value: 3 })
  })

  it('单位矩阵：λ = 1 的 scaled-identity', () => {
    const e = eigen2D(mat2(1, 0, 0, 1))
    expect(e.kind).toBe('scaled-identity')
  })

  it('奇异矩阵 [[1,1],[1,1]]：特征值 0 与 2', () => {
    const e = eigen2D(mat2(1, 1, 1, 1))
    if (e.kind !== 'two-real') throw new Error('应当有两个实特征值')
    expect(e.values[0]).toBeCloseTo(0)
    expect(e.values[1]).toBeCloseTo(2)
  })

  it('特征向量已归一化', () => {
    const e = eigen2D(mat2(2, 1, 0.5, -1))
    if (e.kind !== 'two-real') throw new Error('应当有两个实特征值')
    for (const v of e.vectors) {
      expect(Math.hypot(v.x, v.y)).toBeCloseTo(1)
    }
  })
})
