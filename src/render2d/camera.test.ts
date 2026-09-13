import { describe, expect, it } from 'vitest'
import { createCamera, gridStep, MAX_SCALE, MIN_SCALE, panBy, zoomAt } from './camera'
import { screenToWorld } from './coord'

describe('createCamera', () => {
  it('原点在画布中心，缩放随尺寸自适应', () => {
    const cam = createCamera(800, 600)
    expect(cam.originX).toBe(400)
    expect(cam.originY).toBe(300)
    expect(cam.scale).toBe(50) // min(800,600)/12，在 [30,120] 内
  })

  it('初始缩放被夹在上下限内', () => {
    expect(createCamera(4000, 4000).scale).toBe(120)
    expect(createCamera(200, 200).scale).toBe(30)
  })
})

describe('zoomAt', () => {
  it('锚点下的世界点保持不变', () => {
    const cam = createCamera(800, 600)
    const before = screenToWorld(cam, 500, 200)
    const next = zoomAt(cam, 500, 200, 1.5)
    const after = screenToWorld(next, 500, 200)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
    expect(next.scale).toBeCloseTo(cam.scale * 1.5)
  })

  it('缩放在上下限处截断', () => {
    const cam = createCamera(800, 600)
    expect(zoomAt(cam, 400, 300, 1e9).scale).toBe(MAX_SCALE)
    expect(zoomAt(cam, 400, 300, 1e-9).scale).toBe(MIN_SCALE)
  })
})

describe('panBy', () => {
  it('原点随屏幕位移移动', () => {
    const cam = createCamera(800, 600)
    const next = panBy(cam, 30, -20)
    expect(next.originX).toBe(430)
    expect(next.originY).toBe(280)
  })
})

describe('gridStep', () => {
  it('常规缩放（64px/单位）步长为 1', () => {
    expect(gridStep(64)).toBe(1)
  })

  it('放大时单位细分', () => {
    expect(gridStep(200)).toBeCloseTo(0.2)
    expect(gridStep(5000)).toBeCloseTo(0.01)
  })

  it('缩小时单位合并', () => {
    expect(gridStep(30)).toBe(2)
    expect(gridStep(10)).toBe(5)
  })
})
