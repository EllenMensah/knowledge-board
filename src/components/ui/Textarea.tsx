import React from "react"

type TextareaProps = {
  id?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  className?: string
  "aria-label"?: string
}

const Textarea = ({ id, placeholder, value, onChange, rows = 3, className = "", "aria-label": ariaLabel }: TextareaProps) => {
  return (
    <textarea
      id={id}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      rows={rows}
      aria-label={ariaLabel}
    />
  )
}

export default Textarea
