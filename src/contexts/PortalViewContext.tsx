import { createContext, useContext, useState, type ReactNode } from 'react'

export type StaffPortalView = 'funcionario' | 'gestor'

type PortalViewContextValue = {
  view: StaffPortalView
  setView: (view: StaffPortalView) => void
}

const PortalViewContext = createContext<PortalViewContextValue | null>(null)

export function PortalViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<StaffPortalView>('funcionario')
  return (
    <PortalViewContext.Provider value={{ view, setView }}>
      {children}
    </PortalViewContext.Provider>
  )
}

export function usePortalView() {
  return useContext(PortalViewContext)
}
