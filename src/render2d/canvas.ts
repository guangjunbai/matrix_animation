import type { Viewport } from './coord'
import { createCamera } from './camera'

export interface CanvasHandle {
  ctx: CanvasRenderingContext2D
  vp: Viewport
  resize: () => void
  setViewport: (vp: Viewport) => void
}

/** 建立画布：按容器尺寸与设备像素比调整大小；首次建立默认视图 */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasHandle {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持 Canvas 2D')

  let vp: Viewport = { width: 0, height: 0, scale: 0, originX: 0, originY: 0 }

  const resize = (): void => {
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(rect.width * dpr))
    canvas.height = Math.max(1, Math.round(rect.height * dpr))
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // 首次按画布尺寸建立默认视图；之后只更新尺寸，保留用户的缩放与平移
    vp =
      vp.scale === 0
        ? createCamera(rect.width, rect.height)
        : { ...vp, width: rect.width, height: rect.height }
  }

  const handle: CanvasHandle = {
    ctx,
    get vp() {
      return vp
    },
    resize,
    setViewport(next) {
      vp = next
    },
  }

  resize()
  return handle
}
