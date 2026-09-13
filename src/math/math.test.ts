import { describe, expect, it } from 'vitest'
import type { Mat3 } from './mat'
import { isFiniteVec2, isFiniteVec3, vec2, vec3 } from './vec'
import {
  isFiniteMat2,
  isFiniteMat3,
  mat2,
  mat2Det,
  mat2Identity,
  mat2Inverse,
  mat2Invertible,
  mat2Mult,
  mat2Transpose,
  mat2Vec2,
  mat2Zero,
  mat3,
  mat3Det,
  mat3Identity,
  mat3Inverse,
  mat3Invertible,
  mat3Mult,
  mat3Transpose,
  mat3Vec3,
} from './mat'

describe('二维矩阵乘向量', () => {
  it('单位矩阵保持向量不变', () => {
    expect(mat2Vec2(mat2Identity(), vec2(2, 3))).toEqual(vec2(2, 3))
  })

  it('缩放矩阵逐分量缩放', () => {
    expect(mat2Vec2(mat2(2, 0, 0, 3), vec2(1, 1))).toEqual(vec2(2, 3))
  })

  it('90 度旋转矩阵把 e1 转到 e2', () => {
    expect(mat2Vec2(mat2(0, -1, 1, 0), vec2(1, 0))).toEqual(vec2(0, 1))
  })

  it('零矩阵把任意向量映到原点', () => {
    expect(mat2Vec2(mat2Zero(), vec2(7, -2))).toEqual(vec2(0, 0))
  })
})

describe('三维矩阵乘向量', () => {
  it('单位矩阵保持向量不变', () => {
    expect(mat3Vec3(mat3Identity(), vec3(1, 2, 3))).toEqual(vec3(1, 2, 3))
  })

  it('缩放矩阵逐分量缩放', () => {
    expect(mat3Vec3(mat3(2, 0, 0, 0, 3, 0, 0, 0, 4), vec3(1, 1, 1))).toEqual(vec3(2, 3, 4))
  })

  it('绕 z 轴旋转 90 度把 e1 转到 e2', () => {
    expect(mat3Vec3(mat3(0, -1, 0, 1, 0, 0, 0, 0, 1), vec3(1, 0, 0))).toEqual(vec3(0, 1, 0))
  })
})

describe('矩阵乘法', () => {
  // 矩阵乘法可能产生 -0（如 0*0 + (-1)*1），数学上等于 0，
  // 但 JS 深比较区分 -0 与 +0，比较前先归一化。
  const norm = (m: readonly number[]) => m.map((n) => n + 0)

  it('二维：两次 90 度旋转合成 180 度旋转', () => {
    const rot90 = mat2(0, -1, 1, 0)
    const rot180 = mat2Mult(rot90, rot90)
    expect(norm(rot180)).toEqual(mat2(-1, 0, 0, -1))
  })

  it('二维：单位矩阵是乘法幺元', () => {
    const m = mat2(1, 2, 3, 4)
    expect(mat2Mult(mat2Identity(), m)).toEqual(m)
    expect(mat2Mult(m, mat2Identity())).toEqual(m)
  })

  it('三维：对角缩放矩阵相乘等于分量乘积', () => {
    const a = mat3(2, 0, 0, 0, 3, 0, 0, 0, 4)
    const b = mat3(5, 0, 0, 0, 6, 0, 0, 0, 7)
    expect(mat3Mult(a, b)).toEqual(mat3(10, 0, 0, 0, 18, 0, 0, 0, 28))
  })

  it('三维：单位矩阵是乘法幺元', () => {
    const m = mat3(1, 2, 3, 4, 5, 6, 7, 8, 9)
    expect(mat3Mult(mat3Identity(), m)).toEqual(m)
    expect(mat3Mult(m, mat3Identity())).toEqual(m)
  })
})

describe('行列式与可逆性', () => {
  it('二维单位矩阵行列式为 1', () => {
    expect(mat2Det(mat2Identity())).toBe(1)
  })

  it('二维缩放矩阵行列式为缩放因子之积', () => {
    expect(mat2Det(mat2(2, 0, 0, 3))).toBe(6)
  })

  it('二维交换两列的矩阵行列式为 -1', () => {
    expect(mat2Det(mat2(0, 1, 1, 0))).toBe(-1)
  })

  it('二维零矩阵行列式为 0 且不可逆', () => {
    expect(mat2Det(mat2Zero())).toBe(0)
    expect(mat2Invertible(mat2Zero())).toBe(false)
  })

  it('二维非奇异矩阵可逆', () => {
    expect(mat2Invertible(mat2(1, 2, 3, 4))).toBe(true)
  })

  it('三维单位矩阵行列式为 1', () => {
    expect(mat3Det(mat3Identity())).toBe(1)
  })

  it('三维对角矩阵行列式为对角元之积', () => {
    expect(mat3Det(mat3(2, 0, 0, 0, 3, 0, 0, 0, 4))).toBe(24)
  })

  it('三维秩亏矩阵行列式为 0 且不可逆', () => {
    const m = mat3(1, 2, 3, 4, 5, 6, 7, 8, 9)
    expect(mat3Det(m)).toBe(0)
    expect(mat3Invertible(m)).toBe(false)
  })

  it('三维非奇异矩阵可逆', () => {
    expect(mat3Invertible(mat3(1, 0, 0, 0, 2, 0, 0, 0, 3))).toBe(true)
  })
})

describe('二维矩阵求逆', () => {
  it('旋转矩阵的逆是反向旋转', () => {
    expect(mat2Inverse(mat2(0, -1, 1, 0))).toEqual(mat2(0, 1, -1, 0))
  })

  it('奇异矩阵没有逆', () => {
    expect(mat2Inverse(mat2(1, 1, 1, 1))).toBeNull()
  })

  it('M 乘 M⁻¹ 等于单位矩阵（浮点容差）', () => {
    const m = mat2(2, 1, 1, 3)
    const inv = mat2Inverse(m)
    if (!inv) throw new Error('应当可逆')
    const prod = mat2Mult(m, inv)
    const expected = mat2Identity()
    prod.forEach((n, i) => expect(n).toBeCloseTo(expected[i], 12))
  })
})

describe('三维矩阵求逆', () => {
  // 求逆会产生 -0（如 -0/1），数学上等于 0，比较时按容差判定
  const expectCloseToMat = (a: Mat3, b: Mat3): void => {
    a.forEach((n, i) => expect(n).toBeCloseTo(b[i], 12))
  }

  it('单位矩阵的逆是自身', () => {
    expectCloseToMat(mat3Inverse(mat3Identity())!, mat3Identity())
  })

  it('对角矩阵的逆是对角元取倒数', () => {
    expectCloseToMat(mat3Inverse(mat3(2, 0, 0, 0, 4, 0, 0, 0, 5))!, mat3(0.5, 0, 0, 0, 0.25, 0, 0, 0, 0.2))
  })

  it('M 乘 M⁻¹ 等于单位矩阵（浮点容差）', () => {
    const m = mat3(2, 1, 0, 1, 3, 1, 0, 1, 4)
    const inv = mat3Inverse(m)
    if (!inv) throw new Error('应当可逆')
    expectCloseToMat(mat3Mult(m, inv), mat3Identity())
  })

  it('奇异矩阵没有逆', () => {
    expect(mat3Inverse(mat3(1, 2, 3, 4, 5, 6, 7, 8, 9))).toBeNull()
    expect(mat3Inverse(mat3(0, 0, 0, 0, 0, 0, 0, 0, 0))).toBeNull()
  })

  it('行列式非零但很小的矩阵仍可求逆', () => {
    expect(mat3Inverse(mat3(1, 0, 0, 0, 1, 0, 0, 0, 1e-6))).not.toBeNull()
  })
})

describe('转置', () => {
  it('二维转置交换非对角元', () => {
    expect(mat2Transpose(mat2(1, 2, 3, 4))).toEqual(mat2(1, 3, 2, 4))
  })

  it('三维转置交换非对角元', () => {
    expect(mat3Transpose(mat3(1, 2, 3, 4, 5, 6, 7, 8, 9))).toEqual(
      mat3(1, 4, 7, 2, 5, 8, 3, 6, 9),
    )
  })

  it('单位矩阵转置不变', () => {
    expect(mat2Transpose(mat2Identity())).toEqual(mat2Identity())
    expect(mat3Transpose(mat3Identity())).toEqual(mat3Identity())
  })
})

describe('数值合法性检查', () => {
  it('全部为有限数的矩阵合法', () => {
    expect(isFiniteMat2(mat2(1, -2.5, 0, 1e10))).toBe(true)
    expect(isFiniteMat3(mat3Identity())).toBe(true)
  })

  it('含 NaN 或 Infinity 的矩阵不合法', () => {
    expect(isFiniteMat2(mat2(NaN, 0, 0, 1))).toBe(false)
    expect(isFiniteMat3(mat3(1, 0, 0, 0, 1, 0, 0, 0, Infinity))).toBe(false)
  })

  it('向量合法性检查同理', () => {
    expect(isFiniteVec2(vec2(1, 2))).toBe(true)
    expect(isFiniteVec3(vec3(1, NaN, 3))).toBe(false)
  })
})
