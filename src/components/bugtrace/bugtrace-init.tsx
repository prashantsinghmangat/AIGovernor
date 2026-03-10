"use client"

import { useEffect } from "react"

export default function BugTraceInit() {
  useEffect(() => {
    // ── Constants ────────────────────────────────────────────────────
    const PROJECT_ID = "aigovernor"
    const STORAGE_KEY = "bugtrace_sessions"
    const MAX_EVENTS = 200
    const MAX_SESSIONS = 50

    // ── Types ────────────────────────────────────────────────────────
    type Session = {
      sessionId: string
      projectId: string
      createdAt: number
      updatedAt: number
      errorMessage: string | null
      errorStack: string | null
      reproSteps: string | null
      errorSummary: string | null
      events: Ev[]
    }
    type Ev = {
      id: string
      sessionId: string
      projectId: string
      type: string
      page: string
      timestamp: number
      data: Record<string, unknown>
    }

    // ── Session ID ───────────────────────────────────────────────────
    let sessionId = sessionStorage.getItem("bugtrace_session_id")
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem("bugtrace_session_id", sessionId)
    }

    // ── Recording state (persisted so it survives refresh) ───────────
    let isRecording =
      sessionStorage.getItem("bugtrace_recording") !== "false"

    // ── Storage helpers ──────────────────────────────────────────────
    function getSessions(): Session[] {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
      } catch {
        return []
      }
    }
    function saveSessions(s: Session[]) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
      } catch {
        if (s.length > 1) {
          s.shift()
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
          } catch {}
        }
      }
    }
    function createNewSession(): void {
      const sessions = getSessions()
      if (sessions.find((s) => s.sessionId === sessionId)) return
      sessions.push({
        sessionId: sessionId!,
        projectId: PROJECT_ID,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        errorMessage: null,
        errorStack: null,
        reproSteps: null,
        errorSummary: null,
        events: [],
      })
      if (sessions.length > MAX_SESSIONS)
        sessions.splice(0, sessions.length - MAX_SESSIONS)
      saveSessions(sessions)
    }
    createNewSession()

    // ── Event counter for live badge ─────────────────────────────────
    let eventCount = 0
    let errorCount = 0

    function addEvent(type: string, data: Record<string, unknown>) {
      if (!isRecording) return
      const sessions = getSessions()
      const s = sessions.find((s) => s.sessionId === sessionId)
      if (!s) return
      s.events.push({
        id: Math.random().toString(36).slice(2, 10),
        sessionId: sessionId!,
        projectId: PROJECT_ID,
        type,
        page: window.location.pathname,
        timestamp: Date.now(),
        data,
      })
      if (s.events.length > MAX_EVENTS)
        s.events = s.events.slice(-MAX_EVENTS)
      s.updatedAt = Date.now()
      saveSessions(sessions)
      eventCount++
      if (
        type === "error" ||
        type === "unhandled_rejection" ||
        type === "console_error"
      )
        errorCount++
      // Notify the dashboard to update in real-time
      window.dispatchEvent(new CustomEvent("bugtrace:event"))
    }

    // ── Repro step generator ─────────────────────────────────────────
    function generateRepro(events: Ev[], errorMsg: string, stack?: string) {
      const steps: string[] = []
      let n = 1
      for (const e of events) {
        switch (e.type) {
          case "route_change": {
            const to = (e.data.to as string) || e.page
            const name =
              to === "/"
                ? "Home page"
                : to
                    .split("/")
                    .filter(Boolean)
                    .map((p) => p[0].toUpperCase() + p.slice(1))
                    .join(" ") + " page"
            steps.push(`${n++}. Navigate to ${name} (${to})`)
            break
          }
          case "click": {
            const el = e.data.element as Record<string, string> | undefined
            const label =
              el?.text?.trim()?.slice(0, 50) ||
              el?.id ||
              el?.tag ||
              "element"
            steps.push(`${n++}. Click "${label}"`)
            break
          }
          case "input": {
            const inp = e.data.element as Record<string, string> | undefined
            const field = inp?.name || inp?.id || "field"
            steps.push(
              inp?.tag === "select"
                ? `${n++}. Change "${field}" dropdown value`
                : `${n++}. Type in "${field}" field`
            )
            break
          }
          case "api_request": {
            const r = e.data.request as Record<string, unknown> | undefined
            const sc = r?.statusCode as number
            if (sc >= 400 || sc === 0)
              steps.push(
                `${n++}. API call fails: ${r?.method} ${(r?.url as string)?.slice(0, 60)} → ${sc || "Network Error"}`
              )
            break
          }
          case "error":
          case "unhandled_rejection": {
            const err = e.data.error as Record<string, string> | undefined
            steps.push(
              `${n++}. Error: "${(err?.message || errorMsg).slice(0, 120)}"`
            )
            break
          }
        }
      }
      if (steps.length === 0)
        steps.push("1. (No interactions recorded before error)")
      const summary = [`Error: ${errorMsg}`]
      if (stack) {
        const m = stack.match(/at\s+(\S+)\s+\(([^)]+)\)/)
        if (m) summary.push(`Thrown in: ${m[1]} at ${m[2]}`)
      }
      return { reproSteps: steps.join("\n"), errorSummary: summary.join("\n") }
    }

    function processError(errorMsg: string, stack?: string) {
      setTimeout(() => {
        const sessions = getSessions()
        const s = sessions.find((s) => s.sessionId === sessionId)
        if (!s) return
        const result = generateRepro(s.events, errorMsg, stack)
        s.errorMessage = errorMsg
        s.errorStack = stack || null
        s.reproSteps = result.reproSteps
        s.errorSummary = result.errorSummary
        s.updatedAt = Date.now()
        saveSessions(sessions)
        window.dispatchEvent(new CustomEvent("bugtrace:event"))
      }, 100)
    }

    // ── Collectors ───────────────────────────────────────────────────
    const cleanups: (() => void)[] = []

    // Clicks
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t || t.closest("#bugtrace-panel, #bugtrace-btn")) return
      addEvent("click", {
        element: {
          tag: t.tagName?.toLowerCase(),
          text: (t.innerText || "").slice(0, 120),
          id: t.id || "",
          className:
            typeof t.className === "string"
              ? t.className.slice(0, 200)
              : "",
        },
      })
    }
    document.addEventListener("click", onClick, true)
    cleanups.push(() =>
      document.removeEventListener("click", onClick, true)
    )

    // Inputs (debounced)
    const inputTimers = new Map<
      EventTarget,
      ReturnType<typeof setTimeout>
    >()
    const onInput = (e: Event) => {
      const t = e.target as HTMLInputElement
      if (!t || !("value" in t)) return
      const prev = inputTimers.get(t)
      if (prev) clearTimeout(prev)
      inputTimers.set(
        t,
        setTimeout(() => {
          addEvent("input", {
            element: {
              tag: t.tagName?.toLowerCase(),
              name: t.name || t.id || "",
              type: t.type || "",
              valueLength: (t.value || "").length,
            },
          })
          inputTimers.delete(t)
        }, 300)
      )
    }
    document.addEventListener("input", onInput, true)
    cleanups.push(() => {
      document.removeEventListener("input", onInput, true)
      inputTimers.forEach((t) => clearTimeout(t))
    })

    // Route changes
    let lastPath = window.location.pathname
    const checkRoute = () => {
      if (window.location.pathname !== lastPath) {
        const from = lastPath
        lastPath = window.location.pathname
        addEvent("route_change", { from, to: lastPath })
      }
    }
    window.addEventListener("popstate", checkRoute)
    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)
    history.pushState = function (
      ...args: Parameters<typeof history.pushState>
    ) {
      origPush(...args)
      checkRoute()
    }
    history.replaceState = function (
      ...args: Parameters<typeof history.replaceState>
    ) {
      origReplace(...args)
      checkRoute()
    }
    cleanups.push(() => {
      window.removeEventListener("popstate", checkRoute)
      history.pushState = origPush
      history.replaceState = origReplace
    })

    // Fetch interception
    const IGNORED_URL_PATTERNS = [
      "/__nextjs_",
      "/_next/",
      "/__next_",
      "/auth/v1/token",
      "hot-update",
      ".hot-update.",
      "webpack",
    ]
    function shouldIgnoreUrl(url: string | undefined): boolean {
      if (!url) return true
      return IGNORED_URL_PATTERNS.some((p) => url.includes(p))
    }
    const originalFetch = window.fetch
    window.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url
      const method = (init?.method || "GET").toUpperCase()
      const start = Date.now()
      try {
        const res = await originalFetch.call(window, input, init)
        if (!shouldIgnoreUrl(url)) {
          addEvent("api_request", {
            request: {
              url: url?.slice(0, 500),
              method,
              statusCode: res.status,
              durationMs: Date.now() - start,
            },
          })
        }
        return res
      } catch (err) {
        if (!shouldIgnoreUrl(url)) {
          addEvent("api_request", {
            request: {
              url: url?.slice(0, 500),
              method,
              statusCode: 0,
              durationMs: Date.now() - start,
            },
          })
        }
        throw err
      }
    }
    cleanups.push(() => {
      window.fetch = originalFetch
    })

    // Errors
    const IGNORED_ERROR_PATTERNS = [
      "AuthRetryableFetchError",
      "Failed to fetch",
      "NEXT_REDIRECT",
      "NEXT_NOT_FOUND",
      "hydration",
    ]
    function shouldIgnoreError(msg: string): boolean {
      return IGNORED_ERROR_PATTERNS.some((p) =>
        msg.toLowerCase().includes(p.toLowerCase())
      )
    }
    const prevOnError = window.onerror
    window.onerror = (msg, source, line, col, error) => {
      const message = String(msg)
      if (!shouldIgnoreError(message)) {
        addEvent("error", {
          error: {
            message,
            stack: error?.stack,
            source,
            line,
            column: col,
          },
        })
        processError(message, error?.stack)
      }
      if (prevOnError)
        (prevOnError as OnErrorEventHandler)(msg, source, line, col, error)
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const message = e.reason?.message || String(e.reason)
      if (!shouldIgnoreError(message)) {
        addEvent("unhandled_rejection", {
          error: { message, stack: e.reason?.stack },
        })
        processError(message, e.reason?.stack)
      }
    }
    window.addEventListener("unhandledrejection", onRejection)
    const origConsoleError = console.error
    console.error = function (...args: unknown[]) {
      const message = args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ")
        .trim()
      const isNoise =
        !message ||
        message === "{}" ||
        message === "null" ||
        message === "undefined" ||
        message.includes("Warning:") ||
        message.includes("DevTools") ||
        message.includes("__nextjs") ||
        message.includes("hot-update") ||
        message.includes("NEXT_REDIRECT") ||
        message.includes("AuthRetryableFetchError")
      if (!isNoise) {
        addEvent("console_error", { error: { message } })
      }
      origConsoleError.apply(console, args)
    }
    cleanups.push(() => {
      window.onerror = prevOnError
      window.removeEventListener("unhandledrejection", onRejection)
      console.error = origConsoleError
    })

    // ── Dashboard ────────────────────────────────────────────────────
    const destroyDashboard = mountDashboard({
      STORAGE_KEY,
      getSessionId: () => sessionId!,
      getEventCount: () => eventCount,
      getErrorCount: () => errorCount,
      isRecording: () => isRecording,
      toggleRecording: () => {
        isRecording = !isRecording
        sessionStorage.setItem(
          "bugtrace_recording",
          isRecording ? "true" : "false"
        )
        return isRecording
      },
      clearAndReset: () => {
        localStorage.removeItem(STORAGE_KEY)
        // Generate a fresh session ID
        sessionId = crypto.randomUUID()
        sessionStorage.setItem("bugtrace_session_id", sessionId)
        eventCount = 0
        errorCount = 0
        createNewSession()
      },
    })
    cleanups.push(destroyDashboard)

    console.info(
      `[BugTrace] Initialized — project: ${PROJECT_ID}, session: ${sessionId}`
    )
    return () => cleanups.forEach((fn) => fn())
  }, [])

  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard — floating panel with real-time updates, flow view, start/stop
// ═══════════════════════════════════════════════════════════════════════════

interface DashboardAPI {
  STORAGE_KEY: string
  getSessionId: () => string
  getEventCount: () => number
  getErrorCount: () => number
  isRecording: () => boolean
  toggleRecording: () => boolean
  clearAndReset: () => void
}

function mountDashboard(api: DashboardAPI): () => void {
  if (document.getElementById("bugtrace-btn")) return () => {}

  type Session = {
    sessionId: string
    projectId: string
    createdAt: number
    updatedAt: number
    errorMessage: string | null
    errorStack: string | null
    reproSteps: string | null
    errorSummary: string | null
    events: {
      id: string
      type: string
      page: string
      timestamp: number
      data: Record<string, unknown>
    }[]
  }

  function getSessions(): Session[] {
    try {
      return JSON.parse(
        localStorage.getItem(api.STORAGE_KEY) || "[]"
      )
    } catch {
      return []
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")

  const timeAgo = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 1000)
    return d < 5
      ? "now"
      : d < 60
        ? `${d}s ago`
        : d < 3600
          ? `${Math.floor(d / 60)}m ago`
          : d < 86400
            ? `${Math.floor(d / 3600)}h ago`
            : `${Math.floor(d / 86400)}d ago`
  }

  const sbtn = (c: string, extra = "") =>
    `background:${c}22;color:${c};border:1px solid ${c}44;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:11px;font-family:system-ui,sans-serif;transition:all 0.15s;${extra}`

  const eventCfg: Record<
    string,
    { label: string; color: string; bg: string; icon: string }
  > = {
    click: {
      label: "Click",
      color: "#60a5fa",
      bg: "#1e293b",
      icon: "👆",
    },
    input: {
      label: "Input",
      color: "#c084fc",
      bg: "#1e1533",
      icon: "⌨",
    },
    route_change: {
      label: "Navigate",
      color: "#22d3ee",
      bg: "#0c2e33",
      icon: "🔀",
    },
    api_request: {
      label: "API",
      color: "#fbbf24",
      bg: "#2a2005",
      icon: "🌐",
    },
    error: {
      label: "Error",
      color: "#f87171",
      bg: "#2a0505",
      icon: "❌",
    },
    console_error: {
      label: "Console",
      color: "#fb923c",
      bg: "#2a1505",
      icon: "⚠",
    },
    unhandled_rejection: {
      label: "Rejection",
      color: "#f87171",
      bg: "#2a0505",
      icon: "💥",
    },
  }

  function describeEv(e: {
    type: string
    data: Record<string, unknown>
  }): string {
    const d = e.data
    switch (e.type) {
      case "click": {
        const el = d.element as Record<string, string> | undefined
        const t =
          el?.text?.trim()?.slice(0, 60) ||
          (el?.id ? `#${el.id}` : el?.tag || "element")
        return `Clicked "${t}"`
      }
      case "input": {
        const inp = d.element as Record<string, unknown> | undefined
        return `Typed in "${inp?.name || "field"}" (${inp?.valueLength || 0} chars)`
      }
      case "route_change":
        return `${d.from} → ${d.to}`
      case "api_request": {
        const r = d.request as Record<string, unknown> | undefined
        const sc = r?.statusCode as number
        const isFail = sc >= 400 || sc === 0
        const statusLabel =
          sc === 0 ? "FAILED" : `${sc}`
        return `${r?.method} ${(r?.url as string)?.slice(0, 45)}${isFail ? "" : ""} → ${statusLabel} (${r?.durationMs}ms)`
      }
      case "error":
      case "unhandled_rejection": {
        const err = d.error as Record<string, string> | undefined
        return (err?.message || "Unknown error").slice(0, 120)
      }
      case "console_error": {
        const ce = d.error as Record<string, string> | undefined
        return (ce?.message || "").slice(0, 120)
      }
      default:
        return JSON.stringify(d).slice(0, 100)
    }
  }

  function isApiFailure(e: {
    type: string
    data: Record<string, unknown>
  }): boolean {
    if (e.type !== "api_request") return false
    const r = e.data.request as Record<string, unknown> | undefined
    const sc = r?.statusCode as number
    return sc >= 400 || sc === 0
  }

  function isErrorEvent(type: string): boolean {
    return ["error", "unhandled_rejection", "console_error"].includes(
      type
    )
  }

  // ── Floating button with live badge ────────────────────────────────
  const btn = document.createElement("button")
  btn.id = "bugtrace-btn"
  btn.title = "BugTrace AI"
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "99999",
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    border: "2px solid #ef4444",
    background: "#1a1a2e",
    color: "#ef4444",
    fontSize: "22px",
    cursor: "pointer",
    boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    fontFamily: "system-ui, sans-serif",
    padding: "0",
    outline: "none",
  })
  btn.onmouseenter = () => (btn.style.transform = "scale(1.1)")
  btn.onmouseleave = () => (btn.style.transform = "scale(1)")

  // Error count badge
  const badge = document.createElement("span")
  Object.assign(badge.style, {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    background: "#ef4444",
    color: "#fff",
    fontSize: "10px",
    fontWeight: "700",
    borderRadius: "10px",
    padding: "1px 5px",
    minWidth: "16px",
    textAlign: "center",
    display: "none",
    fontFamily: "system-ui, sans-serif",
  })
  btn.style.position = "fixed" // re-set so badge positions relative to it
  btn.appendChild(badge)

  function updateBtnState() {
    const rec = api.isRecording()
    const errors = api.getErrorCount()
    btn.innerHTML = ""
    const icon = document.createTextNode(rec ? "🐛" : "⏸")
    btn.appendChild(icon)
    btn.appendChild(badge)
    btn.style.borderColor = rec ? "#ef4444" : "#666"
    btn.style.opacity = rec ? "1" : "0.7"
    if (errors > 0) {
      badge.textContent = String(errors)
      badge.style.display = "block"
    } else {
      badge.style.display = "none"
    }
  }
  updateBtnState()

  // ── Panel ──────────────────────────────────────────────────────────
  const panel = document.createElement("div")
  panel.id = "bugtrace-panel"
  Object.assign(panel.style, {
    position: "fixed",
    top: "0",
    right: "-500px",
    width: "480px",
    height: "100vh",
    zIndex: "99998",
    background: "#0a0a14",
    borderLeft: "1px solid #1e1e32",
    color: "#e0e0e0",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
    overflow: "hidden",
    transition: "right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    flexDirection: "column",
    boxShadow: "-8px 0 40px rgba(0,0,0,0.7)",
  })

  let isOpen = false
  let currentView: "list" | "detail" | "flow" = "list"
  let currentDetailSession: Session | null = null
  let autoRefreshTimer: ReturnType<typeof setInterval> | null = null

  btn.onclick = () => {
    isOpen = !isOpen
    panel.style.right = isOpen ? "0" : "-500px"
    if (isOpen) {
      currentView = "list"
      renderCurrentView()
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
    updateBtnState()
  }

  // ── Real-time: listen for new events ───────────────────────────────
  const onNewEvent = () => {
    updateBtnState()
    if (isOpen) renderCurrentView()
  }
  window.addEventListener("bugtrace:event", onNewEvent)

  function startAutoRefresh() {
    stopAutoRefresh()
    autoRefreshTimer = setInterval(() => {
      if (isOpen) renderCurrentView()
    }, 3000)
  }
  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer)
      autoRefreshTimer = null
    }
  }

  document.body.appendChild(btn)
  document.body.appendChild(panel)

  function renderCurrentView() {
    if (currentView === "detail" && currentDetailSession) {
      // Re-fetch session to get latest events
      const fresh = getSessions().find(
        (s) => s.sessionId === currentDetailSession!.sessionId
      )
      if (fresh) {
        currentDetailSession = fresh
        renderDetail(fresh)
      } else {
        currentView = "list"
        renderList()
      }
    } else if (currentView === "flow" && currentDetailSession) {
      const fresh = getSessions().find(
        (s) => s.sessionId === currentDetailSession!.sessionId
      )
      if (fresh) {
        currentDetailSession = fresh
        renderFlow(fresh)
      }
    } else {
      renderList()
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // SESSION LIST VIEW
  // ══════════════════════════════════════════════════════════════════
  function renderList() {
    const sessions = getSessions().sort(
      (a, b) => b.updatedAt - a.updatedAt
    )
    const errors = sessions.filter((s) => s.errorMessage)
    const rec = api.isRecording()
    const currentSid = api.getSessionId()

    panel.innerHTML = `
      <div style="padding:14px 18px;border-bottom:1px solid #1e1e32;flex-shrink:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">🐛</span>
            <span style="font-size:15px;font-weight:700;color:#fff">BugTrace AI</span>
          </div>
          <button id="bt-close" style="background:none;border:none;color:#555;cursor:pointer;font-size:18px;padding:0;line-height:1">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button id="bt-rec" style="${sbtn(rec ? "#ef4444" : "#22c55e")}display:flex;align-items:center;gap:5px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${rec ? "#ef4444" : "#666"};${rec ? "animation:btpulse 1.5s infinite" : ""}"></span>
            ${rec ? "Recording" : "Paused"}
          </button>
          <button id="bt-clear" style="${sbtn("#666")}">Clear All</button>
          <span style="color:#444;font-size:11px;margin-left:auto">${errors.length} error${errors.length !== 1 ? "s" : ""} · ${sessions.length} session${sessions.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div id="bt-ct" style="flex:1;overflow-y:auto;padding:10px 14px"></div>
      <style>@keyframes btpulse{0%,100%{opacity:1}50%{opacity:0.3}}</style>
    `

    panel.querySelector("#bt-close")!.addEventListener("click", () => {
      isOpen = false
      panel.style.right = "-500px"
      stopAutoRefresh()
      updateBtnState()
    })

    panel.querySelector("#bt-rec")!.addEventListener("click", () => {
      api.toggleRecording()
      renderList()
      updateBtnState()
    })

    panel.querySelector("#bt-clear")!.addEventListener("click", () => {
      api.clearAndReset()
      renderList()
      updateBtnState()
    })

    const ct = panel.querySelector("#bt-ct") as HTMLElement

    if (sessions.length === 0) {
      ct.innerHTML = `
        <div style="text-align:center;padding:50px 20px;color:#444">
          <div style="font-size:40px;margin-bottom:14px">🔍</div>
          <div style="font-size:14px;color:#666;font-weight:500">No sessions recorded</div>
          <div style="font-size:11px;margin-top:6px;color:#444;line-height:1.5">
            ${rec ? "Interact with the app — events will appear here in real-time." : 'Recording is paused. Click "Paused" to start.'}
          </div>
        </div>`
      return
    }

    ct.innerHTML = ""
    for (const s of sessions) {
      const isCurrent = s.sessionId === currentSid
      const hasError = !!s.errorMessage
      const failedApis = s.events.filter((e) => isApiFailure(e)).length

      const card = document.createElement("div")
      card.style.cssText = `border:1px solid ${hasError ? "#2a1515" : "#1e1e32"};border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all 0.15s;background:${hasError ? "#110808" : "#0d0d18"};${isCurrent ? "border-left:3px solid #3b82f6;" : ""}`
      card.onmouseenter = () => {
        card.style.borderColor = hasError ? "#4a2020" : "#3a3a5e"
        card.style.background = hasError ? "#160a0a" : "#12121f"
      }
      card.onmouseleave = () => {
        card.style.borderColor = hasError ? "#2a1515" : "#1e1e32"
        card.style.background = hasError ? "#110808" : "#0d0d18"
      }

      const dot = hasError
        ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;flex-shrink:0"></span>'
        : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"></span>'
      const badgeHtml = s.reproSteps
        ? '<span style="font-size:9px;background:#14532d;color:#4ade80;padding:2px 6px;border-radius:4px">REPRO</span>'
        : ""
      const currentBadge = isCurrent
        ? '<span style="font-size:9px;background:#1e3a5f;color:#60a5fa;padding:2px 6px;border-radius:4px">LIVE</span>'
        : ""
      const failBadge =
        failedApis > 0
          ? `<span style="font-size:9px;background:#2a2005;color:#fbbf24;padding:2px 6px;border-radius:4px">${failedApis} API FAIL</span>`
          : ""

      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          ${dot}
          <span style="color:#888;font-size:11px;font-family:'SF Mono',Consolas,monospace">${s.sessionId.slice(0, 10)}</span>
          <div style="display:flex;gap:4px;margin-left:auto">${currentBadge}${badgeHtml}${failBadge}</div>
        </div>
        ${hasError ? `<div style="color:#f87171;font-size:11px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4">${esc(s.errorMessage!)}</div>` : ""}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
          <span style="color:#444;font-size:10px">${s.events.length} events</span>
          <span style="color:#444;font-size:10px">${timeAgo(s.updatedAt)}</span>
        </div>
      `
      card.onclick = () => {
        currentView = "detail"
        currentDetailSession = s
        renderDetail(s)
      }
      ct.appendChild(card)
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // SESSION DETAIL VIEW
  // ══════════════════════════════════════════════════════════════════
  function renderDetail(s: Session) {
    const ct = panel.querySelector("#bt-ct")
    if (!ct) {
      // Panel structure lost, re-render from list first
      currentView = "list"
      renderList()
      return
    }

    const failedApis = s.events.filter((e) => isApiFailure(e))

    let h = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <button id="bt-bk" style="background:none;border:none;color:#3b82f6;cursor:pointer;font-size:12px;padding:0;font-family:inherit">← Back</button>
        <div style="margin-left:auto;display:flex;gap:6px">
          <button id="bt-flow" style="${sbtn("#8b5cf6")}font-size:10px;">Flow View</button>
          <button id="bt-del" style="${sbtn("#ef4444")}font-size:10px;">Delete</button>
        </div>
      </div>

      <div style="background:#0d0d18;border:1px solid #1e1e32;border-radius:10px;padding:12px;margin-bottom:12px">
        <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Session</div>
        <div style="color:#aaa;font-size:11px;font-family:'SF Mono',Consolas,monospace;word-break:break-all">${s.sessionId}</div>
        <div style="display:flex;gap:12px;margin-top:6px">
          <span style="color:#444;font-size:10px">${new Date(s.createdAt).toLocaleString()}</span>
          <span style="color:#444;font-size:10px">${s.events.length} events</span>
        </div>
      </div>
    `

    // Error box
    if (s.errorMessage) {
      h += `
        <div style="border:1px solid #7f1d1d;background:#130404;border-radius:10px;padding:12px;margin-bottom:12px">
          <div style="color:#f87171;font-weight:600;font-size:11px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Error</div>
          <div style="color:#fca5a5;font-size:12px;line-height:1.5">${esc(s.errorMessage)}</div>
          ${s.errorStack ? `<details style="margin-top:8px"><summary style="color:#555;font-size:10px;cursor:pointer">Stack trace</summary><pre style="color:#dc262650;font-size:10px;margin-top:6px;white-space:pre-wrap;max-height:100px;overflow:auto;line-height:1.4">${esc(s.errorStack)}</pre></details>` : ""}
        </div>
      `
    }

    // Failed API calls
    if (failedApis.length > 0) {
      h += `
        <div style="border:1px solid #78350f;background:#130c02;border-radius:10px;padding:12px;margin-bottom:12px">
          <div style="color:#fbbf24;font-weight:600;font-size:11px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Failed API Calls (${failedApis.length})</div>
      `
      for (const fe of failedApis) {
        const r = fe.data.request as Record<string, unknown>
        const sc = r?.statusCode as number
        h += `
          <div style="background:#1a1005;border:1px solid #2a1a05;border-radius:6px;padding:8px;margin-bottom:6px;font-size:11px">
            <span style="color:${sc === 0 ? "#ef4444" : "#fbbf24"};font-weight:600">${sc === 0 ? "NETWORK ERR" : sc}</span>
            <span style="color:#aaa;margin-left:6px">${r?.method} ${(r?.url as string)?.slice(0, 50)}</span>
            <span style="color:#555;margin-left:6px">${r?.durationMs}ms</span>
          </div>
        `
      }
      h += `</div>`
    }

    // Repro steps
    if (s.reproSteps) {
      h += `
        <div style="border:1px solid #14532d;background:#020f04;border-radius:10px;padding:12px;margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="color:#4ade80;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Reproduction Steps</div>
            <button id="bt-cp" style="${sbtn("#4ade80")}font-size:10px;padding:3px 8px;">Copy</button>
          </div>
          <pre style="color:#bbf7d0;font-size:12px;white-space:pre-wrap;line-height:1.7;margin:0">${esc(s.reproSteps)}</pre>
          ${
            s.errorSummary
              ? `<div style="border-top:1px solid #14532d;margin-top:10px;padding-top:8px">
              <div style="color:#4ade80;font-size:10px;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">Summary</div>
              <pre style="color:#86efac;font-size:11px;white-space:pre-wrap;line-height:1.4;margin:0">${esc(s.errorSummary)}</pre></div>`
              : ""
          }
        </div>
      `
    }

    // Timeline
    h += `<div style="font-size:11px;font-weight:600;color:#666;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Event Timeline (${s.events.length})</div>`
    h += `<div style="position:relative;padding-left:22px">`
    h += `<div style="position:absolute;left:6px;top:0;bottom:0;width:1px;background:linear-gradient(to bottom, #1e1e32, #1e1e32 70%, transparent)"></div>`

    for (const ev of s.events) {
      const c = eventCfg[ev.type] || {
        label: ev.type,
        color: "#666",
        bg: "#1a1a2e",
        icon: "•",
      }
      const isErr = isErrorEvent(ev.type)
      const isFail = isApiFailure(ev)
      const highlight = isErr || isFail
      const dotColor = isErr
        ? "#ef4444"
        : isFail
          ? "#fbbf24"
          : "#3a3a5e"

      h += `
        <div style="position:relative;margin-bottom:6px">
          <div style="position:absolute;left:-20px;top:6px;width:8px;height:8px;border-radius:50%;background:${dotColor};${isErr ? "box-shadow:0 0 6px #ef444488" : isFail ? "box-shadow:0 0 6px #fbbf2488" : ""}"></div>
          <div style="border:1px solid ${highlight ? (isErr ? "#2a0808" : "#2a1a05") : "#141420"};background:${highlight ? (isErr ? "#110404" : "#110c02") : "#0c0c16"};border-radius:8px;padding:7px 10px;transition:background 0.15s">
            <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px">
              <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:${c.bg};color:${c.color};font-weight:500">${c.icon} ${c.label}</span>
              ${isFail ? '<span style="font-size:9px;color:#fbbf24;font-weight:600">FAILED</span>' : ""}
              <span style="font-size:9px;color:#333;margin-left:auto">${new Date(ev.timestamp).toLocaleTimeString()}</span>
            </div>
            <div style="color:${highlight ? (isErr ? "#fca5a5" : "#fde68a") : "#888"};font-size:11px;line-height:1.3">${esc(describeEv(ev))}</div>
          </div>
        </div>
      `
    }
    h += `</div>`

    ct.innerHTML = h

    // Wire up buttons
    ct.querySelector("#bt-bk")!.addEventListener("click", () => {
      currentView = "list"
      currentDetailSession = null
      renderList()
    })
    ct.querySelector("#bt-flow")!.addEventListener("click", () => {
      currentView = "flow"
      renderFlow(s)
    })
    ct.querySelector("#bt-del")!.addEventListener("click", () => {
      const all = getSessions().filter(
        (x) => x.sessionId !== s.sessionId
      )
      localStorage.setItem(api.STORAGE_KEY, JSON.stringify(all))
      currentView = "list"
      currentDetailSession = null
      renderList()
      updateBtnState()
    })
    const cpBtn = ct.querySelector("#bt-cp")
    if (cpBtn) {
      cpBtn.addEventListener("click", () => {
        navigator.clipboard
          .writeText(
            `Bug Report\n${"=".repeat(40)}\n\nReproduction Steps:\n${s.reproSteps}\n\nError: ${s.errorMessage}\n\n${s.errorSummary || ""}`
          )
          .then(() => {
            ;(cpBtn as HTMLElement).textContent = "Copied!"
            setTimeout(
              () => ((cpBtn as HTMLElement).textContent = "Copy"),
              1500
            )
          })
      })
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // FLOW VIEW — visual user journey diagram
  // ══════════════════════════════════════════════════════════════════
  function renderFlow(s: Session) {
    const ct = panel.querySelector("#bt-ct")
    if (!ct) return

    // Build flow nodes from events — collapse consecutive same-type events
    type FlowNode = {
      label: string
      type: string
      color: string
      bg: string
      icon: string
      count: number
      isError: boolean
      isFail: boolean
      page: string
      time: string
    }

    const nodes: FlowNode[] = []
    let prevPage = ""

    for (const ev of s.events) {
      const c = eventCfg[ev.type] || {
        label: ev.type,
        color: "#666",
        bg: "#1a1a2e",
        icon: "•",
      }
      const isErr = isErrorEvent(ev.type)
      const isFail = isApiFailure(ev)

      let label = ""
      switch (ev.type) {
        case "route_change":
          label = `→ ${ev.data.to}`
          break
        case "click": {
          const el = ev.data.element as Record<string, string> | undefined
          label = `Click "${el?.text?.trim()?.slice(0, 30) || el?.id || el?.tag || "..."}"`
          break
        }
        case "input": {
          const inp = ev.data.element as Record<string, string> | undefined
          label = `Type in "${inp?.name || "field"}"`
          break
        }
        case "api_request": {
          const r = ev.data.request as Record<string, unknown>
          const sc = r?.statusCode as number
          label = `${r?.method} ${(r?.url as string)?.split("/").pop()?.slice(0, 25) || "..."} → ${sc === 0 ? "ERR" : sc}`
          break
        }
        case "error":
        case "unhandled_rejection": {
          const err = ev.data.error as Record<string, string>
          label = (err?.message || "Error").slice(0, 50)
          break
        }
        case "console_error": {
          const ce = ev.data.error as Record<string, string>
          label = (ce?.message || "Console error").slice(0, 50)
          break
        }
        default:
          label = ev.type
      }

      // Page separator
      if (ev.page !== prevPage && ev.type !== "route_change") {
        prevPage = ev.page
      }

      nodes.push({
        label,
        type: ev.type,
        color: isErr ? "#f87171" : isFail ? "#fbbf24" : c.color,
        bg: isErr ? "#2a0505" : isFail ? "#2a1a05" : c.bg,
        icon: c.icon,
        count: 1,
        isError: isErr,
        isFail,
        page: ev.page,
        time: new Date(ev.timestamp).toLocaleTimeString(),
      })
    }

    let h = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <button id="bt-bk2" style="background:none;border:none;color:#3b82f6;cursor:pointer;font-size:12px;padding:0;font-family:inherit">← Back</button>
        <span style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px">Flow View</span>
        <button id="bt-timeline" style="${sbtn("#3b82f6")}font-size:10px;margin-left:auto;">Timeline View</button>
      </div>

      <div style="display:flex;flex-direction:column;align-items:center;gap:0;padding:10px 0">
    `

    // Start node
    h += `
      <div style="background:#1e293b;border:2px solid #3b82f6;border-radius:20px;padding:6px 20px;font-size:12px;color:#60a5fa;font-weight:600">
        Session Start
      </div>
    `

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const borderColor = n.isError
        ? "#ef4444"
        : n.isFail
          ? "#fbbf24"
          : "#2a2a3e"
      const glow = n.isError
        ? "box-shadow:0 0 12px #ef444444;"
        : n.isFail
          ? "box-shadow:0 0 12px #fbbf2444;"
          : ""

      // Connector arrow
      h += `
        <div style="display:flex;flex-direction:column;align-items:center">
          <div style="width:1px;height:12px;background:${borderColor}"></div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid ${borderColor}"></div>
        </div>
      `

      // Node
      const width = n.isError || n.isFail ? "90%" : "80%"
      h += `
        <div style="background:${n.bg};border:1px solid ${borderColor};border-radius:10px;padding:8px 14px;width:${width};${glow}">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:12px">${n.icon}</span>
            <span style="color:${n.color};font-size:11px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n.label)}</span>
            <span style="color:#333;font-size:9px;flex-shrink:0">${n.time}</span>
          </div>
          <div style="color:#444;font-size:9px;margin-top:2px">${n.page}</div>
        </div>
      `
    }

    // End node
    const hasError = !!s.errorMessage
    h += `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="width:1px;height:12px;background:${hasError ? "#ef4444" : "#22c55e"}"></div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid ${hasError ? "#ef4444" : "#22c55e"}"></div>
      </div>
      <div style="background:${hasError ? "#2a0505" : "#052e0f"};border:2px solid ${hasError ? "#ef4444" : "#22c55e"};border-radius:20px;padding:6px 20px;font-size:12px;color:${hasError ? "#f87171" : "#4ade80"};font-weight:600">
        ${hasError ? "Error" : "Session Active"}
      </div>
    `

    h += `</div>`

    ct.innerHTML = h

    ct.querySelector("#bt-bk2")!.addEventListener("click", () => {
      currentView = "detail"
      renderDetail(s)
    })
    ct.querySelector("#bt-timeline")!.addEventListener("click", () => {
      currentView = "detail"
      renderDetail(s)
    })
  }

  return () => {
    btn.remove()
    panel.remove()
    window.removeEventListener("bugtrace:event", onNewEvent)
    stopAutoRefresh()
  }
}
