import { describe, expect, it } from 'vitest'
import { compileExpression, tryCompile } from './expr'

const at = (src: string) => (t: number) => compileExpression(src)(t)

describe('表达式求值', () => {
  it('变量与四则运算', () => {
    expect(at('t')(3)).toBe(3)
    expect(at('2*t + 1')(4)).toBe(9)
    expect(at('1+2*3')(0)).toBe(7)
    expect(at('(1+2)*3')(0)).toBe(9)
    expect(at('t/2')(5)).toBe(2.5)
  })

  it('乘方右结合，一元负号比乘方弱', () => {
    expect(at('t^2')(3)).toBe(9)
    expect(at('-t^2')(3)).toBe(-9)
    expect(at('(-2)^2')(0)).toBe(4)
    expect(at('2^-3')(0)).toBe(0.125)
  })

  it('隐式乘法', () => {
    expect(at('2t')(3)).toBe(6)
    expect(at('2sin(t)')(Math.PI / 2)).toBeCloseTo(2)
    expect(at('3pi')(0)).toBeCloseTo(3 * Math.PI)
    expect(at('t sin(t)')(Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(at('(t)cos(t)')(0)).toBe(0)
  })

  it('常量与函数', () => {
    expect(at('pi')(0)).toBeCloseTo(Math.PI)
    expect(at('π')(0)).toBeCloseTo(Math.PI)
    expect(at('2π')(0)).toBeCloseTo(2 * Math.PI)
    expect(at('e')(0)).toBeCloseTo(Math.E)
    expect(at('sin(pi/2)')(0)).toBeCloseTo(1)
    expect(at('cos(0)')(0)).toBeCloseTo(1)
    expect(at('sqrt(9)')(0)).toBe(3)
    expect(at('abs(-3)')(0)).toBe(3)
    expect(at('ln(e)')(0)).toBeCloseTo(1)
    expect(at('log(100)')(0)).toBeCloseTo(2)
    expect(at('exp(0)')(0)).toBe(1)
    expect(at('round(1.6)')(0)).toBe(2)
    expect(at('sign(-5)')(0)).toBe(-1)
    expect(at('floor(2.7)')(0)).toBe(2)
  })

  it('嵌套与复合', () => {
    expect(at('sin(cos(t))')(0)).toBeCloseTo(Math.sin(1))
    expect(at('t^2 + 2*t + 1')(2)).toBe(9)
  })
})

describe('表达式错误', () => {
  it('空串与残缺表达式', () => {
    expect(tryCompile('').ok).toBe(false)
    expect(tryCompile('1+').ok).toBe(false)
    expect(tryCompile('t +').ok).toBe(false)
    expect(tryCompile('(t').ok).toBe(false)
    expect(tryCompile('sin(').ok).toBe(false)
  })

  it('未知符号与裸函数名', () => {
    expect(tryCompile('foo(1)').ok).toBe(false)
    expect(tryCompile('sin').ok).toBe(false)
  })

  it('多余 token', () => {
    expect(tryCompile('1 2').ok).toBe(false)
    expect(tryCompile('t + 1 2').ok).toBe(false)
  })

  it('标识符之间也是隐式乘法', () => {
    expect(at('t t')(3)).toBe(9)
  })

  it('错误信息带位置', () => {
    const r = tryCompile('1 + @')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('第 5 个字符')
  })
})
