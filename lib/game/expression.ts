/**
 * Polynomial expression parsing, formatting, and comparison.
 * Coefficients are stored as number[] where index = power of x.
 * E.g. [5, -2, 3] represents 3x^2 - 2x + 5.
 */

export function formatPolynomial(coeffs: number[]): string {
  const trimmed = trimTrailingZeros(coeffs)
  if (trimmed.length === 0) return '0'

  const parts: string[] = []
  for (let pow = trimmed.length - 1; pow >= 0; pow--) {
    const c = trimmed[pow]
    if (c === 0) continue

    const isFirst = parts.length === 0
    let term = ''

    if (pow === 0) {
      term = isFirst ? `${c}` : (c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`)
    } else {
      const xPart = pow === 1 ? 'x' : `x^${pow}`
      const absC = Math.abs(c)

      if (isFirst) {
        if (c === 1) term = xPart
        else if (c === -1) term = `-${xPart}`
        else term = `${c}${xPart}`
      } else {
        const sign = c > 0 ? ' + ' : ' - '
        if (absC === 1) term = `${sign}${xPart}`
        else term = `${sign}${absC}${xPart}`
      }
    }

    parts.push(term)
  }

  return parts.length === 0 ? '0' : parts.join('')
}

export function parsePolynomial(input: string): number[] | null {
  const s = input.replace(/\s+/g, '').replace(/\*\*/g, '^').replace(/\*/g, '')
  if (s.length === 0) return null

  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s)
    return isNaN(n) ? null : [n]
  }

  const normalized = s.replace(/-/g, '+-')
  const terms = normalized.split('+').filter(t => t.length > 0)
  if (terms.length === 0) return null

  const coeffs: number[] = []

  for (const term of terms) {
    const parsed = parseTerm(term)
    if (!parsed) return null

    const { coeff, power } = parsed
    while (coeffs.length <= power) coeffs.push(0)
    coeffs[power] += coeff
  }

  return coeffs
}

function parseTerm(term: string): { coeff: number; power: number } | null {
  // Pure number (constant term)
  if (/^[+-]?\d+(\.\d+)?$/.test(term)) {
    return { coeff: parseFloat(term), power: 0 }
  }

  // ax^n
  const match1 = term.match(/^([+-]?\d*\.?\d*)x\^(\d+)$/)
  if (match1) {
    const coeffStr = match1[1]
    const coeff = coeffStr === '' || coeffStr === '+' ? 1 : coeffStr === '-' ? -1 : parseFloat(coeffStr)
    return isNaN(coeff) ? null : { coeff, power: parseInt(match1[2]) }
  }

  // ax (x^1)
  const match2 = term.match(/^([+-]?\d*\.?\d*)x$/)
  if (match2) {
    const coeffStr = match2[1]
    const coeff = coeffStr === '' || coeffStr === '+' ? 1 : coeffStr === '-' ? -1 : parseFloat(coeffStr)
    return isNaN(coeff) ? null : { coeff, power: 1 }
  }

  return null
}

function trimTrailingZeros(coeffs: number[]): number[] {
  const result = [...coeffs]
  while (result.length > 0 && result[result.length - 1] === 0) {
    result.pop()
  }
  return result
}

export function comparePolynomials(a: number[], b: number[]): boolean {
  const ta = trimTrailingZeros(a)
  const tb = trimTrailingZeros(b)
  if (ta.length !== tb.length) return false
  return ta.every((c, i) => Math.abs(c - tb[i]) < 0.001)
}
