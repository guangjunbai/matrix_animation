import type { Vec2 } from '../math/vec'
import { isFiniteVec2, vec2 } from '../math/vec'
import type { Mat2 } from '../math/mat'
import { mat2Inverse, mat2Vec2 } from '../math/mat'
import { gridStep } from './camera'
import type { Viewport } from './coord'
import { screenToWorld, worldToScreen } from './coord'

/** 深色调色板：原色（灰）/ 中间态（琥珀）/ 变换后（蓝）三色 */
export const PALETTE = {
  background: '#0f172a',
  grid: 'rgba(226, 232, 240, 0.5)',
  axis: '#e2e8f0',
  original: '#94a3b8',
  intermediate: '#fbbf24',
  transformed: '#60a5fa',
  /** 变换后的网格：固定亮橙色（动画中与结束后一致） */
  gridTransformed: '#ffa94d',
  e1: '#f87171',
  e2: '#4ade80',
  eigen1: '#c084fc',
  eigen2: '#f472b6',
  /** 三维基向量 e₃（z 方向，沿用 x/y/z = 红/绿/蓝 的惯例） */
  e3: '#38bdf8',
  /** 三维的第三个特征方向颜色（前两个与二维共用 eigen1 / eigen2） */
  eigen3: '#22d3ee',
  /** 自定义向量（用户指定） */
  vector: '#f8fafc',
} as const

/** 把 #rrggbb 转成带透明度的 rgba() 颜色字符串 */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 清屏（填充背景色） */
export function clear(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  ctx.fillStyle = PALETTE.background
  ctx.fillRect(0, 0, vp.width, vp.height)
}

/** 变换网格单帧最大遍历点数：防止近奇异矩阵（逆矩阵爆炸）导致遍历失控 */
export const MAX_GRID_POINTS = 4096

/**
 * 计算变换网格需要遍历的索引范围（网格线索引 k、j 与步长 step）。
 * - 可逆：取视口四角在 M⁻¹ 下的原像
 * - 奇异：图像塌缩成过原点的直线，按视口半径与列模长之比放大原像范围，保证塌缩线铺满视野
 * - 点数超限（近奇异时逆矩阵爆炸）：倍增步长抽稀网格，总点数恒不超过 MAX_GRID_POINTS
 *   （步长翻倍时索引范围同步减半，覆盖的世界区间不变，只抽稀不丢线）
 */
export function gridIndexRange(
  vp: Viewport,
  transform: Mat2,
  initialStep: number,
): { kMin: number; kMax: number; jMin: number; jMax: number; step: number } {
  let step = initialStep
  const inv = mat2Inverse(transform)
  const viewCorners = [
    screenToWorld(vp, 0, 0),
    screenToWorld(vp, vp.width, 0),
    screenToWorld(vp, 0, vp.height),
    screenToWorld(vp, vp.width, vp.height),
  ]
  let corners: Vec2[]
  if (inv) {
    corners = viewCorners.map((p) => mat2Vec2(inv, p))
  } else {
    const radius = Math.max(...viewCorners.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))))
    const colScale = Math.max(
      Math.hypot(transform[0], transform[2]),
      Math.hypot(transform[1], transform[3]),
      1e-12,
    )
    const r = radius / colScale
    corners = [vec2(r, r), vec2(r, -r), vec2(-r, r), vec2(-r, -r)]
  }
  for (;;) {
    const xs = corners.map((p) => p.x)
    const ys = corners.map((p) => p.y)
    const kMin = Math.floor(Math.min(...xs) / step) - 1
    const kMax = Math.ceil(Math.max(...xs) / step) + 1
    const jMin = Math.floor(Math.min(...ys) / step) - 1
    const jMax = Math.ceil(Math.max(...ys) / step) + 1
    const points = (kMax - kMin + 1) * (jMax - jMin + 1)
    if (points <= MAX_GRID_POINTS) return { kMin, kMax, jMin, jMax, step }
    step *= 2
  }
}

/**
 * 绘制无尽网格：
 * - 步长随缩放自适应（1/2/5 × 10^k），任何缩放级别下网格都铺满视野
 * - 遍历范围由 gridIndexRange 保证覆盖且点数受限，平移/旋转/降维都不缺线、不卡顿
 * - 逐点变换、逐小段连线，剪切/旋转后的网格正确弯曲且保持段长可控
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  transform: Mat2,
  color: string,
): void {
  const { kMin, kMax, jMin, jMax, step } = gridIndexRange(vp, transform, gridStep(vp.scale))

  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let k = kMin; k <= kMax; k++) {
    for (let j = jMin; j <= jMax; j++) {
      const gx = k * step
      const gy = j * step
      // 水平小段：从 (gx-step, gy) 到 (gx+step, gy)
      const h1 = mat2Vec2(transform, vec2(gx - step, gy))
      const h2 = mat2Vec2(transform, vec2(gx + step, gy))
      const hs1 = worldToScreen(vp, h1.x, h1.y)
      const hs2 = worldToScreen(vp, h2.x, h2.y)
      ctx.moveTo(hs1.x, hs1.y)
      ctx.lineTo(hs2.x, hs2.y)
      // 竖直小段：从 (gx, gy-step) 到 (gx, gy+step)
      const v1 = mat2Vec2(transform, vec2(gx, gy - step))
      const v2 = mat2Vec2(transform, vec2(gx, gy + step))
      const vs1 = worldToScreen(vp, v1.x, v1.y)
      const vs2 = worldToScreen(vp, v2.x, v2.y)
      ctx.moveTo(vs1.x, vs1.y)
      ctx.lineTo(vs2.x, vs2.y)
    }
  }
  ctx.stroke()
}

/** 三角形箭头（屏幕空间，供二维与三维共用） */
export function arrowHead(
  ctx: CanvasRenderingContext2D,
  tip: { x: number; y: number },
  dir: { x: number; y: number },
  color: string,
  size = 9,
): void {
  const angle = Math.atan2(dir.y, dir.x)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(tip.x, tip.y)
  ctx.lineTo(
    tip.x - size * Math.cos(angle - Math.PI / 6),
    tip.y - size * Math.sin(angle - Math.PI / 6),
  )
  ctx.lineTo(
    tip.x - size * Math.cos(angle + Math.PI / 6),
    tip.y - size * Math.sin(angle + Math.PI / 6),
  )
  ctx.closePath()
  ctx.fill()
}

/** 坐标轴（正方向带箭头；原点移出视野时自动不可见） */
export function drawAxes(ctx: CanvasRenderingContext2D, vp: Viewport): void {
  const o = worldToScreen(vp, 0, 0)
  ctx.strokeStyle = PALETTE.axis
  ctx.lineWidth = 1.5
  // x 轴
  ctx.beginPath()
  ctx.moveTo(0, o.y)
  ctx.lineTo(vp.width, o.y)
  ctx.stroke()
  arrowHead(ctx, { x: vp.width, y: o.y }, { x: 1, y: 0 }, PALETTE.axis)
  // y 轴
  ctx.beginPath()
  ctx.moveTo(o.x, vp.height)
  ctx.lineTo(o.x, 0)
  ctx.stroke()
  arrowHead(ctx, { x: o.x, y: 0 }, { x: 0, y: -1 }, PALETTE.axis)
}

/** 向量箭头（从 from 到 to，to 端带箭头；glow 为轻微光晕） */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  from: Vec2,
  to: Vec2,
  color: string,
  lineWidth = 2,
  glow = false,
): void {
  const p1 = worldToScreen(vp, from.x, from.y)
  const p2 = worldToScreen(vp, to.x, to.y)
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  if (glow) {
    ctx.shadowColor = withAlpha(color, 0.45)
    ctx.shadowBlur = 8
  }
  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.stroke()
  if (Math.hypot(dx, dy) > 5) arrowHead(ctx, p2, { x: dx, y: dy }, color)
  ctx.shadowBlur = 0
}

/** 点 */
export function drawPoint(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  p: Vec2,
  color: string,
  radius = 3,
): void {
  const s = worldToScreen(vp, p.x, p.y)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(s.x, s.y, radius, 0, Math.PI * 2)
  ctx.fill()
}

/** 线段 */
export function drawSegment(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  a: Vec2,
  b: Vec2,
  color: string,
  lineWidth = 2,
): void {
  const p1 = worldToScreen(vp, a.x, a.y)
  const p2 = worldToScreen(vp, b.x, b.y)
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.stroke()
}

/**
 * 折线：对点列逐点施加变换后连线。
 * 非有限点（如 ln 的负数）处提笔断开，保证曲线健壮。
 */
export function drawPolyline(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  points: readonly Vec2[],
  transform: Mat2,
  color: string,
  lineWidth = 2,
  glow = false,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  if (glow) {
    ctx.shadowColor = withAlpha(color, 0.45)
    ctx.shadowBlur = 8
  }
  ctx.beginPath()
  let pen = false
  for (const p of points) {
    const q = mat2Vec2(transform, p)
    if (!isFiniteVec2(q)) {
      pen = false
      continue
    }
    const s = worldToScreen(vp, q.x, q.y)
    if (pen) ctx.lineTo(s.x, s.y)
    else {
      ctx.moveTo(s.x, s.y)
      pen = true
    }
  }
  ctx.stroke()
  ctx.shadowBlur = 0
}

/** 特征向量方向线：过原点向视野两端延伸的虚线，可选标注 λ 值；返回标签屏幕位置（供防重叠用） */
export function drawEigenLine(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  dir: Vec2,
  color: string,
  label: string | null = null,
): { x: number; y: number } | null {
  const o = worldToScreen(vp, 0, 0)
  const dx = dir.x * vp.scale
  const dy = -dir.y * vp.scale
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return null
  const ux = dx / len
  const uy = dy / len
  const D = Math.hypot(vp.width, vp.height)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.setLineDash([7, 7])
  ctx.beginPath()
  ctx.moveTo(o.x - ux * D, o.y - uy * D)
  ctx.lineTo(o.x + ux * D, o.y + uy * D)
  ctx.stroke()
  ctx.setLineDash([])
  if (label) {
    const d = Math.min(D * 0.3, 220)
    const lx = o.x + ux * d
    const ly = o.y + uy * d
    drawLabelScreen(ctx, lx, ly, label, color)
    return { x: lx, y: ly }
  }
  return null
}

/** 标签字体（统一清晰字体） */
export const LABEL_FONT = "600 13px 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif"

/** 在屏幕坐标处画文字标签，带背景色光晕保证可读性 */
export function drawLabelScreen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
): void {
  ctx.font = LABEL_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = PALETTE.background
  ctx.shadowBlur = 6
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.shadowBlur = 0
}

/** 单位正方形（对四个顶点施加变换后连线；可选填充、顶点标记与光晕） */
export function drawUnitSquare(
  ctx: CanvasRenderingContext2D,
  vp: Viewport,
  transform: Mat2,
  color: string,
  fill: string | null = null,
  vertices = false,
  glow = false,
): void {
  const corners = [vec2(0, 0), vec2(1, 0), vec2(1, 1), vec2(0, 1)].map((p) =>
    mat2Vec2(transform, p),
  )
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  if (glow) {
    ctx.shadowColor = withAlpha(color, 0.45)
    ctx.shadowBlur = 8
  }
  ctx.beginPath()
  for (let i = 0; i < corners.length; i++) {
    const s = worldToScreen(vp, corners[i].x, corners[i].y)
    if (i === 0) ctx.moveTo(s.x, s.y)
    else ctx.lineTo(s.x, s.y)
  }
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  ctx.stroke()
  if (vertices) {
    ctx.fillStyle = color
    for (const c of corners) {
      const s = worldToScreen(vp, c.x, c.y)
      ctx.beginPath()
      ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.shadowBlur = 0
}
