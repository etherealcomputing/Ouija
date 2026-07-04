"use client"

import { useCallback, useRef, useState } from "react"
import { parseUpload, UPLOAD_HELP } from "@/lib/uploads"
import { parseViome } from "@/lib/viome"
import { useAtlas } from "./atlas-data-provider"
import { Upload, X, FileWarning, Dna } from "lucide-react"

export function UploadDropzone() {
  const { source, uploadLabel, warnings, setUpload, clearUpload, gutLabel, setGut, clearGut } = useAtlas()
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Try the EEG/region-values parser first; fall back to the Viome gut parser.
  // Whichever recognizes the file wins; if neither does, surface the clearest error.
  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      const reader = new FileReader()
      reader.onload = () => {
        const text = String(reader.result ?? "")
        let regionErr: string | null = null
        try {
          const parsed = parseUpload(text, file.name)
          if (Object.keys(parsed.regionValues).length) {
            setUpload(parsed)
            return
          }
          regionErr = "No usable region values in the file."
        } catch (e) {
          regionErr = e instanceof Error ? e.message : "Could not parse file."
        }
        try {
          setGut(parseViome(text, file.name))
          return
        } catch (e) {
          const viomeErr = e instanceof Error ? e.message : "Could not parse file."
          // Prefer the region error unless the file clearly looked like a Viome report.
          setError(/viome|gut/i.test(viomeErr) ? regionErr ?? viomeErr : viomeErr)
        }
      }
      reader.onerror = () => setError("Could not read file.")
      reader.readAsText(file)
    },
    [setUpload, setGut],
  )

  return (
    <div className="space-y-2">
      {/* Region/EEG upload state */}
      {source === "upload" && (
        <div className="rounded-lg border border-perception/40 bg-perception/5 px-4 py-3 flex items-center gap-3">
          <Upload className="w-4 h-4 text-perception shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-mono text-foreground truncate">{uploadLabel}</div>
            <div className="text-[9px] font-mono text-text-dim">driving the atlas from uploaded data</div>
            {warnings.map((w, i) => (
              <div key={i} className="text-[9px] font-mono text-amber flex items-center gap-1 mt-0.5">
                <FileWarning className="w-3 h-3" /> {w}
              </div>
            ))}
          </div>
          <button onClick={clearUpload} className="text-text-dim hover:text-foreground p-1" aria-label="Clear upload, return to live feed">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Viome gut upload state */}
      {gutLabel && (
        <div className="rounded-lg border border-mint/40 bg-mint/5 px-4 py-3 flex items-center gap-3">
          <Dna className="w-4 h-4 text-mint shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-mono text-foreground truncate">{gutLabel}</div>
            <div className="text-[9px] font-mono text-text-dim">Viome gut intelligence — converted in-app</div>
          </div>
          <button onClick={clearGut} className="text-text-dim hover:text-foreground p-1" aria-label="Clear Viome gut data">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dropzone (always available — accepts more data any time) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f) handleFile(f)
        }}
        className={`rounded-lg border border-dashed px-4 py-4 text-center cursor-pointer transition-colors ${
          dragging ? "border-perception bg-perception/10" : "border-border hover:border-perception/40 bg-obsidian/40"
        }`}
      >
        <Upload className="w-4 h-4 text-perception mx-auto mb-1.5" />
        <div className="text-[11px] font-mono text-foreground/80">Drop data (CSV or JSON)</div>
        <div className="text-[9px] font-mono text-text-faint mt-1 leading-relaxed">
          EEG / region values, or a Viome gut-intelligence report. {UPLOAD_HELP}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.csv,.txt,application/json,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ""
          }}
        />
      </div>
      {error && (
        <div className="text-[10px] font-mono text-coral flex items-center gap-1.5">
          <FileWarning className="w-3 h-3" /> {error}
        </div>
      )}
    </div>
  )
}
