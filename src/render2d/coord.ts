/**
 * 二维画布视口（相机）：
 * - width/height：CSS 像素尺寸
 * - scale：每数学单位对应的像素数（缩放级别）
 * - originX/originY：世界原点在屏幕上的位置（平移）
 */
export interface Viewport {
  width: number
  height: number
  scale: number
  originX: number
  originY: number
}

/** 数学坐标 → 屏幕坐标（y 轴向上） */
export function worldToScreen(vp: Viewport, x: number, y: number): { x: number; y: number } {
  return {
    x: vp.originX + x * vp.scale,
    y: vp.originY - y * vp.scale,
  }
}

/** 屏幕坐标 → 数学坐标（worldToScreen 的逆映射） */
export function screenToWorld(vp: Viewport, x: number, y: number): { x: number; y: number } {
  return {
    x: (x - vp.originX) / vp.scale,
    y: (vp.originY - y) / vp.scale,
  }
}
