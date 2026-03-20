import React from "react"

type InputProps = {
  id?: string
  type?: "text" | "email" | "date"
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
  "aria-label"?: string
  autoFocus?: boolean
}

const Input = ({ id, type = "text", placeholder, value, onChange, onBlur, onKeyDown, className = "", "aria-label": ariaLabel, autoFocus }: InputProps) => {
  return (
    <input
      id={id}
      type={type}
      autoFocus={autoFocus}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
    />
  )
}

export default Input