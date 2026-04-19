export function protectedQueryArgs<TArgs>(
  isAuthenticated: boolean,
  args: TArgs
): TArgs | 'skip'
