import { describe, expect, it } from 'vitest'
import { vec2 } from './vec'
import { fmtExact, fmtNum, niceVector, toFraction } from './format'

describe('toFraction', () => {
  it('常见分数', () => {
    expect(toFraction(0.5)).toEqual([1, 2])
    expect(toFraction(2.5)).toEqual([5, 2])
    expect(toFraction(1 / 3)).toEqual([1, 3])
    expect(toFraction(-0.5)).toEqual([-1, 2])
  })

  it('浮点噪声不干扰（0.1 → 1/10）', () => {
    expect(toFraction(0.1)).toEqual([1, 10])
    expect(toFraction(0.2)).toEqual([1, 5])
  })

  it('无理数返回 null', () => {
    expect(toFraction(Math.sqrt(2))).toBeNull()
    expect(toFraction(Math.PI)).toBeNull()
  })
})

describe('fmtExact', () => {
  it('整数显示整数', () => {
    expect(fmtExact(3)).toBe('3')
    expect(fmtExact(-2)).toBe('-2')
    expect(fmtExact(2.9999999999999996)).toBe('3') // 浮点噪声
  })

  it('有理数显示最简分数', () => {
    expect(fmtExact(2.5)).toBe('5/2')
    expect(fmtExact(0.5)).toBe('1/2')
    expect(fmtExact(-0.25)).toBe('-1/4')
  })

  it('无理数退回小数', () => {
    expect(fmtExact(Math.sqrt(2))).toBe('1.414')
  })
})

describe('fmtNum', () => {
  it('保留至多 3 位小数', () => {
    expect(fmtNum(1.23456)).toBe('1.235')
    expect(fmtNum(2)).toBe('2')
    expect(fmtNum(-0)).toBe('0')
  })
})

describe('niceVector', () => {
  it('小整数方向', () => {
    expect(niceVector(vec2(0.7071067811865476, 0.7071067811865476))).toEqual([1, 1])
    expect(niceVector(vec2(0.6, 0.8))).toEqual([3, 4])
    expect(niceVector(vec2(0.4472135954999579, 0.8944271909999159))).toEqual([1, 2])
    expect(niceVector(vec2(0.7071067811865476, -0.7071067811865476))).toEqual([1, -1])
  })

  it('坐标轴方向', () => {
    expect(niceVector(vec2(1, 0))).toEqual([1, 0])
    expect(niceVector(vec2(0, 1))).toEqual([0, 1])
  })

  it('无理数方向返回 null', () => {
    expect(niceVector(vec2(Math.cos(1), Math.sin(1)))).toBeNull()
  })
})
