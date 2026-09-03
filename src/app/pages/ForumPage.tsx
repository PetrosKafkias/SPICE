import { useState } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Plus, Info, Building2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  'Open': 'bg-[#eaf3ea] text-[#3a6b3a]',
  'Under review': 'bg-[#fefce8] text-[#8b4f15] border border-[#e8e3c8]',
  'Included': 'bg-[#e8f0f7] text-[#1b3a5c]',
  'Archived': 'bg-gray-100 text-gray-500',
};

const PROPOSALS = [
  {
    id: 1,
    topic: 'Greenery & Nature',
    title: 'Plant native Mediterranean trees along the promenade',
    desc: 'Replace concrete planters with native olive trees, oleanders, and aromatic herbs to provide shade, reduce heat, and attract pollinators.',
    author: 'Eleni V.', authorRole: 'Citizen', date: '2 Jun 2025',
    votes: { for: 189, against: 12 }, comments: 23,
    status: 'Under review',
    municipalReply: 'This proposal has been referred to the Green Infrastructure Department for technical assessment. We will report back by 30 June.',
  },
  {
    id: 2,
    topic: 'Mobility & Access',
    title: 'Add a protected cycle lane connecting the waterfront to the city centre',
    desc: 'A segregated cycle lane would improve safety for cyclists, reduce car use, and make the waterfront accessible to more people without private transport.',
    author: 'Kostas M.', authorRole: 'Citizen', date: '5 Jun 2025',
    votes: { for: 234, against: 45 }, comments: 41,
    status: 'Included',
    municipalReply: 'Included in the preliminary design brief. The cycle lane is featured in 3D Scenario Option A (highest-voted). Detailed design will begin Q3 2025.',
  },
  {
    id: 3,
    topic: 'Seating & Rest',
    title: 'Install shaded seating areas with weather protection',
    desc: 'Currently there is very limited seating and no shade. Pergolas or sail structures with integrated seating would make the space usable year-round.',
    author: 'Maria T.', authorRole: 'Citizen', date: '8 Jun 2025',
    votes: { for: 156, against: 8 }, comments: 17,
    status: 'Open',
    municipalReply: null,
  },
  {
    id: 4,
    topic: 'Events & Community',
    title: 'Designate a permanent space for community events and markets',
    desc: 'A flexible, open-air event space would allow the community to hold regular markets, cultural events, and civic activities throughout the year.',
    author: 'Nikos P.', authorRole: 'Facilitator', date: '12 Jun 2025',
    votes: { for: 98, against: 23 }, comments: 12,
    status: 'Open',
    municipalReply: null,
  },
  {
    id: 5,
    topic: 'Safety',
    title: 'Improve night-time lighting at the northern pedestrian entrance',
    desc: 'Multiple residents have reported feeling unsafe at the northern entrance after dark. LED lighting with motion sensors would improve safety and visibility.',
    author: 'Sofia A.', authorRole: 'Citizen', date: '15 Jun 2025',
    votes: { for: 312, against: 3 }, comments: 8,
    status: 'Included',
    municipalReply: 'Lighting upgrade has been approved and is included in the 2025 public space maintenance budget. Work will begin September 2025.',
  },
];

const TOPICS = ['All topics', 'Greenery & Nature', 'Mobility & Access', 'Seating & Rest', 'Events & Community', 'Safety', 'Play & Sport'];

export default function ForumPage() {
  const [activeTopic, setActiveTopic] = useState('All topics');
  const [activeStatus, setActiveStatus] = useState('All');
  const [votes, setVotes] = useState<Record<number, 'for' | 'against' | null>>({});
  const [expandedId, setExpandedId] = useState<number | null>(1);

  const filtered = PROPOSALS.filter((p) => {
    const matchTopic = activeTopic === 'All topics' || p.topic === activeTopic;
    const matchStatus = activeStatus === 'All' || p.status === activeStatus;
    return matchTopic && matchStatus;
  });

  const handleVote = (id: number, direction: 'for' | 'against') => {
    setVotes((prev) => ({ ...prev, [id]: prev[id] === direction ? null : direction }));
    toast.success('Your vote has been recorded');
  };

  return (
    <div className="px-8 py-8 max-w-[1100px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Forum / Voting · Structured deliberation · Municipality response badge · Votes stored server-side
      </div>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">Discuss and Decide</h1>
          <p className="text-gray-500 text-[13px]">Discuss and prioritise proposals for the Thessaloniki waterfront redesign.</p>
        </div>
        <button onClick={() => toast.success('Proposal submission form opened')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1b3a5c] text-white rounded-xl font-medium text-[13px] hover:bg-[#163058] shadow-sm">
          <Plus size={14} /> Submit proposal
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TOPICS.map((t) => (
          <button key={t} onClick={() => setActiveTopic(t)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors
              ${activeTopic === t ? 'bg-[#1b3a5c] text-white border-[#1b3a5c]' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'}`}>
            {t}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {['All', 'Open', 'Under review', 'Included', 'Archived'].map((s) => (
            <button key={s} onClick={() => setActiveStatus(s)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors
                ${activeStatus === s ? 'bg-[#1b3a5c] text-white border-[#1b3a5c]' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {filtered.map((proposal) => {
          const totalVotes = proposal.votes.for + proposal.votes.against + (votes[proposal.id] ? 1 : 0);
          const forPct = Math.round((proposal.votes.for / (proposal.votes.for + proposal.votes.against)) * 100);
          const isExpanded = expandedId === proposal.id;

          return (
            <div key={proposal.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Voting */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
                    <button onClick={() => handleVote(proposal.id, 'for')}
                      className={`p-2 rounded-lg transition-colors ${votes[proposal.id] === 'for' ? 'bg-[#eaf3ea] text-[#3a6b3a]' : 'hover:bg-gray-50 text-gray-500'}`}>
                      <ThumbsUp size={16} />
                    </button>
                    <span className="text-[14px] font-bold text-[#1b3a5c]">{proposal.votes.for}</span>
                    <button onClick={() => handleVote(proposal.id, 'against')}
                      className={`p-2 rounded-lg transition-colors ${votes[proposal.id] === 'against' ? 'bg-red-50 text-red-500' : 'hover:bg-gray-50 text-gray-500'}`}>
                      <ThumbsDown size={16} />
                    </button>
                    <span className="text-[11px] text-gray-400">{proposal.votes.against}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{proposal.topic}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[proposal.status]}`}>
                        {proposal.status}
                      </span>
                    </div>
                    <h3 className="text-[14px] font-bold text-[#1b3a5c] mb-1">{proposal.title}</h3>
                    <p className="text-[12px] text-gray-600 leading-relaxed mb-2">{proposal.desc}</p>

                    {/* Support bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                        <span>{forPct}% support ({totalVotes} total)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#4a7c59] rounded-full" style={{ width: `${forPct}%` }}></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span>By {proposal.author} ({proposal.authorRole})</span>
                      <span>{proposal.date}</span>
                      <button onClick={() => setExpandedId(isExpanded ? null : proposal.id)}
                        className="flex items-center gap-1 text-[#1b3a5c] hover:underline ml-auto">
                        <MessageSquare size={12} /> {proposal.comments} comments
                        <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Municipality reply */}
              {proposal.municipalReply && (
                <div className="mx-4 mb-3 bg-[#e8f0f7] rounded-xl p-3 border-l-4 border-[#1b3a5c]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Building2 size={13} className="text-[#1b3a5c]" />
                    <span className="text-[11px] font-bold text-[#1b3a5c]">Official response — Municipality of Thessaloniki</span>
                  </div>
                  <p className="text-[11px] text-[#1b3a5c]/80 leading-relaxed">{proposal.municipalReply}</p>
                </div>
              )}

              {/* Comments section */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-[#f5f2ee] px-4 py-3">
                  <div className="flex flex-col gap-2 mb-3">
                    {[
                      { user: 'Maria T.', role: 'Citizen', comment: 'Fully support this! The current promenade has no shade at all in summer.', time: '3 Jun' },
                      { user: 'Nikos P.', role: 'Facilitator', comment: 'This was also the top concern in the CitiVoice feedback campaign.', time: '5 Jun' },
                    ].map((c, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full bg-[#1b3a5c] text-white text-[9px] font-bold flex items-center justify-center">
                            {c.user[0]}
                          </div>
                          <span className="text-[11px] font-medium text-gray-700">{c.user}</span>
                          <span className="text-[10px] text-gray-400">({c.role}) · {c.time}</span>
                        </div>
                        <p className="text-[12px] text-gray-600 ml-7">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="Add a comment…" className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] text-gray-700 bg-white focus:outline-none" />
                    <button onClick={() => toast.success('Comment posted')}
                      className="px-3 py-1.5 bg-[#1b3a5c] text-white rounded-lg text-[12px] font-medium hover:bg-[#163058]">
                      Post
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
