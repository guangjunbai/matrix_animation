import type { Vec3 } from '../math/vec'
import { cross3, normalize3, vec3 } from '../math/vec'

/**
 * 轨道相机：绕原点旋转（方位角 + 仰角），用视距缩放。
 * 世界坐标约定为 z 轴向上。
 */
export interface Camera3D {
  /** 方位角（弧度，绕 z 轴） */
  azimuth: number
  /** 仰角（弧度，相对 xy 平面） */
  elevation: number
  /** 视距（世界单位） */
  distance: number
  /** 焦距（像素） */
  focal: number
  /** 屏幕中心 x */
  cx: number
  /** 屏幕中心 y */
  cy: number
}

export const MIN_DISTANCE = 1.5
export const MAX_DISTANCE = 80

/** 仰角上限：避免视线与 z 轴重合导致基向量退化 */
const MAX_ELEVATION = Math.PI / 2 - 0.02

/** 拖拽旋转灵敏度（弧度/像素） */
export const ORBIT_SPEED = 0.008

/** 滚轮缩放系数 */
export const ZOOM_FACTOR = 1.15

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** 默认视角：从右前上方看原点 */
export function createCamera3D(width: number, height: number): Camera3D {
  return {
    azimuth: -Math.PI / 5,
    elevation: Math.PI / 7,
    distance: 6,
    focal: Math.min(width, height) * 1.2,
    cx: width / 2,
    cy: height / 2,
  }
}

/** 视口尺寸变化：更新焦距与屏幕中心，保留视角与视距 */
export function resizeCamera3D(cam: Camera3D, width: number, height: number): Camera3D {
  return { ...cam, focal: Math.min(width, height) * 1.2, cx: width / 2, cy: height / 2 }
}

/** 相机基向量（世界坐标） */
function cameraBasis(cam: Camera3D): { eye: Vec3; right: Vec3; up: Vec3; forward: Vec3 } {
  const ce = Math.cos(cam.elevation)
  const se = Math.sin(cam.elevation)
  const ca = Math.cos(cam.azimuth)
  const sa = Math.sin(cam.azimuth)
  const eye = vec3(cam.distance * ce * ca, cam.distance * ce * sa, cam.distance * se)

  // 视线方向：相机 → 原点
  const forward = vec3(-ce * ca, -ce * sa, -se)
  // right = forward × 世界 z 轴（仰角受限，不会退化）
  const right = normalize3(cross3(forward, vec3(0, 0, 1)))
  const up = cross3(right, forward)
  return { eye, right, up, forward }
}

/**
 * 世界坐标 → 屏幕坐标（透视投影）。
 * 返回 null 表示点在相机后方（不可见）。
 */
export function project3D(cam: Camera3D, p: Vec3): { x: number; y: number; depth: number } | null {
  const { eye, right, up, forward } = cameraBasis(cam)
  const vx = p.x - eye.x
  const vy = p.y - eye.y
  const vz = p.z - eye.z
  const depth = vx * forward.x + vy * forward.y + vz * forward.z
  if (depth <= 1e-6) return null
  const sx = vx * right.x + vy * right.y + vz * right.z
  const sy = vx * up.x + vy * up.y + vz * up.z
  return {
    x: cam.cx + (sx / depth) * cam.focal,
    y: cam.cy - (sy / depth) * cam.focal,
    depth,
  }
}

/** 拖拽轨道旋转：dx/dy 为屏幕像素位移 */
export function orbit(cam: Camera3D, dx: number, dy: number): Camera3D {
  return {
    ...cam,
    azimuth: cam.azimuth - dx * ORBIT_SPEED,
    elevation: clamp(cam.elevation + dy * ORBIT_SPEED, -MAX_ELEVATION, MAX_ELEVATION),
  }
}

/** 滚轮缩放：factor > 1 拉近（变大） */
export function zoomCamera3D(cam: Camera3D, factor: number): Camera3D {
  return { ...cam, distance: clamp(cam.distance / factor, MIN_DISTANCE, MAX_DISTANCE) }
}

/** 原点处的像素/世界单位比例，用于网格步长自适应 */
export function worldScale(cam: Camera3D): number {
  return cam.focal / cam.distance
}
