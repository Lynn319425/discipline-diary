import { useState, useEffect } from 'react';
import { useStore } from './store';
import type { SavingGoal, DailyRecord } from './types';

const tabs = ['攒钱', '年度', '每日', '记账', '备忘录'] as const;
const tabIcons = ['💰', '🎯', '✅', '💳', '📝'] as const;
type Tab = (typeof tabs)[number];

const CATEGORIES = ['餐饮', '交通', '购物', '住房', '娱乐', '医疗', '教育', '工资', '其他'] as const;
const CATEGORY_ICONS: Record<string, string> = {
  '餐饮': '🍽️', '交通': '🚗', '购物': '🛍️', '住房': '🏠',
  '娱乐': '🎮', '医疗': '🏥', '教育': '📚', '工资': '💰', '其他': '📦',
};

/* ===== App 根组件 ===== */
export default function App() {
  const { data, setReminderTime, setLastNotifyDate } = useStore();
  const [tab, setTab] = useState<Tab>('攒钱');
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [tempReminderTime, setTempReminderTime] = useState(data.reminderTime || '21:00');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const dateStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  const todayStr = dateToStr(new Date());

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

  // Notification reminder check
  useEffect(() => {
    if (!data.reminderTime) return;
    const check = () => {
      const now = new Date();
      const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (t === data.reminderTime && data.lastNotifyDate !== todayStr) {
        const undone = data.dailyGoals.filter(g =>
          !data.dailyRecords.some(r => r.goalId === g.id && r.date === todayStr && r.completed)
        ).length;
        if (undone > 0 && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('自律日记', { body: `今天还有 ${undone} 个目标未完成，去打卡吧！` });
          setLastNotifyDate(todayStr);
        }
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [data.reminderTime, data.lastNotifyDate, todayStr, data.dailyGoals, data.dailyRecords, setLastNotifyDate]);

  const handleNotifyClick = () => {
    // 总是在页面上显示时间选择器，不管通知权限如何
    if (data.reminderTime) {
      // 如果已经设置了提醒，再次点击展开/收起选择器
      setShowReminderPicker(!showReminderPicker);
    } else {
      setShowReminderPicker(true);
    }
    // 顺便尝试请求通知权限（浏览器可能拒绝，不影响提醒设置）
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
      </header>

      <main className="flex-1 px-4 pb-4 overflow-y-auto min-h-0">
        {tab === '攒钱' && <SavingsTab />}
        {tab === '年度' && <AnnualTab />}
        {tab === '每日' && <DailyTab />}
        {tab === '记账' && <ExpensesTab />}
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

/* ===== 年度目标（含子任务模式） ===== */
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

          {/* 进度条（checkbox 模式不显示） */}
          {goal.mode !== 'checkbox' && (
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all ${goal.completed ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${goal.percentage}%` }} />
            </div>
          )}

          {/* 模式切换（已完成不显示） */}
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

          {/* 百分比模式 */}
          {!goal.completed && goal.mode === 'percentage' && (
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={goal.percentage}
                onChange={e => setAnnualPercentage(goal.id, Number(e.target.value))}
                className="flex-1 h-1.5 accent-amber-500" />
              <span className="text-sm font-medium text-gray-500 w-9 text-right">{goal.percentage}%</span>
            </div>
          )}

          {/* 子任务模式 */}
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

/* ===== 每日目标 ===== */
function DailyTab() {
  const { data, addDailyGoal, deleteDailyGoal, toggleDailyRecord, isDailyDone } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [showMonthly, setShowMonthly] = useState(false);
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
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMonthly(!showMonthly)}
              className={`text-xs transition-colors flex items-center gap-1 ${showMonthly ? 'text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}>
              📊 本月 <span className="text-[10px]">{showMonthly ? '▲' : '▼'}</span>
            </button>
            <span className="text-sm text-gray-400">{doneCount}/{data.dailyGoals.length}</span>
          </div>
        )}
      </div>

      {showMonthly && data.dailyGoals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <p className="text-xs font-medium text-gray-400">📊 本月概览</p>
          {data.dailyGoals.map(goal => {
            const stats = calcMonthlyStats(data.dailyRecords, goal.id);
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

      {data.dailyGoals.length === 0 && !showForm && (
        <EmptyState icon="✅" text="还没有每日目标，添加一个吧" />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {data.dailyGoals.map(goal => {
          const done = isDailyDone(goal.id, todayStr);
          const streak = calcStreak(data.dailyRecords, goal.id);
          const yesterdayStr = dateToStr(new Date(Date.now() - 86400000));
          const hasYesterday = data.dailyRecords.some(r => r.goalId === goal.id && r.date === yesterdayStr && !r.late);
          const hasYesterdayLate = data.dailyRecords.some(r => r.goalId === goal.id && r.date === yesterdayStr && r.late);
          return (
            <div key={goal.id} className="flex items-center gap-3 px-4 py-3">
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
          );
        })}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <input placeholder="习惯名称，如：健身30分钟" value={name} onChange={e => setName(e.target.value)}
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
          + 添加每日目标
        </button>
      )}
    </div>
  );
}

/* ===== 记账 ===== */
function ExpensesTab() {
  const { data, addExpense, deleteExpense, importExpenses, setMonthlyBudget } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const [formDate, setFormDate] = useState(today());
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('餐饮');
  const [formNote, setFormNote] = useState('');
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');

  const monthPrefix = today().slice(0, 7);
  const monthExpenses = data.expenses.filter(e => e.date.startsWith(monthPrefix));
  const totalIncome = monthExpenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpense = monthExpenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const budget = data.monthlyBudget;
  const budgetRemaining = budget !== null ? Math.max(0, budget - totalExpense) : null;
  const budgetUsed = budget !== null && budget > 0 ? (totalExpense / budget) * 100 : 0;

  const catMap = new Map<string, number>();
  monthExpenses.filter(e => e.type === 'expense').forEach(e => {
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
  });
  const catTotals = [...catMap.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const sorted = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const handleAdd = () => {
    if (!formAmount.trim() || Number(formAmount) <= 0) return;
    addExpense(formDate, Number(formAmount), formCategory, formNote.trim(), formType);
    setFormAmount(''); setFormNote(''); setShowForm(false);
    setFormType('expense');
  };

  const handleCSVImport = () => {
    const records = parseCSV(csvText);
    if (records.length === 0) {
      alert('未能识别出有效记录，请确认 CSV 格式正确（支持支付宝/微信导出格式）');
      return;
    }
    importExpenses(records);
    setCsvText('');
    setShowCSV(false);
  };

  return (
    <div className="space-y-3 mt-3">
      {/* 月度汇总 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-xs font-medium text-gray-400 mb-3">📊 {monthPrefix} 月账单</p>
        <div className="grid grid-cols-2 gap-2 text-center mb-3">
          <div className="bg-red-50 rounded-xl py-2">
            <p className="text-xs text-red-400">支出</p>
            <p className="text-lg font-bold text-red-500">¥{totalExpense.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl py-2">
            <p className="text-xs text-emerald-400">收入</p>
            <p className="text-lg font-bold text-emerald-500">¥{totalIncome.toLocaleString()}</p>
          </div>
        </div>

        {/* 每月限额 */}
        {budget !== null ? (
          <div className="bg-amber-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-700 font-medium">🎯 月限额</span>
                <span className="text-sm font-bold text-amber-800">¥{budget.toLocaleString()}</span>
              </div>
              <button onClick={() => { setBudgetInput(String(budget)); setShowBudgetInput(true); }}
                className="text-[10px] text-amber-500 hover:text-amber-700">修改</button>
            </div>
            <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${budgetUsed >= 100 ? 'bg-red-400' : budgetUsed >= 80 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min(100, budgetUsed)}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-amber-600">已用 ¥{totalExpense.toLocaleString()}</span>
              <span className={`font-medium ${budgetRemaining !== null && budgetRemaining > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                🐷 存款 ¥{budgetRemaining?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowBudgetInput(true)}
            className="w-full py-2 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-500 transition-colors">
            📏 设置每月消费限额
          </button>
        )}

        {showBudgetInput && (
          <div className="bg-white border border-amber-200 rounded-xl p-3 space-y-2">
            <p className="text-xs text-gray-500">每月消费限额（仅统计支出）</p>
            <div className="flex gap-2">
              <input type="number" inputMode="decimal" placeholder="输入月限额" value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400"
                autoFocus />
              <button onClick={() => {
                if (budgetInput.trim() && Number(budgetInput) > 0) {
                  setMonthlyBudget(Number(budgetInput));
                  setShowBudgetInput(false);
                }
              }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">确认</button>
              <button onClick={() => { setShowBudgetInput(false); if (budget === null) setBudgetInput(''); }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">取消</button>
            </div>
            {budget !== null && (
              <button onClick={() => { setMonthlyBudget(null); setShowBudgetInput(false); }}
                className="text-xs text-red-400 hover:text-red-600">删除限额</button>
            )}
          </div>
        )}
        {totalExpense > 0 && catTotals.length > 0 && (
          <div className="space-y-1.5">
            {catTotals.map(({ name, total }) => (
              <div key={name} className="flex items-center gap-2 text-xs">
                <span className="w-4 shrink-0 text-center">{CATEGORY_ICONS[name] || '📦'}</span>
                <span className="w-6 text-gray-500">{name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${(total / totalExpense) * 100}%` }} />
                </div>
                <span className="w-14 text-right text-gray-400 shrink-0">¥{total}</span>
              </div>
            ))}
          </div>
        )}
        {monthExpenses.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-1">本月暂无记录</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button onClick={() => setShowForm(true)}
          className="flex-1 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors">
          ✏️ 手动记账
        </button>
        <button onClick={() => setShowCSV(true)}
          className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          📄 导入 CSV
        </button>
      </div>

      {/* 手动记账表单 */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setFormType('expense')}
              className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${formType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>支出</button>
            <button onClick={() => setFormType('income')}
              className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-colors ${formType === 'income' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>收入</button>
          </div>
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300" />
          <input type="number" inputMode="decimal" placeholder="金额" value={formAmount}
            onChange={e => setFormAmount(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" autoFocus />
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFormCategory(c)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${formCategory === c ? 'bg-amber-100 text-amber-800 font-medium' : 'bg-gray-100 text-gray-500'}`}>
                {CATEGORY_ICONS[c]} {c}
              </button>
            ))}
          </div>
          <input placeholder="备注（可选）" value={formNote} onChange={e => setFormNote(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 placeholder:text-gray-400" />
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">保存</button>
            <button onClick={() => setShowForm(false)}
              className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {/* CSV 导入 */}
      {showCSV && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
          <p className="text-xs font-medium text-gray-400">📄 导入 CSV 账单</p>
          <p className="text-xs text-gray-400">从支付宝 / 微信支付导出账单 CSV，粘贴到下方即可自动识别</p>
          <textarea placeholder="粘贴 CSV 内容……" value={csvText} onChange={e => setCsvText(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-300 font-mono resize-none" />
          <div className="flex gap-2">
            <button onClick={handleCSVImport}
              className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              disabled={!csvText.trim()}>解析并导入</button>
            <button onClick={() => setShowCSV(false)}
              className="py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
          </div>
        </div>
      )}

      {/* 记录列表 */}
      {sorted.length === 0 && !showForm && !showCSV ? (
        <EmptyState icon="💳" text="还没有记账记录" />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {sorted.map(e => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg shrink-0">{CATEGORY_ICONS[e.category] || '📦'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-900 truncate">{e.note || e.category}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">{e.category}</span>
                  {e.source !== 'manual' && (
                    <span className={`text-[10px] shrink-0 ${e.source === 'alipay' ? 'text-blue-500' : 'text-green-500'}`}>
                      {e.source === 'alipay' ? '支付宝' : '微信'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{e.date.slice(5)}</p>
              </div>
              <span className={`text-sm font-medium shrink-0 ${e.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                {e.type === 'expense' ? '-' : '+'}¥{e.amount.toLocaleString()}
              </span>
              <button onClick={() => { if (confirm('删除这条？')) deleteExpense(e.id); }}
                className="text-gray-300 hover:text-red-400 text-xs shrink-0">✕</button>
            </div>
          ))}
        </div>
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

/* ===== CSV 解析器 ===== */
function parseCSV(text: string): Array<{
  date: string; amount: number; category: string;
  note: string; type: 'expense' | 'income'; source: 'alipay' | 'wechat';
}> {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0];
  const isAlipay = header.includes('交易分类');
  const isWechat = !isAlipay && header.includes('交易类型');
  if (!isAlipay && !isWechat) return [];

  return lines.slice(1).map(line => {
    const cols = line.split(',');
    if (isAlipay) {
      const dateRaw = (cols[0] || '').trim();
      const date = dateRaw.split(' ')[0].replace(/\//g, '-');
      const category = cols[1]?.trim() || '其他';
      const type: 'expense' | 'income' = cols[4]?.trim() === '支出' ? 'expense' : 'income';
      const amount = Math.abs(parseFloat(cols[5]?.trim() || '0'));
      const note = cols[3]?.trim() || cols[2]?.trim() || '';
      return { date, amount, category, note, type, source: 'alipay' as const };
    } else {
      const dateRaw = (cols[0] || '').trim();
      const date = dateRaw.split(' ')[0].replace(/\//g, '-');
      const category = cols[1]?.trim() || '其他';
      const type: 'expense' | 'income' = cols[4]?.trim() === '支出' ? 'expense' : 'income';
      const amount = Math.abs(parseFloat(cols[5]?.trim() || '0'));
      const note = cols[3]?.trim() || cols[2]?.trim() || '';
      return { date, amount, category, note, type, source: 'wechat' as const };
    }
  }).filter(r => r.amount > 0 && r.date.length === 10);
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
