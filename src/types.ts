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
  targetDays?: number;
  completed?: boolean;
  completedAt?: string;
}

export interface DailyRecord {
  id: string;
  goalId: string;
  date: string;
  completed: boolean;
  late?: boolean;
}

export interface DrinkRecord {
  id: string;
  date: string;
  type: 'milk_tea' | 'coffee' | 'other';
}

export interface ExerciseRecord {
  id: string;
  date: string;
  content: string;
  calories?: number;
}

export interface SleepRecord {
  id: string;
  date: string;
  hours: number;
}

export interface PhoneUsageRecord {
  id: string;
  date: string;
  compliant: boolean;
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
  drinkRecords: DrinkRecord[];
  exerciseRecords: ExerciseRecord[];
  sleepRecords: SleepRecord[];
  phoneUsageRecords: PhoneUsageRecord[];
  notes: Note[];
  reminderTime: string | null;
  lastNotifyDate: string | null;
}
