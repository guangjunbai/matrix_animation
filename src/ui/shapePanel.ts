import { tryCompile } from '../math/expr'
import type { ShapeSpec, ShapeSpec3 } from '../render2d/shape'
import type { Dimension } from './inputPanel'

interface Preset {
  name: string
  fns: string[]
  tMin: string
  tMax: string
}

export const SHAPE_PRESETS_2D: Preset[] = [
  { name: '单位圆', fns: ['cos(t)', 'sin(t)'], tMin: '0', tMax: '2*pi' },
  { name: '椭圆', fns: ['2*cos(t)', 'sin(t)'], tMin: '0', tMax: '2*pi' },
  { name: '正弦波', fns: ['t', 'sin(t)'], tMin: '-pi', tMax: 'pi' },
  { name: '抛物线', fns: ['t', 't^2'], tMin: '-2', tMax: '2' },
  { name: '星形线', fns: ['cos(t)^3', 'sin(t)^3'], tMin: '0', tMax: '2*pi' },
  { name: '螺线', fns: ['t*cos(t)', 't*sin(t)'], tMin: '0', tMax: '4*pi' },
]

export const SHAPE_PRESETS_3D: Preset[] = [
  { name: '螺线（helix）', fns: ['cos(t)', 'sin(t)', 't/4'], tMin: '-2*pi', tMax: '2*pi' },
  {
    name: '三叶结',
    fns: ['(sin(t) + 2*sin(2*t))/2', '(cos(t) - 2*cos(2*t))/2', '-sin(3*t)/2'],
    tMin: '0',
    tMax: '2*pi',
  },
  { name: 'xy 平面圆', fns: ['cos(t)', 'sin(t)', '0'], tMin: '0', tMax: '2*pi' },
  { name: '圆锥螺线', fns: ['t*cos(t)/3', 't*sin(t)/3', 't/3'], tMin: '0', tMax: '4*pi' },
  { name: '双曲螺线', fns: ['cos(t)/t', 'sin(t)/t', 't/6'], tMin: '1', tMax: '6*pi' },
]

interface ShapeData {
  fns: Array<(t: number) => number>
  tMin: number
  tMax: number
}

interface DimState {
  fns: string[]
  tMin: string
  tMax: string
}

export interface ShapePanelCallbacks {
  onShape2Change: (shape: ShapeSpec | null) => void
  onShape3Change: (shape: ShapeSpec3 | null) => void
}

export interface ShapePanel {
  /** 切换维度：重建输入框并按该维度的状态重新应用 */
  setDimension: (dim: Dimension) => void
}

/** 创建图形面板：参数方程 + t 范围 + 预设 + 启用开关（二维两条表达式，三维三条） */
export function createShapePanel(container: HTMLElement, cb: ShapePanelCallbacks): ShapePanel {
  const section = document.createElement('section')
  section.className = 'panel-section'
  section.innerHTML = `
    <h2>图形</h2>
    <label class="shape-toggle">
      <input type="checkbox" class="shape-enable" />
      启用图形变换
    </label>
    <div class="shape-fields"></div>
    <div class="shape-range">
      <span>t ∈ [</span><input class="shape-tmin" /><span>,</span><input class="shape-tmax" /><span>]</span>
    </div>
    <select class="shape-preset"></select>
    <div class="shape-error"></div>
  `
  container.appendChild(section)

  const enableCb = section.querySelector<HTMLInputElement>('.shape-enable')!
  const fieldsEl = section.querySelector<HTMLElement>('.shape-fields')!
  const tMinInput = section.querySelector<HTMLInputElement>('.shape-tmin')!
  const tMaxInput = section.querySelector<HTMLInputElement>('.shape-tmax')!
  const presetSelect = section.querySelector<HTMLSelectElement>('.shape-preset')!
  const errorEl = section.querySelector<HTMLElement>('.shape-error')!

  let dim: Dimension = '2d'
  // 两个维度各自保留自己的表达式与 t 范围
  const states: Record<Dimension, DimState> = {
    '2d': { fns: [...SHAPE_PRESETS_2D[0].fns], tMin: '0', tMax: '2*pi' },
    '3d': { fns: [...SHAPE_PRESETS_3D[0].fns], tMin: '-2*pi', tMax: '2*pi' },
  }
  let inputs: HTMLInputElement[] = []

  const presets = (): Preset[] => (dim === '2d' ? SHAPE_PRESETS_2D : SHAPE_PRESETS_3D)

  function markInvalid(bad: HTMLInputElement | null): void {
    const all = [...inputs, tMinInput, tMaxInput]
    all.forEach((input) => input.classList.toggle('invalid', input === bad))
  }

  /** 把校验结果按当前维度通知出去 */
  function emit(data: ShapeData | null): void {
    if (dim === '2d') {
      cb.onShape2Change(
        data ? { xFn: data.fns[0], yFn: data.fns[1], tMin: data.tMin, tMax: data.tMax } : null,
      )
    } else {
      cb.onShape3Change(
        data
          ? {
              xFn: data.fns[0],
              yFn: data.fns[1],
              zFn: data.fns[2],
              tMin: data.tMin,
              tMax: data.tMax,
            }
          : null,
      )
    }
  }

  /** 校验并应用当前输入；不合法时保留上一次的合法图形 */
  function apply(): void {
    const st = states[dim]
    if (!enableCb.checked) {
      errorEl.textContent = ''
      markInvalid(null)
      emit(null)
      return
    }
    const fns: Array<(t: number) => number> = []
    for (let i = 0; i < st.fns.length; i++) {
      const r = tryCompile(st.fns[i])
      if (!r.ok) {
        errorEl.textContent = `${'xyz'[i]}(t)：${r.error}`
        markInvalid(inputs[i])
        return
      }
      fns.push(r.fn)
    }
    // t 范围支持常量表达式（如 2*pi、-pi）
    const tMinR = tryCompile(st.tMin)
    if (!tMinR.ok) {
      errorEl.textContent = `t 起点：${tMinR.error}`
      markInvalid(tMinInput)
      return
    }
    const tMaxR = tryCompile(st.tMax)
    if (!tMaxR.ok) {
      errorEl.textContent = `t 终点：${tMaxR.error}`
      markInvalid(tMaxInput)
      return
    }
    const tMin = tMinR.fn(0)
    const tMax = tMaxR.fn(0)
    if (!Number.isFinite(tMin)) {
      errorEl.textContent = 't 起点计算结果不是有限数'
      markInvalid(tMinInput)
      return
    }
    if (!Number.isFinite(tMax)) {
      errorEl.textContent = 't 终点计算结果不是有限数'
      markInvalid(tMaxInput)
      return
    }
    if (tMax <= tMin) {
      errorEl.textContent = 't 终点必须大于起点'
      markInvalid(tMaxInput)
      return
    }
    errorEl.textContent = ''
    markInvalid(null)
    emit({ fns, tMin, tMax })
  }

  /** 按当前维度重建输入框与预设列表 */
  function renderFields(): void {
    const st = states[dim]
    fieldsEl.textContent = ''
    inputs = st.fns.map((value, i) => {
      const row = document.createElement('div')
      row.className = 'shape-field'
      const label = document.createElement('span')
      label.textContent = `${'xyz'[i]}(t) =`
      const input = document.createElement('input')
      input.type = 'text'
      input.spellcheck = false
      input.value = value
      input.addEventListener('input', () => {
        st.fns[i] = input.value
        apply()
      })
      row.append(label, input)
      fieldsEl.appendChild(row)
      return input
    })
    tMinInput.value = st.tMin
    tMaxInput.value = st.tMax
    presetSelect.textContent = ''
    const blank = document.createElement('option')
    blank.value = ''
    blank.textContent = '选择预设…'
    presetSelect.appendChild(blank)
    for (const p of presets()) {
      const opt = document.createElement('option')
      opt.value = p.name
      opt.textContent = p.name
      presetSelect.appendChild(opt)
    }
  }

  tMinInput.addEventListener('input', () => {
    states[dim].tMin = tMinInput.value
    apply()
  })
  tMaxInput.addEventListener('input', () => {
    states[dim].tMax = tMaxInput.value
    apply()
  })
  // 勾选/取消只更新图形，不播放动画
  enableCb.addEventListener('change', apply)
  presetSelect.addEventListener('change', () => {
    const preset = presets().find((p) => p.name === presetSelect.value)
    if (!preset) return
    const st = states[dim]
    st.fns = [...preset.fns]
    st.tMin = preset.tMin
    st.tMax = preset.tMax
    renderFields()
    apply()
  })

  renderFields()

  return {
    setDimension(next) {
      if (next === dim) return
      dim = next
      renderFields()
      errorEl.textContent = ''
      markInvalid(null)
      apply()
    },
  }
}
