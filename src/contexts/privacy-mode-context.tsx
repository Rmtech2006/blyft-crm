'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'finance-privacy-mode'
const MASKED = '₹ ••••••'

type PrivacyModeContextValue = {
  isHidden: boolean
  toggle: () => void
  mask: (amount: number, formatter: (n: number) => string) => string
}

const PrivacyModeContext = createContext<PrivacyModeContextValue>({
  isHidden: false,
  toggle: () => {},
  mask: (amount, formatter) => formatter(amount),
})

export function PrivacyModeProvider({ children }: { children: React.ReactNode }) {
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'true') setIsHidden(true)
  }, [])

  function toggle() {
    setIsHidden((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  function mask(amount: number, formatter: (n: number) => string) {
    return isHidden ? MASKED : formatter(amount)
  }

  return (
    <PrivacyModeContext.Provider value={{ isHidden, toggle, mask }}>
      {children}
    </PrivacyModeContext.Provider>
  )
}

export function usePrivacyMode() {
  return useContext(PrivacyModeContext)
}
