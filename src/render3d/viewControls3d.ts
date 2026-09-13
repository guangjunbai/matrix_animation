import type { Camera3D } from './camera3d'
import { createCamera3D, orbit, zoomCamera3D, ZOOM_FACTOR } from './camera3d'

/**
 * 三维视图交互：
 * - 拖拽 = 轨道旋转（绕原点）
 * - 滚轮 = 缩放（改变视距）
 * - 双击 = 复位默认视角
 */
export function attachViewControls3D(
  canvas: HTMLCanvasElement,
  getCamera: () => Camera3D,
  setCamera: (cam: Camera3D) => void,
  isActive: () => boolean,
  onViewChange: () => void,
): void {
  canvas.addEventListener(
    'wheel',
    (event) => {
      if (!isActive()) return
      event.preventDefault()
      setCamera(zoomCamera3D(getCamera(), event.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR))
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
    setCamera(orbit(getCamera(), event.clientX - lastX, event.clientY - lastY))
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
    const cam = getCamera()
    setCamera({ ...createCamera3D(1, 1), cx: cam.cx, cy: cam.cy, focal: cam.focal })
    onViewChange()
  })
}
