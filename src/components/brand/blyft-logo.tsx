import Image from 'next/image'
import { cn } from '@/lib/utils'

type LogoSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<LogoSize, { width: number; height: number }> = {
  sm: { width: 112, height: 22 },
  md: { width: 148, height: 29 },
  lg: { width: 184, height: 36 },
}

export function BlyftLogo({
  size = 'md',
  variant = 'black',
  className,
  priority = false,
}: {
  size?: LogoSize
  variant?: 'black' | 'white'
  className?: string
  priority?: boolean
}) {
  const dimensions = sizeMap[size]
  const src = variant === 'white' ? '/brand/blyft-logo-white.png' : '/brand/blyft-logo-black.png'

  return (
    <Image
      src={src}
      alt="BLYFT"
      width={dimensions.width}
      height={dimensions.height}
      priority={priority}
      className={cn('h-auto w-auto max-w-full', className)}
    />
  )
}
