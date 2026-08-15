import { useCallback, useEffect, useRef, useState } from 'react'

/*
 * IDLE TIMEOUT
 *
 * Admin sessions expire after inactivity (web architecture.txt §6.1): a
 * warning at 25 minutes, sign-out at 30. An unattended admin tab is a
 * standing risk - it can refund orders and move money.
 *
 * The warning must never appear without the user being able to stay signed in,
 * so the countdown is visible and cancellable.
 */

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'] as const

export type IdleTimerOptions = {
  warnAfterMs: number
  signOutAfterMs: number
  onSignOut: () => void
}

export type IdleTimerState = {
  warning: boolean
  secondsRemaining: number
  /** Dismiss the warning and restart the idle clock. */
  stayActive: () => void
  /** Force the warning open - used to review the flow before auth exists. */
  triggerWarning: () => void
}

export function useIdleTimer({
  warnAfterMs,
  signOutAfterMs,
  onSignOut,
}: IdleTimerOptions): IdleTimerState {
  const [warning, setWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  // Seeded on mount by the polling effect below, not here: calling Date.now()
  // during render is impure and can produce unstable results.
  const lastActivityRef = useRef(0)

  // Kept in a ref so the polling effect never re-subscribes when the caller
  // passes a new inline callback. Written in an effect, never during render.
  const onSignOutRef = useRef(onSignOut)

  useEffect(() => {
    onSignOutRef.current = onSignOut
  }, [onSignOut])

  const stayActive = useCallback(() => {
    lastActivityRef.current = Date.now()
    setWarning(false)
  }, [])

  const triggerWarning = useCallback(() => {
    lastActivityRef.current = Date.now() - warnAfterMs
    setWarning(true)
  }, [warnAfterMs])

  // Activity resets the clock, but only while no warning is showing. Once the
  // dialog is up, dismissing it must be a deliberate click - otherwise an
  // accidental scroll silently extends an unattended session.
  useEffect(() => {
    const onActivity = () => {
      if (!warning) {
        lastActivityRef.current = Date.now()
      }
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true })
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity)
      }
    }
  }, [warning])

  useEffect(() => {
    // Seed the activity clock here so render stays pure.
    lastActivityRef.current = Date.now()

    const tick = () => {
      const idleFor = Date.now() - lastActivityRef.current

      if (idleFor >= signOutAfterMs) {
        setWarning(false)
        onSignOutRef.current()
        return
      }

      if (idleFor >= warnAfterMs) {
        setWarning(true)
        setSecondsRemaining(Math.ceil((signOutAfterMs - idleFor) / 1000))
      }
    }

    const interval = window.setInterval(tick, 1000)
    return () => {
      window.clearInterval(interval)
    }
  }, [warnAfterMs, signOutAfterMs])

  return { warning, secondsRemaining, stayActive, triggerWarning }
}
