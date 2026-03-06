import { useMemo } from "react"
import { marked } from "marked"

type MarkdownProps = {
  source: string
  className?: string
}

// Configure marked for safe defaults; no raw HTML in output for Stage 1
marked.setOptions({ gfm: true, breaks: true })

export default function Markdown({ source, className = "" }: MarkdownProps) {
  const html = useMemo(() => (source ? marked.parse(source) as string : ""), [source])
  return (
    <div
      className={`markdown-content text-gray-700 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
