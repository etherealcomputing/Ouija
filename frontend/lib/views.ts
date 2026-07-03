// Typed view registry for the Ouija console. The sidebar, keyboard shortcuts,
// and the routed view surface all derive from this single list.

import {
  Activity,
  Brain,
  Cpu,
  LayoutDashboard,
  LineChart,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type View = "dashboard" | "signals" | "brain" | "trends" | "devices" | "settings"

export interface ViewDef {
  id: View
  label: string
  icon: LucideIcon
  /** Key that jumps to this view. */
  shortcut?: string
  /** Not yet built — rendered as a roadmap placeholder. */
  roadmap?: boolean
}

export const NAVIGATION: ViewDef[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "1" },
  { id: "signals", label: "Signals", icon: Activity, shortcut: "2" },
  { id: "brain", label: "Brain Atlas", icon: Brain, shortcut: "3" },
  { id: "trends", label: "Trends", icon: LineChart, shortcut: "4", roadmap: true },
  { id: "devices", label: "Devices", icon: Cpu, shortcut: "5", roadmap: true },
  { id: "settings", label: "Settings", icon: Settings, shortcut: "6", roadmap: true },
]
