export interface AnimationControlState {
  t: number
  running: boolean
  speed: number
  /** 是否播放过：用于区分"播放"与"重播"的按钮文案 */
  played: boolean
}

export interface AnimationControlCallbacks {
  onToggle: () => void
  onSeek: (t: number) => void
  onSpeed: (speed: number) => void
}

export interface AnimationControls {
  /** 把动画状态同步到控件（按钮文案、进度条、百分比） */
  sync: (state: AnimationControlState) => void
}

/** 创建动画控制区：播放按钮 + 进度条 + 速度选择器 */
export function createAnimationControls(
  container: HTMLElement,
  cb: AnimationControlCallbacks,
): AnimationControls {
  const section = document.createElement('section')
  section.className = 'panel-section'
  section.innerHTML = `
    <h2>动画</h2>
    <div class="anim-buttons">
      <button type="button" class="anim-toggle">▶ 播放</button>
    </div>
    <div class="anim-progress">
      <input type="range" min="0" max="1000" value="0" class="anim-slider" />
      <span class="anim-percent">0%</span>
    </div>
    <label class="anim-speed">
      速度
      <select class="anim-speed-select">
        <option value="0.25">0.25×</option>
        <option value="0.5">0.5×</option>
        <option value="1" selected>1×</option>
        <option value="2">2×</option>
        <option value="4">4×</option>
      </select>
    </label>
  `
  container.appendChild(section)

  const toggleBtn = section.querySelector<HTMLButtonElement>('.anim-toggle')!
  const slider = section.querySelector<HTMLInputElement>('.anim-slider')!
  const percent = section.querySelector<HTMLElement>('.anim-percent')!
  const speedSelect = section.querySelector<HTMLSelectElement>('.anim-speed-select')!

  toggleBtn.addEventListener('click', cb.onToggle)
  slider.addEventListener('input', () => cb.onSeek(Number(slider.value) / 1000))
  speedSelect.addEventListener('change', () => cb.onSpeed(Number(speedSelect.value)))

  return {
    sync(state) {
      // 播放过且已走完，按钮提示可重播
      toggleBtn.textContent = state.running
        ? '⏸ 暂停'
        : state.t >= 1 && state.played
          ? '↻ 重播'
          : '▶ 播放'
      slider.value = String(Math.round(state.t * 1000))
      percent.textContent = `${Math.round(state.t * 100)}%`
      speedSelect.value = String(state.speed)
    },
  }
}
