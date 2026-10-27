let lockCount = 0
let previousBodyOverflow = ''
let previousHtmlOverflow = ''

export function resetStaleScrollLock() {
  if (lockCount !== 0) return
  previousBodyOverflow = ''
  previousHtmlOverflow = ''
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
}

export function lockPageScroll() {
  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  }

  lockCount += 1
  let released = false

  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)

    if (lockCount === 0) {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }
}
