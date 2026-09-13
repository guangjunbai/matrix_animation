import { eigen2D } from './eigen'
import type { Mat2 } from './mat'
import { mat2, mat2Inverse, mat2Mult } from './mat'

export type Diagonalization =
  | { ok: true; P: Mat2; D: Mat2; Pinv: Mat2; stages: Mat2[] }
  | { ok: false; reason: string }

/**
 * 若 A 有两个实特征值（可对角化），构造 A = P·D·P⁻¹：
 * - P 的列是特征向量，D = diag(λ₁, λ₂)
 * - stages 为三步动画的累计矩阵 [P⁻¹, D·P⁻¹, A]，对应列向量 x 的旅程：
 *   ① ×P⁻¹ 换到特征基坐标；② ×D 沿坐标轴拉伸 λ₁、λ₂；③ ×P 回到标准坐标，落地 A
 */
export function diagonalize(m: Mat2): Diagonalization {
  const e = eigen2D(m)
  if (e.kind === 'two-real') {
    // eigen2D 已把特征向量对定向为右手系（det > 0），
    // 因此 P 的列严格等于面板显示的 v₁、v₂，且对称矩阵时 P 是纯旋转。
    const [v1, v2] = e.vectors
    const P = mat2(v1.x, v2.x, v1.y, v2.y)
    const D = mat2(e.values[0], 0, 0, e.values[1])
    const Pinv = mat2Inverse(P)
    if (!Pinv) return { ok: false, reason: '特征向量线性相关，无法对角化' }
    const DPinv = mat2Mult(D, Pinv)
    return { ok: true, P, D, Pinv, stages: [Pinv, DPinv, m] }
  }
  if (e.kind === 'single') return { ok: false, reason: '不可对角化：只有一个特征方向' }
  if (e.kind === 'complex') return { ok: false, reason: '特征值为复数，无法在实数域对角化' }
  return { ok: false, reason: 'A = λI：已在任意基下都是对角形式' }
}
