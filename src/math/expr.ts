/**
 * 数学表达式解析器（递归下降，零依赖）。
 *
 * 文法（优先级从低到高）：
 *   expr    := term (('+' | '-') term)*
 *   term    := unary (('*' | '/') unary)*
 *   unary   := ('+' | '-') unary | power
 *   power   := primary ('^' unary)?          // 右结合，允许 2^-3
 *   primary := 数字 | t | pi | e | 函数 '(' expr ')' | '(' expr ')'
 *
 * 支持隐式乘法：2t、2sin(t)、3pi、(t)cos(t)、t sin(t)。
 * 一元负号比乘方弱：-t^2 = -(t^2)。
 */

/** 表达式错误（带源串中的字符位置） */
export class ExprError extends Error {
  constructor(
    message: string,
    readonly pos: number,
  ) {
    super(message)
    this.name = 'ExprError'
  }
}

type Token =
  | { kind: 'num'; value: number; pos: number }
  | { kind: 'ident'; name: string; pos: number }
  | { kind: 'op'; op: string; pos: number }

const FUNCTIONS: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
}

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E }

const VALUE_IDENTS = new Set(['t', ...Object.keys(CONSTANTS)])

const isDigit = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9'

const isLetter = (c: string | undefined): boolean =>
  c !== undefined && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_')

const isSpace = (c: string): boolean => c === ' ' || c === '\t' || c === '\n'

function tokenize(src: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  // 上一个 token 是否可以作为值的结尾（数字、右括号、值标识符）
  let prevIsValue = false

  const push = (t: Token): void => {
    tokens.push(t)
    prevIsValue =
      t.kind === 'num' || (t.kind === 'op' && t.op === ')') || (t.kind === 'ident' && VALUE_IDENTS.has(t.name))
  }

  while (i < src.length) {
    const c = src[i]
    if (isSpace(c)) {
      i++
      continue
    }

    // 隐式乘法：2t、2sin(t)、3pi、(t)cos(t)、t sin(t)、2π 等
    if (prevIsValue && (isLetter(c) || c === '(' || c === 'π')) {
      push({ kind: 'op', op: '*', pos: i })
      continue
    }

    // π 字符等价于 pi
    if (c === 'π') {
      push({ kind: 'ident', name: 'pi', pos: i })
      i++
      continue
    }

    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      const start = i
      while (isDigit(src[i])) i++
      if (src[i] === '.') {
        i++
        while (isDigit(src[i])) i++
      }
      if (src[i] === 'e' || src[i] === 'E') {
        const save = i
        i++
        if (src[i] === '+' || src[i] === '-') i++
        if (isDigit(src[i])) {
          while (isDigit(src[i])) i++
        } else {
          i = save // 不是科学计数法，回退（如 "1e" 中的 e 作为常量）
        }
      }
      push({ kind: 'num', value: Number(src.slice(start, i)), pos: start })
      continue
    }

    if (isLetter(c)) {
      const start = i
      while (isLetter(src[i]) || isDigit(src[i])) i++
      const name = src.slice(start, i)
      // 跳过空白看是否函数调用
      let j = i
      while (j < src.length && isSpace(src[j])) j++
      if (src[j] === '(' && FUNCTIONS[name]) {
        push({ kind: 'ident', name, pos: start })
      } else if (FUNCTIONS[name]) {
        throw new ExprError(`函数 ${name} 需要括号调用，如 ${name}(t)`, start)
      } else if (VALUE_IDENTS.has(name)) {
        push({ kind: 'ident', name, pos: start })
      } else {
        throw new ExprError(`未知符号 “${name}”`, start)
      }
      continue
    }

    if ('+-*/^(),'.includes(c)) {
      push({ kind: 'op', op: c, pos: i })
      i++
      continue
    }

    throw new ExprError(`无法识别的字符 “${c}”`, i)
  }
  return tokens
}

class Parser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private next(): Token {
    const t = this.tokens[this.pos]
    if (!t) {
      const last = this.tokens[this.tokens.length - 1]
      throw new ExprError('表达式不完整', last ? last.pos : 0)
    }
    this.pos++
    return t
  }

  private expect(op: string): void {
    const t = this.next()
    if (t.kind !== 'op' || t.op !== op) throw new ExprError(`缺少 “${op}”`, t.pos)
  }

  describe(t: Token): string {
    if (t.kind === 'op') return `“${t.op}”`
    if (t.kind === 'num') return String(t.value)
    return `“${t.name}”`
  }

  /** expr := term (('+' | '-') term)* */
  expr(): (t: number) => number {
    let left = this.term()
    for (;;) {
      const tok = this.peek()
      if (tok && tok.kind === 'op' && (tok.op === '+' || tok.op === '-')) {
        this.next()
        const right = this.term()
        const a = left
        left = tok.op === '+' ? (t: number) => a(t) + right(t) : (t: number) => a(t) - right(t)
      } else {
        return left
      }
    }
  }

  /** term := unary (('*' | '/') unary)* */
  term(): (t: number) => number {
    let left = this.unary()
    for (;;) {
      const tok = this.peek()
      if (tok && tok.kind === 'op' && (tok.op === '*' || tok.op === '/')) {
        this.next()
        const right = this.unary()
        const a = left
        left = tok.op === '*' ? (t: number) => a(t) * right(t) : (t: number) => a(t) / right(t)
      } else {
        return left
      }
    }
  }

  /** unary := ('+' | '-') unary | power */
  unary(): (t: number) => number {
    const tok = this.peek()
    if (tok && tok.kind === 'op' && (tok.op === '-' || tok.op === '+')) {
      this.next()
      const inner = this.unary()
      return tok.op === '-' ? (t: number) => -inner(t) : inner
    }
    return this.power()
  }

  /** power := primary ('^' unary)? */
  power(): (t: number) => number {
    const base = this.primary()
    const tok = this.peek()
    if (tok && tok.kind === 'op' && tok.op === '^') {
      this.next()
      const exp = this.unary()
      return (t: number) => base(t) ** exp(t)
    }
    return base
  }

  /** primary := 数字 | t | 常量 | 函数调用 | '(' expr ')' */
  primary(): (t: number) => number {
    const tok = this.next()
    if (tok.kind === 'num') {
      const v = tok.value
      return () => v
    }
    if (tok.kind === 'ident') {
      if (tok.name === 't') return (t: number) => t
      const constVal = CONSTANTS[tok.name]
      if (constVal !== undefined) return () => constVal
      this.expect('(')
      const arg = this.expr()
      this.expect(')')
      const fn = FUNCTIONS[tok.name]
      return (t: number) => fn(arg(t))
    }
    if (tok.kind === 'op' && tok.op === '(') {
      const inner = this.expr()
      this.expect(')')
      return inner
    }
    throw new ExprError(`这里缺少数值或表达式（出现 ${this.describe(tok)}）`, tok.pos)
  }
}

/** 把表达式编译成函数 f(t) → 数值；语法错误抛 ExprError */
export function compileExpression(src: string): (t: number) => number {
  const tokens = tokenize(src)
  const parser = new Parser(tokens)
  const fn = parser.expr()
  const rest = parser.peek()
  if (rest) throw new ExprError(`多余的 ${parser.describe(rest)}`, rest.pos)
  return fn
}

export type CompileResult =
  | { ok: true; fn: (t: number) => number }
  | { ok: false; error: string }

/** 安全编译：失败时返回带位置信息的错误文案 */
export function tryCompile(src: string): CompileResult {
  try {
    return { ok: true, fn: compileExpression(src) }
  } catch (err) {
    if (err instanceof ExprError) {
      return { ok: false, error: `${err.message}（第 ${err.pos + 1} 个字符处）` }
    }
    throw err
  }
}
