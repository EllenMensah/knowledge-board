import { useEffect, useRef, useCallback } from "react"

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  /** Optional id for aria-labelledby on the dialog */
  titleId?: string
}

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

function Modal({ isOpen, onClose, children, title, titleId }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
      if (e.key !== "Tab") return
      const el = contentRef.current
      if (!el) return
      const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    },
    [isOpen, onClose]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (!isOpen) return
    const id = requestAnimationFrame(() => {
      const el = contentRef.current
      const focusable = el ? Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
      const first = focusable[0]
      if (first) first.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? (titleId ?? "modal-title") : undefined}
      aria-label={!title ? "Dialog" : undefined}
    >
      <div
        ref={contentRef}
        className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id={titleId || "modal-title"} className="text-lg font-semibold text-gray-900 pr-8">
            {title}
          </h2>
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close modal"
        >
          <span aria-hidden="true">×</span>
        </button>
        {children}
      </div>
    </div>
  )
}

export default Modal
