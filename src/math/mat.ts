import type { Vec2, Vec3 } from './vec'

/**
 * 二维矩阵（2x2，行优先存储）。
 * [a, b, c, d] 表示 [[a, b], [c, d]]
 */
export type Mat2 = [number, number, number, number]

/**
 * 三维矩阵（3x3，行优先存储）。
 * [a, b, c, d, e, f, g, h, i] 表示
 * [[a, b, c],
 *  [d, e, f],
 *  [g, h, i]]
 */
export type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export const mat2 = (a: number, b: number, c: number, d: number): Mat2 => [a, b, c, d]

export const mat3 = (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
): Mat3 => [a, b, c, d, e, f, g, h, i]

/** 二维单位矩阵 */
export const mat2Identity = (): Mat2 => [1, 0, 0, 1]

/** 三维单位矩阵 */
export const mat3Identity = (): Mat3 => [1, 0, 0, 0, 1, 0, 0, 0, 1]

/** 二维零矩阵 */
export const mat2Zero = (): Mat2 => [0, 0, 0, 0]

/** 三维零矩阵 */
export const mat3Zero = (): Mat3 => [0, 0, 0, 0, 0, 0, 0, 0, 0]

/** 二维矩阵乘二维向量 */
export function mat2Vec2(m: Mat2, v: Vec2): Vec2 {
  const [a, b, c, d] = m
  return { x: a * v.x + b * v.y, y: c * v.x + d * v.y }
}

/** 三维矩阵乘三维向量 */
export function mat3Vec3(m: Mat3, v: Vec3): Vec3 {
  const [a, b, c, d, e, f, g, h, i] = m
  return {
    x: a * v.x + b * v.y + c * v.z,
    y: d * v.x + e * v.y + f * v.z,
    z: g * v.x + h * v.y + i * v.z,
  }
}

/** 二维矩阵乘二维矩阵：a * b（先施加 b，再施加 a） */
export function mat2Mult(a: Mat2, b: Mat2): Mat2 {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ]
}

/** 三维矩阵乘三维矩阵：a * b（先施加 b，再施加 a） */
export function mat3Mult(a: Mat3, b: Mat3): Mat3 {
  const r: Mat3 = mat3Zero()
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let sum = 0
      for (let k = 0; k < 3; k++) {
        sum += a[row * 3 + k] * b[k * 3 + col]
      }
      r[row * 3 + col] = sum
    }
  }
  return r
}

/** 二维行列式 */
export function mat2Det(m: Mat2): number {
  return m[0] * m[3] - m[1] * m[2]
}

/** 三维行列式（按第一行展开） */
export function mat3Det(m: Mat3): number {
  const [a, b, c, d, e, f, g, h, i] = m
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
}

/** 二维矩阵可逆判断（行列式非零） */
export function mat2Invertible(m: Mat2): boolean {
  return mat2Det(m) !== 0
}

/** 三维矩阵的逆（伴随矩阵法）；行列式为 0（不可逆）时返回 null */
export function mat3Inverse(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m
  // 代数余子式
  const c11 = e * i - f * h
  const c12 = -(d * i - f * g)
  const c13 = d * h - e * g
  const c21 = -(b * i - c * h)
  const c22 = a * i - c * g
  const c23 = -(a * h - b * g)
  const c31 = b * f - c * e
  const c32 = -(a * f - c * d)
  const c33 = a * e - b * d
  const det = a * c11 + b * c12 + c * c13
  if (det === 0) return null
  // 逆 = 伴随矩阵（余子式矩阵的转置）/ 行列式
  return [
    c11 / det,
    c21 / det,
    c31 / det,
    c12 / det,
    c22 / det,
    c32 / det,
    c13 / det,
    c23 / det,
    c33 / det,
  ]
}

/** 二维矩阵的逆；行列式为 0（不可逆）时返回 null */
export function mat2Inverse(m: Mat2): Mat2 | null {
  const [a, b, c, d] = m
  const det = a * d - b * c
  if (det === 0) return null
  return [d / det, -b / det, -c / det, a / det]
}

/** 三维矩阵可逆判断（行列式非零） */
export function mat3Invertible(m: Mat3): boolean {
  return mat3Det(m) !== 0
}

/** 二维矩阵转置 */
export function mat2Transpose(m: Mat2): Mat2 {
  return [m[0], m[2], m[1], m[3]]
}

/** 三维矩阵转置 */
export function mat3Transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]
}

/** 二维矩阵数值合法性检查：所有元素必须是有限数 */
export function isFiniteMat2(m: Mat2): boolean {
  return m.every(Number.isFinite)
}

/** 三维矩阵数值合法性检查：所有元素必须是有限数 */
export function isFiniteMat3(m: Mat3): boolean {
  return m.every(Number.isFinite)
}
