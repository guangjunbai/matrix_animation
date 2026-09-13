import type { CanvasHandle } from './canvas'
import { createCamera, panBy, zoomAt, ZOOM_FACTOR } from './camera'

/**
 * 视口交互：
 * - 滚轮缩放（以光标为锚点，光标下的世界点保持不动）
 * - 左键拖拽平移
 * - 双击复位默认视图
 */
export function attachViewControls(
  canvas: HTMLCanvasElement,
  handle: CanvasHandle,
  isActive: () => boolean,
  onViewChange: () => void,
): void {
  canvas.addEventListener(
    'wheel',
    (event) => {
      if (!isActive()) return
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mx = event.clientX - rect.left
      const my = event.clientY - rect.top
      const factor = event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
      handle.setViewport(zoomAt(handle.vp, mx, my, factor))
      onViewChange()
    },
    { passive: false },
  )

  let dragging = false
  let lastX = 0
  let lastY = 0
  canvas.addEventListener('pointerdown', (event) => {
    if (!isActive()) return
    dragging = true
    lastX = event.clientX
    lastY = event.clientY
    canvas.setPointerCapture(event.pointerId)
    canvas.classList.add('dragging')
  })
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return
    handle.setViewport(panBy(handle.vp, event.clientX - lastX, event.clientY - lastY))
    lastX = event.clientX
    lastY = event.clientY
    onViewChange()
  })
  const endDrag = (): void => {
    dragging = false
    canvas.classList.remove('dragging')
  }
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)

  canvas.addEventListener('dblclick', () => {
    if (!isActive()) return
    handle.setViewport(createCamera(handle.vp.width, handle.vp.height))
    onViewChange()
  })
}
