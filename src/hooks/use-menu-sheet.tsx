import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface MenuSheetContextValue {
  open: boolean
  openMenu: () => void
  closeMenu: () => void
  toggleMenu: () => void
}

const MenuSheetContext = createContext<MenuSheetContextValue | null>(null)

export function MenuSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openMenu = useCallback(() => setOpen(true), [])
  const closeMenu = useCallback(() => setOpen(false), [])
  const toggleMenu = useCallback(() => setOpen((p) => !p), [])

  return (
    <MenuSheetContext.Provider value={{ open, openMenu, closeMenu, toggleMenu }}>
      {children}
    </MenuSheetContext.Provider>
  )
}

export function useMenuSheet() {
  const ctx = useContext(MenuSheetContext)
  if (!ctx) throw new Error('useMenuSheet must be used within MenuSheetProvider')
  return ctx
}
