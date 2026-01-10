import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { Habit, JournalEntry, Goal, Milestone, GoalCategory, UpcomingDeadline, getDaysLeft, GOAL_CATEGORIES } from '../types';
import { apiService } from '../services/api';
import {
  exportToJSON,
  exportGoalsToCSV,
  exportHabitsToCSV,
  exportJournalToCSV,
  exportMilestonesToCSV,
  exportAllToCSV,
  importFromJSON,
  importGoalsFromCSV,
  importHabitsFromCSV,
  importJournalFromCSV,
  createBackup,
  ImportResult,
} from '../services/exportImport';

// ============================================
// DTOs
// ============================================
export interface UpdateGoalDTO {
  id: string;
  title?: string;
  category?: GoalCategory;
  progress?: number;
  deadline?: string;
  image?: string;
  colorClass?: string;
  notes?: string;
}

export interface AddMilestoneDTO {
  goalId: string;
  title: string;
  dueDate?: string;
}

export interface UpdateMilestoneDTO {
  goalId: string;
  milestoneId: string;
  title?: string;
  completed?: boolean;
  dueDate?: string;
}

export interface UpdateHabitDTO {
  id: string;
  name?: string;
  category?: string;
  streak?: number;
  linkedGoalId?: string;
}

export interface UpdateJournalDTO {
  id: string;
  content?: string;
  mood?: string;
  linkedGoalId?: string;
}

// ============================================
// Context Type
// ============================================
interface AppContextType {
  // Data
  goals: Goal[];
  habits: Habit[];
  journalEntries: JournalEntry[];
  
  // Loading & Error states
  isLoading: boolean;
  error: string | null;
  isOnline: boolean;
  
  // Computed
  upcomingDeadlines: UpcomingDeadline[];
  goalsByCategory: Record<GoalCategory, Goal[]>;
  categoryProgress: Record<GoalCategory, number>;
  
  // Goal actions
  addGoal: (title: string, category: GoalCategory, deadline: string) => void;
  updateGoal: (dto: UpdateGoalDTO) => void;
  deleteGoal: (id: string) => void;
  updateGoalProgress: (id: string, newProgress: number) => void;
  
  // Milestone actions (tasks con của goal)
  addMilestone: (dto: AddMilestoneDTO) => void;
  updateMilestone: (dto: UpdateMilestoneDTO) => void;
  deleteMilestone: (goalId: string, milestoneId: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  
  // Habit actions
  addHabit: (name: string, category: string, linkedGoalId?: string) => void;
  updateHabit: (dto: UpdateHabitDTO) => void;
  toggleHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  
  // Journal actions
  addJournalEntry: (content: string, mood: string, linkedGoalId?: string) => void;
  updateJournalEntry: (dto: UpdateJournalDTO) => void;
  deleteJournalEntry: (id: string) => void;

  // Utility actions
  refreshData: () => Promise<void>;
  migrateToCloud: () => Promise<boolean>;
  resetAllData: () => void;
  
  // Export/Import actions
  exportDataToJSON: () => void;
  exportGoalsCSV: () => void;
  exportHabitsCSV: () => void;
  exportJournalCSV: () => void;
  exportMilestonesCSV: () => void;
  exportAllCSV: () => void;
  importDataFromJSON: (file: File) => Promise<ImportResult>;
  importGoalsCSV: (file: File) => Promise<ImportResult>;
  importHabitsCSV: (file: File) => Promise<ImportResult>;
  importJournalCSV: (file: File) => Promise<ImportResult>;
  createDataBackup: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'ALEX_OS_DATA_V4'; // Bump version for new structure

// ============================================
// Default Data
// ============================================
const DEFAULT_GOALS: Goal[] = [];

const DEFAULT_HABITS: Habit[] = [];

// ============================================
// Helper: Load from localStorage with fallback
// ============================================
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// ============================================
// Helper: Save to localStorage
// ============================================
function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save to localStorage [${key}]:`, error);
  }
}

// ============================================
// Provider
// ============================================
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- Loading & Error States ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- GOALS ---
  const [goals, setGoals] = useState<Goal[]>(() => {
    return loadFromStorage(STORAGE_KEY + '_GOALS', DEFAULT_GOALS);
  });

  // --- HABITS ---
  const [habits, setHabits] = useState<Habit[]>(() => {
    let parsedHabits: Habit[] = loadFromStorage(STORAGE_KEY + '_HABITS', DEFAULT_HABITS);
    
    const todayStr = new Date().toDateString();
    parsedHabits = parsedHabits.map(h => {
      if (h.lastCompletedDate !== todayStr) {
        return { ...h, completedToday: false };
      }
      return h;
    });
    return parsedHabits;
  });

  // --- JOURNAL ---
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    return loadFromStorage(STORAGE_KEY + '_JOURNAL', []);
  });

  // --- ONLINE/OFFLINE LISTENER ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Try to process queued requests when back online
      apiService.processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- PERSISTENCE (localStorage always as backup) ---
  useEffect(() => { saveToStorage(STORAGE_KEY + '_GOALS', goals); }, [goals]);
  useEffect(() => { saveToStorage(STORAGE_KEY + '_HABITS', habits); }, [habits]);
  useEffect(() => { saveToStorage(STORAGE_KEY + '_JOURNAL', journalEntries); }, [journalEntries]);

  // --- FETCH DATA FROM API ---
  const fetchDataFromApi = useCallback(async () => {
    if (apiService.isUsingLocalStorage()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch goals
      const goalsResponse = await apiService.getGoals();
      if (goalsResponse.success && goalsResponse.data) {
        // Fetch milestones and merge with goals
        const milestonesResponse = await apiService.getMilestones();
        const milestones = milestonesResponse.success && milestonesResponse.data ? milestonesResponse.data : [];
        
        const goalsWithMilestones = goalsResponse.data.map(goal => ({
          ...goal,
          milestones: milestones.filter(m => m.goalId === goal.id).map(({ goalId, ...m }) => m) as Milestone[],
        }));
        setGoals(goalsWithMilestones);
      }

      // Fetch habits
      const habitsResponse = await apiService.getHabits();
      if (habitsResponse.success && habitsResponse.data) {
        const todayStr = new Date().toDateString();
        const processedHabits = habitsResponse.data.map(h => ({
          ...h,
          completedToday: h.lastCompletedDate === todayStr ? h.completedToday : false,
        }));
        setHabits(processedHabits);
      }

      // Fetch journal entries
      const journalResponse = await apiService.getJournalEntries();
      if (journalResponse.success && journalResponse.data) {
        setJournalEntries(journalResponse.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Failed to fetch data from API:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- INITIAL LOAD FROM API ---
  useEffect(() => {
    if (!apiService.isUsingLocalStorage()) {
      fetchDataFromApi();
    }
  }, [fetchDataFromApi]);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  // Upcoming Deadlines - Lấy từ Goals và Milestones thật
  const upcomingDeadlines = useMemo<UpcomingDeadline[]>(() => {
    const deadlines: UpcomingDeadline[] = [];
    
    goals.forEach(goal => {
      // Add goal deadline
      const daysLeft = getDaysLeft(goal.deadline);
      if (daysLeft <= 30 && daysLeft >= -7) { // Hiển thị 30 ngày tới và 7 ngày quá hạn
        deadlines.push({
          goalId: goal.id,
          goalTitle: goal.title,
          deadline: goal.deadline,
          daysLeft,
          progress: goal.progress,
          colorClass: goal.colorClass,
          type: 'goal',
        });
      }
      
      // Add milestone deadlines
      goal.milestones.forEach(milestone => {
        if (milestone.dueDate && !milestone.completed) {
          const mDaysLeft = getDaysLeft(milestone.dueDate);
          if (mDaysLeft <= 14 && mDaysLeft >= -3) {
            deadlines.push({
              goalId: goal.id,
              goalTitle: goal.title,
              deadline: milestone.dueDate,
              daysLeft: mDaysLeft,
              progress: goal.progress,
              colorClass: goal.colorClass,
              type: 'milestone',
              milestoneTitle: milestone.title,
            });
          }
        }
      });
    });
    
    // Sort by daysLeft (sớm nhất trước)
    return deadlines.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [goals]);

  // Goals by Category
  const goalsByCategory = useMemo<Record<GoalCategory, Goal[]>>(() => {
    const result: Record<GoalCategory, Goal[]> = {} as Record<GoalCategory, Goal[]>;
    GOAL_CATEGORIES.forEach(cat => { result[cat] = []; });
    goals.forEach(goal => {
      if (result[goal.category]) {
        result[goal.category].push(goal);
      }
    });
    return result;
  }, [goals]);

  // Category Progress - Tính trung bình progress theo category
  const categoryProgress = useMemo<Record<GoalCategory, number>>(() => {
    const result: Record<GoalCategory, number> = {} as Record<GoalCategory, number>;
    GOAL_CATEGORIES.forEach(cat => {
      const catGoals = goalsByCategory[cat];
      if (catGoals.length === 0) {
        result[cat] = 0;
      } else {
        const total = catGoals.reduce((sum, g) => sum + g.progress, 0);
        result[cat] = Math.round(total / catGoals.length);
      }
    });
    return result;
  }, [goalsByCategory]);

  // ============================================
  // GOAL ACTIONS
  // ============================================
  const addGoal = useCallback((title: string, category: GoalCategory, deadline: string) => {
    const colors = ['bg-neo-blue', 'bg-neo-purple', 'bg-neo-orange', 'bg-neo-lime', 'bg-neo-red'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const images = [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=60', 
      'https://images.unsplash.com/photo-1555421689-492a6c3ae4eb?w=800&auto=format&fit=crop&q=60',
    ];
    const randomImage = images[Math.floor(Math.random() * images.length)];

    const newGoal: Goal = {
      id: Date.now().toString(),
      title,
      category,
      progress: 0,
      deadline,
      image: randomImage,
      colorClass: randomColor,
      milestones: [],
      createdAt: Date.now(),
    };

    // Update local state immediately
    setGoals(prev => [...prev, newGoal]);

    // Sync to API if not using localStorage
    if (!apiService.isUsingLocalStorage()) {
      apiService.createGoal({ title, category, deadline, image: randomImage, colorClass: randomColor })
        .catch(err => console.error('Failed to create goal in API:', err));
    }
  }, []);

  const updateGoal = useCallback((dto: UpdateGoalDTO) => {
    setGoals(prev => prev.map(g => {
      if (g.id === dto.id) {
        return {
          ...g,
          title: dto.title ?? g.title,
          category: dto.category ?? g.category,
          progress: dto.progress ?? g.progress,
          deadline: dto.deadline ?? g.deadline,
          image: dto.image ?? g.image,
          colorClass: dto.colorClass ?? g.colorClass,
          notes: dto.notes ?? g.notes,
        };
      }
      return g;
    }));

    if (!apiService.isUsingLocalStorage()) {
      apiService.updateGoal({ ...dto, category: dto.category as string })
        .catch(err => console.error('Failed to update goal in API:', err));
    }
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));

    if (!apiService.isUsingLocalStorage()) {
      apiService.deleteGoal(id)
        .catch(err => console.error('Failed to delete goal in API:', err));
    }
  }, []);

  const updateGoalProgress = useCallback((id: string, newProgress: number) => {
    const clampedProgress = Math.max(0, Math.min(100, newProgress));
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress: clampedProgress } : g));

    if (!apiService.isUsingLocalStorage()) {
      apiService.updateGoal({ id, progress: clampedProgress })
        .catch(err => console.error('Failed to update goal progress in API:', err));
    }
  }, []);

  // ============================================
  // MILESTONE ACTIONS (Tasks con của Goal)
  // ============================================
  const addMilestone = useCallback((dto: AddMilestoneDTO) => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: dto.title,
      completed: false,
      dueDate: dto.dueDate,
    };

    setGoals(prev => prev.map(g => {
      if (g.id === dto.goalId) {
        return { ...g, milestones: [...g.milestones, newMilestone] };
      }
      return g;
    }));

    if (!apiService.isUsingLocalStorage()) {
      apiService.createMilestone(dto)
        .catch(err => console.error('Failed to create milestone in API:', err));
    }
  }, []);

  const updateMilestone = useCallback((dto: UpdateMilestoneDTO) => {
    setGoals(prev => prev.map(g => {
      if (g.id === dto.goalId) {
        const newMilestones = g.milestones.map(m => {
          if (m.id === dto.milestoneId) {
            return {
              ...m,
              title: dto.title ?? m.title,
              completed: dto.completed ?? m.completed,
              dueDate: dto.dueDate ?? m.dueDate,
            };
          }
          return m;
        });
        return { ...g, milestones: newMilestones };
      }
      return g;
    }));

    if (!apiService.isUsingLocalStorage()) {
      apiService.updateMilestone({ 
        id: dto.milestoneId, 
        goalId: dto.goalId,
        title: dto.title,
        completed: dto.completed,
        dueDate: dto.dueDate
      }).catch(err => console.error('Failed to update milestone in API:', err));
    }
  }, []);

  const deleteMilestone = useCallback((goalId: string, milestoneId: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return { ...g, milestones: g.milestones.filter(m => m.id !== milestoneId) };
      }
      return g;
    }));

    if (!apiService.isUsingLocalStorage()) {
      apiService.deleteMilestone(milestoneId)
        .catch(err => console.error('Failed to delete milestone in API:', err));
    }
  }, []);

  const toggleMilestone = useCallback((goalId: string, milestoneId: string) => {
    let updatedCompleted = false;

    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const newMilestones = g.milestones.map(m => {
          if (m.id === milestoneId) {
            updatedCompleted = !m.completed;
            return { ...m, completed: updatedCompleted };
          }
          return m;
        });
        
        // Auto-update goal progress based on milestones
        const completedCount = newMilestones.filter(m => m.completed).length;
        const totalCount = newMilestones.length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : g.progress;
        
        return { ...g, milestones: newMilestones, progress: newProgress };
      }
      return g;
    }));

    if (!apiService.isUsingLocalStorage()) {
      apiService.updateMilestone({ id: milestoneId, goalId, completed: updatedCompleted })
        .catch(err => console.error('Failed to toggle milestone in API:', err));
    }
  }, []);

  // ============================================
  // HABIT ACTIONS
  // ============================================
  const addHabit = useCallback((name: string, category: string, linkedGoalId?: string) => {
    const newHabit: Habit = {
      id: Date.now().toString(),
      name,
      streak: 0,
      completedToday: false,
      lastCompletedDate: null,
      category,
      linkedGoalId,
    };
    setHabits(prev => [...prev, newHabit]);

    if (!apiService.isUsingLocalStorage()) {
      apiService.createHabit({ name, category, linkedGoalId })
        .catch(err => console.error('Failed to create habit in API:', err));
    }
  }, []);

  const updateHabit = useCallback((dto: UpdateHabitDTO) => {
    setHabits(prev => prev.map(h => {
      if (h.id === dto.id) {
        return {
          ...h,
          name: dto.name ?? h.name,
          category: dto.category ?? h.category,
          streak: dto.streak ?? h.streak,
          linkedGoalId: dto.linkedGoalId ?? h.linkedGoalId,
        };
      }
      return h;
    }));

    if (!apiService.isUsingLocalStorage()) {
      apiService.updateHabit(dto)
        .catch(err => console.error('Failed to update habit in API:', err));
    }
  }, []);

  const toggleHabit = useCallback((id: string) => {
    const todayStr = new Date().toDateString();
    let updatedHabit: Habit | null = null;

    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const isCompleting = !h.completedToday;
        let newStreak = h.streak;
        if (isCompleting) {
          newStreak = h.streak + 1;
        } else {
          newStreak = Math.max(0, h.streak - 1);
        }
        updatedHabit = {
          ...h,
          completedToday: isCompleting,
          lastCompletedDate: isCompleting ? todayStr : h.lastCompletedDate,
          streak: newStreak
        };
        return updatedHabit;
      }
      return h;
    }));

    if (!apiService.isUsingLocalStorage() && updatedHabit) {
      apiService.updateHabit({
        id: updatedHabit.id,
        streak: updatedHabit.streak,
        completedToday: updatedHabit.completedToday,
        lastCompletedDate: updatedHabit.lastCompletedDate,
      }).catch(err => console.error('Failed to toggle habit in API:', err));
    }
  }, []);

  const deleteHabit = useCallback((id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));

    if (!apiService.isUsingLocalStorage()) {
      apiService.deleteHabit(id)
        .catch(err => console.error('Failed to delete habit in API:', err));
    }
  }, []);

  // ============================================
  // JOURNAL ACTIONS
  // ============================================
  const addJournalEntry = useCallback((content: string, mood: string, linkedGoalId?: string) => {
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      content,
      mood,
      linkedGoalId,
    };
    setJournalEntries(prev => [newEntry, ...prev]);

    if (!apiService.isUsingLocalStorage()) {
      apiService.createJournalEntry({ content, mood, linkedGoalId })
        .catch(err => console.error('Failed to create journal entry in API:', err));
    }
  }, []);

  const updateJournalEntry = useCallback((dto: UpdateJournalDTO) => {
    setJournalEntries(prev => prev.map(e => {
      if (e.id === dto.id) {
        return {
          ...e,
          content: dto.content ?? e.content,
          mood: dto.mood ?? e.mood,
          linkedGoalId: dto.linkedGoalId ?? e.linkedGoalId,
        };
      }
      return e;
    }));

    if (!apiService.isUsingLocalStorage()) {
      apiService.updateJournalEntry(dto)
        .catch(err => console.error('Failed to update journal entry in API:', err));
    }
  }, []);

  const deleteJournalEntry = useCallback((id: string) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));

    if (!apiService.isUsingLocalStorage()) {
      apiService.deleteJournalEntry(id)
        .catch(err => console.error('Failed to delete journal entry in API:', err));
    }
  }, []);

  // ============================================
  // UTILITY ACTIONS
  // ============================================
  const refreshData = useCallback(async () => {
    await fetchDataFromApi();
  }, [fetchDataFromApi]);

  const migrateToCloud = useCallback(async (): Promise<boolean> => {
    if (apiService.isUsingLocalStorage()) {
      console.warn('Cannot migrate while in localStorage mode. Set VITE_USE_LOCAL_STORAGE=false');
      return false;
    }

    const result = await apiService.migrateFromLocalStorage({
      goals,
      habits,
      journalEntries,
    });

    if (result.success) {
      console.log('Migration successful!');
      return true;
    } else {
      console.error('Migration failed:', result.error);
      return false;
    }
  }, [goals, habits, journalEntries]);

  const resetAllData = useCallback(() => {
    // Xóa tất cả dữ liệu từ localStorage
    localStorage.removeItem(STORAGE_KEY + '_GOALS');
    localStorage.removeItem(STORAGE_KEY + '_HABITS');
    localStorage.removeItem(STORAGE_KEY + '_JOURNAL');
    localStorage.removeItem('bovanav2_focus_tasks');
    
    // Reset state về mảng rỗng
    setGoals([]);
    setHabits([]);
    setJournalEntries([]);
  }, []);

  // ============================================
  // EXPORT/IMPORT ACTIONS
  // ============================================
  const exportDataToJSON = useCallback(() => {
    exportToJSON({
      goals,
      habits,
      journalEntries,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    });
  }, [goals, habits, journalEntries]);

  const exportGoalsCSV = useCallback(() => {
    exportGoalsToCSV(goals);
  }, [goals]);

  const exportHabitsCSV = useCallback(() => {
    exportHabitsToCSV(habits);
  }, [habits]);

  const exportJournalCSV = useCallback(() => {
    exportJournalToCSV(journalEntries);
  }, [journalEntries]);

  const exportMilestonesCSV = useCallback(() => {
    exportMilestonesToCSV(goals);
  }, [goals]);

  const exportAllCSV = useCallback(() => {
    exportAllToCSV({ goals, habits, journalEntries });
  }, [goals, habits, journalEntries]);

  const importDataFromJSON = useCallback(async (file: File): Promise<ImportResult> => {
    const result = await importFromJSON(file);
    if (result.success && result.data) {
      setGoals(result.data.goals);
      setHabits(result.data.habits);
      setJournalEntries(result.data.journalEntries);
    }
    return result;
  }, []);

  const importGoalsCSV = useCallback(async (file: File): Promise<ImportResult> => {
    const result = await importGoalsFromCSV(file);
    if (result.success && result.data && result.data.goals.length > 0) {
      setGoals(prev => [...prev, ...result.data!.goals]);
    }
    return result;
  }, []);

  const importHabitsCSV = useCallback(async (file: File): Promise<ImportResult> => {
    const result = await importHabitsFromCSV(file);
    if (result.success && result.data && result.data.habits.length > 0) {
      setHabits(prev => [...prev, ...result.data!.habits]);
    }
    return result;
  }, []);

  const importJournalCSV = useCallback(async (file: File): Promise<ImportResult> => {
    const result = await importJournalFromCSV(file);
    if (result.success && result.data && result.data.journalEntries.length > 0) {
      setJournalEntries(prev => [...result.data!.journalEntries, ...prev]);
    }
    return result;
  }, []);

  const createDataBackup = useCallback(() => {
    createBackup({ goals, habits, journalEntries });
  }, [goals, habits, journalEntries]);

  return (
    <AppContext.Provider value={{
      goals, habits, journalEntries,
      isLoading, error, isOnline,
      upcomingDeadlines, goalsByCategory, categoryProgress,
      addGoal, updateGoal, deleteGoal, updateGoalProgress,
      addMilestone, updateMilestone, deleteMilestone, toggleMilestone,
      addHabit, updateHabit, toggleHabit, deleteHabit,
      addJournalEntry, updateJournalEntry, deleteJournalEntry,
      refreshData, migrateToCloud, resetAllData,
      exportDataToJSON, exportGoalsCSV, exportHabitsCSV, exportJournalCSV,
      exportMilestonesCSV, exportAllCSV,
      importDataFromJSON, importGoalsCSV, importHabitsCSV, importJournalCSV,
      createDataBackup,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
