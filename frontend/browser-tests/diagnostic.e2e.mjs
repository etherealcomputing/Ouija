// Real end-to-end browser test for the telemetry diagnostic.
// ─────────────────────────────────────────────────────────────────────────
// Serves the static export (out/) in-process and drives it in Chromium:
// the console must boot OFFLINE, and flipping Demo Mode must transition the
// header diagnostic to LIVE with a live dropped-frame readout. This exercises
// the whole chain — SimulatedNeurosityAdapter → TelemetryProvider →
// TelemetryMonitor → LinkDiagnostic — that unit tests can only cover in pieces.
//
// Prereqs: `npm run build` (produces out/) and a Chromium the Playwright driver
// can find (CI: `npx playwright install chromium`; this environment ships one at
// /opt/pw-browsers). Run via `npm run test:e2e:browser`.
//
// Self-contained: no external web server, no Playwright config/runner — just the
// `playwright` driver, so it stays dependency-light and non-flaky.

import http from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { chromium } from "playwright"

const ROOT = join(process.cwd(), "out")
const PORT = Number(process.env.PORT || 4321)
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
}

async function serveFile(res, fp) {
  const body = await readFile(fp)
  res.writeHead(200, { "content-type": MIME[extname(fp)] || "application/octet-stream" })
  res.end(body)
}

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent((req.url || "/").split("?")[0])
  if (p.endsWith("/")) p += "index.html"
  const fp = join(ROOT, p)
  try {
    await serveFile(res, fp)
  } catch {
    try {
      await serveFile(res, fp + ".html") // Next export routes → foo.html
    } catch {
      try {
        await serveFile(res, join(ROOT, "index.html")) // SPA fallback
      } catch {
        res.writeHead(404)
        res.end("not found")
      }
    }
  }
})

function fail(msg) {
  console.error(`E2E FAIL: ${msg}`)
  process.exitCode = 1
}

await new Promise((r) => server.listen(PORT, r))
const base = `http://127.0.0.1:${PORT}`
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined })

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(base, { waitUntil: "networkidle" })

  const diag = page.getByTestId("link-diagnostic")
  await diag.waitFor({ state: "visible", timeout: 15000 })

  const bootLink = await diag.getAttribute("data-link")
  if (bootLink !== "disconnected") fail(`expected OFFLINE at boot, got ${bootLink}`)

  await page.getByRole("switch", { name: "Toggle Demo Mode" }).click()
  await page.waitForFunction(
    () => document.querySelector('[data-testid="link-diagnostic"]')?.getAttribute("data-link") === "live",
    { timeout: 15000 },
  )
  await page.waitForTimeout(1500) // let frames flow so the loss readout renders

  const liveLink = await diag.getAttribute("data-link")
  const loss = await page.getByTestId("frame-loss").textContent().catch(() => null)
  if (liveLink !== "live") fail(`expected LIVE after Demo on, got ${liveLink}`)
  if (!loss || !/dropped/.test(loss)) fail(`expected a dropped-frame readout, got ${loss}`)

  if (!process.exitCode) console.log(`E2E OK: OFFLINE → LIVE, diagnostic readout "${(await diag.textContent())?.trim()}"`)
} catch (err) {
  fail(err?.message || String(err))
} finally {
  await browser.close()
  server.close()
}
