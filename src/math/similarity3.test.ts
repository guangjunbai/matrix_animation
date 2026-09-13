import { describe, expect, it } from 'vitest'
import type { Mat3 } from './mat'
import { mat3, mat3Mult, mat3Vec3 } from './mat'
import { diagonalize3 } from './similarity3'

const expectCloseToMat = (a: Mat3, b: Mat3, digits = 8): void => {
  a.forEach((n, i) => expect(n).toBeCloseTo(b[i], digits))
}

describe('diagonalize3', () => {
  it('三个不同实特征值：P·D·P⁻¹ = A，阶段为 [P⁻¹, D·P⁻¹, A]', () => {
    const m = mat3(2, 1, 0, 1, 2, 0, 0, 0, 3)
    const d = diagonalize3(m)
    if (!d.ok) throw new Error(`应当可对角化：${d.reason}`)

    expect(d.stages).toHaveLength(3)
    expect(d.stages[0]).toEqual(d.Pinv)
    expect(d.stages[2]).toEqual(m)

    // P 的列是特征向量：A·vᵢ = λᵢ·vᵢ
    const columns = [
      { x: d.P[0], y: d.P[3], z: d.P[6] },
      { x: d.P[1], y: d.P[4], z: d.P[7] },
      { x: d.P[2], y: d.P[5], z: d.P[8] },
    ]
    const lambdas = [d.D[0], d.D[4], d.D[8]]
    columns.forEach((v, i) => {
      const mv = mat3Vec3(m, v)
      expect(mv.x).toBeCloseTo(lambdas[i] * v.x, 8)
      expect(mv.y).toBeCloseTo(lambdas[i] * v.y, 8)
      expect(mv.z).toBeCloseTo(lambdas[i] * v.z, 8)
    })

    // A = P·D·P⁻¹
    expectCloseToMat(mat3Mult(mat3Mult(d.P, d.D), d.Pinv), m)
    // P·P⁻¹ = I
    const identity = mat3(1, 0, 0, 0, 1, 0, 0, 0, 1)
    expectCloseToMat(mat3Mult(d.P, d.Pinv), identity)
  })

  it('对角矩阵：P = I，D = A', () => {
    const m = mat3(3, 0, 0, 0, 2, 0, 0, 0, 1)
    const d = diagonalize3(m)
    if (!d.ok) throw new Error('应当可对角化')
    expectCloseToMat(mat3Mult(mat3Mult(d.P, d.D), d.Pinv), m)
    expect(d.D[0]).toBeCloseTo(3)
    expect(d.D[4]).toBeCloseTo(2)
    expect(d.D[8]).toBeCloseTo(1)
  })

  it('二重根但特征空间是 2 维平面：仍可对角化', () => {
    const m = mat3(2, 0, 0, 0, 2, 0, 0, 0, 3)
    const d = diagonalize3(m)
    if (!d.ok) throw new Error(`应当可对角化：${d.reason}`)
    expectCloseToMat(mat3Mult(mat3Mult(d.P, d.D), d.Pinv), m)
    // 对角线上出现 3 与两个 2
    const diag = [d.D[0], d.D[4], d.D[8]].sort((a, b) => a - b)
    expect(diag[0]).toBeCloseTo(2)
    expect(diag[1]).toBeCloseTo(2)
    expect(diag[2]).toBeCloseTo(3)
  })

  it('λI：P 可取单位矩阵', () => {
    const d = diagonalize3(mat3(5, 0, 0, 0, 5, 0, 0, 0, 5))
    if (!d.ok) throw new Error('应当可对角化')
    expect(d.D[0]).toBeCloseTo(5)
    expect(d.D[4]).toBeCloseTo(5)
    expect(d.D[8]).toBeCloseTo(5)
    expectCloseToMat(mat3Mult(mat3Mult(d.P, d.D), d.Pinv), mat3(5, 0, 0, 0, 5, 0, 0, 0, 5))
  })

  it('剪切矩阵（二重根但只有一个特征方向）：不可对角化', () => {
    const d = diagonalize3(mat3(1, 1, 0, 0, 1, 0, 0, 0, 2))
    expect(d.ok).toBe(false)
    if (!d.ok) expect(d.reason).toContain('不可对角化')
  })

  it('含复特征值（旋转）：不可对角化', () => {
    const d = diagonalize3(mat3(0, -1, 0, 1, 0, 0, 0, 0, 1))
    expect(d.ok).toBe(false)
    if (!d.ok) expect(d.reason).toContain('复数')
  })

  it('非对称但可对角化的矩阵', () => {
    const m = mat3(3, 1, 0, 0, 2, 1, 0, 0, 1)
    const d = diagonalize3(m)
    if (!d.ok) throw new Error(`应当可对角化：${d.reason}`)
    expectCloseToMat(mat3Mult(mat3Mult(d.P, d.D), d.Pinv), m)
  })
})
