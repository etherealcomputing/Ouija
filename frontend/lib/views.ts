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

export type View = "dashboard" | "signals" | "trends" | "imaging" | "devices" | "settings"

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
  { id: "trends", label: "Trends", icon: LineChart, shortcut: "3", roadmap: true },
  { id: "imaging", label: "Imaging", icon: Brain, shortcut: "4", roadmap: true },
  { id: "devices", label: "Devices", icon: Cpu, shortcut: "5", roadmap: true },
  { id: "settings", label: "Settings", icon: Settings, shortcut: "6", roadmap: true },
]
