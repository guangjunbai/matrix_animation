import { describe, expect, it } from 'vitest'
import { cross3, dot3, fmtVec3, norm3, normalize3, scale3, vec3 } from './vec'

describe('三维向量运算', () => {
  it('点积', () => {
    expect(dot3(vec3(1, 2, 3), vec3(4, 5, 6))).toBe(32)
    expect(dot3(vec3(1, 0, 0), vec3(0, 1, 0))).toBe(0)
  })

  it('叉积：右手系', () => {
    expect(cross3(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual(vec3(0, 0, 1))
    expect(cross3(vec3(0, 1, 0), vec3(1, 0, 0))).toEqual(vec3(0, 0, -1))
  })

  it('平行向量的叉积为零向量', () => {
    expect(cross3(vec3(2, 4, 6), vec3(1, 2, 3))).toEqual(vec3(0, 0, 0))
  })

  it('模长', () => {
    expect(norm3(vec3(3, 4, 0))).toBe(5)
    expect(norm3(vec3(0, 0, 0))).toBe(0)
  })

  it('单位化', () => {
    const v = normalize3(vec3(0, 3, 4))
    expect(norm3(v)).toBeCloseTo(1)
    expect(v.x).toBeCloseTo(0)
    expect(v.y).toBeCloseTo(0.6)
    expect(v.z).toBeCloseTo(0.8)
  })

  it('零向量单位化仍是零向量', () => {
    expect(normalize3(vec3(0, 0, 0))).toEqual(vec3(0, 0, 0))
  })

  it('缩放', () => {
    expect(scale3(vec3(1, -2, 3), 2)).toEqual(vec3(2, -4, 6))
  })

  it('分量格式化', () => {
    expect(fmtVec3(vec3(1, -2, 0.5), (n) => String(n))).toBe('(1, -2, 0.5)')
  })
})
