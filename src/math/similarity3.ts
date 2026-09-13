import { eigen3D, eigenspaceBasis } from './eigen3'
import type { Mat3 } from './mat'
import { mat3, mat3Inverse, mat3Mult } from './mat'
import type { Vec3 } from './vec'

export type Diagonalization3 =
  | { ok: true; P: Mat3; D: Mat3; Pinv: Mat3; stages: Mat3[] }
  | { ok: false; reason: string }

/**
 * 若 A 有 3 个线性无关的实特征向量，构造 A = P·D·P⁻¹：
 * - P 的列是特征向量（与面板显示的特征向量完全一致）
 * - D = diag(λ₁, λ₂, λ₃)
 * - stages 为三步动画的累计矩阵 [P⁻¹, D·P⁻¹, A]
 *
 * 不可对角化的情形：特征值含复数，或某个重特征值的特征空间维数不足。
 */
export function diagonalize3(m: Mat3): Diagonalization3 {
  const e = eigen3D(m)
  if (e.kind === 'complex') {
    return { ok: false, reason: '特征值含复数，无法在实数域对角化' }
  }

  const columns: Vec3[] = []
  const values: number[] = []
  for (const g of e.groups) {
    const basis = eigenspaceBasis(m, g.value, g.dim)
    if (basis.length < g.multiplicity) {
      return {
        ok: false,
        reason: `特征值 ${g.value} 是 ${g.multiplicity} 重根，但特征空间只有 ${g.dim} 维，不可对角化`,
      }
    }
    for (let k = 0; k < g.multiplicity; k++) {
      columns.push(basis[k])
      values.push(g.value)
    }
  }
  if (columns.length !== 3) {
    return { ok: false, reason: '找不到 3 个线性无关的特征向量，不可对角化' }
  }

  const [v1, v2, v3] = columns
  const P = mat3(v1.x, v2.x, v3.x, v1.y, v2.y, v3.y, v1.z, v2.z, v3.z)
  const D = mat3(values[0], 0, 0, 0, values[1], 0, 0, 0, values[2])
  const Pinv = mat3Inverse(P)
  if (!Pinv) return { ok: false, reason: '特征向量线性相关，不可对角化' }
  return { ok: true, P, D, Pinv, stages: [Pinv, mat3Mult(D, Pinv), m] }
}
