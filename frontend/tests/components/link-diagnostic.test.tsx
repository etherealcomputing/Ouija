import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { LinkDiagnosticView } from "@/components/ouija/link-diagnostic"
import type { TelemetryDiagnostic } from "@/lib/diagnostics"

function diag(over: Partial<TelemetryDiagnostic> = {}): TelemetryDiagnostic {
  return {
    link: "live",
    stale: false,
    msSinceFrame: 120,
    integrity: { received: 100, dropped: 0, duplicates: 0, outOfRange: 0, lastSeq: 100 },
    deliveryRatio: 1,
    warnings: [],
    ...over,
  }
}

describe("LinkDiagnosticView", () => {
  it("shows LIVE and a zero-loss readout when healthy", () => {
    render(<LinkDiagnosticView diagnostic={diag()} connected />)
    expect(screen.getByTestId("link-diagnostic").dataset.link).toBe("live")
    expect(screen.getByText(/LIVE · streaming/)).toBeTruthy()
    expect(screen.getByTestId("frame-loss").textContent).toContain("0 dropped")
  })

  it("surfaces STALE — the state raw device health never reports", () => {
    render(<LinkDiagnosticView diagnostic={diag({ link: "stale", stale: true, msSinceFrame: 5000 })} connected />)
    expect(screen.getByTestId("link-diagnostic").dataset.link).toBe("stale")
    expect(screen.getByText(/STALE/)).toBeTruthy()
  })

  it("reports dropped frames with a loss percentage", () => {
    render(
      <LinkDiagnosticView
        diagnostic={diag({
          integrity: { received: 90, dropped: 10, duplicates: 0, outOfRange: 0, lastSeq: 100 },
          deliveryRatio: 0.9,
        })}
        connected
      />,
    )
    const loss = screen.getByTestId("frame-loss").textContent ?? ""
    expect(loss).toContain("10 dropped")
    expect(loss).toContain("10%")
  })

  it("hides the loss readout before any frame / when disconnected", () => {
    render(
      <LinkDiagnosticView
        diagnostic={diag({ link: "disconnected", integrity: { received: 0, dropped: 0, duplicates: 0, outOfRange: 0, lastSeq: null } })}
        connected={false}
      />,
    )
    expect(screen.getByText(/OFFLINE/)).toBeTruthy()
    expect(screen.queryByTestId("frame-loss")).toBeNull()
  })
})
