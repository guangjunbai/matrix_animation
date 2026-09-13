import { describe, expect, it } from 'vitest'
import { describeEigen3, eigen3D, eigen3DLines, solveCubic } from './eigen3'
import type { Mat3 } from './mat'
import { mat3, mat3Vec3 } from './mat'
import { cross3, norm3 } from './vec'

describe('solveCubic', () => {
  it('三个实根（(λ−1)(λ−2)(λ−3) = λ³ − 6λ² + 11λ − 6）', () => {
    const r = solveCubic(-6, 11, -6)
    expect(r.kind).toBe('three-real')
    if (r.kind !== 'three-real') return
    expect(r.roots[0]).toBeCloseTo(3)
    expect(r.roots[1]).toBeCloseTo(2)
    expect(r.roots[2]).toBeCloseTo(1)
  })

  it('重根（λ²(λ−3) = λ³ − 3λ²）', () => {
    const r = solveCubic(-3, 0, 0)
    expect(r.kind).toBe('three-real')
    if (r.kind !== 'three-real') return
    expect(r.roots[0]).toBeCloseTo(3)
    expect(r.roots[1]).toBeCloseTo(0)
    expect(r.roots[2]).toBeCloseTo(0)
  })

  it('三重根（λ³）', () => {
    const r = solveCubic(0, 0, 0)
    expect(r.kind).toBe('three-real')
    if (r.kind !== 'three-real') return
    for (const root of r.roots) expect(root).toBeCloseTo(0)
  })

  it('一个实根 + 一对复根（λ³ + λ = λ(λ²+1)）', () => {
    const r = solveCubic(0, 1, 0)
    expect(r.kind).toBe('one-real')
    if (r.kind !== 'one-real') return
    expect(r.root).toBeCloseTo(0)
    expect(r.re).toBeCloseTo(0)
    expect(r.im).toBeCloseTo(1)
  })

  it('复根情形：实部非零（(λ−1)(λ²+1) = λ³ − λ² + λ − 1）', () => {
    const r = solveCubic(-1, 1, -1)
    expect(r.kind).toBe('one-real')
    if (r.kind !== 'one-real') return
    expect(r.root).toBeCloseTo(1)
    expect(r.re).toBeCloseTo(0)
    expect(r.im).toBeCloseTo(1)
  })
})

/** 验证 v 是 m 的特征向量、λ 是对应特征值 */
function expectEigenpair(m: Mat3, lambda: number, v: { x: number; y: number; z: number }): void {
  const mv = mat3Vec3(m, v)
  expect(mv.x).toBeCloseTo(lambda * v.x, 6)
  expect(mv.y).toBeCloseTo(lambda * v.y, 6)
  expect(mv.z).toBeCloseTo(lambda * v.z, 6)
}

describe('eigen3D：三个不同实特征值', () => {
  const m = mat3(3, 0, 0, 0, 2, 0, 0, 0, 1)

  it('对角矩阵：三个坐标轴方向，特征值降序', () => {
    const e = eigen3D(m)
    expect(e.kind).toBe('real')
    if (e.kind !== 'real') return
    expect(e.groups).toHaveLength(3)
    e.groups.forEach((g, i) => expect(g.value).toBeCloseTo([3, 2, 1][i], 9))
    for (const g of e.groups) {
      expect(g.multiplicity).toBe(1)
      expect(g.dim).toBe(1)
      expectEigenpair(m, g.value, g.vector!)
    }
  })

  it('对称矩阵：三个互相正交的特征方向', () => {
    const sym = mat3(2, 1, 0, 1, 2, 0, 0, 0, 5)
    const e = eigen3D(sym)
    if (e.kind !== 'real') throw new Error('应当是三个实特征值')
    expect(e.groups).toHaveLength(3)
    for (const g of e.groups) {
      expect(g.vector).not.toBeNull()
      expectEigenpair(sym, g.value, g.vector!)
    }
    const [a, b, c] = e.groups.map((g) => g.vector!)
    expect(Math.abs(a.x * b.x + a.y * b.y + a.z * b.z)).toBeCloseTo(0, 9)
    expect(Math.abs(a.x * c.x + a.y * c.y + a.z * c.z)).toBeCloseTo(0, 9)
  })

  it('特征向量已归一化', () => {
    const e = eigen3D(m)
    if (e.kind !== 'real') return
    for (const g of e.groups) expect(norm3(g.vector!)).toBeCloseTo(1)
  })
})

describe('eigen3D：重根', () => {
  it('剪切矩阵：二重根但只有一个特征方向', () => {
    const shear = mat3(1, 1, 0, 0, 1, 0, 0, 0, 2)
    const e = eigen3D(shear)
    expect(e.kind).toBe('real')
    if (e.kind !== 'real') return
    expect(e.groups).toHaveLength(2)
    const double = e.groups.find((g) => g.multiplicity === 2)!
    expect(double.value).toBeCloseTo(1)
    expect(double.multiplicity).toBe(2)
    expect(double.dim).toBe(1)
    expect(double.vector!.x).toBeCloseTo(1)
    expect(double.vector!.y).toBeCloseTo(0)
    expect(double.vector!.z).toBeCloseTo(0)
  })

  it('diag(2,2,3)：二重根的特征空间是 2 维平面', () => {
    const e = eigen3D(mat3(2, 0, 0, 0, 2, 0, 0, 0, 3))
    if (e.kind !== 'real') throw new Error('应当是实特征值')
    const double = e.groups.find((g) => Math.abs(g.value - 2) < 1e-9)!
    expect(double.multiplicity).toBe(2)
    expect(double.dim).toBe(2)
    expect(double.vector).toBeNull()
  })

  it('λI：三重根，全部向量都是特征向量', () => {
    const e = eigen3D(mat3(2, 0, 0, 0, 2, 0, 0, 0, 2))
    if (e.kind !== 'real') throw new Error('应当是实特征值')
    expect(e.groups).toHaveLength(1)
    expect(e.groups[0].multiplicity).toBe(3)
    expect(e.groups[0].dim).toBe(3)
  })
})

describe('eigen3D：复特征值', () => {
  it('绕 z 轴 90° 旋转：λ = 1 与 ±i', () => {
    const rot = mat3(0, -1, 0, 1, 0, 0, 0, 0, 1)
    const e = eigen3D(rot)
    expect(e.kind).toBe('complex')
    if (e.kind !== 'complex') return
    expect(e.value).toBeCloseTo(1)
    expect(e.re).toBeCloseTo(0)
    expect(e.im).toBeCloseTo(1)
    expect(e.dim).toBe(1)
    expect(e.vector!.z).toBeCloseTo(1) // 旋转轴 z
  })

  it('空间旋转矩阵（绕 (1,1,1) 120°）：实特征值仍为 1', () => {
    const rot = mat3(0, 0, 1, 1, 0, 0, 0, 1, 0)
    const e = eigen3D(rot)
    expect(e.kind).toBe('complex')
    if (e.kind !== 'complex') return
    expect(e.value).toBeCloseTo(1)
    expect(e.im).toBeGreaterThan(0)
  })
})

describe('eigen3DLines', () => {
  it('只返回特征空间为 1 维的方向', () => {
    const shear = mat3(1, 1, 0, 0, 1, 0, 0, 0, 2)
    expect(eigen3DLines(eigen3D(shear))).toHaveLength(2) // 二重根方向 + λ=2 方向
    const flat = mat3(2, 0, 0, 0, 2, 0, 0, 0, 3)
    expect(eigen3DLines(eigen3D(flat))).toHaveLength(1) // 只剩 λ=3 的 z 轴
  })

  it('复特征值时只返回那个实方向', () => {
    const rot = mat3(0, -1, 0, 1, 0, 0, 0, 0, 1)
    const lines = eigen3DLines(eigen3D(rot))
    expect(lines).toHaveLength(1)
    expect(lines[0].value).toBeCloseTo(1)
  })

  it('返回的方向确实是特征方向', () => {
    const m = mat3(4, 1, 2, 0, 3, 1, 0, 0, 2)
    for (const line of eigen3DLines(eigen3D(m))) {
      expectEigenpair(m, line.value, line.vector)
    }
  })
})

describe('describeEigen3', () => {
  it('三个不同实根逐条列出', () => {
    const lines = describeEigen3(eigen3D(mat3(3, 0, 0, 0, 2, 0, 0, 0, 1)))
    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('λ₁ = 3')
    expect(lines[2]).toContain('λ₃ = 1')
  })

  it('二重根说明特征空间', () => {
    const single = describeEigen3(eigen3D(mat3(1, 1, 0, 0, 1, 0, 0, 0, 2)))
    const text = single.join(' ')
    expect(text).toContain('二重')
    expect(text).toContain('v = ')
    // 另一个单重根仍按 λ 编号列出
    expect(text).toContain('λ₁ = 2')

    const plane = describeEigen3(eigen3D(mat3(2, 0, 0, 0, 2, 0, 0, 0, 3)))
    expect(plane.join(' ')).toContain('2 维平面')
  })

  it('复根情形给出说明', () => {
    const lines = describeEigen3(eigen3D(mat3(0, -1, 0, 1, 0, 0, 0, 0, 1)))
    expect(lines.join(' ')).toContain('复')
    expect(lines.join(' ')).toContain('旋转')
  })

  it('λI 说明任意向量都是特征向量', () => {
    const lines = describeEigen3(eigen3D(mat3(5, 0, 0, 0, 5, 0, 0, 0, 5)))
    expect(lines.join(' ')).toContain('任意非零向量')
  })
})

describe('不变方向验证', () => {
  it('特征方向在变换下保持方向（只缩放 λ 倍）', () => {
    // 该矩阵的特征值为 3, 3, 1：λ=3 的特征空间是 2 维平面，只有 λ=1 是特征线
    const m = mat3(2, 1, 0, 1, 2, 0, 0, 0, 3)
    const lines = eigen3DLines(eigen3D(m))
    expect(lines).toHaveLength(1)
    for (const { vector } of lines) {
      const mv = mat3Vec3(m, vector)
      // 叉积为零 ⇔ 方向不变
      expect(norm3(cross3(mv, vector))).toBeCloseTo(0, 9)
    }
  })

  it('复特征值情形：实特征方向同样不变', () => {
    const m = mat3(0, -1, 0, 1, 0, 0, 0, 0, 1)
    for (const { value, vector } of eigen3DLines(eigen3D(m))) {
      const mv = mat3Vec3(m, vector)
      expect(norm3(cross3(mv, vector))).toBeCloseTo(0, 9)
      expect(norm3(mv)).toBeCloseTo(Math.abs(value), 9)
    }
  })
})
