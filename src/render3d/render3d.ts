import type { Eigen3D } from '../math/eigen3'
import { eigen3DLines } from '../math/eigen3'
import { fmtExact, fmtNum } from '../math/format'
import type { Mat3 } from '../math/mat'
import { mat3Identity, mat3Vec3 } from '../math/mat'
import type { Vec3 } from '../math/vec'
import { isFiniteVec3, scale3, vec3 } from '../math/vec'
import { gridStep } from '../render2d/camera'
import { arrowHead, drawLabelScreen, PALETTE, withAlpha } from '../render2d/draw'
import { sceneTint, TINT_COLOR } from '../render2d/render'
import type { ShapeSpec3 } from '../render2d/shape'
import { sampleShape3 } from '../render2d/shape'
import type { Camera3D } from './camera3d'
import { project3D, worldScale } from './camera3d'

export interface Scene3DOptions {
  mat: Mat3
  progress: number
  cam: Camera3D
  width: number
  height: number
  /** 目标矩阵的特征信息（特征方向标注） */
  eigen?: Eigen3D | null
  /** 自定义空间曲线 */
  shape?: ShapeSpec3 | null
  /** 用户指定的向量：绘制其原始位置与变换后的位置 */
  vector?: Vec3 | null
}

/** 三个基向量与其颜色、标签 */
const BASIS: Vec3[] = [vec3(1, 0, 0), vec3(0, 1, 0), vec3(0, 0, 1)]
const BASIS_COLORS = [PALETTE.e1, PALETTE.e2, PALETTE.e3]
const BASIS_NAMES = ['e₁', 'e₂', 'e₃']

/** 单位立方体：8 个顶点（0/1 组合）与 12 条棱 */
const CUBE_VERTICES: Vec3[] = [
  vec3(0, 0, 0),
  vec3(1, 0, 0),
  vec3(1, 1, 0),
  vec3(0, 1, 0),
  vec3(0, 0, 1),
  vec3(1, 0, 1),
  vec3(1, 1, 1),
  vec3(0, 1, 1),
]
const CUBE_EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0], // 底面
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4], // 顶面
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7], // 竖棱
]

/** 单帧网格线数量上限（每方向），超出则倍增步长抽稀 */
const MAX_GRID_LINES = 24

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** 地板网格的世界范围：按视距估计，并考虑变换的收缩（奇异矩阵时放大，但有上限） */
function gridExtent(cam: Camera3D, mat: Mat3): number {
  const view = cam.distance * 1.8
  const colScale = Math.max(
    Math.min(
      Math.hypot(mat[0], mat[3], mat[6]),
      Math.hypot(mat[1], mat[4], mat[7]),
      Math.hypot(mat[2], mat[5], mat[8]),
    ),
    1e-3,
  )
  return clamp(view / colScale, view, 200)
}

/** 网格步长：随缩放自适应，并保证线数不超上限 */
function gridParams(cam: Camera3D, mat: Mat3): { extent: number; step: number } {
  let step = gridStep(worldScale(cam))
  const extent = gridExtent(cam, mat)
  while (extent / step > MAX_GRID_LINES) step *= 2
  return { extent, step }
}

/** 投影并画一条线段；任一端在相机后方则跳过 */
function line3(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  a: Vec3,
  b: Vec3,
  color: string,
  width = 1,
): void {
  const p = project3D(cam, a)
  const q = project3D(cam, b)
  if (!p || !q) return
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  ctx.lineTo(q.x, q.y)
  ctx.stroke()
}

/** 把线段均分成若干小段绘制，避免长线段跨越相机平面时整条消失 */
function segmentedLine3(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  a: Vec3,
  b: Vec3,
  color: string,
  width: number,
  pieces = 6,
): void {
  for (let i = 0; i < pieces; i++) {
    const t0 = i / pieces
    const t1 = (i + 1) / pieces
    line3(
      ctx,
      cam,
      vec3(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.z + (b.z - a.z) * t0),
      vec3(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1, a.z + (b.z - a.z) * t1),
      color,
      width,
    )
  }
}

/** 三维箭头：线段 + 屏幕空间箭头 */
function arrow3(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  from: Vec3,
  to: Vec3,
  color: string,
  width = 2,
  glow = false,
): void {
  const p = project3D(cam, from)
  const q = project3D(cam, to)
  if (!p || !q) return
  const dx = q.x - p.x
  const dy = q.y - p.y
  ctx.strokeStyle = color
  ctx.lineWidth = width
  if (glow) {
    ctx.shadowColor = withAlpha(color, 0.45)
    ctx.shadowBlur = 8
  }
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  ctx.lineTo(q.x, q.y)
  ctx.stroke()
  if (Math.hypot(dx, dy) > 6) arrowHead(ctx, q, { x: dx, y: dy }, color, 8)
  ctx.shadowBlur = 0
}

/**
 * 坐标轴：三条穿过原点的轴线。
 * 正半轴亮而粗并带箭头，负半轴压暗，画在网格之上保证清晰可辨。
 */
function axes3(ctx: CanvasRenderingContext2D, cam: Camera3D, extent: number): void {
  const origin = vec3(0, 0, 0)
  for (let i = 0; i < 3; i++) {
    const dir = BASIS[i]
    const neg = vec3(-dir.x * extent, -dir.y * extent, -dir.z * extent)
    const pos = vec3(dir.x * extent, dir.y * extent, dir.z * extent)
    // 负半轴（暗）
    segmentedLine3(ctx, cam, neg, origin, withAlpha(BASIS_COLORS[i], 0.28), 1)
    // 正半轴（亮）+ 末端箭头
    segmentedLine3(ctx, cam, origin, pos, withAlpha(BASIS_COLORS[i], 0.8), 1.6)
    arrow3(
      ctx,
      cam,
      vec3(dir.x * extent * 0.86, dir.y * extent * 0.86, dir.z * extent * 0.86),
      pos,
      BASIS_COLORS[i],
      1.6,
    )
  }
}

/** 地板网格（z = 0 平面）：对每个格点变换后画短线段 */
function grid3(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  transform: Mat3,
  color: string,
  extent: number,
  step: number,
): void {
  const n = Math.ceil(extent / step)
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.beginPath()
  // 逐格点画短线（变换后仍是直线，故每段只需投影两端）
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const gx = i * step
      const gy = j * step
      for (const [ax, ay] of [
        [step, 0],
        [0, step],
      ]) {
        const a = project3D(cam, mat3Vec3(transform, vec3(gx - ax, gy - ay, 0)))
        const b = project3D(cam, mat3Vec3(transform, vec3(gx + ax, gy + ay, 0)))
        if (!a || !b) continue
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
      }
    }
  }
  ctx.stroke()
}

/** 单位立方体线框（对 8 个顶点施加变换后连棱） */
function cube3(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  transform: Mat3,
  color: string,
  width = 2,
  glow = false,
): void {
  const pts = CUBE_VERTICES.map((v) => mat3Vec3(transform, v))
  ctx.strokeStyle = color
  ctx.lineWidth = width
  if (glow) {
    ctx.shadowColor = withAlpha(color, 0.45)
    ctx.shadowBlur = 8
  }
  ctx.beginPath()
  for (const [i, j] of CUBE_EDGES) {
    const a = project3D(cam, pts[i])
    const b = project3D(cam, pts[j])
    if (!a || !b) continue
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0
}

/** 空间参数曲线：逐点变换后连接，非有限点或相机后方的点处断开 */
function polyline3(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  points: readonly Vec3[],
  transform: Mat3,
  color: string,
  width: number,
  glow = false,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  if (glow) {
    ctx.shadowColor = withAlpha(color, 0.45)
    ctx.shadowBlur = 8
  }
  ctx.beginPath()
  let pen = false
  for (const p of points) {
    const q = mat3Vec3(transform, p)
    if (!isFiniteVec3(q)) {
      pen = false
      continue
    }
    const s = project3D(cam, q)
    if (!s) {
      pen = false
      continue
    }
    if (pen) ctx.lineTo(s.x, s.y)
    else ctx.moveTo(s.x, s.y)
    pen = true
  }
  ctx.stroke()
  ctx.shadowBlur = 0
}

const SUBS = ['₁', '₂', '₃']
/** 每条特征方向一种颜色（前两个与二维完全一致） */
const EIGEN_COLORS = [PALETTE.eigen1, PALETTE.eigen2, PALETTE.eigen3]

/** 标签防重叠：与已放置的标签过近时沿竖直方向错开 */
function placeLabel(
  placed: Array<{ x: number; y: number }>,
  x: number,
  y: number,
): { x: number; y: number } {
  let ny = y
  for (const p of placed) {
    if (Math.hypot(x - p.x, ny - p.y) < 28) {
      ny += ny >= p.y ? 18 : -18
      break
    }
  }
  placed.push({ x, y: ny })
  return { x, y: ny }
}

/**
 * 特征方向标注（与二维同款）：
 * - 贯穿视野的虚线 + λ 标签，每条特征方向一种颜色
 * - 幽灵箭头（原始 v，半透明）与实心箭头（M(t)·v，发光），带 vᵢ 标签
 * 特征空间为 2/3 维时不画（由面板文字说明）。
 */
function eigenMarkers3(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  extent: number,
  lines: Array<{ value: number; vector: Vec3 }>,
  transform: Mat3,
  showArrows: boolean,
): void {
  const withIndex = lines.length === 3
  const placed: Array<{ x: number; y: number }> = []

  lines.forEach((line, i) => {
    const color = EIGEN_COLORS[i % EIGEN_COLORS.length]
    const v = line.vector

    // 虚线：整条不变方向
    const a = project3D(cam, scale3(v, -extent))
    const b = project3D(cam, scale3(v, extent))
    if (a && b) {
      ctx.strokeStyle = withAlpha(color, 0.55)
      ctx.lineWidth = 1.5
      ctx.setLineDash([7, 7])
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    // λ 标签贴在虚线上
    const lp = project3D(cam, scale3(v, extent * 0.5))
    if (lp) {
      const at = placeLabel(placed, lp.x, lp.y)
      const name = withIndex ? `λ${SUBS[i]}` : 'λ'
      drawLabelScreen(ctx, at.x, at.y, `${name} = ${fmtExact(line.value)}`, color)
    }

    if (!showArrows) return
    // 幽灵箭头：变换前的 v
    arrow3(ctx, cam, vec3(0, 0, 0), v, withAlpha(color, 0.35), 2)
    // 实心箭头：变换后的 M(t)·v，终点落在虚线上、被拉伸 λ 倍
    const mv = mat3Vec3(transform, v)
    arrow3(ctx, cam, vec3(0, 0, 0), mv, color, 2.5, true)
    const tp = project3D(cam, mv)
    if (tp) {
      const at = placeLabel(placed, tp.x, tp.y + 16)
      drawLabelScreen(ctx, at.x, at.y, `v${withIndex ? SUBS[i] : ''}`, color)
    }
  })
}

/** 在点的投影处沿"原点 → 点"方向偏移画标签 */
function label3(
  ctx: CanvasRenderingContext2D,
  cam: Camera3D,
  p: Vec3,
  text: string,
  color: string,
): void {
  const s = project3D(cam, p)
  const o = project3D(cam, vec3(0, 0, 0))
  if (!s || !o) return
  const dx = s.x - o.x
  const dy = s.y - o.y
  const len = Math.hypot(dx, dy)
  const k = len > 1 ? 1 + 24 / len : 1
  drawLabelScreen(ctx, o.x + dx * k, o.y + dy * k, text, color)
}

/**
 * 绘制三维一帧：地板网格、单位立方体、三个基向量。
 * 与二维一样按动画进度分三层配色：原始（灰）→ 中间态（琥珀）→ 变换后（蓝）。
 */
export function renderScene3D(
  ctx: CanvasRenderingContext2D,
  opts: Scene3DOptions,
): void {
  const { mat, progress, cam, width, height, eigen = null, shape = null, vector = null } = opts
  const tint = sceneTint(progress)
  const color = TINT_COLOR[tint]
  const identity = mat3Identity()
  const { extent, step } = gridParams(cam, mat)

  ctx.fillStyle = PALETTE.background
  ctx.fillRect(0, 0, width, height)

  // 原始图层（灰）：地板网格 + 单位立方体 + 基向量幽灵
  grid3(ctx, cam, identity, PALETTE.grid, extent, step)
  cube3(ctx, cam, identity, PALETTE.original, 1.2)
  for (let i = 0; i < 3; i++) {
    arrow3(ctx, cam, vec3(0, 0, 0), BASIS[i], withAlpha(BASIS_COLORS[i], 0.45), 1.5)
  }

  // 变换图层（进度为 0 时与原始态重合，不画）
  if (tint !== 'original') {
    grid3(ctx, cam, mat, withAlpha(PALETTE.gridTransformed, 0.5), extent, step)
    cube3(ctx, cam, mat, color, 2, true)
  }

  // 自定义空间曲线：原始（灰）与变换后（随三色切换）
  if (shape) {
    const pts = sampleShape3(shape)
    polyline3(ctx, cam, pts, identity, withAlpha(PALETTE.original, 0.85), 1.5)
    if (tint !== 'original') {
      polyline3(ctx, cam, pts, mat, color, 2.5, true)
    }
  }

  // 坐标轴画在网格之上，保证清晰可辨
  axes3(ctx, cam, extent)

  // 变换后的基向量与坐标标签在最上层
  if (tint !== 'original') {
    for (let i = 0; i < 3; i++) {
      const v = mat3Vec3(mat, BASIS[i])
      arrow3(ctx, cam, vec3(0, 0, 0), v, BASIS_COLORS[i], 2.5, true)
      label3(
        ctx,
        cam,
        v,
        `${BASIS_NAMES[i]} = (${fmtNum(v.x)}, ${fmtNum(v.y)}, ${fmtNum(v.z)})`,
        BASIS_COLORS[i],
      )
    }
  }

  // 用户指定的向量：幽灵（原始位置）+ 变换后（实时坐标标签）
  if (vector) {
    arrow3(ctx, cam, vec3(0, 0, 0), vector, withAlpha(PALETTE.vector, 0.4), 1.5)
    if (tint !== 'original') {
      const mv = mat3Vec3(mat, vector)
      arrow3(ctx, cam, vec3(0, 0, 0), mv, PALETTE.vector, 2.5, true)
      label3(
        ctx,
        cam,
        mv,
        `v = (${fmtNum(mv.x)}, ${fmtNum(mv.y)}, ${fmtNum(mv.z)})`,
        PALETTE.vector,
      )
    }
  }

  // 特征方向标注画在最上层，保证醒目
  if (eigen) {
    eigenMarkers3(ctx, cam, extent, eigen3DLines(eigen), mat, tint !== 'original')
  }

  // 坐标轴标签（贴在各轴正方向末端）
  for (let i = 0; i < 3; i++) {
    const dir = BASIS[i]
    const p = vec3(dir.x * extent * 0.94, dir.y * extent * 0.94, dir.z * extent * 0.94)
    const s = project3D(cam, p)
    if (s) drawLabelScreen(ctx, s.x + 10, s.y - 10, 'xyz'[i], BASIS_COLORS[i])
  }
}
