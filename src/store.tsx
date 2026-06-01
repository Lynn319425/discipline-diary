import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppData } from './types';

const STORAGE_KEY = 'discipline-diary-data';

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Migrate annual goals: add mode and subtasks
      if (data.annualGoals) {
        data.annualGoals = data.annualGoals.map((g: any) => ({
          ...g,
          mode: g.mode || 'percentage',
          subtasks: g.subtasks || [],
        }));
      }
      if (!data.expenses) data.expenses = [];
      if (!data.reminderTime) data.reminderTime = null;
      if (!data.lastNotifyDate) data.lastNotifyDate = null;
      if (data.monthlyBudget === undefined) data.monthlyBudget = null;
      return data;
    }
  } catch { /* ignore */ }
  return {
    savingGoals: [], annualGoals: [], dailyGoals: [], dailyRecords: [],
    expenses: [], notes: [], reminderTime: null, lastNotifyDate: null, monthlyBudget: null,
  };
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function now() {
  return new Date().toISOString();
}

interface StoreType {
  data: AppData;
  addSavingGoal: (name: string, targetAmount: number) => void;
  deleteSavingGoal: (id: string) => void;
  addSavingRecord: (goalId: string, amount: number, note: string) => void;
  deleteSavingRecord: (goalId: string, recordId: string) => void;
  addAnnualGoal: (name: string) => void;
  deleteAnnualGoal: (id: string) => void;
  toggleAnnualGoal: (id: string) => void;
  setAnnualPercentage: (id: string, pct: number) => void;
  addAnnualSubTask: (goalId: string, name: string) => void;
  toggleAnnualSubTask: (goalId: string, subTaskId: string) => void;
  deleteAnnualSubTask: (goalId: string, subTaskId: string) => void;
  setAnnualGoalMode: (goalId: string, mode: 'percentage' | 'subtasks') => void;
  addDailyGoal: (name: string) => void;
  deleteDailyGoal: (id: string) => void;
  toggleDailyRecord: (goalId: string, date: string) => void;
  isDailyDone: (goalId: string, date: string) => boolean;
  addExpense: (date: string, amount: number, category: string, note: string, type: 'expense' | 'income', source?: 'manual' | 'alipay' | 'wechat') => void;
  deleteExpense: (id: string) => void;
  importExpenses: (records: Array<{ date: string; amount: number; category: string; note: string; type: 'expense' | 'income'; source: 'manual' | 'alipay' | 'wechat' }>) => void;
  addNote: (content: string) => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  setReminderTime: (time: string | null) => void;
  setLastNotifyDate: (date: string | null) => void;
  setMonthlyBudget: (budget: number | null) => void;
}

const StoreContext = createContext<StoreType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => { saveData(data); }, [data]);

  /* ===== 攒钱目标 ===== */
  const addSavingGoal = useCallback((name: string, targetAmount: number) => {
    setData(d => ({
      ...d,
      savingGoals: [...d.savingGoals, { id: uid(), name, targetAmount, records: [], createdAt: now() }],
    }));
  }, []);

  const deleteSavingGoal = useCallback((id: string) => {
    setData(d => ({ ...d, savingGoals: d.savingGoals.filter(g => g.id !== id) }));
  }, []);

  const addSavingRecord = useCallback((goalId: string, amount: number, note: string) => {
    setData(d => ({
      ...d,
      savingGoals: d.savingGoals.map(g =>
        g.id === goalId
          ? { ...g, records: [...g.records, { id: uid(), date: today(), amount, note }] }
          : g
      ),
    }));
  }, []);

  const deleteSavingRecord = useCallback((goalId: string, recordId: string) => {
    setData(d => ({
      ...d,
      savingGoals: d.savingGoals.map(g =>
        g.id === goalId
          ? { ...g, records: g.records.filter(r => r.id !== recordId) }
          : g
      ),
    }));
  }, []);

  /* ===== 年度目标 ===== */
  const addAnnualGoal = useCallback((name: string) => {
    setData(d => ({
      ...d,
      annualGoals: [...d.annualGoals, {
        id: uid(), name, year: new Date().getFullYear(),
        percentage: 0, completed: false, createdAt: now(),
        mode: 'percentage', subtasks: [],
      }],
    }));
  }, []);

  const deleteAnnualGoal = useCallback((id: string) => {
    setData(d => ({ ...d, annualGoals: d.annualGoals.filter(g => g.id !== id) }));
  }, []);

  const toggleAnnualGoal = useCallback((id: string) => {
    setData(d => ({
      ...d,
      annualGoals: d.annualGoals.map(g =>
        g.id === id ? { ...g, completed: !g.completed, percentage: g.completed ? g.percentage : 100 } : g
      ),
    }));
  }, []);

  const setAnnualPercentage = useCallback((id: string, pct: number) => {
    setData(d => ({
      ...d,
      annualGoals: d.annualGoals.map(g =>
        g.id === id ? { ...g, percentage: pct, completed: pct >= 100 } : g
      ),
    }));
  }, []);

  const addAnnualSubTask = useCallback((goalId: string, name: string) => {
    setData(d => ({
      ...d,
      annualGoals: d.annualGoals.map(g => {
        if (g.id !== goalId) return g;
        const newSubtasks = [...g.subtasks, { id: uid(), name, completed: false }];
        const done = newSubtasks.filter(s => s.completed).length;
        const pct = Math.round((done / newSubtasks.length) * 100);
        return { ...g, subtasks: newSubtasks, percentage: pct, completed: pct >= 100 };
      }),
    }));
  }, []);

  const toggleAnnualSubTask = useCallback((goalId: string, subTaskId: string) => {
    setData(d => ({
      ...d,
      annualGoals: d.annualGoals.map(g => {
        if (g.id !== goalId) return g;
        const newSubtasks = g.subtasks.map(s =>
          s.id === subTaskId ? { ...s, completed: !s.completed } : s
        );
        const done = newSubtasks.filter(s => s.completed).length;
        const pct = Math.round((done / newSubtasks.length) * 100);
        return { ...g, subtasks: newSubtasks, percentage: pct, completed: pct >= 100 };
      }),
    }));
  }, []);

  const deleteAnnualSubTask = useCallback((goalId: string, subTaskId: string) => {
    setData(d => ({
      ...d,
      annualGoals: d.annualGoals.map(g => {
        if (g.id !== goalId) return g;
        const newSubtasks = g.subtasks.filter(s => s.id !== subTaskId);
        const done = newSubtasks.filter(s => s.completed).length;
        const pct = newSubtasks.length > 0 ? Math.round((done / newSubtasks.length) * 100) : 0;
        return { ...g, subtasks: newSubtasks, percentage: pct, completed: pct >= 100 };
      }),
    }));
  }, []);

  const setAnnualGoalMode = useCallback((goalId: string, mode: 'percentage' | 'subtasks') => {
    setData(d => ({
      ...d,
      annualGoals: d.annualGoals.map(g => {
        if (g.id !== goalId) return g;
        if (mode === 'subtasks') {
          const done = g.subtasks.filter(s => s.completed).length;
          const pct = g.subtasks.length > 0 ? Math.round((done / g.subtasks.length) * 100) : g.percentage;
          return { ...g, mode, percentage: pct, completed: pct >= 100 };
        }
        return { ...g, mode };
      }),
    }));
  }, []);

  /* ===== 每日目标 ===== */
  const addDailyGoal = useCallback((name: string) => {
    setData(d => ({
      ...d,
      dailyGoals: [...d.dailyGoals, { id: uid(), name, createdAt: now() }],
    }));
  }, []);

  const deleteDailyGoal = useCallback((id: string) => {
    setData(d => ({
      ...d,
      dailyGoals: d.dailyGoals.filter(g => g.id !== id),
      dailyRecords: d.dailyRecords.filter(r => r.goalId !== id),
    }));
  }, []);

  const toggleDailyRecord = useCallback((goalId: string, date: string) => {
    setData(d => {
      const existing = d.dailyRecords.find(r => r.goalId === goalId && r.date === date);
      if (existing) {
        return { ...d, dailyRecords: d.dailyRecords.filter(r => r.id !== existing.id) };
      }
      return { ...d, dailyRecords: [...d.dailyRecords, { id: uid(), goalId, date, completed: true }] };
    });
  }, []);

  const isDailyDone = useCallback((goalId: string, date: string) => {
    return data.dailyRecords.some(r => r.goalId === goalId && r.date === date && r.completed);
  }, [data.dailyRecords]);

  /* ===== 记账 ===== */
  const addExpense = useCallback((
    date: string, amount: number, category: string, note: string,
    type: 'expense' | 'income', source: 'manual' | 'alipay' | 'wechat' = 'manual',
  ) => {
    setData(d => ({
      ...d,
      expenses: [{ id: uid(), date, amount, category, note, type, source }, ...d.expenses],
    }));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setData(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }));
  }, []);

  const importExpenses = useCallback((
    records: Array<{ date: string; amount: number; category: string; note: string; type: 'expense' | 'income'; source: 'manual' | 'alipay' | 'wechat' }>,
  ) => {
    setData(d => ({
      ...d,
      expenses: [...records.map(r => ({ ...r, id: uid() })), ...d.expenses],
    }));
  }, []);

  /* ===== 备忘录 ===== */
  const addNote = useCallback((content: string) => {
    setData(d => ({
      ...d,
      notes: [...d.notes, { id: uid(), content, date: now() }],
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setData(d => ({ ...d, notes: d.notes.filter(n => n.id !== id) }));
  }, []);

  const updateNote = useCallback((id: string, content: string) => {
    setData(d => ({
      ...d,
      notes: d.notes.map(n => n.id === id ? { ...n, content, date: now() } : n),
    }));
  }, []);

  /* ===== 提醒 ===== */
  const setReminderTime = useCallback((time: string | null) => {
    setData(d => ({ ...d, reminderTime: time }));
  }, []);

  const setLastNotifyDate = useCallback((date: string | null) => {
    setData(d => ({ ...d, lastNotifyDate: date }));
  }, []);

  /* ===== 每月限额 ===== */
  const setMonthlyBudget = useCallback((budget: number | null) => {
    setData(d => ({ ...d, monthlyBudget: budget }));
  }, []);

  return (
    <StoreContext value={{
      data,
      addSavingGoal, deleteSavingGoal, addSavingRecord, deleteSavingRecord,
      addAnnualGoal, deleteAnnualGoal, toggleAnnualGoal, setAnnualPercentage,
      addAnnualSubTask, toggleAnnualSubTask, deleteAnnualSubTask, setAnnualGoalMode,
      addDailyGoal, deleteDailyGoal, toggleDailyRecord, isDailyDone,
      addExpense, deleteExpense, importExpenses,
      addNote, updateNote, deleteNote,
      setReminderTime, setLastNotifyDate, setMonthlyBudget,
    }}>
      {children}
    </StoreContext>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
