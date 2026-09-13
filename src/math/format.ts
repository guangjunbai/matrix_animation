import type { Vec2, Vec3 } from './vec'

/** 数值格式化：保留至多 3 位小数（兜底显示用） */
export const fmtNum = (n: number): string => String(Math.round(n * 1000) / 1000)

/**
 * 连分数法把浮点数转成最简分数 [分子, 分母]：
 * 误差 < 1e-9 且分母 ≤ maxDen 时返回，否则 null（如 √2 之类无理数）。
 */
export function toFraction(x: number, maxDen = 99): [number, number] | null {
  if (!Number.isFinite(x)) return null
  const sign = x < 0 ? -1 : 1
  x = Math.abs(x)
  let h0 = 0
  let h1 = 1
  let k0 = 1
  let k1 = 0
  let b = x
  for (;;) {
    const a = Math.floor(b)
    const h2 = a * h1 + h0
    const k2 = a * k1 + k0
    if (Math.abs(h2 / k2 - x) < 1e-9) return [sign * h2, k2]
    const rem = b - a
    if (rem < 1e-15) return null
    b = 1 / rem
    h0 = h1
    h1 = h2
    k0 = k1
    k1 = k2
    if (k1 > maxDen) {
      // 分母超限：检查当前候选是否足够接近
      return Math.abs(h1 / k1 - x) < 1e-9 ? [sign * h1, k1] : null
    }
  }
}

/**
 * 数值的"漂亮"显示：整数 → "3"，简单分数 → "5/2"，否则 3 位小数。
 * 用于特征值等希望精确读数的场景。
 */
export function fmtExact(x: number): string {
  if (!Number.isFinite(x)) return String(x)
  const r = Math.round(x)
  if (Math.abs(x - r) < 1e-9) return String(r)
  const f = toFraction(x)
  if (f) return f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`
  return fmtNum(x)
}

/**
 * 把单位特征向量缩放到"漂亮"表示：优先小整数分量（如 (1,1)、(3,4)、(1,2)），
 * 找不到整数倍表示（无理数方向）时返回 null。
 */
export function niceVector(v: Vec2): [number, number] | null {
  const m = Math.max(Math.abs(v.x), Math.abs(v.y))
  if (m < 1e-12) return null
  const sx = v.x / m
  const sy = v.y / m
  for (let k = 1; k <= 12; k++) {
    const px = sx * k
    const py = sy * k
    if (Math.abs(px - Math.round(px)) < 1e-6 && Math.abs(py - Math.round(py)) < 1e-6) {
      return [Math.round(px), Math.round(py)]
    }
  }
  return null
}

/** 三维版本：把单位向量缩放到小整数分量表示，找不到则返回 null */
export function niceVector3(v: Vec3): [number, number, number] | null {
  const m = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z))
  if (m < 1e-12) return null
  const s = [v.x / m, v.y / m, v.z / m]
  for (let k = 1; k <= 12; k++) {
    const p = s.map((n) => n * k)
    if (p.every((n) => Math.abs(n - Math.round(n)) < 1e-6)) {
      return [Math.round(p[0]), Math.round(p[1]), Math.round(p[2])]
    }
  }
  return null
}
