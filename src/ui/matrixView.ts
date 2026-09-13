import { fmtNum } from '../math/format'

/** 把行优先的方阵（2×2 / 3×3）渲染成带方括号的网格 */
export function createMatrixView(values: readonly number[]): HTMLElement {
  const size = Math.round(Math.sqrt(values.length))
  const box = document.createElement('div')
  box.className = size === 3 ? 'matrix-view size-3' : 'matrix-view'
  for (const value of values) {
    const cell = document.createElement('span')
    cell.textContent = fmtNum(value)
    box.appendChild(cell)
  }
  return box
}

/** 一行"标签 = 矩阵" */
export function createMatrixRow(label: string, values: readonly number[]): HTMLElement {
  const row = document.createElement('div')
  row.className = 'matrix-row'
  const tag = document.createElement('span')
  tag.className = 'matrix-tag'
  tag.textContent = `${label} =`
  row.appendChild(tag)
  row.appendChild(createMatrixView(values))
  return row
}

/** 往容器里追加多行文本 */
export function appendLines(el: HTMLElement, lines: string[]): void {
  el.textContent = ''
  for (const line of lines) {
    const div = document.createElement('div')
    div.textContent = line
    el.appendChild(div)
  }
}
