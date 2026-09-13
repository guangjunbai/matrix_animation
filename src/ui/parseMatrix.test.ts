import { describe, expect, it } from 'vitest'
import { mat2, mat3 } from '../math/mat'
import { vec2, vec3 } from '../math/vec'
import { parseMat2Input, parseMat3Input, parseVec2Input, parseVec3Input } from './parseMatrix'

describe('parseMat2Input', () => {
  it('解析合法的 4 个数字', () => {
    expect(parseMat2Input(['1', '2', '3', '4'])).toEqual({ ok: true, mat: mat2(1, 2, 3, 4) })
  })

  it('支持小数、负数与科学计数法', () => {
    const r = parseMat2Input(['-0.5', '2', '0', '1e2'])
    if (!r.ok) throw new Error('应当解析成功')
    expect(r.mat).toEqual(mat2(-0.5, 2, 0, 100))
  })

  it('空元素报错并给出位置', () => {
    expect(parseMat2Input(['1', '2', '', '4'])).toEqual({
      ok: false,
      error: '第 3 个元素不能为空',
      index: 2,
    })
  })

  it('非数字报错并给出位置', () => {
    expect(parseMat2Input(['a', '2', '3', '4'])).toEqual({
      ok: false,
      error: '“a”不是有效数字',
      index: 0,
    })
  })

  it('超出范围的数（Infinity）报错', () => {
    expect(parseMat2Input(['1e999', '2', '3', '4'])).toEqual({
      ok: false,
      error: '“1e999”不是有效数字',
      index: 0,
    })
  })

  it('元素个数不对报错', () => {
    expect(parseMat2Input(['1', '2']).ok).toBe(false)
  })

  it('忽略首尾空白', () => {
    const r = parseMat2Input([' 1 ', ' 2', '3 ', '4'])
    if (!r.ok) throw new Error('应当解析成功')
    expect(r.mat).toEqual(mat2(1, 2, 3, 4))
  })
})

describe('parseMat3Input', () => {
  it('解析合法的 9 个数字（行优先）', () => {
    const r = parseMat3Input(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
    expect(r).toEqual({ ok: true, mat: mat3(1, 2, 3, 4, 5, 6, 7, 8, 9) })
  })

  it('支持负数与小数', () => {
    const r = parseMat3Input(['-1', '0', '0.5', '0', '1', '0', '0', '0', '1'])
    if (!r.ok) throw new Error('应当解析成功')
    expect(r.mat).toEqual(mat3(-1, 0, 0.5, 0, 1, 0, 0, 0, 1))
  })

  it('空元素报错并给出位置', () => {
    const r = parseMat3Input(['1', '2', '3', '4', '5', '6', '7', '', '9'])
    expect(r).toEqual({ ok: false, error: '第 8 个元素不能为空', index: 7 })
  })

  it('非数字报错并给出位置', () => {
    const r = parseMat3Input(['1', 'x', '3', '4', '5', '6', '7', '8', '9'])
    expect(r).toEqual({ ok: false, error: '“x”不是有效数字', index: 1 })
  })

  it('元素个数不对报错', () => {
    expect(parseMat3Input(['1', '2', '3']).ok).toBe(false)
  })
})

describe('parseVec2Input / parseVec3Input', () => {
  it('解析二维向量', () => {
    expect(parseVec2Input(['2', '1'])).toEqual({ ok: true, vec: vec2(2, 1) })
    expect(parseVec2Input(['-1.5', '0'])).toEqual({ ok: true, vec: vec2(-1.5, 0) })
  })

  it('解析三维向量', () => {
    expect(parseVec3Input(['1', '-2', '3'])).toEqual({ ok: true, vec: vec3(1, -2, 3) })
  })

  it('空值与非法值报错并给出位置', () => {
    expect(parseVec2Input(['1', ''])).toEqual({
      ok: false,
      error: '第 2 个元素不能为空',
      index: 1,
    })
    expect(parseVec3Input(['1', 'a', '3'])).toEqual({
      ok: false,
      error: '“a”不是有效数字',
      index: 1,
    })
  })

  it('分量个数不对报错', () => {
    expect(parseVec2Input(['1', '2', '3']).ok).toBe(false)
    expect(parseVec3Input(['1', '2']).ok).toBe(false)
  })
})
