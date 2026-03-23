import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Lock, Leaf } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMyCollectives } from '@/hooks/use-collective'
import { useMyStaffChannels } from '@/hooks/use-staff-channels'

interface ChatSwitcherDropdownProps {
  currentCollectiveId?: string
  currentChannelId?: string
}

export function ChatSwitcherDropdown({
  currentCollectiveId,
  currentChannelId,
}: ChatSwitcherDropdownProps) {
  const navigate = useNavigate()
  const { data: myCollectives } = useMyCollectives()
  const { data: staffChannels } = useMyStaffChannels()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const collectives = myCollectives?.map((m) => {
    const c = m.collectives as { id: string; name: string; slug: string; cover_image_url: string | null } | null
    return c ? { id: m.collective_id, name: c.name, coverUrl: c.cover_image_url } : null
  }).filter(Boolean) as { id: string; name: string; coverUrl: string | null }[] ?? []

  const channels = staffChannels ?? []
  const hasOptions = collectives.length > 1 || channels.length > 0

  if (!hasOptions) return null

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-500 hover:bg-primary-100 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
        aria-label="Switch chat"
        aria-expanded={open}
      >
        <ChevronDown size={16} className={cn('transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-1 z-50 w-64 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-8rem)] rounded-2xl bg-white shadow-xl ring-1 ring-primary-200/60 overflow-hidden"
          >
            <div className="max-h-[inherit] overflow-y-auto py-1.5">
              {/* Collectives */}
              {collectives.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-primary-400 px-3.5 pt-2 pb-1">Collectives</p>
                  {collectives.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        if (c.id !== currentCollectiveId) navigate(`/chat/${c.id}`)
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-[colors,transform] duration-100 active:scale-[0.98] min-h-11 cursor-pointer',
                        c.id === currentCollectiveId
                          ? 'bg-primary-50 text-primary-900 font-bold'
                          : 'text-primary-700 hover:bg-primary-50/60',
                      )}
                    >
                      <div className="h-8 w-8 rounded-lg overflow-hidden shrink-0">
                        {c.coverUrl ? (
                          <img src={c.coverUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-400 to-secondary-600">
                            <Leaf size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Staff channels */}
              {channels.length > 0 && (
                <div>
                  {collectives.length > 0 && <div className="h-px bg-primary-100 mx-3 my-1" />}
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-primary-400 px-3.5 pt-2 pb-1">Staff Channels</p>
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        if (ch.id !== currentChannelId) navigate(`/chat/channel/${ch.id}`)
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-[colors,transform] duration-100 active:scale-[0.98] min-h-11 cursor-pointer',
                        ch.id === currentChannelId
                          ? 'bg-primary-50 text-primary-900 font-bold'
                          : 'text-primary-700 hover:bg-primary-50/60',
                      )}
                    >
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-plum-400 to-plum-600 flex items-center justify-center shrink-0">
                        <Lock size={14} className="text-white" />
                      </div>
                      <span className="truncate">{ch.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
