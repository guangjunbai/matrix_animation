import './style.css'
import { lerpMat2, lerpMat3, MatrixAnimation } from './animation/matrixAnimation'
import type { Eigen2D } from './math/eigen'
import { eigen2D } from './math/eigen'
import type { Eigen3D } from './math/eigen3'
import { eigen3D } from './math/eigen3'
import type { Mat2, Mat3 } from './math/mat'
import { mat2Identity, mat3Identity } from './math/mat'
import type { Vec2, Vec3 } from './math/vec'
import type { Diagonalization } from './math/similarity'
import { diagonalize } from './math/similarity'
import type { Diagonalization3 } from './math/similarity3'
import { diagonalize3 } from './math/similarity3'
import { setupCanvas } from './render2d/canvas'
import { renderScene } from './render2d/render'
import type { ShapeSpec, ShapeSpec3 } from './render2d/shape'
import { attachViewControls } from './render2d/viewControls'
import type { Camera3D } from './render3d/camera3d'
import { createCamera3D, resizeCamera3D } from './render3d/camera3d'
import { renderScene3D } from './render3d/render3d'
import { attachViewControls3D } from './render3d/viewControls3d'
import { createAnimationControls } from './ui/animationControls'
import { createEigenPanel } from './ui/eigenPanel'
import type { Dimension } from './ui/inputPanel'
import { createMatrixPanel } from './ui/inputPanel'
import { createShapePanel } from './ui/shapePanel'
import { createSimilarityPanel } from './ui/similarityPanel'
import { createVectorPanel } from './ui/vectorPanel'

const panelEl = document.querySelector<HTMLElement>('#panel')
const stageEl = document.querySelector<HTMLElement>('#stage')
const canvasEl = document.querySelector<HTMLCanvasElement>('#canvas')

if (!panelEl || !stageEl || !canvasEl) {
  throw new Error('页面结构缺失，请检查 index.html')
}

const handle = setupCanvas(canvasEl)

// 二维与三维各持一份动画：同一套播放逻辑，注入各自的插值函数与单位矩阵
const anim2 = new MatrixAnimation(lerpMat2, mat2Identity, mat2Identity(), mat2Identity())
const anim3 = new MatrixAnimation(lerpMat3, mat3Identity, mat3Identity(), mat3Identity())
// 初始即处于"已显示当前矩阵"状态（否则首帧进度为 0，变换图层不会绘制）
anim2.show(mat2Identity())
anim3.show(mat3Identity())

let dimension: Dimension = '2d'
let current2: Mat2 = mat2Identity()
let current3: Mat3 = mat3Identity()
/** 是否播放过当前动画（决定按钮显示"播放"还是"重播"） */
let played = false
let dirty = true
let shape2: ShapeSpec | null = null
let shape3: ShapeSpec3 | null = null
let vector2: Vec2 | null = null
let vector3: Vec3 | null = null
let eigen2: Eigen2D | null = eigen2D(mat2Identity())
let eigen3: Eigen3D | null = eigen3D(mat3Identity())
let diag2: Diagonalization = diagonalize(mat2Identity())
let diag3: Diagonalization3 = diagonalize3(mat3Identity())
let cam3: Camera3D = createCamera3D(
  handle.vp.width || 800,
  handle.vp.height || 600,
)

/** 动画控制绑定当前维度对应的动画 */
const currentAnim = (): MatrixAnimation<Mat2> | MatrixAnimation<Mat3> =>
  dimension === '3d' ? anim3 : anim2

const panel = createMatrixPanel(panelEl)

const vectorPanel = createVectorPanel(panelEl, {
  onVector2Change: (v) => {
    vector2 = v
    dirty = true
  },
  onVector3Change: (v) => {
    vector3 = v
    dirty = true
  },
})

const eigenPanel = createEigenPanel(panelEl)
eigenPanel.setMatrix2(current2)

const simPanel = createSimilarityPanel(panelEl, {
  // 单步播放第 index 段：从上一阶段（首段从单位矩阵）变形到该阶段
  onPlayStage: (index) => {
    if (dimension === '3d') {
      if (!diag3.ok) return
      const from = index === 0 ? mat3Identity() : diag3.stages[index - 1]
      anim3.playSegment(from, diag3.stages[index])
    } else {
      if (!diag2.ok) return
      const from = index === 0 ? mat2Identity() : diag2.stages[index - 1]
      anim2.playSegment(from, diag2.stages[index])
    }
    played = true
    dirty = true
  },
  // 连续播放全部三段
  onPlayAll: () => {
    if (dimension === '3d') {
      if (!diag3.ok) return
      anim3.playSequence(diag3.stages)
    } else {
      if (!diag2.ok) return
      anim2.playSequence(diag2.stages)
    }
    played = true
    dirty = true
  },
})
simPanel.setDiag2(diag2)

panel.onMatrix2Change = (mat) => {
  // 改矩阵不播放动画：立即显示新矩阵（起点记为单位矩阵，随时可点播放从头演示）
  current2 = mat
  anim2.show(mat)
  played = false
  eigen2 = eigen2D(mat)
  diag2 = diagonalize(mat)
  eigenPanel.setMatrix2(mat)
  simPanel.setDiag2(diag2)
  dirty = true
}

panel.onMatrix3Change = (mat) => {
  current3 = mat
  anim3.show(mat)
  played = false
  eigen3 = eigen3D(mat)
  diag3 = diagonalize3(mat)
  eigenPanel.setMatrix3(mat)
  simPanel.setDiag3(diag3)
  dirty = true
}

panel.onDimensionChange = (dim) => {
  dimension = dim
  // 特征值 / 对角化 / 图形面板两种维度共用，切换时各自刷新内容
  if (dim === '3d') {
    eigenPanel.setMatrix3(current3)
    simPanel.setDiag3(diag3)
  } else {
    eigenPanel.setMatrix2(current2)
    simPanel.setDiag2(diag2)
  }
  shapePanel.setDimension(dim)
  vectorPanel.setDimension(dim)
  played = false
  dirty = true
}

// 矩阵自身的线性变换：随时从头再演示一遍（不依赖上次播过什么）
panel.onPlay = () => {
  if (dimension === '3d') anim3.playSegment(mat3Identity(), current3)
  else anim2.playSegment(mat2Identity(), current2)
  played = true
  dirty = true
}

const controls = createAnimationControls(panelEl, {
  onToggle: () => {
    const a = currentAnim()
    if (a.running) {
      a.pause()
    } else {
      // 未走完则继续；已走完则从头重播当前这一段
      a.play()
    }
    played = true
    dirty = true
  },
  onSeek: (t) => {
    const a = currentAnim()
    a.pause()
    a.seek(t)
    dirty = true
  },
  onSpeed: (speed) => {
    currentAnim().setSpeed(speed)
  },
})
controls.sync({ t: anim2.progress, running: anim2.running, speed: anim2.speed, played })

const shapePanel = createShapePanel(panelEl, {
  onShape2Change: (next) => {
    shape2 = next
    dirty = true
  },
  onShape3Change: (next) => {
    shape3 = next
    dirty = true
  },
})

// 容器尺寸变化时重新适配画布（三维相机同步更新焦距与中心）
new ResizeObserver(() => {
  handle.resize()
  cam3 = resizeCamera3D(cam3, handle.vp.width, handle.vp.height)
  dirty = true
}).observe(stageEl)

// 二维：滚轮缩放 / 拖拽平移 / 双击复位；三维：拖拽轨道旋转 / 滚轮缩放 / 双击复位
attachViewControls(canvasEl, handle, () => dimension === '2d', () => {
  dirty = true
})
attachViewControls3D(
  canvasEl,
  () => cam3,
  (cam) => {
    cam3 = cam
  },
  () => dimension === '3d',
  () => {
    dirty = true
  },
)

// 渲染循环：只在状态变化（动画推进/交互/缩放）时重绘
let last = performance.now()
function frame(now: number): void {
  // 切后台返回时 dt 可能很大，限制步长避免动画瞬移
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  const act = currentAnim()
  if (act.running) {
    act.advance(dt)
    dirty = true
  }
  if (dirty) {
    controls.sync({ t: act.progress, running: act.running, speed: act.speed, played })
    if (dimension === '3d') {
      renderScene3D(handle.ctx, {
        mat: anim3.currentMatrix(),
        progress: anim3.progress,
        cam: cam3,
        width: handle.vp.width,
        height: handle.vp.height,
        eigen: eigen3,
        shape: shape3,
        vector: vector3,
      })
    } else {
      renderScene(handle.ctx, handle.vp, {
        mat: anim2.currentMatrix(),
        progress: anim2.progress,
        shape: shape2,
        eigen: eigen2,
        vector: vector2,
      })
    }
    dirty = false
  }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
