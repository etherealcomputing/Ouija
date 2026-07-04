# Brain Atlas Dashboard — Design Specification

> Product/UX specification for Ouija's brain-atlas-centric dashboard. This
> document defines the target UI/UX and functional requirements; the
> accompanying implementation lands the changes in `frontend/`.

## 1. Overview

Ouija is a **single, cohesive dashboard** for understanding your own brain and
body. Its focal point is an interactive 3D **brain atlas** that sits *recessed*
in the center of the dashboard — a sunken viewport the rest of the surface wraps
around. Every other element (mind-state, live metrics, system readiness, region
detail, uploads, session log) lands on this same dashboard rather than on
separate pages, so the experience reads as one console, not a set of tabs.

The dashboard aggregates multiple data modalities — EEG, autonomic (HRV),
imaging (MRI/SPECT/fNIRS), body composition, and **gut intelligence (Viome)** —
and distills them into plain-language insight. It runs empty and ready by
default; a **Demo Mode** can seed it, and users can upload their own data to
light the brain region-by-region toward a fully resolved (NOMINAL) state.

## 2. Layout & Navigation

**Single-dashboard model.** The Brain Atlas view *is* the dashboard and the app's
home. Secondary views (Signals, Trends, Devices, Settings) remain reachable from
the sidebar/drawer, but the home dashboard is self-sufficient: it carries the
brain plus the primary widgets so a user never has to leave it to get the whole
picture.

**Recessed brain viewport (focal point).** The 3D canvas is presented in a
*recessed well*: an inset container with an inner shadow and a subtle beveled
ring, so the brain reads as sunken into the dashboard surface rather than sitting
on a flat card. It is the largest element and the visual anchor.

**Content zones (desktop, ≥ lg):**
- **Center:** the recessed brain viewport with its HUD overlay (status readout,
  cortical-drive meter, reticle, active-region caption).
- **Right rail:** System Readiness (adaptive resolution tracker) → Region detail
  panel (hover/select) → Upload center.
- **Above the brain:** the plain-language "your brain, right now" banner + a
  compact KPI strip (mind-state, focus, calm, HRV) so the dashboard's headline
  numbers land here too.
- **Below the brain:** the all-regions grid.

**Responsive:** on small screens the zones stack vertically (banner → KPIs →
brain → readiness → region → upload → regions grid); navigation collapses to a
drawer. See §Mobile in the implementation.

**Navigation:** left sidebar (desktop) / drawer (mobile) with digit shortcuts.
Brain Atlas is item 1 and the default landing view.

## 3. Copy Guidelines

**"God View" usage — title only.**
- The **only** permitted use is the exact product title **"God View for Your
  Brain"** (note the capital **F**, and no hyphen).
- Remove "God view" / "God-View" from **all** microcopy: subtitles, banners,
  captions, and any user-facing string. Region and status microcopy describes
  what the data means in plain terms, never "God-View."
- Internal code comments are also cleaned up for consistency, but the hard rule
  applies to user-facing copy.

**"A personal project" — removed completely.**
- The phrase "A personal project" is removed from **all** copy in **every**
  state (metadata/description, footer, anywhere). It never appears.

**Simulated-feed microcopy — conditional.**
- When simulated feeds (**Demo Mode**) are **off**: the simulated-feed microcopy
  must disappear entirely. The footer degrades to the neutral, non-diagnostic
  disclaimer only.
- When Demo Mode is **on**: it is honest to label the feed as simulated (e.g.,
  "Simulated feed — not a diagnostic instrument").

**Disclaimer.** "Not a diagnostic instrument" is retained in both states — it is
a safety statement, not project framing.

## 4. Data Integration

**Required modalities.** The system resolves to NOMINAL only when every required
modality is feeding: **EEG**, **Autonomic (HRV)**, **Imaging**, **Body**, and
**Gut Intelligence (Viome)**.

**Viome Gut Intelligence — format clarification.** Viome's Gut Intelligence test
is a stool-based **metatranscriptomic (RNA) assay**; results are delivered as
**scored reports (JSON/CSV/PDF)** — Gut Microbiome Health, Metabolic Fitness,
Inflammatory Activity, and per-pathway/organism scores — **not DICOM imaging**.
DICOM is the format for the medical-imaging modality (MRI/SPECT), which Ouija
already converts. Accordingly:
- **Gut (Viome)** is integrated via a client-side **Viome report parser**
  (JSON/CSV of 0–100 scores) → normalized 0–1 gut-health signals. This is the
  "real-time, in-app conversion" — no server round-trip.
- The medical-imaging DICOM path (`converters/imaging/`) remains the home for
  actual imaging; the gut modality does not masquerade as imaging.
- If a user genuinely has imaging-formatted gut data, it routes through the
  imaging path; the default and expected Viome path is the report parser.

**Gut-brain axis mapping.** Gut intelligence is a **systemic** modality (like
Body): it drives overall readiness and the plain-language summary, and lightly
informs the limbic/autonomic read (the gut-brain axis) rather than a cortical
region. It advances the system toward NOMINAL.

**Real-time conversion (in-app).** All user uploads are parsed client-side
(FileReader, no network) and reflected immediately: EEG/region CSV-JSON via
`lib/uploads.ts`; Viome report via `lib/viome.ts`; heavier scientific formats
(EDF/SNIRF/DICOM) convert offline through the Python `converters/` and can emit
the region-values / score JSON the app ingests in real time.

## 5. Upload Flow & Adaptive Notifications

**Goal:** at any moment the user knows exactly what is connected, what is
missing, and how to resolve it — "ironclad" clarity.

**Upload center (right rail).** One clear affordance per modality state:
1. A **resolution tracker** headline: "`N of M` data sources connected" with a
   progress meter and the system status (OFFLINE → PARTIAL → NOMINAL).
2. A **per-modality checklist**: each required modality (EEG, Autonomic,
   Imaging, Body, Gut) with a live state chip — `connected` (✓, and *how*:
   device / upload / demo) or `awaiting` — plus an inline action (upload /
   connect) for the ones still missing.
3. A **dropzone** that accepts the relevant file types and classifies them
   automatically (EEG/region values, Viome report, imaging region-values).

**Adaptive notification logic.**
- The headline and checklist recompute on every data change (frame arrives,
  upload parsed, demo toggled, connect pressed).
- When **incomplete**: an amber "still needed" line names the missing modalities
  explicitly — e.g., "Awaiting Imaging, Gut — upload a scan or a Viome report to
  finish resolving your brain."
- When **complete (NOMINAL)**: a success confirmation replaces the "still
  needed" line — "All sources connected · fully resolved."
- Notifications never show a modality as needed once it is connected, and never
  claim completeness while any required modality is awaiting.
- Errors (unparseable upload) surface inline on the dropzone with a specific
  reason, not a generic failure.

## 6. Demo Mode Setup

**Purpose.** Demo Mode instantiates a runnable brain so the app is explorable
before any real data exists. It is **off by default** (the app boots empty and
usable); toggling it on starts the feed, toggling it off tears it down and clears
all buffers.

**Housekeeping prerequisites (must land before Demo Mode is "user-data" mode):**
1. Copy conditionalized (no "A personal project" / simulated-feed microcopy when
   off) — §3.
2. "God View" restricted to the title — §3.
3. Required-modality set finalized incl. Gut (Viome) — §4.
4. Upload flow + adaptive notifications in place — §5.
5. Legal links present — §7.

**Demo content vs. the user's own data.** Today Demo Mode runs the deterministic
simulated feed (`SimulatedNeurosityAdapter`). The forward path — Demo Mode seeded
from *the user's own* previously-uploaded/hosted data — is enabled **after** the
housekeeping above and the data-hosting story (personal store → NeuroJSON) is
wired; until then the simulated feed stands in, clearly labeled as simulated.

## 7. Legal Documentation Placement

Privacy Policy and Terms of Service (PDFs supplied later) are linked following
web best practice — **footer and Settings only**, never scattered through the UI:
- **Global footer:** a slim persistent footer on the dashboard with "Privacy
  Policy" and "Terms of Service" links (open the PDFs in a new tab; `rel`
  hardened). Until the PDFs exist, links point to placeholder routes
  (`/legal/privacy`, `/legal/terms`) and are visibly marked as forthcoming.
- **Settings:** a "Legal" section repeating the two links for discoverability.
- No legal links appear anywhere else.

## 8. Checklist

- [ ] Brain atlas is the central, **recessed** view on the dashboard.
- [ ] All other content lands on the (single) dashboard.
- [ ] "A personal project" removed when simulated feeds are off.
- [ ] Simulated-feed microcopy fully removed in that state.
- [ ] Viome gut-intelligence listed as a required modality.
- [ ] Real-time (client-side) conversion capability noted + implemented.
- [ ] Upload flow is clear; adaptive notifications define what's still needed.
- [ ] Demo Mode prerequisites documented.
- [ ] "God View" appears only in the title "God View for Your Brain" (capital F).
- [ ] Privacy Policy + Terms of Service links in footer and Settings only.
- [ ] Mobile experience optimized (follow-up pass).
