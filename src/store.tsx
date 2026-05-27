import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { AppData, SavingGoal, AnnualGoal, DailyGoal, DailyRecord, Note, SavingRecord } from './types';

const STORAGE_KEY = 'discipline-diary-data';

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { savingGoals: [], annualGoals: [], dailyGoals: [], dailyRecords: [], notes: [] };
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
  addDailyGoal: (name: string) => void;
  deleteDailyGoal: (id: string) => void;
  toggleDailyRecord: (goalId: string, date: string) => void;
  isDailyDone: (goalId: string, date: string) => boolean;
  addNote: (content: string) => void;
  deleteNote: (id: string) => void;
}

const StoreContext = createContext<StoreType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => { saveData(data); }, [data]);

  const addSavingGoal = useCallback((name: string, targetAmount: number) => {
    setData(d => ({
      ...d,
      savingGoals: [...d.savingGoals, { id: uid(), name, targetAmount, records: [], createdAt: now() }],
    }));
  }, []);

  const deleteSavingGoal = useCallback((id: string) => {
    setData(d => ({
      ...d,
      savingGoals: d.savingGoals.filter(g => g.id !== id),
    }));
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

  const addAnnualGoal = useCallback((name: string) => {
    setData(d => ({
      ...d,
      annualGoals: [...d.annualGoals, { id: uid(), name, year: new Date().getFullYear(), percentage: 0, completed: false, createdAt: now() }],
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

  const addNote = useCallback((content: string) => {
    setData(d => ({
      ...d,
      notes: [...d.notes, { id: uid(), content, date: now() }],
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setData(d => ({ ...d, notes: d.notes.filter(n => n.id !== id) }));
  }, []);

  return (
    <StoreContext value={{
      data,
      addSavingGoal, deleteSavingGoal, addSavingRecord, deleteSavingRecord,
      addAnnualGoal, deleteAnnualGoal, toggleAnnualGoal, setAnnualPercentage,
      addDailyGoal, deleteDailyGoal, toggleDailyRecord, isDailyDone,
      addNote, deleteNote,
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
