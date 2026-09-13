import { describe, expect, it } from 'vitest'
import { handleGridNav } from './gridNav'

interface FakeInput {
  value: string
  selectionStart: number | null
  selectionEnd: number | null
  focused: boolean
  selection: [number, number] | null
}

function makeInputs(values: string[], caret = 0): FakeInput[] {
  return values.map((value) => ({
    value,
    selectionStart: caret,
    selectionEnd: caret,
    focused: false,
    selection: null,
  }))
}

/** 把假输入转成 HTMLInputElement 供被测函数使用 */
const asInputs = (fakes: FakeInput[]): HTMLInputElement[] =>
  fakes.map((f) => {
    const el = {
      get value() {
        return f.value
      },
      get selectionStart() {
        return f.selectionStart
      },
      get selectionEnd() {
        return f.selectionEnd
      },
      focus() {
        f.focused = true
      },
      setSelectionRange(start: number, end: number) {
        f.selection = [start, end]
      },
    }
    return el as unknown as HTMLInputElement
  })

const key = (k: string): KeyboardEvent =>
  ({ key: k, preventDefault: () => {} }) as unknown as KeyboardEvent

describe('handleGridNav：水平移动（单行向量与矩阵通用）', () => {
  it('光标在数字最左端按 ← 跳到前一格，光标落在末尾', () => {
    const fakes = makeInputs(['2', '1'], 0)
    handleGridNav(key('ArrowLeft'), 1, asInputs(fakes), 2)
    expect(fakes[0].focused).toBe(true)
    expect(fakes[0].selection).toEqual([1, 1])
    expect(fakes[1].focused).toBe(false)
  })

  it('光标在数字最右端按 → 跳到后一格，光标落在开头', () => {
    const fakes = makeInputs(['12', '34'], 0)
    fakes[0].selectionStart = 2
    fakes[0].selectionEnd = 2
    handleGridNav(key('ArrowRight'), 0, asInputs(fakes), 2)
    expect(fakes[1].focused).toBe(true)
    expect(fakes[1].selection).toEqual([0, 0])
  })

  it('越界循环：最后一格按 → 回到第一格', () => {
    const fakes = makeInputs(['2', '1'], 0)
    fakes[1].selectionStart = 1
    fakes[1].selectionEnd = 1
    handleGridNav(key('ArrowRight'), 1, asInputs(fakes), 2)
    expect(fakes[0].focused).toBe(true)
    expect(fakes[0].selection).toEqual([0, 0])
  })

  it('光标在数字中间时不跳格', () => {
    const fakes = makeInputs(['123'], 1)
    handleGridNav(key('ArrowRight'), 0, asInputs(fakes), 3)
    expect(fakes[0].focused).toBe(false)
  })

  it('有选区时水平方向不拦截', () => {
    const fakes = makeInputs(['12', '34'], 0)
    fakes[0].selectionStart = 0
    fakes[0].selectionEnd = 2
    handleGridNav(key('ArrowLeft'), 0, asInputs(fakes), 2)
    expect(fakes[1].focused).toBe(false)
    expect(fakes[0].selection).toBeNull()
  })
})

describe('handleGridNav：竖直移动', () => {
  it('单行（向量）时 ↑/↓ 不拦截，交给浏览器默认行为', () => {
    const fakes = makeInputs(['2', '1', '3'], 0)
    handleGridNav(key('ArrowUp'), 1, asInputs(fakes), 3)
    handleGridNav(key('ArrowDown'), 1, asInputs(fakes), 3)
    expect(fakes.some((f) => f.focused)).toBe(false)
  })

  it('多行（矩阵）时 ↓ 跳到下一行同列，光标落在末尾', () => {
    // 2×2 矩阵：索引 0 1 / 2 3
    const fakes = makeInputs(['1', '2', '3', '4'], 0)
    handleGridNav(key('ArrowDown'), 0, asInputs(fakes), 2)
    expect(fakes[2].focused).toBe(true)
    expect(fakes[2].selection).toEqual([1, 1])
  })

  it('矩阵：最后一行按 ↓ 循环回第一行', () => {
    const fakes = makeInputs(['1', '2', '3', '4'], 0)
    handleGridNav(key('ArrowDown'), 3, asInputs(fakes), 2)
    expect(fakes[1].focused).toBe(true)
  })

  it('矩阵：第一行按 ↑ 循环到最后一行', () => {
    const fakes = makeInputs(['1', '2', '3', '4'], 0)
    handleGridNav(key('ArrowUp'), 0, asInputs(fakes), 2)
    expect(fakes[2].focused).toBe(true)
  })

  it('3×3 矩阵竖直移动保持列不变', () => {
    const fakes = makeInputs(new Array(9).fill('0'), 0)
    handleGridNav(key('ArrowDown'), 1, asInputs(fakes), 3)
    expect(fakes[4].focused).toBe(true) // 第 1 列（索引 1）→ 第 4 格
  })
})
