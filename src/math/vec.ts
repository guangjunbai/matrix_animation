/** 二维向量 */
export interface Vec2 {
  x: number
  y: number
}

/** 三维向量 */
export interface Vec3 {
  x: number
  y: number
  z: number
}

export const vec2 = (x: number, y: number): Vec2 => ({ x, y })

export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

/** 三维点积 */
export const dot3 = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z

/** 三维叉积 */
export const cross3 = (a: Vec3, b: Vec3): Vec3 =>
  vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x)

/** 三维模长 */
export const norm3 = (v: Vec3): number => Math.sqrt(dot3(v, v))

/** 三维缩放 */
export const scale3 = (v: Vec3, k: number): Vec3 => vec3(v.x * k, v.y * k, v.z * k)

/** 三维单位化；零向量原样返回零向量 */
export function normalize3(v: Vec3): Vec3 {
  const n = norm3(v)
  return n > 1e-12 ? scale3(v, 1 / n) : vec3(0, 0, 0)
}

/** 向量数值合法性检查：所有分量必须是有限数 */
export const isFiniteVec2 = (v: Vec2): boolean =>
  Number.isFinite(v.x) && Number.isFinite(v.y)

export const isFiniteVec3 = (v: Vec3): boolean =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)

/** 三维向量分量格式化（用于面板显示） */
export const fmtVec3 = (v: Vec3, fmt: (n: number) => string): string =>
  `(${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)})`
