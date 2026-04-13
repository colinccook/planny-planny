import type { ReactNode } from 'react'
import { useRegisterHeaderOverride } from '../../hooks/useHeaderOverride'

interface FullScreenViewProps {
  title: string
  onBack: () => void
  children: ReactNode
}

export default function FullScreenView({ title, onBack, children }: FullScreenViewProps) {
  useRegisterHeaderOverride(title, onBack)

  return <>{children}</>
}
