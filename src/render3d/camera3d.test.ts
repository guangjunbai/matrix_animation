import { describe, expect, it } from 'vitest'
import { vec3 } from '../math/vec'
import {
  createCamera3D,
  MAX_DISTANCE,
  MIN_DISTANCE,
  orbit,
  project3D,
  resizeCamera3D,
  worldScale,
  zoomCamera3D,
} from './camera3d'

describe('createCamera3D', () => {
  it('原点在屏幕中心，焦点随视口尺寸', () => {
    const cam = createCamera3D(800, 600)
    expect(cam.cx).toBe(400)
    expect(cam.cy).toBe(300)
    expect(cam.focal).toBe(600 * 1.2)
  })

  it('默认仰角在合法范围内', () => {
    const cam = createCamera3D(800, 600)
    expect(Math.abs(cam.elevation)).toBeLessThan(Math.PI / 2)
  })
})

describe('project3D', () => {
  it('原点投影到屏幕中心', () => {
    const cam = createCamera3D(800, 600)
    const p = project3D(cam, vec3(0, 0, 0))
    expect(p).not.toBeNull()
    expect(p!.x).toBeCloseTo(400)
    expect(p!.y).toBeCloseTo(300)
    expect(p!.depth).toBeCloseTo(cam.distance)
  })

  it('z 轴正方向投影在中心上方', () => {
    const cam = createCamera3D(800, 600)
    const p = project3D(cam, vec3(0, 0, 1))!
    expect(p.y).toBeLessThan(300)
  })

  it('相机后方的点返回 null', () => {
    const cam = createCamera3D(800, 600)
    // 相机位置方向（单位向量）× 500：远在相机背后
    const dir = vec3(
      Math.cos(cam.elevation) * Math.cos(cam.azimuth),
      Math.cos(cam.elevation) * Math.sin(cam.azimuth),
      Math.sin(cam.elevation),
    )
    expect(project3D(cam, vec3(dir.x * 500, dir.y * 500, dir.z * 500))).toBeNull()
  })

  it('透视：同样大小的偏移，远处的点在屏幕上更靠近中心', () => {
    const cam = createCamera3D(800, 600)
    // 相机在 (d,0,0) 方向；取两个同向但远近不同的点
    const dx = Math.cos(cam.elevation) * Math.cos(cam.azimuth)
    const dy = Math.cos(cam.elevation) * Math.sin(cam.azimuth)
    const dz = Math.sin(cam.elevation)
    const norm = Math.hypot(dx, dy, dz)
    // 沿视线方向（离相机更近）与反方向各取一点，再加上同样的横向偏移
    const near = project3D(cam, vec3((dx / norm) * 3, (dy / norm) * 3, (dz / norm) * 3 + 1))!
    const far = project3D(cam, vec3((-dx / norm) * 3, (-dy / norm) * 3, (-dz / norm) * 3 + 1))!
    const centerDist = (p: { x: number; y: number }) => Math.hypot(p.x - cam.cx, p.y - cam.cy)
    expect(centerDist(far)).toBeLessThan(centerDist(near))
  })
})

describe('orbit', () => {
  it('水平拖拽改变方位角，竖直拖拽改变仰角', () => {
    const cam = createCamera3D(800, 600)
    const moved = orbit(cam, 50, 20)
    expect(moved.azimuth).not.toBeCloseTo(cam.azimuth)
    expect(moved.elevation).toBeGreaterThan(cam.elevation)
  })

  it('仰角被限制在 ±(π/2 − ε)，不会翻过极点', () => {
    const cam = createCamera3D(800, 600)
    const up = orbit(cam, 0, 100000)
    const down = orbit(cam, 0, -100000)
    expect(up.elevation).toBeLessThan(Math.PI / 2)
    expect(down.elevation).toBeGreaterThan(-Math.PI / 2)
  })
})

describe('zoomCamera3D', () => {
  it('factor > 1 拉近，视距变小', () => {
    const cam = createCamera3D(800, 600)
    expect(zoomCamera3D(cam, 2).distance).toBeCloseTo(cam.distance / 2)
  })

  it('视距被限制在上下限内', () => {
    const cam = createCamera3D(800, 600)
    expect(zoomCamera3D(cam, 1e6).distance).toBe(MIN_DISTANCE)
    expect(zoomCamera3D(cam, 1e-6).distance).toBe(MAX_DISTANCE)
  })
})

describe('resizeCamera3D', () => {
  it('更新焦距与中心，保留视角与视距', () => {
    const cam = createCamera3D(800, 600)
    const resized = resizeCamera3D(cam, 1000, 400)
    expect(resized.cx).toBe(500)
    expect(resized.cy).toBe(200)
    expect(resized.focal).toBe(400 * 1.2)
    expect(resized.azimuth).toBe(cam.azimuth)
    expect(resized.distance).toBe(cam.distance)
  })
})

describe('worldScale', () => {
  it('等于焦距/视距', () => {
    const cam = createCamera3D(800, 600)
    expect(worldScale(cam)).toBeCloseTo(cam.focal / cam.distance)
  })
})
