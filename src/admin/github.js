/**
 * Minimal GitHub Contents API client.
 *
 * The admin runs entirely in the browser on GitHub Pages, so there is no server
 * to hold a secret. Instead the owner pastes their own fine-grained personal
 * access token once; it is kept in this browser's localStorage and sent only to
 * api.github.com. Nothing else ever sees it.
 */

const API = "https://api.github.com"
const LS_KEY = "portfolio.admin.config"

/**
 * The site always lives in one repository, so the login screen only has to ask
 * for the token. Change these if the repository is ever renamed or moved.
 */
export const REPO = {
  owner: "irahuntsu-glitch",
  repo: "portfolio",
  branch: "main",
}

export function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "null")
  } catch {
    return null
  }
}

export function saveConfig(cfg) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg))
}

export function clearConfig() {
  localStorage.removeItem(LS_KEY)
}

/** UTF-8 safe base64, needed for Cyrillic content. */
export function toBase64(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export function fromBase64(b64) {
  const bin = atob(b64.replace(/\s/g, ""))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function request(cfg, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${cfg.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let detail = ""
    try {
      detail = (await res.json()).message || ""
    } catch {
      /* body was not json */
    }
    const err = new Error(
      res.status === 401
        ? "Токен не принят (401). Проверь, что он не истёк и скопирован целиком."
        : res.status === 403
          ? "Доступ запрещён (403). У токена нет прав Contents: Read and write на этот репозиторий."
          : res.status === 404
            ? "Не найдено (404). Проверь владельца, название репозитория и ветку."
            : `Ошибка GitHub ${res.status}. ${detail}`
    )
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

/** Verifies the token and repository are usable before showing the editor. */
export async function checkAccess(cfg) {
  const repo = await request(cfg, `/repos/${cfg.owner}/${cfg.repo}`)
  if (!repo.permissions?.push) {
    throw new Error("У токена нет прав на запись в этот репозиторий.")
  }
  return { defaultBranch: repo.default_branch }
}

/** Reads a text file, returning its content and blob sha. */
export async function getFile(cfg, path) {
  try {
    const data = await request(
      cfg,
      `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(cfg.branch)}`
    )
    return { text: fromBase64(data.content), sha: data.sha }
  } catch (e) {
    if (e.status === 404) return { text: null, sha: null }
    throw e
  }
}

/** Creates or updates a text file. Returns the new sha. */
export async function putFile(cfg, path, text, sha, message) {
  const data = await request(cfg, `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: toBase64(text),
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  })
  return data.content.sha
}

/** Uploads a binary file (an image) read from an <input type="file">. */
export async function putBinary(cfg, path, base64, message) {
  // If something already lives at this path we need its sha to overwrite it.
  let sha = null
  try {
    const existing = await request(
      cfg,
      `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(cfg.branch)}`
    )
    sha = existing.sha
  } catch (e) {
    if (e.status !== 404) throw e
  }

  await request(cfg, `/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(path)}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: base64, branch: cfg.branch, ...(sha ? { sha } : {}) }),
  })
  return "/" + path.replace(/^public\//, "")
}

/** Reads a File object as bare base64 (no data: prefix). */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(",")[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

/** Latest deploy run, so the admin can show "публикуется / опубликовано". */
export async function latestRun(cfg) {
  try {
    const data = await request(
      cfg,
      `/repos/${cfg.owner}/${cfg.repo}/actions/runs?per_page=1&branch=${encodeURIComponent(cfg.branch)}`
    )
    const run = data.workflow_runs?.[0]
    return run ? { status: run.status, conclusion: run.conclusion, url: run.html_url } : null
  } catch {
    return null
  }
}

export function slugify(str) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
    э: "e", ю: "yu", я: "ya",
  }
  return (
    str
      .toLowerCase()
      .split("")
      .map((c) => (c in map ? map[c] : c))
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "case"
  )
}
