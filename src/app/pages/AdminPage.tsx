import { useState } from 'react';
import { Settings, Users, Globe, Activity, Shield, Lock, ToggleLeft, ToggleRight, Info, CheckCircle2, AlertCircle, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

const MODULES = [
  { id: 'forum', label: 'Forum / Voting', desc: 'Community discussion and voting module', active: true },
  { id: 'citivoice', label: 'CitiVoice integration', desc: 'Real-time feedback from CitiVoice app', active: true },
  { id: 'ai-agent', label: 'Co-Design AI Agent', desc: 'RAG-based AI guidance assistant', active: true },
  { id: 'scene-editor', label: '3D Scene Editor', desc: 'Embedded Gaussian splatting viewer', active: true },
  { id: 'repository', label: 'Repository', desc: 'Document and media repository', active: true },
  { id: 'analog', label: 'Analog Tools Results', desc: 'Upload and display analog workshop outputs', active: true },
  { id: 'reports', label: 'Reports & Export', desc: 'Process and pilot report generation', active: false },
  { id: 'gamification', label: 'Gamification features', desc: 'Points, badges, and contribution milestones', active: false },
];

const ROLES_MATRIX = [
  { role: 'Admin', view: true, edit: true, manage: true, export: true, configure: true },
  { role: 'Municipality Staff', view: true, edit: true, manage: true, export: true, configure: false },
  { role: 'Facilitator', view: true, edit: true, manage: false, export: true, configure: false },
  { role: 'Citizen', view: true, edit: false, manage: false, export: false, configure: false },
];

const LANG_STATUS = [
  { lang: 'English (EN)', pct: 100, status: 'Complete' },
  { lang: 'Greek (EL)', pct: 87, status: 'In progress' },
  { lang: 'Italian (IT)', pct: 72, status: 'In progress' },
  { lang: 'Portuguese (PT)', pct: 65, status: 'In progress' },
  { lang: 'Spanish (ES)', pct: 58, status: 'In progress' },
  { lang: 'Finnish (FI)', pct: 41, status: 'In progress' },
  { lang: 'Polish (PL)', pct: 34, status: 'Needs attention' },
];

const LOG_ITEMS = [
  { time: '14:32:01', level: 'INFO', msg: 'CitiVoice API sync completed — 47 new contributions', user: 'system' },
  { time: '14:18:45', level: 'INFO', msg: 'User Nikos P. exported process plan (PDF)', user: 'nikos.p' },
  { time: '13:55:20', level: 'INFO', msg: '3D Scene v3 rendered and exported to repository', user: 'nikos.p' },
  { time: '13:22:08', level: 'WARN', msg: 'Translation file EL.json has 13 missing keys', user: 'system' },
  { time: '12:48:30', level: 'INFO', msg: 'Forum proposal #5 status changed to "Included"', user: 'admin' },
  { time: '11:30:15', level: 'INFO', msg: 'New user registered: Sofia A. (Citizen)', user: 'system' },
];

const LOG_COLORS: Record<string, string> = {
  INFO: 'text-[#3a6b3a] bg-[#eaf3ea]',
  WARN: 'text-[#8b4f15] bg-[#fef3e8]',
  ERROR: 'text-red-600 bg-red-50',
};

export default function AdminPage() {
  const [modules, setModules] = useState(MODULES);
  const [activeTab, setActiveTab] = useState<'config' | 'roles' | 'translation' | 'logs' | 'consent'>('config');

  const toggleModule = (id: string) => {
    setModules((prev) => prev.map((m) => m.id === id ? { ...m, active: !m.active } : m));
    toast.success('Module configuration updated');
  };

  return (
    <div className="px-8 py-8 max-w-[1200px] mx-auto">
      {/* Annotation */}
      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 text-[11px] text-amber-800 mb-5">
        <Info size={12} />
        Admin configuration · Backend-driven pilot configuration · Navigation and module availability controlled via backend
      </div>

      {/* Permission warning for non-admin */}
      <div className="flex items-center gap-2 bg-[#fef3e8] border border-[#e8d4b8] rounded-xl p-3 mb-5">
        <Lock size={14} className="text-[#8b4f15] flex-shrink-0" />
        <p className="text-[12px] text-[#8b4f15]">
          Admin configuration area. Access restricted to users with <strong>Municipality Staff</strong> or <strong>Admin</strong> role.
          Changes here affect all users of the Thessaloniki pilot.
        </p>
      </div>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-bold text-[#1b3a5c] mb-1">Manage / Admin Configuration</h1>
          <p className="text-gray-500 text-[13px]">Pilot configuration, module availability, roles, translations, and system monitoring.</p>
        </div>
        <button onClick={() => toast.success('Configuration exported')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1b3a5c] text-white text-[12px] font-medium hover:bg-[#163058] shadow-sm">
          <Download size={13} /> Export config
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {([
          { id: 'config', label: '⚙️ Pilot config', icon: Settings },
          { id: 'roles', label: '👥 Roles', icon: Users },
          { id: 'translation', label: '🌍 Translations', icon: Globe },
          { id: 'logs', label: '📊 Monitoring', icon: Activity },
          { id: 'consent', label: '🔒 Consent', icon: Shield },
        ] as const).map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors
              ${activeTab === tab.id ? 'bg-white text-[#1b3a5c] shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-2 gap-5">
          {/* Pilot info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#1b3a5c] mb-4">Pilot configuration</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Pilot name', value: 'Thessaloniki Pilot', editable: true },
                { label: 'Project', value: 'Public Space Co-Creation', editable: true },
                { label: 'Pilot ID', value: 'SPICE-GR-001', editable: false },
                { label: 'Status', value: 'Active — Feedback open', editable: false },
                { label: 'Start date', value: '1 May 2025', editable: true },
                { label: 'End date', value: '31 December 2025', editable: true },
                { label: 'Primary language', value: 'Greek (EL)', editable: true },
                { label: 'Target participants', value: '500+', editable: true },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-[11px] text-gray-500 font-medium">{f.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-800 font-medium">{f.value}</span>
                    {f.editable && (
                      <button className="text-[10px] text-[#1b3a5c] hover:underline opacity-50 hover:opacity-100">Edit</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Module availability */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#1b3a5c] mb-4">Module availability</h3>
            <div className="text-[11px] text-[#5a3f7a] bg-[#f0eef8] rounded-lg px-3 py-2 mb-3">
              Module availability is controlled via backend configuration, not hardcoded frontend changes.
            </div>
            <div className="flex flex-col gap-2">
              {modules.map((mod) => (
                <div key={mod.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="text-[12px] font-medium text-gray-800">{mod.label}</div>
                    <div className="text-[10px] text-gray-500">{mod.desc}</div>
                  </div>
                  <button onClick={() => toggleModule(mod.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors
                      ${mod.active ? 'bg-[#eaf3ea] text-[#3a6b3a]' : 'bg-gray-100 text-gray-500'}`}>
                    {mod.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {mod.active ? 'Active' : 'Off'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#1b3a5c] mb-2">Role & permission matrix</h3>
          <p className="text-[11px] text-gray-500 mb-4">Role-Based Access Control (RBAC) — managed via Keycloak OAuth2/JWT integration.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Role</th>
                  {['View content', 'Edit content', 'Manage process', 'Export data', 'Configure pilot'].map((h) => (
                    <th key={h} className="text-center py-2 px-3 text-gray-500 font-medium">{h}</th>
                  ))}
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ROLES_MATRIX.map((row) => (
                  <tr key={row.role} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-[#1b3a5c]">{row.role}</span>
                    </td>
                    {[row.view, row.edit, row.manage, row.export, row.configure].map((perm, i) => (
                      <td key={i} className="py-3 px-3 text-center">
                        {perm ? (
                          <CheckCircle2 size={16} className="text-[#4a7c59] mx-auto" />
                        ) : (
                          <span className="text-gray-300 text-[16px] mx-auto block text-center">—</span>
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-3 text-center">
                      <button className="text-[11px] text-[#1b3a5c] hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 bg-[#e8f0f7] rounded-lg p-3 text-[11px] text-[#1b3a5c]">
            Authentication: OAuth2/JWT via Keycloak · Backend Integration Layer enforces RBAC on all API requests
          </div>
        </div>
      )}

      {activeTab === 'translation' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-[#1b3a5c]">Translation completeness</h3>
              <p className="text-[11px] text-gray-500">7 languages · Translation manager · i18n JSON key coverage</p>
            </div>
            <button onClick={() => toast.success('Exporting translation files…')}
              className="flex items-center gap-1.5 text-[12px] text-[#1b3a5c] bg-[#e8f0f7] px-3 py-1.5 rounded-lg hover:bg-[#d0e4f0]">
              <Download size={13} /> Export .json files
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {LANG_STATUS.map((l) => (
              <div key={l.lang} className="flex items-center gap-4">
                <div className="w-[160px] text-[12px] font-medium text-gray-700 flex-shrink-0">{l.lang}</div>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${l.pct === 100 ? 'bg-[#4a7c59]' : l.pct >= 60 ? 'bg-[#1b3a5c]' : 'bg-[#c8691e]'}`}
                    style={{ width: `${l.pct}%` }}>
                  </div>
                </div>
                <div className="w-[60px] text-[12px] font-bold text-right flex-shrink-0"
                  style={{ color: l.pct === 100 ? '#4a7c59' : l.pct >= 60 ? '#1b3a5c' : '#c8691e' }}>
                  {l.pct}%
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0
                  ${l.status === 'Complete' ? 'bg-[#eaf3ea] text-[#3a6b3a]' : l.status === 'In progress' ? 'bg-[#e8f0f7] text-[#1b3a5c]' : 'bg-[#fef3e8] text-[#8b4f15]'}`}>
                  {l.status}
                </span>
                <button className="text-[11px] text-[#1b3a5c] hover:underline flex-shrink-0">Edit</button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-[#8b4f15] bg-[#fef3e8] rounded-lg px-3 py-2">
            <AlertCircle size={12} />
            Polish (PL) translation is 34% complete and needs attention before the Bielsko-Biała pilot launch (Sep 2025).
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-[#1b3a5c]">Monitoring & audit logs</h3>
              <p className="text-[11px] text-gray-500">Last 6 entries · Full audit trail on backend</p>
            </div>
            <div className="flex gap-2">
              <button className="text-[11px] text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">Filter</button>
              <button onClick={() => toast.success('Exporting full audit log…')}
                className="text-[11px] text-[#1b3a5c] bg-[#e8f0f7] px-3 py-1.5 rounded-lg hover:bg-[#d0e4f0] flex items-center gap-1.5">
                <Download size={12} /> Export log
              </button>
            </div>
          </div>
          <div className="bg-[#1b3a5c] rounded-xl overflow-hidden font-mono text-[11px]">
            <div className="px-4 py-2 bg-[#163058] text-blue-200/60 text-[10px] flex items-center gap-4">
              <span>TIME</span><span className="ml-8">LEVEL</span><span className="ml-8">MESSAGE</span><span className="ml-auto">USER</span>
            </div>
            {LOG_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2 border-t border-white/5 hover:bg-white/5">
                <span className="text-blue-200/50">{item.time}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${LOG_COLORS[item.level]}`}>{item.level}</span>
                <span className="text-blue-100/80 flex-1">{item.msg}</span>
                <span className="text-blue-200/40 text-[10px]">{item.user}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { label: 'API requests today', value: '1,284' },
              { label: 'Active users (24h)', value: '47' },
              { label: 'Error rate', value: '0.03%' },
            ].map((s) => (
              <div key={s.label} className="bg-[#f5f2ee] rounded-lg px-3 py-2 text-center">
                <div className="text-[16px] font-bold text-[#1b3a5c]">{s.value}</div>
                <div className="text-[10px] text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'consent' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#1b3a5c] mb-3">Consent text blocks</h3>
            {[
              { label: 'Cookie consent banner', lang: 'EN/EL/IT/PT/ES/FI/PL', status: 'Active', text: 'This platform uses essential cookies only to support your session. No tracking or advertising cookies are used. Your contributions are stored securely on SPICE project servers.' },
              { label: 'First-submission privacy notice', lang: 'EN/EL', status: 'Active', text: 'Before submitting your first contribution, please note: Your name and contribution will be visible to the project team. Anonymous contributions are available as an option.' },
              { label: 'CitiVoice data collection notice', lang: 'EN/EL', status: 'Active', text: 'CitiVoice collects geolocated feedback. Location data is used only for spatial analysis within this project and is not shared with third parties.' },
            ].map((block) => (
              <div key={block.label} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield size={13} className="text-[#1b3a5c]" />
                    <span className="text-[12px] font-semibold text-gray-800">{block.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{block.lang}</span>
                    <span className="text-[10px] bg-[#eaf3ea] text-[#3a6b3a] px-2 py-0.5 rounded-full font-medium">{block.status}</span>
                    <button className="text-[11px] text-[#1b3a5c] hover:underline">Edit</button>
                  </div>
                </div>
                <div className="bg-[#f5f2ee] rounded-lg px-3 py-2 text-[12px] text-gray-600 leading-relaxed">{block.text}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#f0eef8] rounded-xl border border-purple-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={14} className="text-[#5a3f7a]" />
              <span className="text-[13px] font-bold text-[#5a3f7a]">Privacy status labels</span>
            </div>
            <p className="text-[11px] text-[#5a3f7a]/80 mb-3">
              All contributions display one of the following labels to explain how they are used:
            </p>
            <div className="flex gap-3">
              {[
                { label: 'Private', color: 'bg-gray-100 text-gray-600', desc: 'Visible only to you' },
                { label: 'Project team', color: 'bg-[#e8f0f7] text-[#1b3a5c]', desc: 'Shared with authorised users' },
                { label: 'Public', color: 'bg-[#eaf3ea] text-[#3a6b3a]', desc: 'Visible to all users' },
              ].map((s) => (
                <div key={s.label} className="flex-1 bg-white rounded-lg p-3 border border-purple-100">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.color} mb-1.5 inline-block`}>{s.label}</span>
                  <div className="text-[11px] text-gray-600">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
