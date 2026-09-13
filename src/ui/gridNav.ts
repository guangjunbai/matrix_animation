/**
 * 输入框网格的方向键导航（矩阵与向量输入框共用）：
 * - ←/→ 只水平移动：仅当光标位于数字最左/最右端时才跳格，越界循环到本行另一端
 * - ↑/↓ 只竖直移动：任何位置按下都上下跳格，越界循环到本列另一端；只有一行时不拦截
 * - 竖直移动（以及 ← 进入的格子）光标落在数字最右侧，→ 进入的格子落在开头
 */
export function handleGridNav(
  event: KeyboardEvent,
  index: number,
  inputs: readonly HTMLInputElement[],
  cols: number,
): void {
  const input = inputs[index]
  if (!input || cols <= 0) return
  const start = input.selectionStart
  const end = input.selectionEnd
  if (start === null || end === null) return

  const rows = Math.ceil(inputs.length / cols)
  const row = Math.floor(index / cols)
  const col = index % cols

  const focusAt = (i: number, atEnd: boolean): void => {
    const el = inputs[i]
    if (!el) return
    el.focus()
    el.setSelectionRange(atEnd ? el.value.length : 0, atEnd ? el.value.length : 0)
  }

  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    // 单行输入（如向量）：交给浏览器默认行为
    if (rows === 1) return
    event.preventDefault()
    const nextRow =
      event.key === 'ArrowUp' ? (row === 0 ? rows - 1 : row - 1) : row === rows - 1 ? 0 : row + 1
    focusAt(nextRow * cols + col, true)
    return
  }

  // 有选区时水平方向不拦截，保留浏览器默认的选区行为
  if (start !== end) return
  if (event.key === 'ArrowLeft' && start === 0) {
    event.preventDefault()
    focusAt(row * cols + (col === 0 ? cols - 1 : col - 1), true)
  } else if (event.key === 'ArrowRight' && start === input.value.length) {
    event.preventDefault()
    focusAt(row * cols + (col === cols - 1 ? 0 : col + 1), false)
  }
}
