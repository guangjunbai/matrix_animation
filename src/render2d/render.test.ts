import { describe, expect, it } from 'vitest'
import { sceneTint } from './render'

describe('sceneTint', () => {
  it('进度 0 为原色，中间为第三色，结束为变换色', () => {
    expect(sceneTint(0)).toBe('original')
    expect(sceneTint(0.5)).toBe('intermediate')
    expect(sceneTint(1)).toBe('final')
  })
})
