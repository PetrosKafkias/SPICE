import { useState } from 'react';
import { Info, Layers, RotateCcw, ZoomIn, Send, Upload, GitCompare, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const VERSION_HISTORY = [
  { id: 'v3', label: 'v3 — Cycle lane added', date: '8 May 2025', author: 'Nikos P.', active: true },
  { id: 'v2', label: 'v2 — Greenery expanded', date: '2 May 2025', author: 'Eleni V.', active: false },
  { id: 'v1', label: 'v1 — Initial scene', date: '24 Apr 2025', author: 'ARCHi5 Studio', active: false },
];

export default function SceneEditorPage() {
  const [viewMode, setViewMode] = useState<'after' | 'before'>('after');
  const [prompt, setPrompt] = useState('');
  const [activeOp, setActiveOp] = useState<'edit' | 'add' | 'delete'>('edit');

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Embedded Scene Editor · 3D Gaussian Splatting scene · REST API output available · Authenticated
      </div>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">3D Scene Editor</h1>
          <p className="text-gray-500 text-[13px]">
            Nea Paralia Plaza — Thessaloniki Pilot · 3D Gaussian Splatting scene · Version 3
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-[#eaf3ea] text-[#3a6b3a] text-[11px] px-3 py-1.5 rounded-full font-medium">
            <CheckCircle2 size={12} /> Authenticated
          </span>
          <span className="flex items-center gap-1.5 bg-[#e8f0f7] text-[#1b3a5c] text-[11px] px-3 py-1.5 rounded-full font-medium">
            <CheckCircle2 size={12} /> Scene loaded
          </span>
          <span className="flex items-center gap-1.5 bg-[#e6f5f5] text-[#0f6e6e] text-[11px] px-3 py-1.5 rounded-full font-medium">
            <CheckCircle2 size={12} /> REST API output available
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5">
        {/* Main scene viewer */}
        <div className="flex flex-col gap-4">
          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 shadow-sm">
            {/* Before/After */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setViewMode('before')}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${viewMode === 'before' ? 'bg-[#1b3a5c] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Before
              </button>
              <button onClick={() => setViewMode('after')}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${viewMode === 'after' ? 'bg-[#1b3a5c] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                After
              </button>
            </div>

            <div className="h-5 w-px bg-gray-200"></div>

            {/* Operations */}
            {(['edit', 'add', 'delete'] as const).map((op) => (
              <button key={op} onClick={() => setActiveOp(op)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-lg capitalize transition-colors
                  ${activeOp === op ? 'bg-[#fef3e8] text-[#c8691e] border border-[#e8d4b8]' : 'text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
                {op === 'edit' ? '✏️ Edit' : op === 'add' ? '➕ Add' : '🗑️ Delete'}
              </button>
            ))}

            <div className="ml-auto flex gap-2">
              <button className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><ZoomIn size={14} /></button>
              <button className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><RotateCcw size={14} /></button>
              <button className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><Layers size={14} /></button>
            </div>
          </div>

          {/* 3D Scene placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="relative h-[360px]">
              {/* Sky gradient background */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#aed6f1] via-[#d4e8f0] to-[#c8e6c9]"></div>

              {/* Ground */}
              <div className="absolute bottom-0 left-0 right-0 h-[180px] bg-gradient-to-t from-[#8fbc8f] to-[#b8d4b0]"></div>

              {/* Buildings */}
              <div className="absolute bottom-[180px] left-0 right-0 flex items-end gap-1 px-4">
                <div className="w-16 h-28 bg-[#d4c4a0] rounded-t-sm border border-[#b8a880]"></div>
                <div className="w-12 h-20 bg-[#c8b898] rounded-t-sm border border-[#b8a880]"></div>
                <div className="w-20 h-36 bg-[#d0c8b0] rounded-t-sm border border-[#b8a880]"></div>
                <div className="flex-1"></div>
                {/* Trees */}
                <div className="flex gap-2">
                  {[40, 52, 44, 48].map((h, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="w-8 rounded-full bg-[#4a7c59]" style={{ height: h }}></div>
                      <div className="w-1.5 h-4 bg-[#8b6914]"></div>
                    </div>
                  ))}
                </div>
                <div className="flex-1"></div>
                <div className="w-14 h-24 bg-[#c8c0a8] rounded-t-sm border border-[#b8a880]"></div>
              </div>

              {/* Plaza */}
              <div className="absolute bottom-[120px] left-[160px] right-[80px] h-[60px] bg-[#d4cdb8] rounded-lg border border-[#b8b098]"></div>

              {/* Cycle lane (after mode only) */}
              {viewMode === 'after' && (
                <div className="absolute bottom-[150px] left-0 right-0 h-[8px] bg-[#4a7c59]/60 border-t-2 border-b-2 border-[#3a6b3a]"></div>
              )}

              {/* Water */}
              <div className="absolute top-[30%] left-0 right-0 h-[50px] bg-[#7ab0c8]/40 rounded"></div>

              {/* Overlay label */}
              <div className="absolute top-3 left-3 bg-white/90 rounded-lg px-3 py-1.5 text-[11px] shadow-sm">
                <div className="font-semibold text-[#1b3a5c]">
                  {viewMode === 'after' ? '✅ After: Cycle lane + greenery' : '📸 Before: Current state'}
                </div>
                <div className="text-gray-500">Nea Paralia Plaza · 3D Gaussian Splatting</div>
              </div>

              {/* Edit metadata badge */}
              <div className="absolute bottom-3 right-3 bg-white/90 rounded-lg px-2 py-1 text-[10px] text-gray-600 shadow-sm">
                Edit metadata available · v3
              </div>
            </div>

            {/* Action bar */}
            <div className="px-4 py-2 bg-[#f5f2ee] border-t border-gray-200 flex items-center justify-between">
              <button onClick={() => toast.info('Side-by-side comparison view loading…')}
                className="flex items-center gap-1.5 text-[11px] text-[#1b3a5c] font-medium hover:underline">
                <GitCompare size={13} /> Compare snapshots (v1 vs v3)
              </button>
              <div className="flex gap-2">
                <button onClick={() => toast.success('Scene exported to Repository')}
                  className="text-[11px] text-[#1b3a5c] bg-[#e8f0f7] px-2 py-1 rounded-md hover:bg-[#d0e4f0]">
                  Export to Repository
                </button>
                <button onClick={() => toast.success('Scene exported to CitiVoice for collective review')}
                  className="text-[11px] text-[#4a7c59] bg-[#eaf3ea] px-2 py-1 rounded-md hover:bg-[#d4ecda]">
                  Export to CitiVoice
                </button>
                <button onClick={() => toast.success('Results added to My Process')}
                  className="text-[11px] text-[#5a3f7a] bg-[#f0eef8] px-2 py-1 rounded-md hover:bg-[#e4e0f4]">
                  Export to Process
                </button>
              </div>
            </div>
          </div>

          {/* AI prompt field */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-[13px] font-semibold text-[#1b3a5c] mb-2">Describe the modification</h3>
            <div className="flex gap-2">
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Add a cycle lane along the northern edge and expand the green area…"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-[12px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b3a5c]/20"
              />
              <button
                onClick={() => { toast.success('Scene modification queued — rendering…'); setPrompt(''); }}
                className="px-4 py-2 bg-[#1b3a5c] text-white rounded-xl text-[12px] font-medium hover:bg-[#163058] flex items-center gap-1.5">
                <Send size={13} /> Apply
              </button>
            </div>
            <div className="mt-2">
              <div className="text-[10px] text-gray-400 mb-1.5">Reference image upload (optional)</div>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 flex items-center gap-2 text-[11px] text-gray-400 hover:border-[#1b3a5c]/30 cursor-pointer">
                <Upload size={13} />
                Drag a reference image here, or click to upload
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Version history */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-[13px] font-bold text-[#1b3a5c] mb-3">Version history</h3>
            {VERSION_HISTORY.map((v) => (
              <div key={v.id} className={`rounded-lg p-3 mb-2 cursor-pointer transition-all
                ${v.active ? 'bg-[#e8f0f7] border-2 border-[#1b3a5c]' : 'border border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-semibold text-[#1b3a5c]">{v.label}</span>
                  {v.active && <span className="text-[10px] bg-[#1b3a5c] text-white px-1.5 py-0.5 rounded-full">Active</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <Clock size={9} /> {v.date} · {v.author}
                </div>
                {/* Thumbnail placeholder */}
                <div className="mt-2 h-12 rounded bg-gradient-to-br from-[#b8d4c8] to-[#8fbc8f] flex items-center justify-center text-[9px] text-white font-medium">
                  {v.id.toUpperCase()} preview
                </div>
              </div>
            ))}
          </div>

          {/* Collective review */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h3 className="text-[13px] font-bold text-[#1b3a5c] mb-2">Collective review & voting</h3>
            <div className="text-[11px] text-gray-600 mb-3">
              3 design options sent for community review via CitiVoice.
            </div>
            {[
              { label: 'Option A — Cycle lane + greenery', votes: 189, pct: 62 },
              { label: 'Option B — Expanded plaza only', votes: 78, pct: 26 },
              { label: 'Option C — Fountain centrepiece', votes: 37, pct: 12 },
            ].map((opt) => (
              <div key={opt.label} className="mb-2.5">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-gray-700">{opt.label}</span>
                  <span className="font-bold text-[#1b3a5c]">{opt.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1b3a5c] rounded-full" style={{ width: `${opt.pct}%` }}></div>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{opt.votes} votes</div>
              </div>
            ))}
          </div>

          {/* Edit metadata */}
          <div className="bg-[#f5f2ee] rounded-xl p-3 border border-gray-200">
            <div className="text-[11px] font-semibold text-[#1b3a5c] mb-2">Edit metadata (v3)</div>
            <div className="flex flex-col gap-1.5 text-[11px] text-gray-600">
              <div><span className="font-medium text-gray-500">Scene type:</span> 3D Gaussian Splatting</div>
              <div><span className="font-medium text-gray-500">Location:</span> Nea Paralia Plaza, Thess.</div>
              <div><span className="font-medium text-gray-500">Created by:</span> Nikos Papadopoulos</div>
              <div><span className="font-medium text-gray-500">Last rendered:</span> 8 May 2025, 14:23</div>
              <div><span className="font-medium text-gray-500">Status:</span> <span className="text-[#4a7c59]">✓ Rendered</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
