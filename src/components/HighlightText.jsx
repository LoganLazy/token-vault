/**
 * 高亮搜索关键词
 */
export function HighlightText({ text, highlight }) {
  if (!highlight || !text) {
    return <>{text}</>
  }

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'))

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={index} className="bg-terracotta/20 text-terracotta px-1 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  )
}
