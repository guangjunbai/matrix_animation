import type { Mat2, Mat3 } from '../math/mat'
import { mat2Identity, mat3Identity } from '../math/mat'
import { handleGridNav } from './gridNav'
import { parseMat2Input, parseMat3Input } from './parseMatrix'

export type Dimension = '2d' | '3d'

/** 每种维度下矩阵的边长 */
const DIM_SIZE: Record<Dimension, number> = { '2d': 2, '3d': 3 }

export interface MatrixPanel {
  /** 面板根元素 */
  readonly element: HTMLElement
  /** 二维矩阵解析成功后回调 */
  onMatrix2Change: (mat: Mat2) => void
  /** 三维矩阵解析成功后回调 */
  onMatrix3Change: (mat: Mat3) => void
  /** 维度切换回调 */
  onDimensionChange: (dim: Dimension) => void
  /** 点击"播放线性变换"：从头演示当前矩阵的变换 */
  onPlay: () => void
}

/** 创建矩阵输入面板：维度选择器 + 可切换 2×2 / 3×3 的矩阵输入框 */
export function createMatrixPanel(container: HTMLElement): MatrixPanel {
  container.innerHTML = `
    <section class="panel-section">
      <h2>维度</h2>
      <div class="dim-switch">
        <button type="button" data-dim="2d" class="active">2D</button>
        <button type="button" data-dim="3d">3D</button>
      </div>
    </section>
    <section class="panel-section">
      <h2>矩阵</h2>
      <div class="matrix-box"></div>
      <div class="matrix-error"></div>
      <button type="button" class="matrix-play">▶ 播放线性变换</button>
    </section>
  `

  const boxEl = container.querySelector<HTMLElement>('.matrix-box')!
  const errorEl = container.querySelector<HTMLElement>('.matrix-error')!
  const dimButtons = Array.from(container.querySelectorAll<HTMLButtonElement>('.dim-switch button'))
  const playBtn = container.querySelector<HTMLButtonElement>('.matrix-play')!

  const panel: MatrixPanel = {
    element: container,
    onMatrix2Change: () => {},
    onMatrix3Change: () => {},
    onDimensionChange: () => {},
    onPlay: () => {},
  }

  let dim: Dimension = '2d'
  let mat2Value: Mat2 = mat2Identity()
  let mat3Value: Mat3 = mat3Identity()
  let inputs: HTMLInputElement[] = []

  function clearError(): void {
    errorEl.textContent = ''
    inputs.forEach((input) => input.classList.remove('invalid'))
  }

  function showError(error: string, index?: number): void {
    errorEl.textContent = error
    inputs.forEach((input, i) => input.classList.toggle('invalid', i === index))
  }

  function handleChange(): void {
    if (dim === '2d') {
      const r = parseMat2Input(inputs.map((input) => input.value))
      if (!r.ok) {
        showError(r.error, r.index)
        return
      }
      clearError()
      mat2Value = r.mat
      panel.onMatrix2Change(mat2Value)
      return
    }
    const r = parseMat3Input(inputs.map((input) => input.value))
    if (!r.ok) {
      showError(r.error, r.index)
      return
    }
    clearError()
    mat3Value = r.mat
    panel.onMatrix3Change(mat3Value)
  }

  /** 按当前维度重建输入框（切换维度时保留各自的值） */
  function renderInputs(): void {
    const size = DIM_SIZE[dim]
    const values: readonly number[] = dim === '2d' ? mat2Value : mat3Value
    boxEl.textContent = ''
    boxEl.classList.toggle('dim-3', size === 3)
    inputs = []
    for (let i = 0; i < size * size; i++) {
      const input = document.createElement('input')
      input.type = 'text'
      input.inputMode = 'decimal'
      input.spellcheck = false
      input.value = String(values[i])
      input.addEventListener('input', handleChange)
      // 方向键在格子间跳转（与向量输入框共用同一套规则）
      input.addEventListener('keydown', (event) =>
        handleGridNav(event, i, inputs, DIM_SIZE[dim]),
      )
      boxEl.appendChild(input)
      inputs.push(input)
    }
  }

  dimButtons.forEach((button) =>
    button.addEventListener('click', () => {
      const next = button.dataset.dim as Dimension
      if (next === dim) return
      dim = next
      dimButtons.forEach((b) => b.classList.toggle('active', b === button))
      renderInputs()
      clearError()
      panel.onDimensionChange(dim)
      // 切换后立即把该维度的当前矩阵通知出去
      if (dim === '2d') panel.onMatrix2Change(mat2Value)
      else panel.onMatrix3Change(mat3Value)
    }),
  )

  playBtn.addEventListener('click', () => panel.onPlay())

  renderInputs()
  return panel
}
