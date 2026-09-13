import { describeEigen, eigen2D } from '../math/eigen'
import { describeEigen3, eigen3D } from '../math/eigen3'
import type { Mat2, Mat3 } from '../math/mat'

export interface EigenPanel {
  /** 二维矩阵的特征信息 */
  setMatrix2: (m: Mat2 | null) => void
  /** 三维矩阵的特征信息（覆盖重根、特征平面、复根等情形） */
  setMatrix3: (m: Mat3 | null) => void
}

/** 创建特征值面板：显示 λ 与特征向量的文本说明（二维/三维共用） */
export function createEigenPanel(container: HTMLElement): EigenPanel {
  const section = document.createElement('section')
  section.className = 'panel-section'
  section.innerHTML = `
    <h2>特征值</h2>
    <div class="eigen-info"></div>
  `
  const infoEl = section.querySelector<HTMLElement>('.eigen-info')!
  container.appendChild(section)

  function render(lines: string[]): void {
    infoEl.textContent = ''
    for (const line of lines) {
      const div = document.createElement('div')
      div.className = 'eigen-line'
      div.textContent = line
      infoEl.appendChild(div)
    }
  }

  return {
    setMatrix2(m) {
      render(m ? describeEigen(eigen2D(m)) : [])
    },
    setMatrix3(m) {
      render(m ? describeEigen3(eigen3D(m)) : [])
    },
  }
}
