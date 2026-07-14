type Listener = () => void

let suspended = false
const listeners = new Set<Listener>()

export function markAccountSuspended() {
  if (suspended) return
  suspended = true
  listeners.forEach((listener) => listener())
}

export function isAccountSuspended() {
  return suspended
}

export function subscribeAccountSuspended(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
