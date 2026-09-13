import type { Vec2, Vec3 } from '../math/vec'
import { vec2, vec3 } from '../math/vec'
import { handleGridNav } from './gridNav'
import type { Dimension } from './inputPanel'
import { parseVec2Input, parseVec3Input } from './parseMatrix'

/** 每种维度下向量的分量个数 */
const DIM_SIZE: Record<Dimension, number> = { '2d': 2, '3d': 3 }

export interface VectorPanelCallbacks {
  /** 向量变化（未启用时为 null） */
  onVector2Change: (v: Vec2 | null) => void
  onVector3Change: (v: Vec3 | null) => void
}

export interface VectorPanel {
  /** 切换维度：重建输入框并按该维度的状态重新应用 */
  setDimension: (dim: Dimension) => void
}

interface DimState {
  values: number[]
  enabled: boolean
}

/** 创建自定义向量面板：输入一个向量，在画布上观察它被矩阵变换的过程 */
export function createVectorPanel(container: HTMLElement, cb: VectorPanelCallbacks): VectorPanel {
  const section = document.createElement('section')
  section.className = 'panel-section'
  section.innerHTML = `
    <h2>向量</h2>
    <label class="vector-toggle">
      <input type="checkbox" class="vector-enable" checked />
      显示向量 v
    </label>
    <div class="vector-box"></div>
    <div class="vector-error"></div>
  `
  container.appendChild(section)

  const enableCb = section.querySelector<HTMLInputElement>('.vector-enable')!
  const boxEl = section.querySelector<HTMLElement>('.vector-box')!
  const errorEl = section.querySelector<HTMLElement>('.vector-error')!

  let dim: Dimension = '2d'
  const states: Record<Dimension, DimState> = {
    '2d': { values: [2, 1], enabled: true },
    '3d': { values: [2, 1, 1], enabled: true },
  }
  let inputs: HTMLInputElement[] = []

  function emit(data: number[] | null): void {
    if (dim === '2d') {
      cb.onVector2Change(data ? vec2(data[0], data[1]) : null)
    } else {
      cb.onVector3Change(data ? vec3(data[0], data[1], data[2]) : null)
    }
  }

  function apply(): void {
    const st = states[dim]
    const clearMarks = (): void => {
      inputs.forEach((input) => input.classList.remove('invalid'))
    }
    if (!enableCb.checked) {
      errorEl.textContent = ''
      clearMarks()
      emit(null)
      return
    }
    const raw = inputs.map((input) => input.value)
    const fail = (error: string, index?: number): void => {
      errorEl.textContent = error
      inputs.forEach((input, i) => input.classList.toggle('invalid', i === index))
    }

    let values: number[]
    if (dim === '2d') {
      const r = parseVec2Input(raw)
      if (!r.ok) return fail(r.error, r.index)
      values = [r.vec.x, r.vec.y]
    } else {
      const r = parseVec3Input(raw)
      if (!r.ok) return fail(r.error, r.index)
      values = [r.vec.x, r.vec.y, r.vec.z]
    }
    st.values = values
    errorEl.textContent = ''
    clearMarks()
    emit(values)
  }

  function renderInputs(): void {
    const st = states[dim]
    const size = DIM_SIZE[dim]
    boxEl.textContent = ''
    boxEl.classList.toggle('dim-3', size === 3)
    inputs = []
    for (let i = 0; i < size; i++) {
      const input = document.createElement('input')
      input.type = 'text'
      input.inputMode = 'decimal'
      input.spellcheck = false
      input.value = String(st.values[i])
      input.addEventListener('input', apply)
      // 方向键在格子间跳转（与矩阵输入框共用同一套规则）
      input.addEventListener('keydown', (event) => handleGridNav(event, i, inputs, size))
      boxEl.appendChild(input)
      inputs.push(input)
    }
  }

  enableCb.addEventListener('change', apply)

  renderInputs()
  apply()

  return {
    setDimension(next) {
      dim = next
      enableCb.checked = states[dim].enabled
      renderInputs()
      errorEl.textContent = ''
      apply()
    },
  }
}
