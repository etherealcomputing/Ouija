import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { StateChip } from "@/components/ui/state-chip"
import { MIND_STATES, STATE_FLOW } from "@/lib/ouija-data"

describe("StateChip", () => {
  it("renders the label for each mind-state", () => {
    for (const state of STATE_FLOW) {
      const { unmount } = render(<StateChip state={state} />)
      expect(screen.getByText(MIND_STATES[state].label)).toBeInTheDocument()
      unmount()
    }
  })
})
