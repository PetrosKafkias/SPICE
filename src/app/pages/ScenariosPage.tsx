import { useState } from 'react';
import { MapPin, ArrowRight, Info } from 'lucide-react';
import { TOOLS } from '../data/tools';
import { ToolCard } from '../components/ToolCard';
import { toast } from 'sonner';

const SCENARIOS = [
  {
    id: 'thessaloniki',
    name: 'Thessaloniki Public Space Pilot',
    location: 'Thessaloniki, Greece',
    flag: '🇬🇷',
    challenge: 'Revitalising an underused waterfront square with low community trust in municipal planning processes.',
    stage: 'Co-design & Scenario Building',
    stagePhase: 3,
    phases: [2, 3, 4],
    suggestedTools: ['citivoice-collection', 'future-scenarios', 'scene-visualisation', 'temp-prototype'],
    status: 'Active',
    participants: 847,
    contributions: 1247,
    description: 'The Thessaloniki pilot focuses on the Nea Paralia waterfront, engaging a diverse urban community including youth, elderly residents, and small businesses in reimagining public space usage and access.',
  },
  {
    id: 'rovaniemi',
    name: 'Rovaniemi City Centre Pilot',
    location: 'Rovaniemi, Finland',
    flag: '🇫🇮',
    challenge: 'Co-designing a year-round public square that serves both residents and tourists while managing seasonal extremes.',
    stage: 'Collective Understanding',
    stagePhase: 2,
    phases: [1, 2, 3],
    suggestedTools: ['stakeholder-mapping', 'photo-journal', 'perception-map', 'future-scenarios'],
    status: 'Active',
    participants: 324,
    contributions: 678,
    description: 'The Rovaniemi pilot addresses the unique challenge of designing a public space that functions across Arctic winters and tourist-heavy summers, requiring inclusive engagement of year-round residents.',
  },
  {
    id: 'cuba',
    name: 'Cuba Municipality Pilot',
    location: 'Cuba, Portugal',
    flag: '🇵🇹',
    challenge: 'Engaging a small rural municipality in participatory planning of a new community green space on a limited budget.',
    stage: 'Framing & Readiness',
    stagePhase: 1,
    phases: [1, 2],
    suggestedTools: ['readiness-assessment', 'pilot-diagnostic', 'stakeholder-mapping', 'feedback-walk'],
    status: 'Planning',
    participants: 89,
    contributions: 134,
    description: 'Cuba is a small Alentejo municipality with limited participatory planning experience. This pilot tests how the SPICE toolkit can be adapted for resource-constrained, rural contexts with high community cohesion.',
  },
  {
    id: 'bielsko',
    name: 'ARRSA / Bielsko-Biała Pilot',
    location: 'Bielsko-Biała, Poland',
    flag: '🇵🇱',
    challenge: 'Transforming a post-industrial riverside area into an inclusive, nature-based public space through multi-stakeholder co-design.',
    stage: 'Prototyping & Testing',
    stagePhase: 4,
    phases: [3, 4, 5],
    suggestedTools: ['design-sprint', 'temp-prototype', 'popup-consultation', 'outcome-mapping'],
    status: 'Active',
    participants: 512,
    contributions: 921,
    description: 'The Bielsko-Biała pilot focuses on a 3-hectare brownfield site along the Biała River, requiring complex stakeholder negotiation between environmental groups, sports associations, and local residents.',
  },
];

const PHASE_LABELS: Record<number, string> = {
  1: 'Framing',
  2: 'Understanding',
  3: 'Co-design',
  4: 'Prototyping',
  5: 'Consolidation',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-[#eaf3ea] text-[#3a6b3a]',
  Planning: 'bg-[#e8f0f7] text-[#1b3a5c]',
  Complete: 'bg-[#f0eef8] text-[#5a3f7a]',
};

export default function ScenariosPage() {
  const [selected, setSelected] = useState<string | null>('thessaloniki');

  const scenario = SCENARIOS.find((s) => s.id === selected);
  const scenarioTools = scenario ? TOOLS.filter((t) => scenario.suggestedTools.includes(t.id)) : [];

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Scenario-based navigation · Reuse tools from existing SPICE pilots · Backend reads pilot configuration
      </div>

      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">See Possible Scenarios</h1>
        <p className="text-gray-500 text-[13px]">
          Choose an existing SPICE pilot to explore the tools and approaches already tested in similar contexts.
        </p>
      </div>

      <div className="grid grid-cols-[380px_1fr] gap-5">
        {/* Scenario cards */}
        <div className="flex flex-col gap-3">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setSelected(sc.id)}
              className={`text-left rounded-xl border-2 p-4 transition-all shadow-sm
                ${selected === sc.id ? 'border-[#1b3a5c] bg-[#e8f0f7] shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[18px]">{sc.flag}</span>
                  <div>
                    <div className={`text-[13px] font-bold ${selected === sc.id ? 'text-[#1b3a5c]' : 'text-gray-800'}`}>{sc.name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <MapPin size={10} /> {sc.location}
                    </div>
                  </div>
                </div>
                <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sc.status]}`}>
                  {sc.status}
                </span>
              </div>

              <p className="text-[11px] text-gray-600 mb-2 leading-relaxed">{sc.challenge}</p>

              <div className="flex flex-wrap gap-1 mb-2">
                {sc.phases.map((p) => (
                  <span key={p} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Ph. {p}: {PHASE_LABELS[p]}</span>
                ))}
              </div>

              <div className="flex gap-3 text-[10px] text-gray-500">
                <span>👥 {sc.participants} participants</span>
                <span>💬 {sc.contributions} contributions</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {scenario && (
          <div className="flex flex-col gap-4">
            {/* Scenario info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[24px]">{scenario.flag}</span>
                    <h2 className="text-[18px] font-bold text-[#1b3a5c]">{scenario.name}</h2>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-gray-500 mb-3">
                    <MapPin size={12} /> {scenario.location}
                  </div>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[scenario.status]}`}>
                  {scenario.status}
                </span>
              </div>

              <p className="text-[13px] text-gray-600 leading-relaxed mb-4">{scenario.description}</p>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[#f5f2ee] rounded-lg p-3">
                  <div className="text-[11px] text-gray-500 mb-1">Current stage</div>
                  <div className="text-[13px] font-semibold text-[#1b3a5c]">{scenario.stage}</div>
                </div>
                <div className="bg-[#f5f2ee] rounded-lg p-3">
                  <div className="text-[11px] text-gray-500 mb-1">Participants</div>
                  <div className="text-[20px] font-bold text-[#1b3a5c]">{scenario.participants}</div>
                </div>
                <div className="bg-[#f5f2ee] rounded-lg p-3">
                  <div className="text-[11px] text-gray-500 mb-1">Contributions</div>
                  <div className="text-[20px] font-bold text-[#4a7c59]">{scenario.contributions}</div>
                </div>
              </div>

              {/* Phase progress */}
              <div className="mb-4">
                <div className="text-[11px] text-gray-500 font-medium mb-2">Roadmap phases covered</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <div key={p} className={`flex-1 h-2 rounded-full ${scenario.phases.includes(p) ? 'bg-[#1b3a5c]' : 'bg-gray-200'}`}></div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {[1, 2, 3, 4, 5].map((p) => (
                    <div key={p} className={`text-[9px] text-center ${scenario.phases.includes(p) ? 'text-[#1b3a5c] font-medium' : 'text-gray-400'}`}>
                      {PHASE_LABELS[p]}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => toast.success(`Loading ${scenario.name} scenario…`, { description: 'Tools and roadmap will be pre-populated.' })}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1b3a5c] text-white rounded-xl font-semibold text-[13px] hover:bg-[#163058] shadow-md"
              >
                Use this scenario <ArrowRight size={16} />
              </button>
            </div>

            {/* Suggested tools */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-[15px] font-semibold text-[#1b3a5c]">Suggested tools for this scenario</h3>
                <span className="text-[11px] text-gray-500">({scenarioTools.length} tools)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {scenarioTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
