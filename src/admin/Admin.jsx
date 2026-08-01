import { useEffect, useRef, useState } from "react"
import RichText from "./RichText.jsx"
import {
  loadConfig,
  saveConfig,
  clearConfig,
  checkAccess,
  getFile,
  putFile,
  putBinary,
  fileToBase64,
  latestRun,
  slugify,
  REPO,
} from "./github.js"
import { asset } from "../lib/content.js"
import { slotHint } from "../lib/bento.js"
import "./admin.css"

const SITE_PATH = "content/site.json"
const CASES_PATH = "content/cases.json"

const EMPTY_CASE = {
  slug: "",
  title: "",
  tagline: "",
  cover: "",
  metrics: [],
  body: "<p>Расскажи, что за задача и что получилось.</p>",
  draft: true,
  order: 0,
}

export default function Admin() {
  const [cfg, setCfg] = useState(loadConfig)
  const [ready, setReady] = useState(false)
  const [site, setSite] = useState(null)
  const [cases, setCases] = useState(null)
  const [shas, setShas] = useState({})
  const [dirty, setDirty] = useState({})
  const [tab, setTab] = useState("home")
  const [editing, setEditing] = useState(null) // index into cases
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.title = "Админка"
  }, [])

  /* ------------------------------------------------------------- loading */

  useEffect(() => {
    if (!cfg) return
    let alive = true
    setBusy(true)
    ;(async () => {
      try {
        await checkAccess(cfg)
        const [s, c] = await Promise.all([getFile(cfg, SITE_PATH), getFile(cfg, CASES_PATH)])
        if (!alive) return
        if (s.text === null || c.text === null) {
          throw new Error(
            `В репозитории нет ${s.text === null ? SITE_PATH : CASES_PATH}. Проверь ветку — сейчас выбрана «${cfg.branch}».`
          )
        }
        setSite(JSON.parse(s.text))
        setCases(JSON.parse(c.text))
        setShas({ [SITE_PATH]: s.sha, [CASES_PATH]: c.sha })
        setReady(true)
        setMsg(null)
      } catch (e) {
        if (alive) setMsg({ kind: "err", text: e.message })
      } finally {
        if (alive) setBusy(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [cfg])

  // Warn before losing unsaved edits.
  useEffect(() => {
    const anyDirty = Object.values(dirty).some(Boolean)
    if (!anyDirty) return
    const h = (e) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [dirty])

  /* -------------------------------------------------------------- saving */

  const touch = (path) => setDirty((d) => ({ ...d, [path]: true }))

  const updateSite = (fn) => {
    setSite((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
    touch(SITE_PATH)
  }

  const updateCases = (fn) => {
    setCases((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
    touch(CASES_PATH)
  }

  const save = async () => {
    setBusy(true)
    setMsg({ kind: "info", text: "Сохраняю…" })
    try {
      const next = { ...shas }
      if (dirty[SITE_PATH]) {
        next[SITE_PATH] = await putFile(
          cfg,
          SITE_PATH,
          JSON.stringify(site, null, 2) + "\n",
          shas[SITE_PATH],
          "admin: обновлён контент главной"
        )
      }
      if (dirty[CASES_PATH]) {
        const ordered = cases.map((c, i) => ({ ...c, order: i }))
        next[CASES_PATH] = await putFile(
          cfg,
          CASES_PATH,
          JSON.stringify(ordered, null, 2) + "\n",
          shas[CASES_PATH],
          "admin: обновлены кейсы"
        )
      }
      setShas(next)
      setDirty({})
      setMsg({
        kind: "ok",
        text: "Сохранено. Сайт пересоберётся автоматически — обычно за минуту-полторы.",
      })
    } catch (e) {
      setMsg({
        kind: "err",
        text:
          e.status === 409
            ? "Кто-то изменил файл параллельно. Обнови страницу и внеси правки заново."
            : e.message,
      })
    } finally {
      setBusy(false)
    }
  }

  /* ------------------------------------------------------------- uploads */

  const filePicker = useRef(null)
  const pickerResolve = useRef(null)

  /** Opens the OS file dialog, uploads the image, resolves with its site path. */
  const pickImage = (dir = "media") =>
    new Promise((resolve) => {
      pickerResolve.current = { resolve, dir }
      filePicker.current.value = ""
      filePicker.current.click()
    })

  const onFileChosen = async (e) => {
    const files = Array.from(e.target.files || [])
    const ctx = pickerResolve.current
    pickerResolve.current = null
    if (!files.length || !ctx) return ctx?.resolve(null)

    setBusy(true)
    try {
      const paths = []
      for (const f of files) {
        const clean = f.name
          .toLowerCase()
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 40)
        const ext = (f.name.match(/\.[^.]+$/) || [".png"])[0].toLowerCase()
        const name = `${clean || "image"}-${Date.now().toString(36)}${ext}`
        const b64 = await fileToBase64(f)
        const path = await putBinary(cfg, `public/${ctx.dir}/${name}`, b64, `admin: загружено ${name}`)
        paths.push(path)
      }
      setMsg({ kind: "ok", text: `Загружено файлов: ${paths.length}` })
      ctx.resolve(ctx.multiple ? paths : paths[0])
      return paths
    } catch (err) {
      setMsg({ kind: "err", text: err.message })
      ctx.resolve(null)
    } finally {
      setBusy(false)
    }
  }

  /* -------------------------------------------------------------- screens */

  if (!cfg) return <Login onDone={setCfg} />

  if (!ready) {
    return (
      <div className="ad">
        <div className="ad__login">
          {msg ? <div className={`ad__msg ad__msg--${msg.kind}`}>{msg.text}</div> : null}
          <p className="ad__hint">{busy ? "Подключаюсь к репозиторию…" : ""}</p>
          <button
            className="ad__btn"
            onClick={() => {
              clearConfig()
              setCfg(null)
              setMsg(null)
            }}
          >
            Ввести другой токен
          </button>
        </div>
      </div>
    )
  }

  const anyDirty = Object.values(dirty).some(Boolean)

  return (
    <div className="ad">
      <input
        ref={filePicker}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={onFileChosen}
      />

      <div className="ad__bar">
        <div className="ad__bar-in">
          <span className="ad__brand">
            Админка
            <span className="ad__repo">
              {cfg.owner}/{cfg.repo} · {cfg.branch}
            </span>
          </span>
          {anyDirty ? (
            <span style={{ fontSize: 13, color: "#a16207" }}>
              <i className="ad__dot" />
              есть несохранённые правки
            </span>
          ) : null}
          <a className="ad__btn" href={import.meta.env.BASE_URL} target="_blank" rel="noreferrer">
            Открыть сайт
          </a>
          <button className="ad__btn ad__btn--primary" onClick={save} disabled={busy || !anyDirty}>
            {busy ? "…" : "Сохранить и опубликовать"}
          </button>
        </div>
      </div>

      <div className="ad__tabs">
        {[
          ["home", "Главная"],
          ["cases", "Кейсы"],
          ["access", "Доступ"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`ad__tab ${tab === id ? "ad__tab--on" : ""}`}
            onClick={() => {
              setTab(id)
              setEditing(null)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="ad__body">
        {msg ? <div className={`ad__msg ad__msg--${msg.kind}`}>{msg.text}</div> : null}

        {tab === "home" ? (
          <HomeTab site={site} updateSite={updateSite} pickImage={pickImage} />
        ) : null}

        {tab === "cases" ? (
          editing === null ? (
            <CaseList cases={cases} updateCases={updateCases} setEditing={setEditing} />
          ) : (
            <CaseEditor
              item={cases[editing]}
              index={editing}
              onChange={(patch) => updateCases((c) => Object.assign(c[editing], patch))}
              onBack={() => setEditing(null)}
              pickImage={pickImage}
            />
          )
        ) : null}

        {tab === "access" ? (
          <AccessTab
            cfg={cfg}
            onLogout={() => {
              clearConfig()
              setCfg(null)
              setReady(false)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

/* ====================================================================== */

function Login({ onDone }) {
  const [token, setToken] = useState("")
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const cfg = { ...REPO, token: token.trim() }
    try {
      await checkAccess(cfg)
      saveConfig(cfg)
      onDone(cfg)
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ad">
      <form className="ad__login" onSubmit={submit}>
        <div className="ad__card">
          <h3>Вход в админку</h3>
          <p className="ad__hint">
            Правки уходят в <code>{REPO.owner}/{REPO.repo}</code>. Токен хранится только в этом
            браузере и никуда больше не отправляется.
          </p>
          <ol>
            <li>
              Открой <code>github.com/settings/personal-access-tokens</code> → Generate new token
            </li>
            <li>
              Repository access → Only select repositories → <code>{REPO.repo}</code>
            </li>
            <li>
              Permissions → Repository permissions → <code>Contents</code>: Read and write
            </li>
            <li>Скопируй токен и вставь его ниже</li>
          </ol>

          {err ? <div className="ad__msg ad__msg--err">{err}</div> : null}

          <label className="ad__f">
            <span>Токен</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_…"
              autoComplete="off"
              autoFocus
              required
            />
          </label>
          <button className="ad__btn ad__btn--primary" disabled={busy}>
            {busy ? "Проверяю…" : "Войти"}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ====================================================================== */

function HomeTab({ site, updateSite, pickImage }) {
  const set = (path, value) =>
    updateSite((s) => {
      const keys = path.split(".")
      let o = s
      for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]]
      o[keys[keys.length - 1]] = value
    })

  return (
    <>
      <div className="ad__card">
        <h3>Шапка и контакты</h3>
        <p className="ad__hint">Имя рядом с аватаром и кнопки в шапке и подвале.</p>

        <div className="ad__row">
          <label className="ad__f">
            <span>Имя</span>
            <input
              type="text"
              value={site.profile.name}
              onChange={(e) => set("profile.name", e.target.value)}
            />
          </label>
          <div className="ad__f">
            <span>Аватар</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <img
                src={asset(site.profile.avatar)}
                alt=""
                style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
              />
              <button
                type="button"
                className="ad__btn ad__btn--sm"
                onClick={async () => {
                  const p = await pickImage("media")
                  if (p) set("profile.avatar", p)
                }}
              >
                Заменить
              </button>
            </div>
          </div>
        </div>

        {site.links.map((l, i) => (
          <div className="ad__row" key={i}>
            <label className="ad__f">
              <span>Кнопка {i + 1} — подпись</span>
              <input
                type="text"
                value={l.label}
                onChange={(e) => updateSite((s) => (s.links[i].label = e.target.value))}
              />
            </label>
            <label className="ad__f">
              <span>Ссылка</span>
              <input
                type="text"
                value={l.url}
                onChange={(e) => updateSite((s) => (s.links[i].url = e.target.value))}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="ad__card">
        <h3>Первый экран</h3>
        <label className="ad__f">
          <span>Заголовок</span>
          <textarea
            value={site.intro.headline}
            onChange={(e) => set("intro.headline", e.target.value)}
          />
        </label>
        <label className="ad__f">
          <span>Подзаголовок</span>
          <textarea
            value={site.intro.subline}
            onChange={(e) => set("intro.subline", e.target.value)}
          />
        </label>
        <label className="ad__f">
          <span>Теги</span>
          <input type="text" value={site.intro.tags} onChange={(e) => set("intro.tags", e.target.value)} />
        </label>
      </div>

      {site.sections.map((sec, si) => (
        <div className="ad__card" key={sec.id}>
          <h3>Блок «{sec.id}»</h3>
          <p className="ad__hint">
            Текст показывается крупно, картинки — {sec.layout === "marquee" ? "бегущей лентой" : "сеткой"}.
          </p>

          <label className="ad__f">
            <span>Текст</span>
            <textarea
              value={sec.statement}
              rows={4}
              onChange={(e) => updateSite((s) => (s.sections[si].statement = e.target.value))}
            />
          </label>

          <label className="ad__f">
            <span>Вид</span>
            <select
              value={sec.layout}
              onChange={(e) => updateSite((s) => (s.sections[si].layout = e.target.value))}
            >
              <option value="marquee">Бегущая лента</option>
              <option value="grid">Сетка</option>
            </select>
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Картинки ({sec.images.length})</span>
            <button
              type="button"
              className="ad__btn ad__btn--sm"
              onClick={async () => {
                const p = await pickImage("media")
                if (p) updateSite((s) => s.sections[si].images.push(p))
              }}
            >
              + Добавить
            </button>
          </div>

          <div className="ad__imgs">
            {sec.images.map((src, ii) => (
              <div className="ad__img" key={`${src}-${ii}`}>
                <img src={asset(src)} alt="" loading="lazy" />
                <div className="ad__img-tools">
                  <button
                    type="button"
                    title="Левее"
                    disabled={ii === 0}
                    onClick={() =>
                      updateSite((s) => {
                        const a = s.sections[si].images
                        ;[a[ii - 1], a[ii]] = [a[ii], a[ii - 1]]
                      })
                    }
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    title="Удалить"
                    onClick={() => updateSite((s) => s.sections[si].images.splice(ii, 1))}
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    title="Правее"
                    disabled={ii === sec.images.length - 1}
                    onClick={() =>
                      updateSite((s) => {
                        const a = s.sections[si].images
                        ;[a[ii + 1], a[ii]] = [a[ii], a[ii + 1]]
                      })
                    }
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

/* ====================================================================== */

function CaseList({ cases, updateCases, setEditing }) {
  const move = (i, d) =>
    updateCases((c) => {
      const j = i + d
      if (j < 0 || j >= c.length) return
      ;[c[i], c[j]] = [c[j], c[i]]
    })

  return (
    <div className="ad__card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h3>Кейсы</h3>
          <p className="ad__hint" style={{ margin: 0 }}>
            Порядок в списке задаёт размер карточки на главной. Следующий кейс встанет в слот{" "}
            <b>{slotHint(cases.length)}</b>.
          </p>
        </div>
        <button
          className="ad__btn ad__btn--primary ad__btn--sm"
          onClick={() => {
            updateCases((c) => c.unshift({ ...structuredClone(EMPTY_CASE), slug: `case-${Date.now().toString(36)}` }))
            setEditing(0)
          }}
        >
          + Новый кейс
        </button>
      </div>

      {cases.map((c, i) => (
        <div className="ad__case" key={c.slug + i}>
          {c.cover ? (
            <img className="ad__case-thumb" src={asset(c.cover)} alt="" loading="lazy" />
          ) : (
            <div className="ad__case-thumb" />
          )}
          <span className="ad__case-t">
            <b>{c.title || "Без названия"}</b>
            <span>обложка: {slotHint(i)}</span>
          </span>
          {c.draft ? <span className="ad__draft">черновик</span> : null}
          <button className="ad__btn ad__btn--sm" onClick={() => move(i, -1)} disabled={i === 0}>
            ↑
          </button>
          <button
            className="ad__btn ad__btn--sm"
            onClick={() => move(i, 1)}
            disabled={i === cases.length - 1}
          >
            ↓
          </button>
          <button className="ad__btn ad__btn--sm" onClick={() => setEditing(i)}>
            Открыть
          </button>
          <button
            className="ad__btn ad__btn--sm ad__btn--danger"
            onClick={() => {
              if (window.confirm(`Удалить кейс «${c.title}»? Это нельзя отменить.`)) {
                updateCases((cs) => cs.splice(i, 1))
              }
            }}
          >
            Удалить
          </button>
        </div>
      ))}
    </div>
  )
}

/* ====================================================================== */

function CaseEditor({ item, index, onChange, onBack, pickImage }) {
  return (
    <>
      <div className="ad__card">
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button className="ad__btn ad__btn--sm" onClick={onBack}>
            ← К списку
          </button>
          <label style={{ marginLeft: "auto", fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!item.draft}
              onChange={(e) => onChange({ draft: e.target.checked })}
            />
            Черновик (не показывать на сайте)
          </label>
        </div>

        <label className="ad__f">
          <span>Название</span>
          <input
            type="text"
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onBlur={(e) => {
              if (!item.slug || item.slug.startsWith("case-")) {
                onChange({ slug: slugify(e.target.value) })
              }
            }}
          />
        </label>

        <div className="ad__row">
          <label className="ad__f">
            <span>Подпись (клиент, год, сфера)</span>
            <input
              type="text"
              value={item.tagline}
              onChange={(e) => onChange({ tagline: e.target.value })}
            />
          </label>
          <label className="ad__f">
            <span>Адрес страницы</span>
            <input type="text" value={item.slug} onChange={(e) => onChange({ slug: e.target.value })} />
          </label>
        </div>

        <div className="ad__f">
          <span>Обложка — {slotHint(index)}</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {item.cover ? (
              <img
                src={asset(item.cover)}
                alt=""
                style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8 }}
              />
            ) : (
              <div
                style={{
                  width: 120,
                  height: 90,
                  borderRadius: 8,
                  background: "#e4e4e7",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  color: "#71717a",
                }}
              >
                нет
              </div>
            )}
            <button
              className="ad__btn ad__btn--sm"
              onClick={async () => {
                const p = await pickImage("media/cases")
                if (p) onChange({ cover: p })
              }}
            >
              Загрузить
            </button>
            {item.cover ? (
              <button className="ad__btn ad__btn--sm" onClick={() => onChange({ cover: "" })}>
                Убрать
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ad__card">
        <h3>Метрики</h3>
        <p className="ad__hint">Показываются крупной строкой под обложкой. Можно оставить пустым.</p>
        {(item.metrics || []).map((m, i) => (
          <div className="ad__row" key={i}>
            <label className="ad__f">
              <span>Значение</span>
              <input
                type="text"
                value={m.value}
                placeholder="+21%"
                onChange={(e) => {
                  const next = [...item.metrics]
                  next[i] = { ...next[i], value: e.target.value }
                  onChange({ metrics: next })
                }}
              />
            </label>
            <label className="ad__f">
              <span>Подпись</span>
              <input
                type="text"
                value={m.label}
                onChange={(e) => {
                  const next = [...item.metrics]
                  next[i] = { ...next[i], label: e.target.value }
                  onChange({ metrics: next })
                }}
              />
            </label>
            <button
              className="ad__btn ad__btn--sm ad__btn--danger"
              style={{ flex: "0 0 auto", alignSelf: "center" }}
              onClick={() => onChange({ metrics: item.metrics.filter((_, j) => j !== i) })}
            >
              Удалить
            </button>
          </div>
        ))}
        <button
          className="ad__btn ad__btn--sm"
          onClick={() => onChange({ metrics: [...(item.metrics || []), { value: "", label: "" }] })}
        >
          + Метрика
        </button>
      </div>

      <div className="ad__card">
        <h3>Текст кейса</h3>
        <p className="ad__hint">
          Пиши как рассказываешь вслух: задача → что делала → что получилось. Картинки вставляются
          кнопкой на панели.
        </p>
        <RichText
          value={item.body}
          onChange={(html) => onChange({ body: html })}
          onInsertImage={() => pickImage("media/cases")}
        />
      </div>
    </>
  )
}

/* ====================================================================== */

function AccessTab({ cfg, onLogout }) {
  const [run, setRun] = useState(null)

  useEffect(() => {
    latestRun(cfg).then(setRun)
  }, [cfg])

  return (
    <div className="ad__card">
      <h3>Доступ и публикация</h3>
      <p className="ad__hint">
        Репозиторий: {cfg.owner}/{cfg.repo}, ветка {cfg.branch}. Токен лежит в localStorage этого
        браузера — на чужом компьютере обязательно выходи.
      </p>

      {run ? (
        <p className="ad__hint">
          Последняя сборка: {run.status === "completed" ? run.conclusion : run.status} —{" "}
          <a href={run.url} target="_blank" rel="noreferrer">
            открыть на GitHub
          </a>
        </p>
      ) : null}

      <button className="ad__btn ad__btn--danger" onClick={onLogout}>
        Выйти и стереть токен
      </button>
    </div>
  )
}
