'use client'

import { useState } from 'react'

const MASKED = '₹ ••••••'

export function usePrivacyMode(defaultHidden = false) {
  const [isHidden, setIsHidden] = useState(defaultHidden)

  function toggle() {
    setIsHidden((h) => !h)
  }

  function mask(amount: number, formatter: (n: number) => string) {
    return isHidden ? MASKED : formatter(amount)
  }

  return { isHidden, toggle, mask }
}
