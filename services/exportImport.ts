/**
 * Export/Import Service - Xuất và nhập dữ liệu Excel/CSV
 * 
 * Hỗ trợ:
 * - Export Goals, Habits, Journal ra file Excel (.xlsx) hoặc CSV
 * - Import dữ liệu từ file Excel/CSV
 */

import { Goal, Habit, JournalEntry, Milestone, GoalCategory } from '../types';

// ============================================
// TYPES
// ============================================
export interface ExportData {
  goals: Goal[];
  habits: Habit[];
  journalEntries: JournalEntry[];
  exportedAt: string;
  version: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    goals: Goal[];
    habits: Habit[];
    journalEntries: JournalEntry[];
  };
  errors?: string[];
}

// ============================================
// CSV HELPERS
// ============================================
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export all data to JSON file
 */
export function exportToJSON(data: ExportData): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadFile(blob, `alex-os-backup-${formatDate(new Date())}.json`);
}

/**
 * Export Goals to CSV
 */
export function exportGoalsToCSV(goals: Goal[]): void {
  const headers = ['id', 'title', 'category', 'progress', 'deadline', 'colorClass', 'notes', 'createdAt', 'milestones_count'];
  
  const rows = goals.map(goal => [
    escapeCSV(goal.id),
    escapeCSV(goal.title),
    escapeCSV(goal.category),
    escapeCSV(goal.progress),
    escapeCSV(goal.deadline),
    escapeCSV(goal.colorClass),
    escapeCSV(goal.notes || ''),
    escapeCSV(goal.createdAt),
    escapeCSV(goal.milestones.length),
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  downloadFile(blob, `goals-${formatDate(new Date())}.csv`);
}

/**
 * Export Milestones to CSV
 */
export function exportMilestonesToCSV(goals: Goal[]): void {
  const headers = ['id', 'goalId', 'goalTitle', 'title', 'completed', 'dueDate'];
  
  const rows: string[][] = [];
  goals.forEach(goal => {
    goal.milestones.forEach(milestone => {
      rows.push([
        escapeCSV(milestone.id),
        escapeCSV(goal.id),
        escapeCSV(goal.title),
        escapeCSV(milestone.title),
        escapeCSV(milestone.completed),
        escapeCSV(milestone.dueDate || ''),
      ]);
    });
  });
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `milestones-${formatDate(new Date())}.csv`);
}

/**
 * Export Habits to CSV
 */
export function exportHabitsToCSV(habits: Habit[]): void {
  const headers = ['id', 'name', 'category', 'streak', 'completedToday', 'lastCompletedDate', 'linkedGoalId'];
  
  const rows = habits.map(habit => [
    escapeCSV(habit.id),
    escapeCSV(habit.name),
    escapeCSV(habit.category),
    escapeCSV(habit.streak),
    escapeCSV(habit.completedToday),
    escapeCSV(habit.lastCompletedDate || ''),
    escapeCSV(habit.linkedGoalId || ''),
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `habits-${formatDate(new Date())}.csv`);
}

/**
 * Export Journal Entries to CSV
 */
export function exportJournalToCSV(entries: JournalEntry[]): void {
  const headers = ['id', 'createdAt', 'date', 'content', 'mood', 'linkedGoalId'];
  
  const rows = entries.map(entry => [
    escapeCSV(entry.id),
    escapeCSV(entry.createdAt),
    escapeCSV(new Date(entry.createdAt).toLocaleDateString('vi-VN')),
    escapeCSV(entry.content),
    escapeCSV(entry.mood),
    escapeCSV(entry.linkedGoalId || ''),
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `journal-${formatDate(new Date())}.csv`);
}

/**
 * Export all data to multiple CSV files (zipped would require additional library)
 */
export function exportAllToCSV(data: { goals: Goal[]; habits: Habit[]; journalEntries: JournalEntry[] }): void {
  exportGoalsToCSV(data.goals);
  setTimeout(() => exportMilestonesToCSV(data.goals), 500);
  setTimeout(() => exportHabitsToCSV(data.habits), 1000);
  setTimeout(() => exportJournalToCSV(data.journalEntries), 1500);
}

// ============================================
// IMPORT FUNCTIONS
// ============================================

/**
 * Import from JSON file
 */
export async function importFromJSON(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;
    
    // Validate structure
    if (!data.goals || !data.habits || !data.journalEntries) {
      return { success: false, message: 'File không đúng định dạng. Thiếu goals, habits hoặc journalEntries.' };
    }
    
    return {
      success: true,
      message: `Import thành công: ${data.goals.length} goals, ${data.habits.length} habits, ${data.journalEntries.length} journal entries`,
      data: {
        goals: data.goals,
        habits: data.habits,
        journalEntries: data.journalEntries,
      },
    };
  } catch (error) {
    return { success: false, message: `Lỗi đọc file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Import Goals from CSV
 */
export async function importGoalsFromCSV(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { success: false, message: 'File CSV rỗng hoặc thiếu dữ liệu' };
    }
    
    const headers = parseCSVLine(lines[0]);
    const requiredHeaders = ['title', 'category', 'deadline'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return { success: false, message: `Thiếu các cột: ${missingHeaders.join(', ')}` };
    }
    
    const goals: Goal[] = [];
    const errors: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        
        const goal: Goal = {
          id: row.id || Date.now().toString() + i,
          title: row.title,
          category: (row.category || 'Khác') as GoalCategory,
          progress: parseInt(row.progress) || 0,
          deadline: row.deadline || new Date().toISOString().split('T')[0],
          colorClass: row.colorClass || 'bg-neo-blue',
          image: row.image || '',
          notes: row.notes || '',
          milestones: [],
          createdAt: parseInt(row.createdAt) || Date.now(),
        };
        
        goals.push(goal);
      } catch (err) {
        errors.push(`Dòng ${i + 1}: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
      }
    }
    
    return {
      success: true,
      message: `Import ${goals.length} goals thành công${errors.length > 0 ? `, ${errors.length} lỗi` : ''}`,
      data: { goals, habits: [], journalEntries: [] },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return { success: false, message: `Lỗi đọc file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Import Habits from CSV
 */
export async function importHabitsFromCSV(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { success: false, message: 'File CSV rỗng hoặc thiếu dữ liệu' };
    }
    
    const headers = parseCSVLine(lines[0]);
    const requiredHeaders = ['name', 'category'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return { success: false, message: `Thiếu các cột: ${missingHeaders.join(', ')}` };
    }
    
    const habits: Habit[] = [];
    const errors: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        
        const habit: Habit = {
          id: row.id || Date.now().toString() + i,
          name: row.name,
          category: row.category || 'Khác',
          streak: parseInt(row.streak) || 0,
          completedToday: row.completedToday?.toLowerCase() === 'true',
          lastCompletedDate: row.lastCompletedDate || null,
          linkedGoalId: row.linkedGoalId || undefined,
        };
        
        habits.push(habit);
      } catch (err) {
        errors.push(`Dòng ${i + 1}: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
      }
    }
    
    return {
      success: true,
      message: `Import ${habits.length} habits thành công${errors.length > 0 ? `, ${errors.length} lỗi` : ''}`,
      data: { goals: [], habits, journalEntries: [] },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return { success: false, message: `Lỗi đọc file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Import Journal from CSV
 */
export async function importJournalFromCSV(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return { success: false, message: 'File CSV rỗng hoặc thiếu dữ liệu' };
    }
    
    const headers = parseCSVLine(lines[0]);
    const requiredHeaders = ['content', 'mood'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return { success: false, message: `Thiếu các cột: ${missingHeaders.join(', ')}` };
    }
    
    const journalEntries: JournalEntry[] = [];
    const errors: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        
        const entry: JournalEntry = {
          id: row.id || Date.now().toString() + i,
          createdAt: parseInt(row.createdAt) || Date.now(),
          content: row.content,
          mood: row.mood || '😊',
          linkedGoalId: row.linkedGoalId || undefined,
        };
        
        journalEntries.push(entry);
      } catch (err) {
        errors.push(`Dòng ${i + 1}: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
      }
    }
    
    return {
      success: true,
      message: `Import ${journalEntries.length} journal entries thành công${errors.length > 0 ? `, ${errors.length} lỗi` : ''}`,
      data: { goals: [], habits: [], journalEntries },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return { success: false, message: `Lỗi đọc file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Detect file type from extension
 */
export function getFileType(filename: string): 'json' | 'csv' | 'unknown' {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'json') return 'json';
  if (ext === 'csv') return 'csv';
  return 'unknown';
}

/**
 * Create a backup of all data
 */
export function createBackup(data: { goals: Goal[]; habits: Habit[]; journalEntries: JournalEntry[] }): void {
  const exportData: ExportData = {
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };
  exportToJSON(exportData);
}
