import { Info, Download, ExternalLink, MapPin, Heart, MessageSquare, ThumbsUp, AlertCircle, Camera } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

const engagementData = [
  { week: 'W1', contributions: 45, votes: 23 },
  { week: 'W2', contributions: 112, votes: 67 },
  { week: 'W3', contributions: 198, votes: 134 },
  { week: 'W4', contributions: 267, votes: 189 },
  { week: 'W5', contributions: 341, votes: 245 },
  { week: 'W6', contributions: 284, votes: 198 },
];

const categoryData = [
  { name: 'Safety & lighting', value: 312, fill: '#1b3a5c' },
  { name: 'Greenery & nature', value: 284, fill: '#4a7c59' },
  { name: 'Seating & rest', value: 198, fill: '#0f6e6e' },
  { name: 'Play & sport', value: 167, fill: '#c8691e' },
  { name: 'Accessibility', value: 145, fill: '#5a3f7a' },
  { name: 'Events & activity', value: 141, fill: '#d97706' },
];

const sentimentData = [
  { name: 'Positive', value: 38, fill: '#4a7c59' },
  { name: 'Constructive', value: 41, fill: '#1b3a5c' },
  { name: 'Concerned', value: 15, fill: '#c8691e' },
  { name: 'Negative', value: 6, fill: '#dc2626' },
];

const votingData = [
  { idea: 'Add cycle lane', votes: 234, for: 189, against: 45 },
  { idea: 'Community garden', votes: 198, for: 178, against: 20 },
  { idea: 'Covered seating', votes: 176, for: 156, against: 20 },
  { idea: 'Water feature', votes: 143, for: 98, against: 45 },
  { idea: 'Remove parking', votes: 167, for: 89, against: 78 },
];

const TOP_LOCATIONS = [
  { name: 'Central plaza (eastern section)', count: 412, concern: 'Lack of shade and seating' },
  { name: 'Northern pedestrian entrance', count: 234, concern: 'Safety at night — poor lighting' },
  { name: 'Waterfront promenade', count: 198, concern: 'Damaged paving — accessibility issue' },
  { name: 'Children\'s play area', count: 167, concern: 'Outdated equipment' },
];

export default function CitiVoicePage() {
  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Connected CitiVoice output · External service producing data for toolkit · REST API integration · Read-only in this view
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">CitiVoice Outputs</h1>
          <p className="text-gray-500 text-[13px]">
            Maps, heatmaps, and summaries from the CitiVoice citizen feedback campaign — Thessaloniki Pilot, Nea Paralia.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.info('Opening CitiVoice app download link…')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-700 hover:bg-gray-50 shadow-sm">
            <ExternalLink size={13} /> Open CitiVoice
          </button>
          <button onClick={() => toast.success('Summary imported into Reports')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1b3a5c] text-white text-[12px] font-medium hover:bg-[#163058] shadow-sm">
            <Download size={13} /> Import summary into report
          </button>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 mb-5">
        <span className="flex items-center gap-1.5 bg-[#eaf3ea] text-[#3a6b3a] text-[11px] px-3 py-1 rounded-full font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          CitiVoice connected
        </span>
        <span className="flex items-center gap-1.5 bg-[#e8f0f7] text-[#1b3a5c] text-[11px] px-3 py-1 rounded-full font-medium">
          REST API output available
        </span>
        <span className="text-[11px] text-gray-400">Last sync: 12 minutes ago</span>
      </div>

      {/* Key data cards */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Contributions received', value: '1,247', icon: MessageSquare, color: 'text-[#1b3a5c] bg-[#e8f0f7]', change: '+47 today' },
          { label: 'Unique participants', value: '847', icon: Heart, color: 'text-[#4a7c59] bg-[#eaf3ea]', change: '+12 this week' },
          { label: 'Votes cast', value: '856', icon: ThumbsUp, color: 'text-[#0f6e6e] bg-[#e6f5f5]', change: '+23 today' },
          { label: 'Photos uploaded', value: '312', icon: Camera, color: 'text-[#c8691e] bg-[#fef3e8]', change: '+8 this week' },
          { label: 'Issues flagged', value: '89', icon: AlertCircle, color: 'text-[#5a3f7a] bg-[#f0eef8]', change: '14 need action' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg ${card.color.split(' ')[1]} flex items-center justify-center mb-2`}>
                <Icon size={16} className={card.color.split(' ')[0]} />
              </div>
              <div className={`text-[22px] font-bold mb-0.5 ${card.color.split(' ')[0]}`}>{card.value}</div>
              <div className="text-[11px] text-gray-500 mb-1">{card.label}</div>
              <div className="text-[10px] text-gray-400">{card.change}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-5 mb-5">
        {/* Map placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-[13px] text-[#1b3a5c]">Feedback Map — Nea Paralia, Thessaloniki</h3>
            <div className="flex gap-2">
              <button className="px-2 py-1 text-[10px] rounded-md bg-[#1b3a5c] text-white">Heatmap</button>
              <button className="px-2 py-1 text-[10px] rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">Points</button>
              <button className="px-2 py-1 text-[10px] rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">Clusters</button>
            </div>
          </div>
          {/* Map visual placeholder */}
          <div className="relative bg-[#d4e6d4] h-[280px] overflow-hidden">
            {/* Simulated map background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#b8d4c8] via-[#c8ddd0] to-[#a8c8b8]">
              {/* Streets */}
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/60"></div>
              <div className="absolute top-1/4 left-0 right-0 h-[1px] bg-white/40"></div>
              <div className="absolute top-3/4 left-0 right-0 h-[1px] bg-white/40"></div>
              <div className="absolute left-1/3 top-0 bottom-0 w-[1px] bg-white/40"></div>
              <div className="absolute left-2/3 top-0 bottom-0 w-[1px] bg-white/40"></div>
              {/* Water */}
              <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-[#7ab0c8]/60"></div>
              <div className="absolute bottom-[60px] left-0 right-0 h-[8px] bg-[#5a9aab]/40 rounded"></div>
              {/* Heatmap blobs */}
              <div className="absolute top-[35%] left-[40%] w-24 h-20 bg-red-500/50 rounded-full blur-xl"></div>
              <div className="absolute top-[25%] left-[20%] w-16 h-14 bg-orange-400/40 rounded-full blur-lg"></div>
              <div className="absolute top-[55%] left-[60%] w-20 h-16 bg-yellow-400/40 rounded-full blur-xl"></div>
              <div className="absolute top-[40%] left-[65%] w-14 h-12 bg-red-400/35 rounded-full blur-lg"></div>
              {/* Location pins */}
              {[
                { top: '35%', left: '40%', label: '412 contributions' },
                { top: '25%', left: '18%', label: '234 contributions' },
                { top: '55%', left: '58%', label: '198 contributions' },
              ].map((pin, i) => (
                <div key={i} className="absolute" style={{ top: pin.top, left: pin.left }}>
                  <div className="w-4 h-4 bg-[#1b3a5c] rounded-full border-2 border-white shadow-md"></div>
                  <div className="absolute left-5 top-0 bg-white text-[9px] text-[#1b3a5c] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap font-medium">
                    {pin.label}
                  </div>
                </div>
              ))}
              {/* Legend */}
              <div className="absolute top-3 right-3 bg-white/90 rounded-lg px-2 py-1.5 text-[10px]">
                <div className="font-semibold text-gray-700 mb-1">Heatmap intensity</div>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #fef08a, #fb923c, #ef4444)' }}></div>
                  <span className="text-gray-400">High</span>
                </div>
              </div>
              {/* Water label */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-white/80 font-medium">Thermaikos Gulf</div>
            </div>
          </div>
          <div className="px-4 py-2 bg-[#f5f2ee] flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <MapPin size={11} className="text-[#1b3a5c]" />
              Nea Paralia waterfront, Thessaloniki
            </div>
            <span className="text-[10px] text-gray-400">CitiVoice campaign period: 12 May – 20 Jun 2025</span>
          </div>
        </div>

        {/* Top locations */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-semibold text-[13px] text-[#1b3a5c] mb-3">Top locations</h3>
          {TOP_LOCATIONS.map((loc, i) => (
            <div key={loc.name} className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0
                ${i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-400' : i === 2 ? 'bg-yellow-500' : 'bg-gray-400'}`}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-gray-800 leading-tight">{loc.name}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{loc.concern}</div>
                <div className="mt-1">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1b3a5c] rounded-full" style={{ width: `${(loc.count / 412) * 100}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="text-[12px] font-bold text-[#1b3a5c] flex-shrink-0">{loc.count}</div>
            </div>
          ))}
          <button onClick={() => toast.info('Feedback requiring municipal action — 14 items flagged')}
            className="w-full mt-3 text-[11px] bg-[#fef3e8] text-[#8b4f15] border border-[#e8d4b8] rounded-lg py-2 hover:bg-[#fde8d0] transition-colors font-medium">
            ⚠️ 14 issues require municipal action
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Engagement timeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm col-span-2">
          <h3 className="font-semibold text-[13px] text-[#1b3a5c] mb-3">Engagement over time</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="contributions" stroke="#1b3a5c" fill="#1b3a5c" fillOpacity={0.12} strokeWidth={2} name="Contributions" isAnimationActive={false} />
              <Area type="monotone" dataKey="votes" stroke="#4a7c59" fill="none" strokeWidth={2} strokeDasharray="4 2" name="Votes" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-semibold text-[13px] text-[#1b3a5c] mb-3">Sentiment summary</h3>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" cx="50%" cy="50%" outerRadius={50} innerRadius={30} isAnimationActive={false}>
                {sentimentData.map((entry) => <Cell key={`sentiment-${entry.name}`} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-1">
            {sentimentData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.fill }}></div>
                  <span className="text-gray-600">{s.name}</span>
                </div>
                <span className="font-medium text-gray-700">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Feedback categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-semibold text-[13px] text-[#1b3a5c] mb-3">Main concerns by category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Contributions" isAnimationActive={false}>
                {categoryData.map((entry) => <Cell key={`category-${entry.name}`} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Voting results */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-semibold text-[13px] text-[#1b3a5c] mb-3">Most supported ideas (voting)</h3>
          <div className="flex flex-col gap-2">
            {votingData.map((item, i) => (
              <div key={item.idea}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400">#{i + 1}</span>
                    <span className="text-gray-700">{item.idea}</span>
                  </div>
                  <span className="font-medium text-[#1b3a5c]">{item.votes} votes</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-[#4a7c59] rounded-l-full" style={{ width: `${(item.for / item.votes) * 100}%` }}></div>
                  <div className="h-full bg-red-400/60 rounded-r-full" style={{ width: `${(item.against / item.votes) * 100}%` }}></div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                  <span className="text-[#4a7c59]">✓ {item.for} for</span>
                  <span className="text-red-400">✗ {item.against} against</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
