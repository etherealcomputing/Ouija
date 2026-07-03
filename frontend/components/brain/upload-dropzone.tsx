"use client"

import { useCallback, useRef, useState } from "react"
import { parseUpload, UPLOAD_HELP } from "@/lib/uploads"
import { useAtlas } from "./atlas-data-provider"
import { Upload, X, FileWarning } from "lucide-react"

export function UploadDropzone() {
  const { source, uploadLabel, warnings, setUpload, clearUpload } = useAtlas()
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = parseUpload(String(reader.result ?? ""), file.name)
          if (!Object.keys(parsed.regionValues).length) throw new Error("No usable region values in the file.")
          setUpload(parsed)
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not parse file.")
        }
      }
      reader.onerror = () => setError("Could not read file.")
      reader.readAsText(file)
    },
    [setUpload],
  )

  if (source === "upload") {
    return (
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
    )
  }

  return (
    <div>
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
        <div className="text-[11px] font-mono text-foreground/80">Drop EEG / region values (CSV or JSON)</div>
        <div className="text-[9px] font-mono text-text-faint mt-1 leading-relaxed">{UPLOAD_HELP}</div>
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
        <div className="mt-2 text-[10px] font-mono text-coral flex items-center gap-1.5">
          <FileWarning className="w-3 h-3" /> {error}
        </div>
      )}
    </div>
  )
}
