import { useState, useEffect, useRef } from 'react';
import { useStore } from './store';
import { getSWUpdateReady } from './main';
import type { SavingGoal, DailyRecord, DrinkRecord, ExerciseRecord } from './types';

const tabs = ['攒钱', '年度', '自律', '备忘录'] as const;
const tabIcons = ['💰', '🎯', '✅', '📝'] as const;
type Tab = (typeof tabs)[number];

/* ===== App 根组件 ===== */
export default function App() {
  const { data, setReminderTime, setLastNotifyDate } = useStore();
  const [tab, setTab] = useState<Tab>('自律');
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [tempReminderTime, setTempReminderTime] = useState(data.reminderTime || '21:00');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newVersion, setNewVersion] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const dateStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  const todayStr = dateToStr(new Date());

  // Check for new deployed version
  useEffect(() => {
    const key = 'discipline-diary-version';
    fetch('/discipline-diary/version.json')
      .then(r => r.json())
      .then(v => {
        const cached = localStorage.getItem(key);
        if (cached && cached !== v.version) setNewVersion(true);
        localStorage.setItem(key, v.version);
      })
      .catch(() => {});

    const apply = getSWUpdateReady();
    if (apply) {
      const ok = confirm('📲 自律日记有更新，是否立即刷新应用？');
      if (ok) apply();
    }
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  const handleExport = () => {
    const raw = localStorage.getItem('discipline-diary-data');
    if (!raw) { alert('没有数据可导出'); return; }
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `自律日记备份_${today().replace(/-/g, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.savingGoals && !data.annualGoals && !data.dailyGoals) {
          alert('文件格式不正确，请选择正确的备份文件');
          return;
        }
        localStorage.setItem('discipline-diary-data', JSON.stringify(data));
        alert('数据导入成功！页面即将刷新');
        window.location.reload();
      } catch {
        alert('文件解析失败，请确认是有效的备份文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Notification reminder check
  useEffect(() => {
    if (!data.reminderTime) return;
    const check = () => {
      const now = new Date();
      const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (t === data.reminderTime && data.lastNotifyDate !== todayStr) {
        const undone = data.dailyGoals.filter(g =>
          !g.completed && !data.dailyRecords.some(r => r.goalId === g.id && r.date === todayStr && r.completed)
        ).length;
        if (undone > 0 && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('自律日记', { body: `今天还有 ${undone} 项学习未完成，去打卡吧！` });
          setLastNotifyDate(todayStr);
        }
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [data.reminderTime, data.lastNotifyDate, todayStr, data.dailyGoals, data.dailyRecords, setLastNotifyDate]);

  const handleNotifyClick = () => {
    if (data.reminderTime) {
      setShowReminderPicker(!showReminderPicker);
    } else {
      setShowReminderPicker(true);
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  };

  return (
    <div className="h-dvh bg-gray-50 flex flex-col">
      <header className="px-5 pt-4 pb-3 bg-gray-50 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">自律日记</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSettings(!showSettings)} className="text-sm text-gray-400 hover:text-gray-600" title="设置">
              ⚙️
            </button>
            <button onClick={handleNotifyClick} className="text-sm relative" title={data.reminderTime ? `每日 ${data.reminderTime} 提醒` : '设置每日提醒'}>
              {data.reminderTime ? '🔔' : '🔕'}
            </button>
            <span className="text-sm text-gray-400">{dateStr}</span>
          </div>
        </div>
        {showReminderPicker && (
          <div className="mt-3 bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex items-center gap-3">
            <span className="text-sm text-gray-600 shrink-0">每日提醒</span>
            <input type="time" value={tempReminderTime}
              onChange={e => setTempReminderTime(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-amber-300" />
            <button onClick={() => { setReminderTime(tempReminderTime); setShowReminderPicker(false); }}
              className="text-sm text-amber-600 font-medium">确认</button>
            {data.reminderTime && (
              <button onClick={() => { setReminderTime(null); setShowReminderPicker(false); }}
                className="text-xs text-gray-400">关闭</button>
            )}
          </div>
        )}
        {installPrompt && (
          <div className="mt-2 bg-amber-50 rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-amber-700">📱 添加到主屏幕，使用更方便</span>
            <button onClick={handleInstall} className="text-xs font-medium text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">添加</button>
          </div>
        )}
        {newVersion && (
          <div className="mt-2 bg-blue-50 rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs text-blue-700">✨ 新版本已发布，请刷新页面</span>
            <button onClick={() => window.location.reload()}
              className="text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg">刷新</button>
          </div>
        )}
        {showSettings && (
          <div className="mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-3 space-y-2">
            <p className="text-xs font-medium text-gray-400">⚙️ 数据管理</p>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              数据存储在浏览器本地，清除网站数据会丢失。建议定期备份。
            </p>
            <div className="flex gap-2">
              <button onClick={handleExport}
                className="flex-1 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                📤 导出备份
              </button>
              <button onClick={() => importRef.current?.click()}
                className="flex-1 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                📥 导入备份
              </button>
            </div>
          </div>
        )}
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </header>

      <main className="flex-1 px-4 pb-4 overflow-y-auto min-h-0">
        {tab === '攒钱' && <SavingsTab />}
        {tab === '年度' && <AnnualTab />}
        {tab === '自律' && <DisciplineTab />}
        {tab === '备忘录' && <NotesTab />}
      </main>

      <nav className="flex bg-white border-t border-gray-100 pb-1 safe-bottom">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${tab === t ? '' : 'opacity-40'}`}>
            <span className="text-xl leading-none">{tabIcons[i]}</span>
            <span className={`text-[11px] ${tab === t ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>{t}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ===== 辅助函数 ===== */
function totalSaved(goal: SavingGoal) {
  return goal.records.reduce((s, r) => s + r.amount, 0);
}

function dateToStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function today() { return dateToStr(new Date()); }

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 计算连续打卡天数（排除补打卡） */
function calcStreak(records: DailyRecord[], goalId: string): number {
  const ontime = records.filter(r => !r.late);
  const today = new Date();
  const todayStr = dateToStr(today);
  const doneToday = ontime.some(r => r.goalId === goalId && r.date === todayStr);
  const d = new Date(today);
  if (!doneToday) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (true) {
    const ds = dateToStr(d);
    if (!ontime.some(r => r.goalId === goalId && r.date === ds)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** 计算本月完成情况（排除补打卡） */
function calcMonthlyStats(records: DailyRecord[], goalId: string) {
  const ontime = records.filter(r => !r.late);
  const today = new Date();
  const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const doneCount = ontime.filter(r => r.goalId === goalId && r.date.startsWith(prefix)).length;
  const totalDays = today.getDate();
  return { doneCount, totalDays, percentage: Math.round((doneCount / totalDays) * 100) };
}

/* ===== 奶茶/咖啡追踪 ===== */
const DRINK_TYPES = { milk_tea: '🧋', coffee: '☕', other: '🥤' } as const;

/** 获取某天所在周的第一天（周一） */
function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 判断是否为工作日 */
function isWorkday(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/* ===== 日历热力图 ===== */
function MonthlyHeatmap({ records, dailyGoals }: { records: DailyRecord[]; dailyGoals: { id: string }[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();
  const totalGoals = dailyGoals.length;
  const ontime = records.filter(r => !r.late);

  const dayData: { day: number; pct: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const doneCount = ontime.filter(r => r.date === dateStr).length;
    dayData.push({ day: d, pct: totalGoals > 0 ? doneCount / totalGoals : 0 });
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const cellColor = (pct: number) => {
    if (pct === 0) return 'bg-gray-100 text-gray-400';
    if (pct < 0.34) return 'bg-emerald-200 text-emerald-800';
    if (pct < 0.67) return 'bg-emerald-400 text-white';
    if (pct < 1) return 'bg-emerald-500 text-white';
    return 'bg-emerald-600 text-white';
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(w => (
          <div key={w} className="text-[10px] text-gray-400 text-center h-5 flex items-center justify-center">{w}</div>
        ))}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {dayData.map(d => (
          <div key={d.day}
            className={`aspect-square rounded-sm flex items-center justify-center text-[11px] font-medium transition-colors ${cellColor(d.pct)}`}
            title={`${month + 1}月${d.day}日 — ${Math.round(d.pct * 100)}%`}>
            {d.day}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-400">
          {dayData.filter(d => d.pct >= 1).length}/{daysInMonth} 天全勤
        </span>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>少</span>
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <div className="w-3 h-3 rounded-sm bg-emerald-200" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-600" />
          <span>多</span>
        </div>
      </div>
    </div>
  );
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
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

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
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f59e0b, #d97706)' }} />
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1.5">
              <span>已攒 ¥{saved.toLocaleString()}</span>
              <span>{pct}%</span>
            </div>

            {goal.records.length > 0 && (
              <>
                <p className="text-xs text-gray-400 font-medium mt-3 mb-1.5">记录</p>
                <div className="space-y-1">
                  {(expandedGoalId === goal.id ? goal.records : goal.records.slice(0, 3)).map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 w-12 shrink-0">{r.date.slice(5)}</span>
                      <span className="flex-1 text-gray-600 truncate mx-2">{r.note || '攒钱'}</span>
                      <span className="font-medium text-emerald-600 shrink-0">+¥{r.amount}</span>
                      <button onClick={() => deleteSavingRecord(goal.id, r.id)}
                        className="ml-2 text-gray-300 hover:text-red-400 text-xs shrink-0">✕</button>
                    </div>
                  ))}
                </div>
                {goal.records.length > 3 && (
                  <button onClick={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 mt-1.5 flex items-center gap-1 transition-colors">
                    {expandedGoalId === goal.id ? '收起 ▲' : `查看全部 ${goal.records.length} 条记录 ▼`}
                  </button>
                )}
              </>
            )}

            <div className="flex gap-2 mt-3">
              <button onClick={() => setRecordGoal(goal.id)}
                className="flex-1 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">记录攒钱</button>
              <button onClick={() => { if (confirm('删除这个目标？')) deleteSavingGoal(goal.id); }}
                className="py-2 px-3 text-sm text-gray-400 hover:text-red-400 transition-colors">✕</button>
            </div>

            {recordGoal === goal.id && (
              <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
                <input type="number" inputMode="decimal" placeholder="金额" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" autoFocus />
                <input placeholder="备注（可选）" value={note} onChange={e => setNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" />
                <div className="flex gap-2">
                  <button onClick={handleAddRecord}
                    className="flex-1 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors">确认</button>
                  <button onClick={() => setRecordGoal(null)}
                    className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <input placeholder="目标名称，如：买相机" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" autoFocus />
          <input type="number" inputMode="decimal" placeholder="目标金额（¥）" value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" />
          <div className="flex gap-2">
            <button onClick={handleAddGoal}
              className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">添加</button>
            <button onClick={() => setShowForm(false)}
              className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-500 transition-colors">
          + 添加攒钱目标
        </button>
      )}
    </div>
  );
}

/* ===== 年度目标 ===== */
function AnnualTab() {
  const { data, addAnnualGoal, deleteAnnualGoal, toggleAnnualGoal, setAnnualPercentage,
    addAnnualSubTask, toggleAnnualSubTask, deleteAnnualSubTask, setAnnualGoalMode } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [subtaskInput, setSubtaskInput] = useState<Record<string, string>>({});

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

      {[...data.annualGoals]
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return 0;
        })
        .map(goal => (
        <div key={goal.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => toggleAnnualGoal(goal.id)}
              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 transition-all ${goal.completed ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300'}`}>
              {goal.completed && '✓'}
            </button>
            <span className={`flex-1 font-medium ${goal.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{goal.name}</span>
            <button onClick={() => { if (confirm('删除这个目标？')) deleteAnnualGoal(goal.id); }}
              className="text-gray-300 hover:text-red-400 text-xs">✕</button>
          </div>

          {goal.mode !== 'checkbox' && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all ${goal.completed ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${goal.percentage}%` }} />
            </div>
          )}

          {!goal.completed && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                <button onClick={() => setAnnualGoalMode(goal.id, 'percentage')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${goal.mode === 'percentage' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500'}`}>
                  百分比
                </button>
                <button onClick={() => setAnnualGoalMode(goal.id, 'subtasks')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${goal.mode === 'subtasks' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500'}`}>
                  子任务
                </button>
                <button onClick={() => setAnnualGoalMode(goal.id, 'checkbox')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${goal.mode === 'checkbox' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500'}`}>
                  一次性
                </button>
              </div>
              {goal.mode !== 'checkbox' && (
                <span className="text-xs text-gray-400 ml-auto">{goal.percentage}%</span>
              )}
            </div>
          )}

          {!goal.completed && goal.mode === 'percentage' && (
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={goal.percentage}
                onChange={e => setAnnualPercentage(goal.id, Number(e.target.value))}
                className="flex-1 h-1.5 accent-amber-500" />
              <span className="text-sm font-medium text-gray-500 w-9 text-right">{goal.percentage}%</span>
            </div>
          )}

          {!goal.completed && goal.mode === 'subtasks' && (
            <div className="space-y-1.5">
              {goal.subtasks.map(st => (
                <div key={st.id} className="flex items-center gap-2">
                  <button onClick={() => toggleAnnualSubTask(goal.id, st.id)}
                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 transition-all ${st.completed ? 'bg-emerald-500 text-white' : 'border border-gray-300'}`}>
                    {st.completed && '✓'}
                  </button>
                  <span className={`text-sm flex-1 ${st.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{st.name}</span>
                  <button onClick={() => deleteAnnualSubTask(goal.id, st.id)}
                    className="text-gray-300 hover:text-red-400 text-[10px]">✕</button>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input placeholder="添加子任务，按回车确认…"
                  value={subtaskInput[goal.id] || ''}
                  onChange={e => setSubtaskInput(p => ({ ...p, [goal.id]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (subtaskInput[goal.id] || '').trim()) {
                      addAnnualSubTask(goal.id, (subtaskInput[goal.id] || '').trim());
                      setSubtaskInput(p => ({ ...p, [goal.id]: '' }));
                    }
                  }}
                  className="flex-1 px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" />
                <button onClick={() => {
                  if ((subtaskInput[goal.id] || '').trim()) {
                    addAnnualSubTask(goal.id, (subtaskInput[goal.id] || '').trim());
                    setSubtaskInput(p => ({ ...p, [goal.id]: '' }));
                  }
                }}
                  className="text-xs text-amber-600 font-medium shrink-0">添加</button>
              </div>
              {goal.subtasks.length === 0 && (
                <p className="text-xs text-gray-400">添加子任务后，进度将根据已完成子任务自动计算</p>
              )}
            </div>
          )}
        </div>
      ))}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <input placeholder="目标名称，如：学会游泳" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" autoFocus />
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">添加</button>
            <button onClick={() => setShowForm(false)}
              className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-500 transition-colors">
          + 添加年度目标
        </button>
      )}
    </div>
  );
}

/* ============================================================
   ===== 自律面板（5 项核心自律任务） =====
   ============================================================ */
function DisciplineTab() {
  const {
    data, addDailyGoal, deleteDailyGoal, toggleDailyRecord, isDailyDone,
    addDrinkRecord, deleteDrinkRecord,
    addExerciseRecord, updateExerciseRecord, deleteExerciseRecord,
    setSleepRecord, setPhoneUsage,
  } = useStore();
  const todayStr = today();
  const [showMonthly, setShowMonthly] = useState(false);

  const doneCount = data.dailyGoals.filter(g => isDailyDone(g.id, todayStr)).length;

  return (
    <div className="space-y-3 mt-3">
      {/* 日期 + 本月按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-400">{todayStr}</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowMonthly(!showMonthly)}
            className={`text-xs transition-colors flex items-center gap-1 ${showMonthly ? 'text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}>
            📊 本月 <span className="text-[10px]">{showMonthly ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* 1. 睡眠 Section */}
      <SleepSection
        sleepRecords={data.sleepRecords}
        todayStr={todayStr}
        setSleepRecord={setSleepRecord}
      />

      {/* 2. 手机使用 Section */}
      <PhoneUsageSection
        phoneUsageRecords={data.phoneUsageRecords}
        todayStr={todayStr}
        setPhoneUsage={setPhoneUsage}
      />

      {/* 3. 运动 Section */}
      <ExerciseSection
        exerciseRecords={data.exerciseRecords}
        todayStr={todayStr}
        addExerciseRecord={addExerciseRecord}
        updateExerciseRecord={updateExerciseRecord}
        deleteExerciseRecord={deleteExerciseRecord}
      />

      {/* 4. 学习 Section */}
      <LearningSection
        dailyGoals={data.dailyGoals}
        dailyRecords={data.dailyRecords}
        todayStr={todayStr}
        isDailyDone={isDailyDone}
        toggleDailyRecord={toggleDailyRecord}
        deleteDailyGoal={deleteDailyGoal}
        addDailyGoal={addDailyGoal}
        doneCount={doneCount}
      />

      {/* 5. 咖啡奶茶 Section */}
      <DrinkTrackerSection
        drinkRecords={data.drinkRecords}
        addDrinkRecord={addDrinkRecord}
        deleteDrinkRecord={deleteDrinkRecord}
      />

      {/* 本月热力图 + 统计 */}
      {showMonthly && (
        <MonthlySection
          dailyGoals={data.dailyGoals}
          dailyRecords={data.dailyRecords}
          sleepRecords={data.sleepRecords}
          phoneUsageRecords={data.phoneUsageRecords}
          todayStr={todayStr}
        />
      )}
    </div>
  );
}

/* ===== 4. 学习 ===== */
function LearningSection({
  dailyGoals, dailyRecords, todayStr,
  isDailyDone, toggleDailyRecord, deleteDailyGoal, addDailyGoal, doneCount: _doneCount,
}: {
  dailyGoals: { id: string; name: string; createdAt: string; targetDays?: number; completed?: boolean; completedAt?: string }[];
  dailyRecords: DailyRecord[];
  todayStr: string;
  isDailyDone: (goalId: string, date: string) => boolean;
  toggleDailyRecord: (goalId: string, date: string, late?: boolean) => void;
  deleteDailyGoal: (id: string) => void;
  addDailyGoal: (name: string, targetDays?: number) => void;
  doneCount: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [targetDays, setTargetDays] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const activeGoals = dailyGoals.filter(g => !g.completed);
  const archivedGoals = dailyGoals.filter(g => g.completed);

  const handleAdd = () => {
    if (!name.trim()) return;
    const days = targetDays.trim() ? parseInt(targetDays) : undefined;
    addDailyGoal(name.trim(), days);
    setName(''); setTargetDays(''); setShowForm(false);
  };

  /** 计算目标进度（有 targetDays 时） */
  const goalProgress = (goalId: string) => {
    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal?.targetDays) return null;
    const ontime = dailyRecords.filter(r => r.goalId === goalId && !r.late).length;
    return { done: Math.min(ontime, goal.targetDays), total: goal.targetDays, pct: Math.round((ontime / goal.targetDays) * 100) };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <h3 className="text-sm font-medium text-gray-700">学习</h3>
          <span className="text-xs text-gray-400">{activeGoals.filter(g => isDailyDone(g.id, todayStr)).length}/{activeGoals.length}</span>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="text-xs text-amber-600 hover:text-amber-700 transition-colors">
          + 添加
        </button>
      </div>

      {activeGoals.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">还没有学习目标，点击「+ 添加」</p>
      )}

      {/* 进行中的目标 */}
      <div className="divide-y divide-gray-50">
        {activeGoals.map(goal => {
          const done = isDailyDone(goal.id, todayStr);
          const streak = calcStreak(dailyRecords, goal.id);
          const yesterdayStr = dateToStr(new Date(Date.now() - 86400000));
          const hasYesterday = dailyRecords.some(r => r.goalId === goal.id && r.date === yesterdayStr && !r.late);
          const hasYesterdayLate = dailyRecords.some(r => r.goalId === goal.id && r.date === yesterdayStr && r.late);
          const progress = goalProgress(goal.id);
          return (
            <div key={goal.id} className="py-2">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleDailyRecord(goal.id, todayStr)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 transition-all ${done ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300'}`}>
                  {done && '✓'}
                </button>
                <span className={`flex-1 text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{goal.name}</span>
                {!hasYesterday && (
                  <button onClick={() => toggleDailyRecord(goal.id, yesterdayStr, true)}
                    className={`text-[10px] shrink-0 transition-colors ${hasYesterdayLate ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}>
                    {hasYesterdayLate ? '已补✓' : '补昨日'}
                  </button>
                )}
                {streak > 0 && (
                  <span className="text-xs text-orange-500 shrink-0">🔥 {streak}天</span>
                )}
                <button onClick={() => { if (confirm('删除这个习惯？')) deleteDailyGoal(goal.id); }}
                  className="text-gray-300 hover:text-red-400 text-xs shrink-0">✕</button>
              </div>
              {/* 目标天数进度条 */}
              {progress && (
                <div className="flex items-center gap-2 mt-1.5 ml-9">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${progress.pct >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      style={{ width: `${progress.pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{progress.done}/{progress.total} 天</span>
                  {progress.pct >= 100 && (
                    <span className="text-[10px] text-emerald-500 font-medium shrink-0">✅ 已完成</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 已归档目标 */}
      {archivedGoals.length > 0 && (
        <div className="border-t border-gray-50 pt-2">
          <button onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            📂 已完成 ({archivedGoals.length}) <span className="text-[10px]">{showArchived ? '▲' : '▼'}</span>
          </button>
          {showArchived && (
            <div className="divide-y divide-gray-50 mt-1">
              {archivedGoals.map(goal => (
                <div key={goal.id} className="flex items-center gap-3 py-1.5 opacity-60">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-emerald-100 text-emerald-500 shrink-0">
                    ✓
                  </div>
                  <span className="flex-1 text-sm text-gray-500 line-through">{goal.name}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {goal.completedAt ? goal.completedAt.slice(0, 10) : ''}
                  </span>
                  <button onClick={() => { if (confirm('删除这个习惯？')) deleteDailyGoal(goal.id); }}
                    className="text-gray-300 hover:text-red-400 text-xs shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 添加表单 */}
      {showForm && (
        <div className="pt-2 space-y-2">
          <div className="flex gap-2">
            <input placeholder="习惯名称，如：学pandas" value={name} onChange={e => setName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" autoFocus />
            <button onClick={handleAdd}
              className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">添加</button>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" min="1" placeholder="目标天数（选填，填了到期自动归档）"
              value={targetDays} onChange={e => setTargetDays(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== 5. 咖啡奶茶追踪 ===== */
function DrinkTrackerSection({
  drinkRecords, addDrinkRecord, deleteDrinkRecord,
}: {
  drinkRecords: DrinkRecord[];
  addDrinkRecord: (date: string, type: DrinkRecord['type']) => void;
  deleteDrinkRecord: (id: string) => void;
}) {
  const LIMIT = 2;

  const t = new Date();
  const weekStart = getWeekStart(t);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
  const weekEnd = new Date(weekDays[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const weekRecords = drinkRecords.filter(r => {
    const rd = new Date(r.date);
    return rd >= weekStart && rd <= weekEnd;
  });

  const dayMap: Record<string, DrinkRecord[]> = {};
  weekRecords.forEach(r => {
    if (!dayMap[r.date]) dayMap[r.date] = [];
    dayMap[r.date].push(r);
  });

  const weekCount = weekRecords.length;
  const todayStr = dateToStr(t);

  const getDayRecords = (d: Date) => dayMap[dateToStr(d)] || [];
  const isTodayFn = (d: Date) => dateToStr(d) === todayStr;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">🧋 咖啡奶茶</h3>
        <span className="text-xs text-gray-400">每周 ≤ {LIMIT} 杯</span>
      </div>

      <div className="flex gap-1.5">
        {weekDays.map((d, i) => {
          const records = getDayRecords(d);
          const isT = isTodayFn(d);
          return (
            <div key={i}
              className={`flex-1 flex flex-col items-center py-1.5 rounded-lg text-xs relative
                ${isT ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-gray-50'}`}>
              <span className="text-gray-500 leading-tight">{dayNames[i]}</span>
              <span className={`leading-tight ${isT ? 'text-amber-800 font-semibold' : 'text-gray-700'}`}>
                {d.getDate()}
              </span>
              {records.length > 0 && (
                <span className="text-[10px] leading-tight mt-0.5">
                  {records.map(r => DRINK_TYPES[r.type]).join('')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className={weekCount > LIMIT ? 'text-orange-600 font-medium' : 'text-gray-500'}>
            本周已喝 {weekCount} 杯
          </span>
          <span className={
            weekCount > LIMIT ? 'text-orange-600 font-medium'
            : weekCount === LIMIT ? 'text-emerald-600 font-medium'
            : 'text-gray-400'
          }>
            {weekCount > LIMIT ? `⚠️ 已超额 ${weekCount - LIMIT} 杯`
            : weekCount === LIMIT ? '✅ 本周已达标'
            : `还可喝 ${LIMIT - weekCount} 杯`}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${
            weekCount > LIMIT ? 'bg-orange-400'
            : weekCount === LIMIT ? 'bg-emerald-400'
            : 'bg-amber-400'
          }`} style={{ width: `${Math.min(100, (weekCount / LIMIT) * 100)}%` }} />
        </div>
      </div>

      {weekRecords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {weekRecords.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
            <div key={r.id}
              className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full text-xs">
              <span>{DRINK_TYPES[r.type]}</span>
              <span className="text-gray-400">{r.date.slice(5)}</span>
              <button onClick={() => deleteDrinkRecord(r.id)}
                className="ml-0.5 text-gray-300 hover:text-red-400 text-[10px] leading-none">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => addDrinkRecord(todayStr, 'milk_tea')}
          className="flex-1 py-2 text-xs font-medium rounded-lg transition-colors
            bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 active:scale-95">
          🧋 奶茶
        </button>
        <button onClick={() => addDrinkRecord(todayStr, 'coffee')}
          className="flex-1 py-2 text-xs font-medium rounded-lg transition-colors
            bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 active:scale-95">
          ☕ 咖啡
        </button>
      </div>
    </div>
  );
}

/* ===== 3. 运动记录 ===== */
function ExerciseSection({
  exerciseRecords, todayStr, addExerciseRecord, updateExerciseRecord, deleteExerciseRecord,
}: {
  exerciseRecords: ExerciseRecord[];
  todayStr: string;
  addExerciseRecord: (date: string, content: string, calories?: number) => void;
  updateExerciseRecord: (id: string, content: string, calories?: number) => void;
  deleteExerciseRecord: (id: string) => void;
}) {
  const [input, setInput] = useState('');
  const [calInput, setCalInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCal, setEditCal] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showWeek, setShowWeek] = useState(false);

  const handleAdd = () => {
    if (!input.trim()) return;
    const cals = calInput.trim() ? Number(calInput.trim()) : undefined;
    addExerciseRecord(todayStr, input.trim(), cals && !isNaN(cals) ? cals : undefined);
    setInput('');
    setCalInput('');
  };

  const handleEdit = (id: string) => {
    if (!editText.trim()) return;
    const cals = editCal.trim() ? Number(editCal.trim()) : undefined;
    updateExerciseRecord(id, editText.trim(), cals && !isNaN(cals) ? cals : undefined);
    setEditingId(null); setEditText(''); setEditCal('');
  };

  const startEdit = (r: ExerciseRecord) => {
    setEditingId(r.id);
    setEditText(r.content);
    setEditCal(r.calories ? String(r.calories) : '');
  };

  const todayExercises = exerciseRecords.filter(r => r.date === todayStr);
  const todayCount = todayExercises.length;

  // 本周运动天数统计
  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekDaysSet = new Set(
    exerciseRecords.filter(r => {
      const d = new Date(r.date);
      return d >= weekStart && d < weekEnd;
    }).map(r => r.date)
  );

  // 本周运动记录分组
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const ds = dateToStr(d);
    const dayLabel = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i];
    const records = exerciseRecords.filter(r => r.date === ds);
    const totalCal = records.reduce((s, r) => s + (r.calories ?? 0), 0);
    return { date: ds, dayLabel, records, totalCal };
  });

  const weekCalSum = weekDays.reduce((s, d) => s + d.totalCal, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">🏋️ 运动记录</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowWeek(!showWeek)}
            className={`text-xs font-medium transition-colors flex items-center gap-1 ${showWeek ? 'text-amber-600' : 'text-emerald-600 hover:text-emerald-700'}`}>
            本周运动 {weekDaysSet.size} 天 <span className="text-[10px]">{showWeek ? '▲' : '▼'}</span>
          </button>
          {todayCount > 0 && (
            <span className="text-xs text-gray-400">今日 {todayCount} 条</span>
          )}
        </div>
      </div>

      {/* 周视图（点击展开） */}
      {showWeek && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 font-medium">
              {weekDays[0].date} ~ {weekDays[6].date}（{weekDaysSet.size}/7 天）
            </span>
            {weekCalSum > 0 && (
              <span className="text-xs font-medium text-gray-600">🔥 {weekCalSum} 卡</span>
            )}
          </div>
          {weekDays.map(d => (
            <div key={d.date}>
              {d.records.length > 0 ? (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs text-gray-400 min-w-[3em]">{d.dayLabel}</span>
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs text-gray-400">{d.totalCal > 0 ? `${d.totalCal} 卡` : ''}</span>
                  </div>
                  <div className="ml-[0.5em] space-y-1 border-l-2 border-amber-200 pl-3">
                    {d.records.map(r => (
                      <div key={r.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-1 h-1 rounded-full bg-amber-300 shrink-0" />
                        <span>{r.content}</span>
                        {r.calories && <span className="text-gray-400">· {r.calories} 卡</span>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-300 py-0.5">
                  <span className="min-w-[3em] inline-block">{d.dayLabel}</span>
                  <span className="text-gray-200">—</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 添加 */}
      <div className="flex gap-2">
        <input placeholder="如：jo姐 5000步" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" />
        <div className="flex items-center gap-1">
          <input placeholder="消耗" value={calInput}
            onChange={e => setCalInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            className="w-16 px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400 text-right" />
          <span className="text-xs text-gray-400">卡</span>
        </div>
        <button onClick={handleAdd}
          className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">保存</button>
      </div>

      {/* 今日记录列表 */}
      {todayExercises.length > 0 && (
        <div className="space-y-1.5">
          {(expanded ? todayExercises : todayExercises.slice(0, 3)).map(r => (
            <div key={r.id}>
              {editingId === r.id ? (
                <div className="flex gap-2 items-center">
                  <input value={editText} onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(r.id); }}
                    className="flex-1 px-3 py-1.5 text-sm bg-gray-50 border border-amber-300 rounded-lg focus:outline-none placeholder:text-gray-400" autoFocus />
                  <input value={editCal} onChange={e => setEditCal(e.target.value.replace(/\D/g, ''))}
                    placeholder="卡"
                    className="w-14 px-2 py-1.5 text-sm bg-gray-50 border border-amber-300 rounded-lg focus:outline-none text-right" />
                  <button onClick={() => handleEdit(r.id)}
                    className="text-xs text-amber-600 font-medium">保存</button>
                  <button onClick={() => setEditingId(null)}
                    className="text-xs text-gray-400">取消</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="flex-1 text-sm text-gray-700">{r.content}</span>
                  {r.calories && (
                    <span className="text-xs text-gray-400">{r.calories} 卡</span>
                  )}
                  <button onClick={() => startEdit(r)}
                    className="text-xs text-gray-400 hover:text-amber-500 transition-colors">✏️</button>
                  <button onClick={() => deleteExerciseRecord(r.id)}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors">✕</button>
                </div>
              )}
            </div>
          ))}
          {todayExercises.length > 3 && (
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
              {expanded ? '收起 ▲' : `展开全部 ${todayExercises.length} 条 ▼`}
            </button>
          )}
        </div>
      )}

      {todayExercises.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">今日还没有运动记录</p>
      )}
    </div>
  );
}

/* ===== 1. 睡眠记录 ===== */
function SleepSection({
  sleepRecords, todayStr, setSleepRecord,
}: {
  sleepRecords: { date: string; hours: number }[];
  todayStr: string;
  setSleepRecord: (date: string, hours: number) => void;
}) {
  const todaySleep = sleepRecords.find(r => r.date === todayStr);
  const hours = todaySleep?.hours ?? 7; // default 7h
  const [displayHours, setDisplayHours] = useState(hours);

  // Sync displayHours when todaySleep changes
  useEffect(() => {
    setDisplayHours(todaySleep?.hours ?? 7);
  }, [todaySleep?.hours]);

  const isGood = displayHours >= 8;
  const isSet = todaySleep !== undefined;

  const handleChange = (delta: number) => {
    const newVal = Math.max(0, Math.min(24, displayHours + delta));
    setDisplayHours(newVal);
    setSleepRecord(todayStr, newVal);
  };

  // 近 7 天趋势
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return dateToStr(d);
  });

  const chartData = last7Days.map(ds => {
    const rec = sleepRecords.find(r => r.date === ds);
    return { date: ds, hours: rec?.hours ?? 0, exist: !!rec };
  });

  const maxHours = 12; // chart max

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700">😴 睡眠记录</h3>

      {/* 今日睡眠输入 */}
      <div className="flex items-center justify-center gap-4 py-2">
        <button onClick={() => handleChange(-0.5)}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-200 transition-colors">−</button>
        <div className="text-center">
          <span className={`text-3xl font-bold ${isSet && !isGood ? 'text-orange-500' : isGood ? 'text-emerald-500' : 'text-gray-400'}`}>
            {displayHours}
          </span>
          <span className="text-sm text-gray-400 ml-1">h</span>
          <div className="text-xs mt-0.5">
            {!isSet ? (
              <span className="text-gray-400">点击 ± 设置今日睡眠</span>
            ) : isGood ? (
              <span className="text-emerald-500">✅ 大于 8h，达标！</span>
            ) : (
              <span className="text-orange-500">❌ {displayHours}h，需大于 8h</span>
            )}
          </div>
        </div>
        <button onClick={() => handleChange(0.5)}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 hover:bg-gray-200 transition-colors">+</button>
      </div>

      {/* 近 7 天趋势图 */}
      <div>
        <p className="text-xs text-gray-400 mb-2">近 7 天趋势</p>
        <div className="flex items-end gap-2 h-24">
          {chartData.map((d, i) => {
            const pct = d.hours > 0 ? (d.hours / maxHours) * 100 : 0;
            const isToday = i === 6;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="relative w-full flex items-end justify-center">
                  {/* 8h 参考线 */}
                  <div
                    className="absolute bottom-0 w-full border-t border-dashed border-red-200"
                    style={{ height: `${(8 / maxHours) * 100}%` }}
                  />
                  {/* 柱子 */}
                  <div
                    className={`w-full rounded-t-sm ${d.hours === 0 ? 'bg-gray-100' : d.hours >= 8 ? 'bg-emerald-400' : 'bg-orange-400'} ${isToday ? 'opacity-100' : 'opacity-70'}`}
                    style={{ height: `${pct}%`, minHeight: d.hours > 0 ? '4px' : '2px' }}
                  />
                </div>
                <span className={`text-[10px] ${isToday ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                  {d.hours > 0 ? `${d.hours}h` : ''}
                </span>
                <span className="text-[10px] text-gray-400">
                  {['日', '一', '二', '三', '四', '五', '六'][new Date(d.date).getDay()]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
          <span className="text-red-300">- -</span>
          <span>8h 达标线</span>
        </div>
      </div>
    </div>
  );
}

/* ===== 2. 手机使用时长 ===== */
function PhoneUsageSection({
  phoneUsageRecords, todayStr, setPhoneUsage,
}: {
  phoneUsageRecords: { date: string; compliant: boolean }[];
  todayStr: string;
  setPhoneUsage: (date: string, compliant: boolean) => void;
}) {
  const t = new Date();
  const workday = isWorkday(t);
  const standard = workday ? '< 8h' : '< 10h';
  const label = workday ? '工作日' : '非工作日';
  const todayRecord = phoneUsageRecords.find(r => r.date === todayStr);

  // 本月达标率
  const monthPrefix = todayStr.slice(0, 7);
  const monthRecords = phoneUsageRecords.filter(r => r.date.startsWith(monthPrefix));
  const monthCompliant = monthRecords.filter(r => r.compliant).length;
  const monthRate = monthRecords.length > 0 ? Math.round((monthCompliant / monthRecords.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700">📱 手机使用时长</h3>

      <div className="text-center">
        <p className="text-xs text-gray-400 mb-2">今日（{label}）标准 {standard}</p>
        {todayRecord === undefined ? (
          <div className="flex gap-3 justify-center">
            <button onClick={() => setPhoneUsage(todayStr, true)}
              className="px-6 py-2 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all">
              ✅ 达标
            </button>
            <button onClick={() => setPhoneUsage(todayStr, false)}
              className="px-6 py-2 text-sm font-medium rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all">
              ❌ 未达标
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todayRecord.compliant ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="text-lg">✅</span>
                <span className="font-medium">今日达标</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                  <span className="text-lg">❌</span>
                  <span className="font-medium">今日未达标</span>
                </div>
              </div>
            )}
            <div>
              <button onClick={() => setPhoneUsage(todayStr, !todayRecord.compliant)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                点此切换
              </button>
            </div>
          </div>
        )}
      </div>

      {monthRecords.length > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${monthRate >= 80 ? 'bg-emerald-400' : monthRate >= 50 ? 'bg-amber-400' : 'bg-orange-400'}`}
              style={{ width: `${monthRate}%` }} />
          </div>
          <span className="text-xs text-gray-400 shrink-0">本月达标 {monthCompliant}/{monthRecords.length} ({monthRate}%)</span>
        </div>
      )}
    </div>
  );
}

/* ===== 本月汇总 ===== */
function MonthlySection({
  dailyGoals, dailyRecords, sleepRecords, phoneUsageRecords, todayStr,
}: {
  dailyGoals: { id: string; name: string }[];
  dailyRecords: DailyRecord[];
  sleepRecords: { date: string; hours: number }[];
  phoneUsageRecords: { date: string; compliant: boolean }[];
  todayStr: string;
}) {
  const monthLabel = todayStr.slice(0, 7);
  const monthPrefix = monthLabel;

  // 学习统计
  const monthSleepRecords = sleepRecords.filter(r => r.date.startsWith(monthPrefix));
  const avgSleep = monthSleepRecords.length > 0
    ? (monthSleepRecords.reduce((s, r) => s + r.hours, 0) / monthSleepRecords.length)
    : 0;

  const monthPhoneRecords = phoneUsageRecords.filter(r => r.date.startsWith(monthPrefix));
  const phoneRate = monthPhoneRecords.length > 0
    ? Math.round((monthPhoneRecords.filter(r => r.compliant).length / monthPhoneRecords.length) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
      <p className="text-xs font-medium text-gray-400">📊 {monthLabel} 月度汇总</p>

      {/* 学习热力图 */}
      {dailyGoals.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-3">📖 学习热力图</p>
          <MonthlyHeatmap records={dailyRecords} dailyGoals={dailyGoals} />
        </div>
      )}

      {/* 各学习目标完成率 */}
      {dailyGoals.length > 0 && (
        <div className="border-t border-gray-50 pt-3 space-y-2">
          <p className="text-xs font-medium text-gray-400">📖 学习完成率</p>
          {dailyGoals.map(goal => {
            const stats = calcMonthlyStats(dailyRecords, goal.id);
            return (
              <div key={goal.id} className="flex items-center gap-2">
                <span className="text-sm text-gray-700 w-16 shrink-0 truncate">{goal.name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${stats.percentage}%` }} />
                </div>
                <span className="text-xs text-gray-400 shrink-0 w-16 text-right">{stats.doneCount}/{stats.totalDays}</span>
                <span className="text-xs text-gray-500 shrink-0 w-8 text-right">{stats.percentage}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 其他汇总 */}
      <div className="border-t border-gray-50 pt-3 grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">😴 平均睡眠</p>
          <p className={`text-lg font-bold ${avgSleep >= 8 ? 'text-emerald-500' : 'text-orange-500'}`}>
            {avgSleep > 0 ? `${avgSleep.toFixed(1)}h` : '—'}
          </p>
          <p className="text-[10px] text-gray-400">记录 {monthSleepRecords.length} 天</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-400">📱 手机达标率</p>
          <p className={`text-lg font-bold ${phoneRate >= 80 ? 'text-emerald-500' : phoneRate >= 50 ? 'text-amber-500' : 'text-orange-500'}`}>
            {monthPhoneRecords.length > 0 ? `${phoneRate}%` : '—'}
          </p>
          <p className="text-[10px] text-gray-400">记录 {monthPhoneRecords.length} 天</p>
        </div>
      </div>
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
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 resize-none placeholder:text-gray-400" autoFocus />
                <div className="flex gap-2">
                  <button onClick={handleEdit}
                    className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">保存</button>
                  <button onClick={() => setEditingId(null)}
                    className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 cursor-pointer"
                onClick={() => { setEditingId(n.id); setEditContent(n.content); }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{formatDate(n.date)}</span>
                  <button onClick={e => { e.stopPropagation(); if (confirm('删除这条？')) deleteNote(n.id); }}
                    className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <textarea placeholder="随便写点什么…" value={content} onChange={e => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 resize-none placeholder:text-gray-400" autoFocus />
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">保存</button>
            <button onClick={() => setShowForm(false)}
              className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-500 transition-colors">
          + 写点什么
        </button>
      )}
    </div>
  );
}

/* ===== 共享组件 ===== */
function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-3 opacity-50">{icon}</div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
