export const getCurrentUserId = () => {
  if (typeof window === 'undefined') return 'anonymous'
  return window.localStorage.getItem('user_id') || 'anonymous'
}

export const getUserStorageKey = (baseKey: string) => {
  return `${baseKey}:${getCurrentUserId()}`
}
