import { useState } from 'react';
import { useStore } from './store';
import type { SavingGoal } from './types';

const tabs = ['攒钱', '年度', '每日', '备忘录'] as const;
const tabIcons = ['💰', '🎯', '✅', '📝'] as const;
type Tab = (typeof tabs)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>('攒钱');
  const dateStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div className="h-dvh bg-gray-50 flex flex-col">
      <header className="px-5 pt-4 pb-3 bg-gray-50 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">自律日记</h1>
          <span className="text-sm text-gray-400">{dateStr}</span>
        </div>
      </header>

      <main className="flex-1 px-4 pb-4 overflow-y-auto min-h-0">
        {tab === '攒钱' && <SavingsTab />}
        {tab === '年度' && <AnnualTab />}
        {tab === '每日' && <DailyTab />}
        {tab === '备忘录' && <NotesTab />}
      </main>

      <nav className="flex bg-white border-t border-gray-100 pb-1 safe-bottom">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${tab === t ? '' : 'opacity-40'}`}>
            <span className="text-xl leading-none">{tabIcons[i]}</span>
            <span className={`text-[11px] ${tab === t ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>{t}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function totalSaved(goal: SavingGoal) {
  return goal.records.reduce((s, r) => s + r.amount, 0);
}

/* ===== 攒钱 ===== */
function SavingsTab() {
  const { data, addSavingGoal, addSavingRecord, deleteSavingGoal, deleteSavingRecord } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [recordGoal, setRecordGoal] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleAddGoal = () => {
    if (!name.trim() || !target.trim()) return;
    addSavingGoal(name.trim(), Number(target));
    setName(''); setTarget(''); setShowForm(false);
  };

  const handleAddRecord = () => {
    if (!recordGoal || !amount.trim()) return;
    addSavingRecord(recordGoal, Number(amount), note.trim());
    setAmount(''); setNote(''); setRecordGoal(null);
  };

  return (
    <div className="space-y-3 mt-3">
      {data.savingGoals.length === 0 && !showForm && (
        <EmptyState icon="💰" text="还没有攒钱目标，添加一个吧" />
      )}

      {data.savingGoals.map(goal => {
        const saved = totalSaved(goal);
        const pct = Math.min(100, Math.round((saved / goal.targetAmount) * 100));
        const remaining = goal.targetAmount - saved;
        return (
          <div key={goal.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                <p className="text-sm text-gray-400">目标 ¥{goal.targetAmount.toLocaleString()}</p>
              </div>
              {remaining > 0
                ? <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">进行中</span>
                : <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">已完成</span>
              }
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1.5">
              <span>已攒 ¥{saved.toLocaleString()}</span>
              <span>{pct}%</span>
            </div>

            {goal.records.length > 0 && (
              <>
                <p className="text-xs text-gray-400 font-medium mt-3 mb-1.5">记录</p>
                <div className="space-y-1">
                  {goal.records.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 w-12 shrink-0">{r.date.slice(5)}</span>
                      <span className="flex-1 text-gray-600 truncate mx-2">{r.note || '攒钱'}</span>
                      <span className="font-medium text-emerald-600 shrink-0">+¥{r.amount}</span>
                      <button onClick={() => deleteSavingRecord(goal.id, r.id)} className="ml-2 text-gray-300 hover:text-red-400 text-xs shrink-0">✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2 mt-3">
              <button onClick={() => setRecordGoal(goal.id)} className="flex-1 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">记录攒钱</button>
              <button onClick={() => { if (confirm('删除这个目标？')) deleteSavingGoal(goal.id); }} className="py-2 px-3 text-sm text-gray-400 hover:text-red-400 transition-colors">✕</button>
            </div>

            {recordGoal === goal.id && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
                <input type="number" inputMode="decimal" placeholder="金额" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" autoFocus />
                <input placeholder="备注（可选）" value={note} onChange={e => setNote(e.target.value)} className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" />
                <div className="flex gap-2">
                  <button onClick={handleAddRecord} className="flex-1 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors">确认</button>
                  <button onClick={() => setRecordGoal(null)} className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <input placeholder="目标名称，如：买相机" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" autoFocus />
          <input type="number" inputMode="decimal" placeholder="目标金额（¥）" value={target} onChange={e => setTarget(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" />
          <div className="flex gap-2">
            <button onClick={handleAddGoal} className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">添加</button>
            <button onClick={() => setShowForm(false)} className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="w-full py-3 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-500 transition-colors">
          + 添加攒钱目标
        </button>
      )}
    </div>
  );
}

/* ===== 年度目标 ===== */
function AnnualTab() {
  const { data, addAnnualGoal, deleteAnnualGoal, toggleAnnualGoal, setAnnualPercentage } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    addAnnualGoal(name.trim());
    setName(''); setShowForm(false);
  };

  return (
    <div className="space-y-3 mt-3">
      {data.annualGoals.length === 0 && !showForm && (
        <EmptyState icon="🎯" text="还没有年度目标，添加一个吧" />
      )}

      {data.annualGoals.map(goal => (
        <div key={goal.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => toggleAnnualGoal(goal.id)} className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 transition-all ${goal.completed ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300'}`}>
              {goal.completed && '✓'}
            </button>
            <span className={`flex-1 font-medium ${goal.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{goal.name}</span>
            <button onClick={() => { if (confirm('删除这个目标？')) deleteAnnualGoal(goal.id); }} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
          </div>

          {!goal.completed && (
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={goal.percentage} onChange={e => setAnnualPercentage(goal.id, Number(e.target.value))} className="flex-1 h-1.5 accent-amber-500" />
              <span className="text-sm font-medium text-gray-500 w-9 text-right">{goal.percentage}%</span>
            </div>
          )}
        </div>
      ))}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <input placeholder="目标名称，如：学会游泳" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" autoFocus />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">添加</button>
            <button onClick={() => setShowForm(false)} className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="w-full py-3 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-500 transition-colors">
          + 添加年度目标
        </button>
      )}
    </div>
  );
}

/* ===== 每日目标 ===== */
function DailyTab() {
  const { data, addDailyGoal, deleteDailyGoal, toggleDailyRecord, isDailyDone } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const todayStr = today();

  const handleAdd = () => {
    if (!name.trim()) return;
    addDailyGoal(name.trim());
    setName(''); setShowForm(false);
  };

  const doneCount = data.dailyGoals.filter(g => isDailyDone(g.id, todayStr)).length;

  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-400">{todayStr}</h2>
        {data.dailyGoals.length > 0 && (
          <span className="text-sm text-gray-400">{doneCount}/{data.dailyGoals.length}</span>
        )}
      </div>

      {data.dailyGoals.length === 0 && !showForm && (
        <EmptyState icon="✅" text="还没有每日目标，添加一个吧" />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {data.dailyGoals.map(goal => {
          const done = isDailyDone(goal.id, todayStr);
          return (
            <div key={goal.id} className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggleDailyRecord(goal.id, todayStr)} className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 transition-all ${done ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300'}`}>
                {done && '✓'}
              </button>
              <span className={`flex-1 text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{goal.name}</span>
              <button onClick={() => { if (confirm('删除这个习惯？')) deleteDailyGoal(goal.id); }} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <input placeholder="习惯名称，如：健身30分钟" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" autoFocus />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">添加</button>
            <button onClick={() => setShowForm(false)} className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="w-full py-3 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-500 transition-colors">
          + 添加每日目标
        </button>
      )}
    </div>
  );
}

/* ===== 备忘录 ===== */
function NotesTab() {
  const { data, addNote, updateNote, deleteNote } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAdd = () => {
    if (!content.trim()) return;
    addNote(content.trim());
    setContent(''); setShowForm(false);
  };

  const handleEdit = () => {
    if (!editingId || !editContent.trim()) return;
    updateNote(editingId, editContent.trim());
    setEditingId(null); setEditContent('');
  };

  const sorted = [...data.notes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-3 mt-3">
      {sorted.length === 0 && !showForm && (
        <EmptyState icon="📝" text="还没有备忘录，写点什么吧" />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {sorted.map(n => (
          <div key={n.id}>
            {editingId === n.id ? (
              <div className="p-3 space-y-2">
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 resize-none placeholder:text-gray-400" autoFocus />
                <div className="flex gap-2">
                  <button onClick={handleEdit} className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">保存</button>
                  <button onClick={() => setEditingId(null)} className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 cursor-pointer" onClick={() => { setEditingId(n.id); setEditContent(n.content); }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{formatDate(n.date)}</span>
                  <button onClick={e => { e.stopPropagation(); if (confirm('删除这条？')) deleteNote(n.id); }} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <textarea placeholder="随便写点什么…" value={content} onChange={e => setContent(e.target.value)} rows={4} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 resize-none placeholder:text-gray-400" autoFocus />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">保存</button>
            <button onClick={() => setShowForm(false)} className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="w-full py-3 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-500 transition-colors">
          + 写点什么
        </button>
      )}
    </div>
  );
}

/* ===== Shared ===== */
function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3 opacity-50">{icon}</div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
