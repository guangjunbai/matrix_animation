import { describe, expect, it } from 'vitest'
import type { Mat2 } from '../math/mat'
import { mat2, mat2Identity, mat3, mat3Identity } from '../math/mat'
import { vec2 } from '../math/vec'
import {
  BASE_DURATION,
  clamp01,
  easeInOutCubic,
  lerp,
  lerpMat2,
  lerpMat3,
  lerpVec2,
  MatrixAnimation,
} from './matrixAnimation'

/** 构造一个二维矩阵动画（测试里最常用） */
const anim2 = (from: Mat2, to: Mat2): MatrixAnimation<Mat2> =>
  new MatrixAnimation(lerpMat2, mat2Identity, from, to)

describe('插值', () => {
  it('clamp01 截断越界值', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(0.5)).toBe(0.5)
    expect(clamp01(2)).toBe(1)
  })

  it('lerp 端点与中点', () => {
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
    expect(lerp(0, 10, 0.5)).toBe(5)
  })

  it('lerpVec2 分量逐点插值', () => {
    expect(lerpVec2(vec2(0, 0), vec2(2, 4), 0.5)).toEqual(vec2(1, 2))
  })

  it('lerpMat2 元素逐点插值', () => {
    expect(lerpMat2(mat2(0, 0, 0, 0), mat2(2, 4, 6, 8), 0.5)).toEqual(mat2(1, 2, 3, 4))
  })

  it('lerpMat3 元素逐点插值', () => {
    const a = mat3(0, 0, 0, 0, 0, 0, 0, 0, 0)
    const b = mat3(2, 4, 6, 8, 10, 12, 14, 16, 18)
    expect(lerpMat3(a, b, 0.5)).toEqual(mat3(1, 2, 3, 4, 5, 6, 7, 8, 9))
  })
})

describe('easeInOutCubic', () => {
  it('端点与中点不动', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5)
  })

  it('前段减速起步、后段减速收尾且对称', () => {
    const a = easeInOutCubic(0.25)
    const b = easeInOutCubic(0.75)
    expect(a).toBeLessThan(0.25) // 前段慢于线性
    expect(b).toBeGreaterThan(0.75) // 后段快于线性
    expect(a + b).toBeCloseTo(1)
  })
})

describe('MatrixAnimation（二维）', () => {
  const from = mat2(1, 0, 0, 1)
  const to = mat2(0, -1, 1, 0)

  it('初始显示起始矩阵', () => {
    expect(anim2(from, to).currentMatrix()).toEqual(from)
  })

  it('advance 按时间推进，走完自动停止', () => {
    const anim = anim2(from, to)
    anim.play()
    anim.advance(BASE_DURATION / 2) // 半程
    expect(anim.progress).toBeCloseTo(0.5)
    anim.advance(BASE_DURATION) // 走完
    expect(anim.progress).toBe(1)
    expect(anim.running).toBe(false)
    expect(anim.currentMatrix()).toEqual(to)
  })

  it('速度倍率生效', () => {
    const anim = anim2(from, to)
    anim.play()
    anim.setSpeed(2)
    anim.advance(BASE_DURATION / 2) // 2× 速度半程即完成
    expect(anim.progress).toBe(1)
  })

  it('暂停后 advance 不再推进', () => {
    const anim = anim2(from, to)
    anim.play()
    anim.advance(0.1)
    anim.pause()
    anim.advance(1)
    expect(anim.progress).toBeCloseTo(0.1 / BASE_DURATION)
  })

  it('show 立即显示矩阵且不播放', () => {
    const anim = anim2(from, to)
    const m = mat2(2, 0, 0, 3)
    anim.show(m)
    expect(anim.running).toBe(false)
    expect(anim.progress).toBe(1)
    expect(anim.currentMatrix()).toEqual(m)
  })

  it('show 之后 play 从单位矩阵完整播放到该矩阵', () => {
    const anim = anim2(from, to)
    const m = mat2(2, 0, 0, 3)
    anim.show(m)
    anim.play()
    expect(anim.progress).toBe(0)
    expect(anim.currentMatrix()).toEqual(mat2Identity())
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(m)
  })

  it('playSequence 依次播放各段，段间自动衔接', () => {
    const anim = anim2(from, to)
    const a = mat2(0, -1, 1, 0)
    const b = mat2(2, 0, 0, 3)
    const c = mat2(1, 1, 0, 1)
    anim.playSequence([a, b, c])
    expect(anim.currentMatrix()).toEqual(mat2Identity()) // 从单位矩阵起步
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(a)
    expect(anim.progress).toBe(0) // 已进入第二段
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(b)
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(c)
    expect(anim.running).toBe(false)
  })

  it('序列播完后 play 重播整个序列', () => {
    const anim = anim2(from, to)
    const a = mat2(0, -1, 1, 0)
    const b = mat2(2, 0, 0, 3)
    anim.playSequence([a, b])
    anim.advance(BASE_DURATION)
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(b)
    anim.play()
    expect(anim.progress).toBe(0)
    expect(anim.currentMatrix()).toEqual(mat2Identity())
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(a)
  })

  it('单段播完后 play 重播该段（回到指定的起点）', () => {
    const anim = anim2(from, to)
    const a = mat2(0, -1, 1, 0)
    const b = mat2(2, 0, 0, 3)
    anim.playSegment(a, b)
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(b)
    anim.play()
    expect(anim.progress).toBe(0)
    expect(anim.currentMatrix()).toEqual(a)
  })

  it('playSegment 播放指定的区间', () => {
    const anim = anim2(from, to)
    const a = mat2(0, -1, 1, 0)
    const b = mat2(2, 0, 0, 3)
    anim.playSegment(a, b)
    expect(anim.running).toBe(true)
    expect(anim.progress).toBe(0)
    expect(anim.currentMatrix()).toEqual(a)
    anim.advance(BASE_DURATION / 2)
    expect(anim.progress).toBeCloseTo(0.5)
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(b)
  })

  it('走完后再次 play 从头重播', () => {
    const anim = anim2(from, to)
    anim.play()
    anim.advance(BASE_DURATION)
    expect(anim.progress).toBe(1)
    expect(anim.running).toBe(false)
    anim.play()
    expect(anim.running).toBe(true)
    expect(anim.progress).toBe(0)
    expect(anim.currentMatrix()).toEqual(from)
    anim.advance(BASE_DURATION / 2)
    expect(anim.progress).toBeCloseTo(0.5)
  })

  it('走完一半后 play 从当前位置继续', () => {
    const anim = anim2(from, to)
    anim.play()
    anim.advance(BASE_DURATION / 2)
    anim.pause()
    anim.play()
    expect(anim.progress).toBeCloseTo(0.5)
    expect(anim.running).toBe(true)
  })

  it('seek 截断越界进度', () => {
    const anim = anim2(from, to)
    anim.seek(5)
    expect(anim.progress).toBe(1)
    anim.seek(-2)
    expect(anim.progress).toBe(0)
  })
})

describe('MatrixAnimation（三维，同一套逻辑）', () => {
  it('show 与 play 走完整变换', () => {
    const target = mat3(2, 0, 0, 0, 1, 0, 0, 0, 3)
    const anim = new MatrixAnimation(lerpMat3, mat3Identity, mat3Identity(), mat3Identity())
    anim.show(target)
    expect(anim.currentMatrix()).toEqual(target)
    anim.play()
    expect(anim.currentMatrix()).toEqual(mat3Identity())
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(target)
  })

  it('序列播放逐段衔接', () => {
    const a = mat3(0, -1, 0, 1, 0, 0, 0, 0, 1)
    const b = mat3(2, 0, 0, 0, 1, 0, 0, 0, 3)
    const anim = new MatrixAnimation(lerpMat3, mat3Identity, mat3Identity(), mat3Identity())
    anim.playSequence([a, b])
    expect(anim.currentMatrix()).toEqual(mat3Identity())
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(a)
    anim.advance(BASE_DURATION)
    expect(anim.currentMatrix()).toEqual(b)
    expect(anim.running).toBe(false)
  })
})
