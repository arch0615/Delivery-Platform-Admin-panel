import { describe, expect, it } from 'vitest'

import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  generateSecret,
  generateTotp,
  secondsRemainingInStep,
  verifyTotp,
} from '@/lib/auth/totp'

/*
 * RFC 6238 Appendix B test vectors.
 *
 * The shared secret is the ASCII string "12345678901234567890" (20 bytes),
 * which is "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" in base32. The published vectors
 * use 8 digits.
 */
const RFC_SECRET_SHA1 = base32Encode(new TextEncoder().encode('12345678901234567890'))

const RFC_VECTORS_SHA1 = [
  { seconds: 59, code: '94287082' },
  { seconds: 1111111109, code: '07081804' },
  { seconds: 1111111111, code: '14050471' },
  { seconds: 1234567890, code: '89005924' },
  { seconds: 2000000000, code: '69279037' },
  { seconds: 20000000000, code: '65353130' },
]

describe('base32', () => {
  it('encodes the RFC secret', () => {
    expect(RFC_SECRET_SHA1).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  })

  it('round-trips arbitrary bytes', () => {
    const bytes = Uint8Array.from([0, 1, 2, 250, 251, 252, 253, 254, 255])
    expect(Array.from(base32Decode(base32Encode(bytes)))).toEqual(Array.from(bytes))
  })

  it('ignores padding, case and whitespace', () => {
    const canonical = Array.from(base32Decode('GEZDGNBVGY3TQOJQ'))
    expect(Array.from(base32Decode('gezd gnbv gy3t qojq'))).toEqual(canonical)
    expect(Array.from(base32Decode('GEZDGNBVGY3TQOJQ==='))).toEqual(canonical)
  })

  it('rejects characters outside the alphabet', () => {
    expect(() => base32Decode('GEZD!NBV')).toThrow(/Invalid base32/)
  })
})

describe('generateTotp against RFC 6238 vectors', () => {
  for (const vector of RFC_VECTORS_SHA1) {
    it(`SHA-1 at T=${vector.seconds} produces ${vector.code}`, async () => {
      const code = await generateTotp(RFC_SECRET_SHA1, {
        digits: 8,
        algorithm: 'SHA-1',
        timestampMs: vector.seconds * 1000,
      })

      expect(code).toBe(vector.code)
    })
  }
})

describe('verifyTotp', () => {
  const at = (seconds: number) => ({ timestampMs: seconds * 1000, digits: 8 as const })

  it('accepts the code for the current step', async () => {
    await expect(verifyTotp(RFC_SECRET_SHA1, '94287082', at(59))).resolves.toBe(true)
  })

  it('rejects a code from a different step outside the window', async () => {
    // 1111111109 is far from T=59, so it must not verify.
    await expect(verifyTotp(RFC_SECRET_SHA1, '07081804', at(59))).resolves.toBe(false)
  })

  it('tolerates one step of clock drift either side', async () => {
    // 94287082 is valid at T=59, which is step 1. Check it still passes at
    // step 0 and step 2 with window=1, and fails at step 3.
    await expect(verifyTotp(RFC_SECRET_SHA1, '94287082', { ...at(29), window: 1 })).resolves.toBe(
      true,
    )
    await expect(verifyTotp(RFC_SECRET_SHA1, '94287082', { ...at(89), window: 1 })).resolves.toBe(
      true,
    )
    await expect(verifyTotp(RFC_SECRET_SHA1, '94287082', { ...at(119), window: 1 })).resolves.toBe(
      false,
    )
  })

  it('rejects malformed input without throwing', async () => {
    await expect(verifyTotp(RFC_SECRET_SHA1, '', at(59))).resolves.toBe(false)
    await expect(verifyTotp(RFC_SECRET_SHA1, 'abcdefgh', at(59))).resolves.toBe(false)
    await expect(verifyTotp(RFC_SECRET_SHA1, '123', at(59))).resolves.toBe(false)
    await expect(verifyTotp(RFC_SECRET_SHA1, '9428708299', at(59))).resolves.toBe(false)
  })

  it('accepts a 6-digit code round-tripped through generate', async () => {
    const secret = generateSecret()
    const timestampMs = 1_700_000_000_000
    const code = await generateTotp(secret, { timestampMs })

    expect(code).toMatch(/^\d{6}$/)
    await expect(verifyTotp(secret, code, { timestampMs })).resolves.toBe(true)
  })

  it('tolerates whitespace a user pastes in', async () => {
    const secret = generateSecret()
    const timestampMs = 1_700_000_000_000
    const code = await generateTotp(secret, { timestampMs })

    await expect(
      verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, { timestampMs }),
    ).resolves.toBe(true)
  })
})

describe('generateSecret', () => {
  it('produces a decodable 20-byte secret by default', () => {
    const secret = generateSecret()
    expect(base32Decode(secret)).toHaveLength(20)
  })

  it('does not repeat', () => {
    expect(generateSecret()).not.toBe(generateSecret())
  })
})

describe('secondsRemainingInStep', () => {
  it('counts down within the 30 second step', () => {
    expect(secondsRemainingInStep(30, 0)).toBe(30)
    expect(secondsRemainingInStep(30, 1_000)).toBe(29)
    expect(secondsRemainingInStep(30, 29_000)).toBe(1)
    expect(secondsRemainingInStep(30, 30_000)).toBe(30)
  })
})

describe('buildOtpAuthUri', () => {
  it('produces a URI an authenticator app can read', () => {
    const uri = buildOtpAuthUri({
      secret: 'GEZDGNBVGY3TQOJQ',
      accountName: 'alex@plataforma.mx',
      issuer: 'Panel Admin',
    })

    expect(uri).toContain('otpauth://totp/Panel%20Admin:alex%40plataforma.mx')
    expect(uri).toContain('secret=GEZDGNBVGY3TQOJQ')
    expect(uri).toContain('algorithm=SHA1')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
  })
})
