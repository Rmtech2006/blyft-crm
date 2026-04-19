export function protectedQueryArgs(isAuthenticated, args) {
  return isAuthenticated ? args : 'skip'
}
