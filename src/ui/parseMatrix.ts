import type { Mat2, Mat3 } from '../math/mat'
import type { Vec2, Vec3 } from '../math/vec'
import { vec2, vec3 } from '../math/vec'

export type ParseResult =
  | { ok: true; mat: Mat2 }
  | { ok: false; error: string; index?: number }

export type ParseResult3 =
  | { ok: true; mat: Mat3 }
  | { ok: false; error: string; index?: number }

/** 解析 count 个数字输入，失败时给出错误信息与出错位置 */
function parseNumbers(
  values: readonly string[],
  count: number,
): { ok: true; nums: number[] } | { ok: false; error: string; index?: number } {
  if (values.length !== count) {
    return { ok: false, error: `矩阵需要 ${count} 个元素` }
  }
  const nums: number[] = []
  for (let i = 0; i < values.length; i++) {
    const raw = values[i].trim()
    if (raw === '') {
      return { ok: false, error: `第 ${i + 1} 个元素不能为空`, index: i }
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      return { ok: false, error: `“${raw}”不是有效数字`, index: i }
    }
    nums.push(n)
  }
  return { ok: true, nums }
}

/** 解析 2x2 矩阵输入（行优先的 4 个字符串） */
export function parseMat2Input(values: readonly string[]): ParseResult {
  const r = parseNumbers(values, 4)
  if (!r.ok) return r
  return { ok: true, mat: [r.nums[0], r.nums[1], r.nums[2], r.nums[3]] }
}

export type ParseVecResult =
  | { ok: true; vec: Vec2 }
  | { ok: false; error: string; index?: number }

export type ParseVec3Result =
  | { ok: true; vec: Vec3 }
  | { ok: false; error: string; index?: number }

/** 解析二维向量输入（2 个字符串） */
export function parseVec2Input(values: readonly string[]): ParseVecResult {
  const r = parseNumbers(values, 2)
  if (!r.ok) return r
  return { ok: true, vec: vec2(r.nums[0], r.nums[1]) }
}

/** 解析三维向量输入（3 个字符串） */
export function parseVec3Input(values: readonly string[]): ParseVec3Result {
  const r = parseNumbers(values, 3)
  if (!r.ok) return r
  return { ok: true, vec: vec3(r.nums[0], r.nums[1], r.nums[2]) }
}

/** 解析 3x3 矩阵输入（行优先的 9 个字符串） */
export function parseMat3Input(values: readonly string[]): ParseResult3 {
  const r = parseNumbers(values, 9)
  if (!r.ok) return r
  const n = r.nums
  return {
    ok: true,
    mat: [n[0], n[1], n[2], n[3], n[4], n[5], n[6], n[7], n[8]],
  }
}
