import { fmtExact, fmtNum, niceVector3 } from './format'
import type { Mat3 } from './mat'
import type { Vec3 } from './vec'
import { cross3, norm3, normalize3, vec3 } from './vec'

/** 三次方程的根 */
export type CubicRoots =
  | { kind: 'three-real'; roots: [number, number, number] }
  | { kind: 'one-real'; root: number; re: number; im: number }

/**
 * 解 λ³ + a λ² + b λ + c = 0。
 * 判别式 ≤ 0 时用三角法求三个实根（含重根）；否则用 Cardano 求一个实根与一对共轭复根。
 */
export function solveCubic(a: number, b: number, c: number): CubicRoots {
  // 消去二次项：λ = t − a/3，得 t³ + p t + q = 0
  const p = b - (a * a) / 3
  const q = (2 * a * a * a) / 27 - (a * b) / 3 + c
  const shift = -a / 3
  const disc = (q * q) / 4 + (p * p * p) / 27
  const tol = 1e-12 * Math.max(q * q, Math.abs(p * p * p), 1e-30)

  if (disc <= tol) {
    // 三个实根：t_k = 2r·cos(φ − 2πk/3)
    const r = Math.sqrt(Math.max(-p / 3, 0))
    if (r < 1e-300) {
      // p ≈ 0 且判别式 ≤ 0 ⇒ q ≈ 0：三重根
      return { kind: 'three-real', roots: [shift, shift, shift] }
    }
    const arg = Math.min(1, Math.max(-1, -q / (2 * r * r * r)))
    const phi = Math.acos(arg) / 3
    const roots = [0, 1, 2]
      .map((k) => 2 * r * Math.cos(phi - (2 * Math.PI * k) / 3) + shift)
      .sort((x, y) => y - x) as [number, number, number]
    return { kind: 'three-real', roots }
  }

  // 一个实根：用 uv = −p/3 的关系避免两式相减的抵消
  const sqrtDisc = Math.sqrt(disc)
  const u = Math.cbrt(-q / 2 + sqrtDisc)
  const t = Math.abs(u) > 1e-300 ? u - p / (3 * u) : Math.cbrt(-q)
  const root = t + shift

  // 余下的二次因式 λ² + mλ + n
  const m = a + root
  const n = b + m * root
  const delta = m * m - 4 * n
  return {
    kind: 'one-real',
    root,
    re: -m / 2,
    im: Math.sqrt(Math.max(-delta, 0)) / 2,
  }
}

/** 按重数分组的特征值与对应的不变量信息 */
export interface EigenGroup {
  value: number
  /** 重数（1~3） */
  multiplicity: number
  /** 特征空间维度：1（一条特征线）/ 2（特征平面）/ 3（全空间） */
  dim: number
  /** dim === 1 时的单位特征方向 */
  vector: Vec3 | null
}

export type Eigen3D =
  | { kind: 'real'; groups: EigenGroup[] }
  | {
      kind: 'complex'
      /** 唯一的实特征值 */
      value: number
      dim: number
      vector: Vec3 | null
      /** 共轭复根的实部与虚部 */
      re: number
      im: number
    }

/** 用带主元的高斯消元求行向量组的秩 */
function rankOfRows(rows: Vec3[], tol: number): number {
  const a = rows.map((r) => [r.x, r.y, r.z])
  let rank = 0
  for (let col = 0; col < 3 && rank < 3; col++) {
    let pivot = rank
    for (let r = rank; r < 3; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r
    }
    if (Math.abs(a[pivot][col]) <= tol) continue
    const tmp = a[rank]
    a[rank] = a[pivot]
    a[pivot] = tmp
    for (let r = rank + 1; r < 3; r++) {
      const factor = a[r][col] / a[rank][col]
      if (factor === 0) continue
      for (let c = col; c < 3; c++) a[r][c] -= factor * a[rank][c]
    }
    rank++
  }
  return rank
}

/** 求 A − λI 的零空间：维度，以及维度为 1 时的单位方向向量 */
function eigenspace(m: Mat3, lambda: number): { dim: number; vector: Vec3 | null } {
  const rows = [
    vec3(m[0] - lambda, m[1], m[2]),
    vec3(m[3], m[4] - lambda, m[5]),
    vec3(m[6], m[7], m[8] - lambda),
  ]
  const entryScale = Math.max(
    Math.abs(m[0]),
    Math.abs(m[1]),
    Math.abs(m[2]),
    Math.abs(m[3]),
    Math.abs(m[4]),
    Math.abs(m[5]),
    Math.abs(m[6]),
    Math.abs(m[7]),
    Math.abs(m[8]),
    Math.abs(lambda),
    1,
  )
  const tol = entryScale * 1e-9
  const rank = rankOfRows(rows, tol)
  const dim = 3 - rank
  if (dim !== 1) return { dim, vector: null }

  // 秩为 2：零空间方向 = 两个线性无关行的叉积（取模长最大的那对）
  let best = vec3(0, 0, 0)
  let bestLen = 0
  const pairs: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 2],
  ]
  for (const [i, j] of pairs) {
    const c = cross3(rows[i], rows[j])
    const len = norm3(c)
    if (len > bestLen) {
      best = c
      bestLen = len
    }
  }
  return { dim, vector: bestLen > 0 ? normalize3(best) : null }
}

/**
 * 特征空间的单位正交基（dim 为 1~3，返回 dim 个向量）。
 * dim = 1 时用两行叉积取方向；dim = 2 时取行空间正交补平面的一组基；dim = 3 时取标准基。
 */
export function eigenspaceBasis(m: Mat3, lambda: number, dim: number): Vec3[] {
  if (dim <= 0) return []
  const rows = [
    vec3(m[0] - lambda, m[1], m[2]),
    vec3(m[3], m[4] - lambda, m[5]),
    vec3(m[6], m[7], m[8] - lambda),
  ]

  if (dim >= 3) return [vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1)]

  if (dim === 2) {
    // 零空间 = 行空间的正交补；行空间此时是一维的，取模长最大的行作法向
    let normal = rows[0]
    let bestLen = norm3(normal)
    for (const r of rows) {
      const len = norm3(r)
      if (len > bestLen) {
        normal = r
        bestLen = len
      }
    }
    const n = normalize3(normal)
    if (norm3(n) === 0) return []
    const helper = Math.abs(n.x) < 0.9 ? vec3(1, 0, 0) : vec3(0, 1, 0)
    const u = normalize3(cross3(n, helper))
    const v = cross3(n, u)
    return norm3(u) > 0 ? [u, v] : []
  }

  // dim === 1：零空间方向 = 两个线性无关行的叉积（取模长最大的那对）
  let best = vec3(0, 0, 0)
  let bestLen = 0
  const pairs: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 2],
  ]
  for (const [i, j] of pairs) {
    const c = cross3(rows[i], rows[j])
    const len = norm3(c)
    if (len > bestLen) {
      best = c
      bestLen = len
    }
  }
  return bestLen > 0 ? [normalize3(best)] : []
}

/** 把数值上相等的根合并成一组（重根在浮点下会略有偏差） */
function groupRoots(m: Mat3, roots: [number, number, number]): EigenGroup[] {
  const tol = Math.max(Math.abs(roots[0]), Math.abs(roots[1]), Math.abs(roots[2]), 1) * 1e-6
  const buckets: number[][] = []
  for (const value of roots) {
    const bucket = buckets.find((b) => Math.abs(b[0] - value) <= tol)
    if (bucket) bucket.push(value)
    else buckets.push([value])
  }
  return buckets.map((bucket) => {
    const value = bucket.reduce((sum, v) => sum + v, 0) / bucket.length
    const space = eigenspace(m, value)
    return { value, multiplicity: bucket.length, dim: space.dim, vector: space.vector }
  })
}

/** 计算 3×3 实矩阵的特征值与特征向量（按重数分组，覆盖重根与复根情形） */
export function eigen3D(m: Mat3): Eigen3D {
  const tr = m[0] + m[4] + m[8]
  const c2 =
    (m[0] * m[4] - m[1] * m[3]) + (m[0] * m[8] - m[2] * m[6]) + (m[4] * m[8] - m[5] * m[7])
  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])

  const roots = solveCubic(-tr, c2, -det)
  if (roots.kind === 'one-real') {
    const space = eigenspace(m, roots.root)
    return {
      kind: 'complex',
      value: roots.root,
      dim: space.dim,
      vector: space.vector,
      re: roots.re,
      im: roots.im,
    }
  }
  return { kind: 'real', groups: groupRoots(m, roots.roots) }
}

/** 可以画成特征方向线的实特征方向（仅特征空间恰好 1 维的那些） */
export function eigen3DLines(e: Eigen3D): Array<{ value: number; vector: Vec3 }> {
  if (e.kind === 'complex') {
    return e.dim === 1 && e.vector ? [{ value: e.value, vector: e.vector }] : []
  }
  return e.groups
    .filter((g) => g.dim === 1 && g.vector !== null)
    .map((g) => ({ value: g.value, vector: g.vector as Vec3 }))
}

const SUBS = ['₁', '₂', '₃']

/** 三维特征向量的显示文本（优先小整数分量） */
function vec3Str(v: Vec3): string {
  const nice = niceVector3(v)
  if (nice) return `(${nice[0]}, ${nice[1]}, ${nice[2]})`
  return `(${fmtNum(v.x)}, ${fmtNum(v.y)}, ${fmtNum(v.z)})`
}

/** 特征信息的文本行（用于面板显示） */
export function describeEigen3(e: Eigen3D): string[] {
  if (e.kind === 'complex') {
    const vTxt = e.dim === 1 && e.vector ? vec3Str(e.vector) : '—'
    const reTxt = Math.abs(e.re) < 1e-12 ? '' : `${fmtExact(e.re)} `
    const imTxt = Math.abs(e.im - 1) < 1e-12 ? 'i' : `${fmtExact(e.im)}i`
    return [
      `λ₁ = ${fmtExact(e.value)}（实），v₁ = ${vTxt}`,
      `λ₂,₃ = ${reTxt}± ${imTxt}（复）`,
      '复特征值对应旋转，没有对应的实特征向量',
    ]
  }

  const lines: string[] = []
  let index = 0
  for (const g of e.groups) {
    // 单重根编号（λ₁/λ₂/λ₃），重根只标注重数
    const head =
      g.multiplicity === 1
        ? `λ${SUBS[index]} = ${fmtExact(g.value)}`
        : `λ = ${fmtExact(g.value)}（${g.multiplicity === 2 ? '二' : '三'}重）`
    if (g.dim === 1 && g.vector) {
      lines.push(`${head}，v = ${vec3Str(g.vector)}`)
    } else if (g.dim === 2) {
      lines.push(`${head}，特征空间是 2 维平面`)
    } else if (g.dim === 3) {
      lines.push(`${head}，任意非零向量都是特征向量`)
    } else {
      lines.push(head)
    }
    index += g.multiplicity
  }
  return lines
}
