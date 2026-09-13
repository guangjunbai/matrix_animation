import type { Eigen2D } from '../math/eigen'
import { fmtExact, fmtNum } from '../math/format'
import type { Mat2 } from '../math/mat'
import { mat2Identity, mat2Vec2 } from '../math/mat'
import type { Vec2 } from '../math/vec'
import { vec2 } from '../math/vec'
import type { Viewport } from './coord'
import { worldToScreen } from './coord'
import {
  clear,
  drawArrow,
  drawAxes,
  drawEigenLine,
  drawGrid,
  drawLabelScreen,
  drawPolyline,
  drawUnitSquare,
  PALETTE,
  withAlpha,
} from './draw'
import type { ShapeSpec } from './shape'
import { sampleShape } from './shape'

/** 变换层颜色阶段：起点=原色（灰），中间=第三色（琥珀），终点=变换色（蓝） */
export type SceneTint = 'original' | 'intermediate' | 'final'

export function sceneTint(progress: number): SceneTint {
  if (progress <= 0) return 'original'
  if (progress >= 1) return 'final'
  return 'intermediate'
}

/** 三色阶段对应的颜色（三维渲染复用同一套视觉语言） */
export const TINT_COLOR: Record<SceneTint, string> = {
  original: PALETTE.original,
  intermediate: PALETTE.intermediate,
  final: PALETTE.transformed,
}

export interface SceneOptions {
  mat: Mat2
  progress?: number
  shape?: ShapeSpec | null
  eigen?: Eigen2D | null
  /** 用户指定的向量：绘制其原始位置与变换后的位置 */
  vector?: Vec2 | null
}

/**
 * 绘制完整一帧。progress 为动画进度 0~1：
 * 变换层（网格/单位正方形/基向量）按进度切换原色/中间色/变换色。
 */
export function renderScene(ctx: CanvasRenderingContext2D, vp: Viewport, opts: SceneOptions): void {
  const { mat, progress = 1, shape = null, eigen = null, vector = null } = opts
  const tint = sceneTint(progress)
  const color = TINT_COLOR[tint]

  clear(ctx, vp)
  drawGrid(ctx, vp, mat2Identity(), PALETTE.grid)
  drawAxes(ctx, vp)

  // 特征向量虚线（目标矩阵的不变方向，静态世界参考线）
  const eigenLabelPos: Array<{ x: number; y: number } | null> = []
  if (eigen) {
    if (eigen.kind === 'two-real') {
      eigenLabelPos.push(
        drawEigenLine(ctx, vp, eigen.vectors[0], PALETTE.eigen1, `λ₁ = ${fmtExact(eigen.values[0])}`),
        drawEigenLine(ctx, vp, eigen.vectors[1], PALETTE.eigen2, `λ₂ = ${fmtExact(eigen.values[1])}`),
      )
    } else if (eigen.kind === 'single') {
      eigenLabelPos.push(drawEigenLine(ctx, vp, eigen.vector, PALETTE.eigen1, `λ = ${fmtExact(eigen.value)}`))
    }
    // scaled-identity 与 complex 不画线（面板文字说明）
  }

  // 变换层（t=0 时与原图完全重合，跳过）
  if (tint !== 'original') {
    // 网格始终保持亮橙色，动画结束也不变色
    drawGrid(ctx, vp, mat, withAlpha(PALETTE.gridTransformed, 0.55))
    drawUnitSquare(ctx, vp, mat, color, withAlpha(color, 0.12), true, true)
  }

  // 自定义图形：原始（灰）与变换后（随三色切换），逐点变换
  if (shape) {
    const pts = sampleShape(shape)
    drawPolyline(ctx, vp, pts, mat2Identity(), withAlpha(PALETTE.original, 0.85), 1.5)
    if (tint !== 'original') {
      drawPolyline(ctx, vp, pts, mat, color, 2.5, true)
    }
  }

  // 原始单位正方形与基向量（半透明幽灵）
  drawUnitSquare(ctx, vp, mat2Identity(), PALETTE.original, null, true)
  drawArrow(ctx, vp, vec2(0, 0), vec2(1, 0), withAlpha(PALETTE.e1, 0.6), 2)
  drawArrow(ctx, vp, vec2(0, 0), vec2(0, 1), withAlpha(PALETTE.e2, 0.6), 2)

  // 变换后的基向量（发光 + 标签；标签实时标注坐标 = 当前变换矩阵的两列）
  const usedLabels: Array<{ x: number; y: number }> = []
  if (tint !== 'original') {
    const e1 = mat2Vec2(mat, vec2(1, 0))
    const e2 = mat2Vec2(mat, vec2(0, 1))
    drawArrow(ctx, vp, vec2(0, 0), e1, PALETTE.e1, 2.5, true)
    drawArrow(ctx, vp, vec2(0, 0), e2, PALETTE.e2, 2.5, true)
    const p1 = labelVector(ctx, vp, e1, `e₁ = (${fmtNum(e1.x)}, ${fmtNum(e1.y)})`, PALETTE.e1, usedLabels)
    if (p1) usedLabels.push(p1)
    const p2 = labelVector(
      ctx,
      vp,
      e2,
      `e₂ = (${fmtNum(e2.x)}, ${fmtNum(e2.y)})`,
      PALETTE.e2,
      usedLabels,
    )
    if (p2) usedLabels.push(p2)

    // 特征向量的变换动画：箭头随 M(t) 移动，终点落在特征线上、被拉伸 λ 倍
    if (eigen && (eigen.kind === 'two-real' || eigen.kind === 'single')) {
      const vectors = eigen.kind === 'two-real' ? eigen.vectors : [eigen.vector]
      const colors = eigen.kind === 'two-real' ? [PALETTE.eigen1, PALETTE.eigen2] : [PALETTE.eigen1]
      const names = eigen.kind === 'two-real' ? ['v₁', 'v₂'] : ['v']
      vectors.forEach((v, i) => {
        // 幽灵：变换前的位置
        drawArrow(ctx, vp, vec2(0, 0), v, withAlpha(colors[i], 0.35), 2)
        // 变换后：M(t)·v
        const mv = mat2Vec2(mat, v)
        drawArrow(ctx, vp, vec2(0, 0), mv, colors[i], 2.5, true)
        const at = labelVector(ctx, vp, mv, names[i], colors[i], usedLabels)
        if (at) usedLabels.push(at)
      })
    }
  }

  // 用户指定的向量：幽灵（原始位置）+ 变换后（实时坐标标签）
  if (vector) {
    drawArrow(ctx, vp, vec2(0, 0), vector, withAlpha(PALETTE.vector, 0.4), 2)
    if (tint !== 'original') {
      const mv = mat2Vec2(mat, vector)
      drawArrow(ctx, vp, vec2(0, 0), mv, PALETTE.vector, 2.5, true)
      const at = labelVector(
        ctx,
        vp,
        mv,
        `v = (${fmtNum(mv.x)}, ${fmtNum(mv.y)})`,
        PALETTE.vector,
        usedLabels,
      )
      if (at) usedLabels.push(at)
    }
  }

  drawAxisLabels(ctx, vp)
}

/**
 * 在向量末端沿方向偏移处画标签；退化向量（如零矩阵）不标。
 * 与已有标签过近（如降维后两基向量重合）时沿垂直方向错开。
 */
function labelVector(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  tip: Vec2,
  text: string,
  color: string,
  avoid: Array<{ x: number; y: number }> = [],
): { x: number; y: number } | null {
  const s = worldToScreen(vp, tip.x, tip.y)
  const o = worldToScreen(vp, 0, 0)
  const dx = s.x - o.x
  const dy = s.y - o.y
  const len = Math.hypot(dx, dy)
  if (len < 10) return null
  const k = 1 + 18 / len
  let x = o.x + dx * k
  let y = o.y + dy * k
  if (avoid.some((p) => Math.hypot(x - p.x, y - p.y) < 24)) {
    x += (-dy / len) * 18
    y += (dx / len) * 18
  }
  drawLabelScreen(ctx, x, y, text, color)
  return { x, y }
}

/** 坐标轴标签（贴在正方向箭头旁；原点移出视野时随之不可见） */
function drawAxisLabels(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  const o = worldToScreen(vp, 0, 0)
  drawLabelScreen(ctx, vp.width - 14, o.y + 14, 'x', PALETTE.axis)
  drawLabelScreen(ctx, o.x + 14, 14, 'y', PALETTE.axis)
}
