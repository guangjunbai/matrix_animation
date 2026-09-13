import type { Mat2, Mat3 } from '../math/mat'
import type { Vec2 } from '../math/vec'

/** 把 t 截断到 [0, 1] */
export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))

/** 数线性插值 */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** 向量线性插值（分量逐点） */
export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

/** 二维矩阵线性插值（元素逐点） */
export function lerpMat2(a: Mat2, b: Mat2, t: number): Mat2 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)]
}

/** 三维矩阵线性插值（元素逐点） */
export function lerpMat3(a: Mat3, b: Mat3, t: number): Mat3 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
    lerp(a[4], b[4], t),
    lerp(a[5], b[5], t),
    lerp(a[6], b[6], t),
    lerp(a[7], b[7], t),
    lerp(a[8], b[8], t),
  ]
}

/** 缓入缓出（三次曲线）：起步与收尾慢、中间快，动画更自然 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/** 1× 速度下走完全程的秒数 */
export const BASE_DURATION = 2

/**
 * 矩阵动画：在起止矩阵之间做逐元素线性插值，支持单段与多段序列播放。
 *
 * 泛型参数是矩阵类型（Mat2 / Mat3），插值函数与单位矩阵由外部注入，
 * 因此二维与三维共用同一套播放逻辑。
 */
export class MatrixAnimation<T> {
  private start: T
  private end: T
  /** 序列播放时剩余的段 */
  private queue: T[] = []
  /** 上次请求播放的内容（起点 + 各段目标），用于重播整段/整个序列 */
  private requested: { from: T; targets: T[] } | null = null
  private t = 0
  running = false
  speed = 1

  constructor(
    private readonly lerpFn: (a: T, b: T, t: number) => T,
    private readonly identity: () => T,
    start: T,
    end: T,
  ) {
    this.start = start
    this.end = end
  }

  /** 当前进度 t（0~1） */
  get progress(): number {
    return this.t
  }

  /** 当前应显示的矩阵 M(t)（t 经缓入缓出映射） */
  currentMatrix(): T {
    return this.lerpFn(this.start, this.end, easeInOutCubic(clamp01(this.t)))
  }

  /**
   * 立即显示某个矩阵，不播放动画：
   * 状态停在终点，起点保持单位矩阵——这样随时点播放都能从头演示完整变换。
   */
  show(m: T): void {
    this.start = this.identity()
    this.end = m
    this.queue = []
    this.requested = null
    this.t = 1
    this.running = false
  }

  /** 播放单段：从 from 连续变形到 to */
  playSegment(from: T, to: T): void {
    this.requested = { from, targets: [to] }
    this.applyRequest()
  }

  /** 连续播放多段：从单位矩阵依次变形到各目标 */
  playSequence(targets: T[]): void {
    if (targets.length === 0) return
    this.requested = { from: this.identity(), targets: [...targets] }
    this.applyRequest()
  }

  /** 按上次请求的内容开始播放（起点、当前段、剩余队列） */
  private applyRequest(): void {
    const req = this.requested
    if (!req) return
    this.start = req.from
    this.queue = req.targets.slice(1)
    this.end = req.targets[0]
    this.t = 0
    this.running = true
  }

  /** 播放：未走完则从当前位置继续；已走完则重播上次请求的内容（整段或整个序列） */
  play(): void {
    if (this.t >= 1) {
      // show() 之后没有"请求过"的内容，起点已是单位矩阵，直接回到起点即可
      if (this.requested) this.applyRequest()
      else this.t = 0
    }
    this.running = true
  }

  /** 暂停（保持当前 t） */
  pause(): void {
    this.running = false
  }

  /** 直接跳到进度 t（拖动进度条用） */
  seek(t: number): void {
    this.t = clamp01(t)
  }

  setSpeed(speed: number): void {
    this.speed = speed
  }

  /** 按真实时间推进动画（dt 单位秒）；当前段走完自动衔接下一段，末段结束则停止 */
  advance(dt: number): void {
    if (!this.running) return
    this.t = clamp01(this.t + (dt / BASE_DURATION) * this.speed)
    if (this.t < 1) return
    if (this.queue.length > 0) {
      // 进入下一段：以上一段的终点为起点
      this.start = this.end
      this.end = this.queue.shift()!
      this.t = 0
    } else {
      this.running = false
    }
  }
}
