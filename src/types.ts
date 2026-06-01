export interface SavingRecord {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  records: SavingRecord[];
  createdAt: string;
}

export interface AnnualSubTask {
  id: string;
  name: string;
  completed: boolean;
}

export interface AnnualGoal {
  id: string;
  name: string;
  year: number;
  percentage: number;
  completed: boolean;
  createdAt: string;
  mode: 'percentage' | 'subtasks' | 'checkbox';
  subtasks: AnnualSubTask[];
}

export interface DailyGoal {
  id: string;
  name: string;
  createdAt: string;
}

export interface DailyRecord {
  id: string;
  goalId: string;
  date: string;
  completed: boolean;
  late?: boolean;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  amount: number;
  category: string;
  note: string;
  type: 'expense' | 'income';
  source: 'manual' | 'alipay' | 'wechat';
}

export interface Note {
  id: string;
  content: string;
  date: string;
}

export interface AppData {
  savingGoals: SavingGoal[];
  annualGoals: AnnualGoal[];
  dailyGoals: DailyGoal[];
  dailyRecords: DailyRecord[];
  expenses: ExpenseRecord[];
  notes: Note[];
  reminderTime: string | null;
  lastNotifyDate: string | null;
  monthlyBudget: number | null;
}
