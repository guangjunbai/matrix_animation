import { fmtExact, fmtNum, niceVector } from './format'
import type { Mat2 } from './mat'
import type { Vec2 } from './vec'
import { vec2 } from './vec'

/**
 * 2×2 矩阵的特征分解结果，覆盖四种情形：
 * - two-real：两个实特征值与两个线性无关的特征向量
 * - single：二重实特征值但只有一个特征方向（不可对角化，如剪切/Jordan 块）
 * - scaled-identity：M = λI，任意非零向量都是特征向量
 * - complex：共轭复特征值（对应旋转/螺旋），无实特征向量
 */
export type Eigen2D =
  | { kind: 'two-real'; values: [number, number]; vectors: [Vec2, Vec2] }
  | { kind: 'single'; value: number; vector: Vec2 }
  | { kind: 'scaled-identity'; value: number }
  | { kind: 'complex'; re: number; im: number }

const EPS = 1e-9

/** 求 (M - λI)v = 0 的单位特征向量；比较两行候选，取模长较大者保证数值稳定 */
function eigenvectorFor(m: Mat2, lambda: number): Vec2 {
  const [a, b, c, d] = m
  // 行 1：(a-λ)x + b·y = 0 → 候选 (b, λ-a)；行 2：c·x + (d-λ)y = 0 → 候选 (λ-d, c)
  const r1 = vec2(b, lambda - a)
  const r2 = vec2(lambda - d, c)
  let v = Math.hypot(r1.x, r1.y) >= Math.hypot(r2.x, r2.y) ? r1 : r2
  const len = Math.hypot(v.x, v.y)
  if (len < 1e-12) {
    // 两行都退化意味着 M=λI，由 scaled-identity 分支处理，这里只是兜底
    v = vec2(1, 0)
  } else {
    v = vec2(v.x / len, v.y / len)
  }
  // 定向：让第一个非零分量为正，保证显示方向一致
  if (v.x < -1e-12 || (Math.abs(v.x) <= 1e-12 && v.y < 0)) {
    v = vec2(-v.x, -v.y)
  }
  return v
}

/**
 * 定向特征向量对：每个向量已按"首非零分量为正"定向，
 * 再按需交换次序，保证 det(v₁, v₂) > 0（右手系）。
 * 这样由特征向量排成的 P 是旋转而非反射，且 P 的列与面板显示完全一致。
 */
function orientedPair(
  m: Mat2,
  l1: number,
  l2: number,
): { values: [number, number]; vectors: [Vec2, Vec2] } {
  const v1 = eigenvectorFor(m, l1)
  const v2 = eigenvectorFor(m, l2)
  if (v1.x * v2.y - v1.y * v2.x >= 0) return { values: [l1, l2], vectors: [v1, v2] }
  return { values: [l2, l1], vectors: [v2, v1] }
}

/** 计算 2×2 矩阵的特征值与特征向量（按判别式分类，带容差） */
export function eigen2D(m: Mat2): Eigen2D {
  const [a, b, c, d] = m
  const tr = a + d
  const det = a * d - b * c
  const disc = tr * tr - 4 * det
  const scale = Math.max(tr * tr, Math.abs(4 * det), 1e-12)

  if (disc > scale * EPS) {
    // 两个实特征值（次序经定向，保证 det(v₁, v₂) > 0）
    const s = Math.sqrt(disc)
    const { values, vectors } = orientedPair(m, (tr + s) / 2, (tr - s) / 2)
    return { kind: 'two-real', values, vectors }
  }
  if (disc < -scale * EPS) {
    // 共轭复特征值（对应旋转/螺旋），无实特征向量
    return { kind: 'complex', re: tr / 2, im: Math.sqrt(-disc) / 2 }
  }
  // 二重实根：区分 λI 与只有一个特征方向两种情形
  const lambda = tr / 2
  const entryScale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d), 1)
  const isScaledIdentity =
    Math.abs(b) + Math.abs(c) <= entryScale * 1e-9 && Math.abs(a - d) <= entryScale * 1e-9
  if (isScaledIdentity) {
    return { kind: 'scaled-identity', value: lambda }
  }
  return { kind: 'single', value: lambda, vector: eigenvectorFor(m, lambda) }
}

/** 特征向量显示：优先小整数分量（如 (1,1)），否则 3 位小数 */
function vecStr(v: Vec2): string {
  const nice = niceVector(v)
  if (nice) return `(${nice[0]}, ${nice[1]})`
  return `(${fmtNum(v.x)}, ${fmtNum(v.y)})`
}

/** 特征信息的文本行（用于面板显示） */
export function describeEigen(e: Eigen2D): string[] {
  switch (e.kind) {
    case 'two-real':
      return [
        `λ₁ = ${fmtExact(e.values[0])}，v₁ = ${vecStr(e.vectors[0])}`,
        `λ₂ = ${fmtExact(e.values[1])}，v₂ = ${vecStr(e.vectors[1])}`,
      ]
    case 'single':
      return [
        `λ = ${fmtExact(e.value)}（二重），v = ${vecStr(e.vector)}`,
        '只有一个特征方向（不可对角化）',
      ]
    case 'scaled-identity':
      return [`λ = ${fmtExact(e.value)}（二重）`, '任意非零向量都是特征向量']
    case 'complex': {
      const reTxt = Math.abs(e.re) < 1e-12 ? '' : `${fmtExact(e.re)} ± `
      const imTxt = Math.abs(e.im - 1) < 1e-12 ? 'i' : `${fmtExact(e.im)}i`
      return [`特征值为复数：λ = ${reTxt}±${imTxt}`, '对应旋转/螺旋，无实特征向量']
    }
  }
}
