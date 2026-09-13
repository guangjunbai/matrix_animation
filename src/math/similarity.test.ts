import { describe, expect, it } from 'vitest'
import type { Mat2 } from './mat'
import { mat2, mat2Inverse, mat2Mult } from './mat'
import { diagonalize } from './similarity'

const norm = (m: readonly number[]) => m.map((n) => n + 0)

const expectCloseToMat = (a: Mat2, b: Mat2, digits = 9): void => {
  norm(a).forEach((n, i) => expect(n).toBeCloseTo(b[i], digits))
}

describe('diagonalize', () => {
  it('对称矩阵：P 由特征向量组成，A = P·D·P⁻¹，阶段为 [P⁻¹, D·P⁻¹, A]', () => {
    const m = mat2(2, 1, 1, 2)
    const d = diagonalize(m)
    if (!d.ok) throw new Error('应当可对角化')
    // P 的列就是面板显示的单位特征向量（定向为右手系）
    const c1 = { x: d.P[0], y: d.P[2] }
    const c2 = { x: d.P[1], y: d.P[3] }
    expect(Math.hypot(c1.x, c1.y)).toBeCloseTo(1)
    expect(c1.x).toBeCloseTo(-c1.y) // (1,-1) 方向
    expect(c2.x).toBeCloseTo(c2.y) // (1,1) 方向
    // P 的列与 eigen2D 的向量一致，且 det > 0（对称矩阵时 P 是纯旋转）
    expect(d.P[0] * d.P[3] - d.P[1] * d.P[2]).toBeGreaterThan(0)
    // D 是对角阵，对角元为对应的特征值 1 与 3
    expect(d.D[1]).toBeCloseTo(0)
    expect(d.D[2]).toBeCloseTo(0)
    expect(d.D[0]).toBeCloseTo(1)
    expect(d.D[3]).toBeCloseTo(3)
    // 三步动画阶段
    expect(d.stages).toHaveLength(3)
    expect(d.stages[2]).toEqual(m)
    expect(d.stages[0]).toEqual(d.Pinv)
    expect(d.stages[1]).toEqual(mat2Mult(d.D, d.Pinv))
    // P·P⁻¹ = I
    expectCloseToMat(mat2Mult(d.P, d.Pinv), mat2(1, 0, 0, 1))
    // 验证 A = P·D·P⁻¹
    const pd = mat2Mult(d.P, d.D)
    const pdp = mat2Mult(pd, mat2Inverse(d.P)!)
    expectCloseToMat(pdp, m)
  })

  it('剪切矩阵不可对角化', () => {
    const d = diagonalize(mat2(1, 1, 0, 1))
    expect(d.ok).toBe(false)
    if (!d.ok) expect(d.reason).toContain('不可对角化')
  })

  it('旋转矩阵：复数特征值无法实对角化', () => {
    const d = diagonalize(mat2(0, -1, 1, 0))
    expect(d.ok).toBe(false)
    if (!d.ok) expect(d.reason).toContain('复数')
  })

  it('λI：已是平凡对角形式', () => {
    const d = diagonalize(mat2(2, 0, 0, 2))
    expect(d.ok).toBe(false)
  })
})

describe('diagonalize 的三步阶段', () => {
  it('阶段为累计矩阵 [P⁻¹, D·P⁻¹, A]（向量 x 的旅程）', () => {
    const m = mat2(2, 1, 1, 2)
    const d = diagonalize(m)
    if (!d.ok) throw new Error('应当可对角化')
    expect(d.stages).toHaveLength(3)
    expectCloseToMat(d.stages[0], mat2Inverse(d.P)!)
    expectCloseToMat(d.stages[1], mat2Mult(d.D, mat2Inverse(d.P)!))
    expect(d.stages[2]).toEqual(m)
  })
})
