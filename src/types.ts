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

export interface AnnualGoal {
  id: string;
  name: string;
  year: number;
  percentage: number;
  completed: boolean;
  createdAt: string;
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
  notes: Note[];
}
