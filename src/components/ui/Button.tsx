import React from "react"

type ButtonProps = {
  type?: "button" | "submit" | "reset"
  children: React.ReactNode
  onClick?: () => void
  className?: string
  "aria-label"?: string
}

const Button = ({ type = "button", children, onClick, className = "", "aria-label": ariaLabel }: ButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

export default Button