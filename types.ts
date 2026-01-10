export enum View {
  DASHBOARD = 'DASHBOARD',
  GOALS = 'GOALS',
  INBOX = 'INBOX',
  HABITS = 'HABITS',
  FOCUS = 'FOCUS',
  JOURNAL = 'JOURNAL',
  SETTINGS = 'SETTINGS',
}

export interface NavItem {
  id: View;
  label: string;
  icon: string;
}

// Milestone/Task con của mục tiêu
export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string; // VD: "2025-12-20"
}

// MỤC TIÊU - Trung tâm của ứng dụng
export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  progress: number; // 0-100
  deadline: string; // VD: "2025-12-31"
  image: string;
  colorClass: string;
  milestones: Milestone[]; // Các nhiệm vụ/milestone con
  createdAt: number;
  notes?: string; // Ghi chú cho mục tiêu
}

// Các danh mục mục tiêu
export type GoalCategory =
  | 'Sự nghiệp'
  | 'Tài chính'
  | 'Sức khỏe'
  | 'Gia đình'
  | 'Học tập'
  | 'Dự án phụ'
  | 'Khác';

export const GOAL_CATEGORIES: GoalCategory[] = [
  'Sự nghiệp',
  'Tài chính',
  'Sức khỏe',
  'Gia đình',
  'Học tập',
  'Dự án phụ',
  'Khác'
];

// Habit giữ nguyên - hỗ trợ mục tiêu
export interface Habit {
  id: string;
  name: string;
  streak: number;
  completedToday: boolean;
  lastCompletedDate: string | null;
  category: string;
  linkedGoalId?: string; // Liên kết với mục tiêu nào
}

export interface JournalEntry {
  id: string;
  createdAt: number;
  content: string;
  mood: string;
  linkedGoalId?: string; // Liên kết với mục tiêu nào
}

// Focus Task cho Flowtime
export interface FocusTask {
  id: string;
  title: string;                    // Tên task
  startTime: number | null;         // Timestamp bắt đầu
  endTime: number | null;           // Timestamp kết thúc
  duration: number;                 // Thời lượng làm việc (ms)
  status: 'pending' | 'active' | 'completed' | 'resting';
  logs: string[];                   // Log những gì đã làm
  rating: number | null;            // Đánh giá 1-10
  notes: string;                    // Ghi chú
  restStartTime: number | null;     // Thời gian bắt đầu nghỉ
  restEndTime: number | null;       // Thời gian kết thúc nghỉ
  restDuration: number;             // Thời gian đã nghỉ (ms)
  suggestedRestTime: number;        // Thời gian nghỉ đề xuất (ms)
  createdAt: number;
}

// Tính toán "Sắp tới" từ goals
export interface UpcomingDeadline {
  goalId: string;
  goalTitle: string;
  deadline: string;
  daysLeft: number;
  progress: number;
  colorClass: string;
  type: 'goal' | 'milestone';
  milestoneTitle?: string;
}

// Helper: Parse date từ string
export function parseDeadline(deadline: string): Date | null {
  // Hỗ trợ nhiều format: "31/12", "2025-12-31", "31/12/2025"
  if (!deadline) return null;

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return new Date(deadline);
  }

  // Format: DD/MM hoặc DD/MM/YYYY
  const parts = deadline.split('/');
  if (parts.length >= 2) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
    return new Date(year, month, day);
  }

  return null;
}

// Helper: Tính số ngày còn lại
export function getDaysLeft(deadline: string): number {
  const deadlineDate = parseDeadline(deadline);
  if (!deadlineDate) return Infinity;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: Format deadline cho hiển thị
export function formatDeadlineDisplay(deadline: string): string {
  const daysLeft = getDaysLeft(deadline);

  if (daysLeft < 0) return `Quá hạn ${Math.abs(daysLeft)} ngày`;
  if (daysLeft === 0) return 'Hôm nay';
  if (daysLeft === 1) return 'Ngày mai';
  if (daysLeft <= 7) return `${daysLeft} ngày nữa`;

  const date = parseDeadline(deadline);
  if (date) {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }
  return deadline;
}