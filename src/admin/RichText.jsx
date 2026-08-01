import { useEffect, useRef } from "react"

/**
 * Small contenteditable editor producing the same HTML shape the Framer CMS
 * used, so existing case bodies keep rendering identically.
 */
export default function RichText({ value, onChange, onInsertImage }) {
  const ref = useRef(null)
  const last = useRef(value)

  // Only write into the DOM when the value changed outside the editor,
  // otherwise the caret jumps on every keystroke.
  useEffect(() => {
    if (ref.current && value !== last.current) {
      ref.current.innerHTML = value || ""
      last.current = value
    }
  }, [value])

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || ""
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const push = () => {
    const html = ref.current?.innerHTML ?? ""
    last.current = html
    onChange(html)
  }

  const cmd = (name, arg = null) => {
    ref.current?.focus()
    document.execCommand(name, false, arg)
    push()
  }

  const block = (tag) => cmd("formatBlock", tag)

  const link = () => {
    const url = window.prompt("Ссылка (URL):")
    if (url) cmd("createLink", url)
  }

  const image = async () => {
    const path = await onInsertImage?.()
    if (!path) return
    ref.current?.focus()
    document.execCommand("insertHTML", false, `<img src="${path}" alt="">`)
    push()
  }

  const table = () => {
    const cols = Number(window.prompt("Сколько колонок?", "3"))
    const rows = Number(window.prompt("Сколько строк (без шапки)?", "3"))
    if (!cols || !rows) return
    const th = `<tr>${Array.from({ length: cols }, () => "<th>Заголовок</th>").join("")}</tr>`
    const tr = `<tr>${Array.from({ length: cols }, () => "<td> </td>").join("")}</tr>`
    cmd("insertHTML", `<table><thead>${th}</thead><tbody>${tr.repeat(rows)}</tbody></table><p><br></p>`)
  }

  // Paste as plain text so Word/Notion styling never leaks into the site.
  const onPaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
    push()
  }

  return (
    <div className="rte">
      <div className="rte__bar">
        <button type="button" onClick={() => block("<p>")} title="Обычный текст">
          Текст
        </button>
        <button type="button" onClick={() => block("<h2>")}>
          H2
        </button>
        <button type="button" onClick={() => block("<h3>")}>
          H3
        </button>
        <button type="button" onClick={() => cmd("bold")} style={{ fontWeight: 700 }}>
          Ж
        </button>
        <button type="button" onClick={() => cmd("italic")} style={{ fontStyle: "italic" }}>
          К
        </button>
        <button type="button" onClick={() => cmd("insertUnorderedList")}>
          • Список
        </button>
        <button type="button" onClick={() => cmd("insertOrderedList")}>
          1. Список
        </button>
        <button type="button" onClick={() => block("<blockquote>")}>
          Цитата
        </button>
        <button type="button" onClick={link}>
          Ссылка
        </button>
        <button type="button" onClick={image}>
          Картинка
        </button>
        <button type="button" onClick={table}>
          Таблица
        </button>
        <button type="button" onClick={() => cmd("insertHorizontalRule")}>
          —
        </button>
        <button type="button" onClick={() => cmd("removeFormat")}>
          Очистить
        </button>
      </div>
      <div
        ref={ref}
        className="rte__area"
        contentEditable
        suppressContentEditableWarning
        onInput={push}
        onBlur={push}
        onPaste={onPaste}
      />
    </div>
  )
}
