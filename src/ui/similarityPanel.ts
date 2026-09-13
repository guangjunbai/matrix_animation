import type { Diagonalization } from '../math/similarity'
import type { Diagonalization3 } from '../math/similarity3'
import { createMatrixRow } from './matrixView'

export interface SimilarityPanelCallbacks {
  /** 单步播放第 index 段（0 起）：从上一阶段变形到该阶段 */
  onPlayStage: (index: number) => void
  /** 连续播放全部三段 */
  onPlayAll: () => void
}

export interface SimilarityPanel {
  /** 二维矩阵的对角化结果（不可对角化时显示原因） */
  setDiag2: (d: Diagonalization) => void
  /** 三维矩阵的对角化结果 */
  setDiag3: (d: Diagonalization3) => void
}

/** 三段动画各自的操作名（与对角化的 stages 对应） */
const STAGE_LABELS = ['① ×P⁻¹', '② ×D', '③ ×P']

/** 创建对角化面板：A = P·D·P⁻¹ 信息 + 三个单步按钮 + 全部播放（二维/三维共用） */
export function createSimilarityPanel(
  container: HTMLElement,
  cb: SimilarityPanelCallbacks,
): SimilarityPanel {
  const section = document.createElement('section')
  section.className = 'panel-section'
  section.innerHTML = `
    <h2>对角化</h2>
    <div class="diag-info"></div>
    <button type="button" class="diag-play">▶ 播放全部三段</button>
    <div class="diag-stages">
      ${STAGE_LABELS.map(
        (label, i) =>
          `<button type="button" class="diag-stage" data-stage="${i}">${label}</button>`,
      ).join('')}
    </div>
  `
  container.appendChild(section)

  const diagInfo = section.querySelector<HTMLElement>('.diag-info')!
  const playAllBtn = section.querySelector<HTMLButtonElement>('.diag-play')!
  const stageBtns = Array.from(section.querySelectorAll<HTMLButtonElement>('.diag-stage'))

  function setButtonsEnabled(enabled: boolean): void {
    playAllBtn.disabled = !enabled
    stageBtns.forEach((btn) => {
      btn.disabled = !enabled
    })
  }

  function render(d: Diagonalization | Diagonalization3): void {
    diagInfo.textContent = ''
    if (!d.ok) {
      const reason = document.createElement('div')
      reason.textContent = d.reason
      diagInfo.appendChild(reason)
      setButtonsEnabled(false)
      return
    }
    const title = document.createElement('div')
    title.className = 'diag-title'
    title.textContent = 'A = P · D · P⁻¹'
    diagInfo.appendChild(title)
    diagInfo.appendChild(createMatrixRow('P', d.P))
    diagInfo.appendChild(createMatrixRow('D', d.D))
    diagInfo.appendChild(createMatrixRow('P⁻¹', d.Pinv))
    setButtonsEnabled(true)
  }

  playAllBtn.addEventListener('click', cb.onPlayAll)
  stageBtns.forEach((btn, i) => btn.addEventListener('click', () => cb.onPlayStage(i)))

  return {
    setDiag2: render,
    setDiag3: render,
  }
}
