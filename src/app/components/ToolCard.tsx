import { Clock, Users, Plus, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';
import { Tool } from '../data/tools';
import { useApp } from '../context/AppContext';
import { PHASES } from '../data/tools';
import { toast } from 'sonner';

interface ToolCardProps {
  tool: Tool;
  compact?: boolean;
}

const MODE_COLORS = {
  Online: 'bg-[#e6f5f5] text-[#0f6e6e]',
  Offline: 'bg-[#fef3e8] text-[#8b4f15]',
  Hybrid: 'bg-[#eaf3ea] text-[#3a6b3a]',
};

export function ToolCard({ tool, compact = false }: ToolCardProps) {
  const { addToolToProcess, myProcessTools } = useApp();
  const phase = PHASES.find((p) => p.id === tool.phase)!;
  const inProcess = myProcessTools.includes(tool.id);

  const handleAdd = () => {
    addToolToProcess(tool.id);
    toast.success(`"${tool.name}" added to your process`, {
      description: 'Go to My Process to view your roadmap.',
    });
  };

  return (
    <div className="bg-[#fefce8] border border-[#e8e3c8] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[#1b3a5c] font-semibold text-[13px] leading-tight">{tool.name}</h3>
        <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${phase.light} ${phase.color}`}>
          Ph. {tool.phase}
        </span>
      </div>

      <p className="text-gray-600 text-[12px] leading-relaxed">{tool.shortDesc}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${MODE_COLORS[tool.mode]}`}>
          {tool.mode}
        </span>
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          <Clock size={10} /> {tool.duration}
        </span>
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          <Users size={10} /> {tool.groupSize}
        </span>
      </div>

      {!compact && (
        <div className="text-[11px] text-gray-500 border-t border-[#e8e3c8] pt-2">
          {tool.phaseName}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Link
          to={`/tool/${tool.id}`}
          className="flex-1 text-center text-[11px] text-[#1b3a5c] border border-[#1b3a5c]/30 rounded-lg py-1.5 hover:bg-[#1b3a5c]/5 transition-colors font-medium"
        >
          More info
        </Link>
        <button
          onClick={handleAdd}
          disabled={inProcess}
          className={`flex-1 flex items-center justify-center gap-1 text-[11px] rounded-lg py-1.5 font-medium transition-colors
            ${inProcess ? 'bg-[#4a7c59] text-white cursor-default' : 'bg-[#1b3a5c] text-white hover:bg-[#163058]'}`}
        >
          {inProcess ? <CheckCircle2 size={12} /> : <Plus size={12} />}
          {inProcess ? 'In My Process' : 'Add to Process'}
        </button>
      </div>
    </div>
  );
}
