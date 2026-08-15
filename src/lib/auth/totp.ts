/*
 * TOTP (RFC 6238) over HOTP (RFC 4226), using Web Crypto.
 *
 * Implemented properly rather than stubbed so the enrolment QR works with a
 * real authenticator app and the flow can be exercised end to end before the
 * backend exists. Verification here mirrors what the server will do; when
 * POST /admin/auth/2fa/verify lands, this module is deleted from the client.
 *
 * SECURITY NOTE: a TOTP secret must never live in the browser in production.
 * It is here only because there is no server yet.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function byteAt(bytes: Uint8Array, index: number): number {
  const value = bytes[index]
  if (value === undefined) {
    throw new RangeError(`Byte index ${index} out of range`)
  }
  return value
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | byteAt(bytes, i)
    bits += 8

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

export function base32Decode(input: string): Uint8Array {
  const normalized = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  const bytes: number[] = []

  let bits = 0
  let value = 0

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character)
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${character}`)
    }

    value = (value << 5) | index
    bits += 5

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return Uint8Array.from(bytes)
}

/** Cryptographically random secret. 20 bytes matches the SHA-1 block size. */
export function generateSecret(byteLength = 20): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}

export type TotpAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

export type TotpOptions = {
  digits?: number
  stepSeconds?: number
  algorithm?: TotpAlgorithm
  /** Epoch milliseconds. Defaults to now. */
  timestampMs?: number
}

async function hmac(
  algorithm: TotpAlgorithm,
  key: Uint8Array,
  message: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message as BufferSource)
  return new Uint8Array(signature)
}

function counterToBytes(counter: number): Uint8Array {
  const bytes = new Uint8Array(8)
  // Counters fit comfortably in 53 bits, so a BigInt is unnecessary; the top
  // two bytes stay zero until well past the year 275000.
  let remaining = counter

  for (let i = 7; i >= 0; i -= 1) {
    bytes[i] = remaining & 0xff
    remaining = Math.floor(remaining / 256)
  }

  return bytes
}

/** HOTP: RFC 4226 dynamic truncation. */
export async function generateHotp(
  secretBase32: string,
  counter: number,
  { digits = 6, algorithm = 'SHA-1' }: Pick<TotpOptions, 'digits' | 'algorithm'> = {},
): Promise<string> {
  const digest = await hmac(algorithm, base32Decode(secretBase32), counterToBytes(counter))

  const offset = byteAt(digest, digest.length - 1) & 0x0f
  const binary =
    ((byteAt(digest, offset) & 0x7f) << 24) |
    (byteAt(digest, offset + 1) << 16) |
    (byteAt(digest, offset + 2) << 8) |
    byteAt(digest, offset + 3)

  return String(binary % 10 ** digits).padStart(digits, '0')
}

export async function generateTotp(
  secretBase32: string,
  options: TotpOptions = {},
): Promise<string> {
  const { digits = 6, stepSeconds = 30, algorithm = 'SHA-1', timestampMs = Date.now() } = options

  const counter = Math.floor(timestampMs / 1000 / stepSeconds)
  return generateHotp(secretBase32, counter, { digits, algorithm })
}

export type VerifyOptions = TotpOptions & {
  /** Steps of clock drift accepted either side. RFC 6238 suggests 1. */
  window?: number
}

/**
 * Verify a submitted code, tolerating clock drift.
 *
 * Comparison is constant-time-ish: every candidate in the window is computed
 * before returning, so a wrong code does not fail measurably faster.
 */
export async function verifyTotp(
  secretBase32: string,
  submitted: string,
  options: VerifyOptions = {},
): Promise<boolean> {
  const { window = 1, digits = 6, stepSeconds = 30, algorithm = 'SHA-1' } = options
  const timestampMs = options.timestampMs ?? Date.now()

  const cleaned = submitted.replace(/\s+/g, '')
  if (!/^\d+$/.test(cleaned) || cleaned.length !== digits) {
    return false
  }

  const counter = Math.floor(timestampMs / 1000 / stepSeconds)
  let matched = false

  for (let drift = -window; drift <= window; drift += 1) {
    const candidate = await generateHotp(secretBase32, counter + drift, { digits, algorithm })
    if (candidate === cleaned) {
      matched = true
    }
  }

  return matched
}

/** Seconds until the current code rolls over - drives the countdown ring. */
export function secondsRemainingInStep(stepSeconds = 30, timestampMs = Date.now()): number {
  return stepSeconds - (Math.floor(timestampMs / 1000) % stepSeconds)
}

export type OtpAuthParams = {
  secret: string
  accountName: string
  issuer: string
  digits?: number
  stepSeconds?: number
  algorithm?: TotpAlgorithm
}

/** otpauth:// URI that authenticator apps read from the QR code. */
export function buildOtpAuthUri({
  secret,
  accountName,
  issuer,
  digits = 6,
  stepSeconds = 30,
  algorithm = 'SHA-1',
}: OtpAuthParams): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`

  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: algorithm.replace('-', ''),
    digits: String(digits),
    period: String(stepSeconds),
  })

  return `otpauth://totp/${label}?${params.toString()}`
}

/** Groups the secret for manual entry when a camera is unavailable. */
export function formatSecretForDisplay(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim()
}
