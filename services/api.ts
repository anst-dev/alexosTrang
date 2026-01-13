/**
 * API Service Layer - Chuẩn hóa giao tiếp với Backend
 * 
 * Mục đích: Tạo lớp trung gian giữa Frontend và Backend (n8n/Google Sheets)
 * Khi backend sẵn sàng, chỉ cần thay đổi implementation trong file này
 */

import { Habit, JournalEntry, Goal, Milestone } from '../types';

// ============================================
// CONFIGURATION
// ============================================
const API_BASE_URL = import.meta.env.VITE_BASE_URL;
// Mặc định sử dụng localStorage, không gọi n8n API
// DISABLED: Chỉ sử dụng 2 API cho quick note và log history
const USE_LOCAL_STORAGE = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true'; // Force local storage for goals, habits, journal, milestones

// n8n Webhook Endpoints - DISABLED (chỉ dùng quick note APIs)
// Các endpoint này đã bị vô hiệu hóa, chỉ sử dụng localStorage
const ENDPOINTS = {
    GOALS: '', // DISABLED - Using localStorage only
    HABITS: '', // DISABLED - Using localStorage only
    JOURNAL: '', // DISABLED - Using localStorage only
    MILESTONES: '', // DISABLED - Using localStorage only
};

// ============================================
// DTOs - Data Transfer Objects (Input/Output)
// ============================================

// --- GOAL DTOs ---
export interface CreateGoalDTO {
    title: string;
    category: string;
    deadline: string;
    image?: string;
    colorClass?: string;
    notes?: string;
}

export interface UpdateGoalDTO {
    id: string;
    title?: string;
    category?: string;
    progress?: number;
    deadline?: string;
    image?: string;
    colorClass?: string;
    notes?: string;
}

export interface GoalResponseDTO extends Goal { }

// --- MILESTONE DTOs ---
export interface CreateMilestoneDTO {
    goalId: string;
    title: string;
    dueDate?: string;
}

export interface UpdateMilestoneDTO {
    id: string;
    goalId: string;
    title?: string;
    completed?: boolean;
    dueDate?: string;
}

export interface MilestoneResponseDTO extends Milestone {
    goalId: string;
}

// --- HABIT DTOs ---
export interface CreateHabitDTO {
    name: string;
    category: string;
    linkedGoalId?: string;
}

export interface UpdateHabitDTO {
    id: string;
    name?: string;
    category?: string;
    streak?: number;
    completedToday?: boolean;
    lastCompletedDate?: string | null;
    linkedGoalId?: string;
}

export interface HabitResponseDTO extends Habit { }

// --- JOURNAL DTOs ---
export interface CreateJournalDTO {
    content: string;
    mood: string;
    linkedGoalId?: string;
}

export interface UpdateJournalDTO {
    id: string;
    content?: string;
    mood?: string;
    linkedGoalId?: string;
}

export interface JournalResponseDTO extends JournalEntry { }

// ============================================
// API Response Wrapper
// ============================================
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// ============================================
// API Service Implementation
// ============================================
class ApiService {
    private baseUrl: string;
    private useLocalStorage: boolean;
    private requestQueue: Array<() => Promise<void>> = [];
    private isProcessingQueue = false;

    constructor() {
        this.baseUrl = API_BASE_URL;
        this.useLocalStorage = USE_LOCAL_STORAGE;
    }

    // --- Check if using local storage ---
    isUsingLocalStorage(): boolean {
        return this.useLocalStorage;
    }

    // --- Generic HTTP Methods ---
    private async request<T>(
        url: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        body?: unknown
    ): Promise<ApiResponse<T>> {
        if (this.useLocalStorage) {
            return { success: true, message: 'Using local storage' };
        }

        try {
            const options: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-HTTP-Method': method, // n8n webhook compatibility
                },
            };

            if (body && method !== 'GET') {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`API Error [${method} ${url}]:`, errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    // ============================================
    // GOAL API
    // ============================================
    async getGoals(): Promise<ApiResponse<GoalResponseDTO[]>> {
        return this.request<GoalResponseDTO[]>(ENDPOINTS.GOALS, 'GET');
    }

    async createGoal(dto: CreateGoalDTO): Promise<ApiResponse<GoalResponseDTO>> {
        const payload = {
            ...dto,
            id: Date.now().toString(),
            progress: 0,
            milestones: [],
            createdAt: Date.now(),
        };
        return this.request<GoalResponseDTO>(ENDPOINTS.GOALS, 'POST', payload);
    }

    async updateGoal(dto: UpdateGoalDTO): Promise<ApiResponse<GoalResponseDTO>> {
        return this.request<GoalResponseDTO>(`${ENDPOINTS.GOALS}/${dto.id}`, 'PUT', dto);
    }

    async deleteGoal(id: string): Promise<ApiResponse<void>> {
        return this.request<void>(`${ENDPOINTS.GOALS}/${id}`, 'DELETE');
    }

    // ============================================
    // MILESTONE API
    // ============================================
    async getMilestones(goalId?: string): Promise<ApiResponse<MilestoneResponseDTO[]>> {
        const url = goalId 
            ? `${ENDPOINTS.MILESTONES}?goalId=${goalId}` 
            : ENDPOINTS.MILESTONES;
        return this.request<MilestoneResponseDTO[]>(url, 'GET');
    }

    async createMilestone(dto: CreateMilestoneDTO): Promise<ApiResponse<MilestoneResponseDTO>> {
        const payload = {
            ...dto,
            id: Date.now().toString(),
            completed: false,
        };
        return this.request<MilestoneResponseDTO>(ENDPOINTS.MILESTONES, 'POST', payload);
    }

    async updateMilestone(dto: UpdateMilestoneDTO): Promise<ApiResponse<MilestoneResponseDTO>> {
        return this.request<MilestoneResponseDTO>(`${ENDPOINTS.MILESTONES}/${dto.id}`, 'PUT', dto);
    }

    async deleteMilestone(id: string): Promise<ApiResponse<void>> {
        return this.request<void>(`${ENDPOINTS.MILESTONES}/${id}`, 'DELETE');
    }

    // ============================================
    // HABIT API
    // ============================================
    async getHabits(): Promise<ApiResponse<HabitResponseDTO[]>> {
        return this.request<HabitResponseDTO[]>(ENDPOINTS.HABITS, 'GET');
    }

    async createHabit(dto: CreateHabitDTO): Promise<ApiResponse<HabitResponseDTO>> {
        const payload = {
            ...dto,
            id: Date.now().toString(),
            streak: 0,
            completedToday: false,
            lastCompletedDate: null,
        };
        return this.request<HabitResponseDTO>(ENDPOINTS.HABITS, 'POST', payload);
    }

    async updateHabit(dto: UpdateHabitDTO): Promise<ApiResponse<HabitResponseDTO>> {
        return this.request<HabitResponseDTO>(`${ENDPOINTS.HABITS}/${dto.id}`, 'PUT', dto);
    }

    async deleteHabit(id: string): Promise<ApiResponse<void>> {
        return this.request<void>(`${ENDPOINTS.HABITS}/${id}`, 'DELETE');
    }

    // ============================================
    // JOURNAL API
    // ============================================
    async getJournalEntries(): Promise<ApiResponse<JournalResponseDTO[]>> {
        return this.request<JournalResponseDTO[]>(ENDPOINTS.JOURNAL, 'GET');
    }

    async createJournalEntry(dto: CreateJournalDTO): Promise<ApiResponse<JournalResponseDTO>> {
        const payload = {
            ...dto,
            id: Date.now().toString(),
            createdAt: Date.now(),
        };
        return this.request<JournalResponseDTO>(ENDPOINTS.JOURNAL, 'POST', payload);
    }

    async updateJournalEntry(dto: UpdateJournalDTO): Promise<ApiResponse<JournalResponseDTO>> {
        return this.request<JournalResponseDTO>(`${ENDPOINTS.JOURNAL}/${dto.id}`, 'PUT', dto);
    }

    async deleteJournalEntry(id: string): Promise<ApiResponse<void>> {
        return this.request<void>(`${ENDPOINTS.JOURNAL}/${id}`, 'DELETE');
    }

    // ============================================
    // SYNC UTILITIES
    // ============================================
    
    /**
     * Queue a request for retry when offline
     */
    queueRequest(requestFn: () => Promise<void>): void {
        this.requestQueue.push(requestFn);
        this.saveQueueToStorage();
    }

    /**
     * Process queued requests
     */
    async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.requestQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            if (request) {
                try {
                    await request();
                } catch (error) {
                    console.error('Failed to process queued request:', error);
                    // Re-queue failed request
                    this.requestQueue.unshift(request);
                    break;
                }
            }
        }
        
        this.saveQueueToStorage();
        this.isProcessingQueue = false;
    }

    private saveQueueToStorage(): void {
        // Queue requests are functions, so we can't serialize them directly
        // This is a simplified version - in production, you'd store request params
        localStorage.setItem('ALEX_OS_SYNC_QUEUE_COUNT', this.requestQueue.length.toString());
    }

    /**
     * Check API health
     */
    async healthCheck(): Promise<boolean> {
        if (this.useLocalStorage) return true;
        
        try {
            const response = await fetch(`${this.baseUrl}/healthz`, { 
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Migrate data from localStorage to API
     */
    async migrateFromLocalStorage(data: {
        goals: Goal[];
        habits: Habit[];
        journalEntries: JournalEntry[];
    }): Promise<ApiResponse<void>> {
        if (this.useLocalStorage) {
            return { success: false, error: 'Cannot migrate while using localStorage mode' };
        }

        try {
            // Migrate goals (milestones will be migrated separately)
            for (const goal of data.goals) {
                const { milestones, ...goalData } = goal;
                await this.request(ENDPOINTS.GOALS, 'POST', goalData);
                
                // Migrate milestones for this goal
                for (const milestone of milestones) {
                    await this.request(ENDPOINTS.MILESTONES, 'POST', {
                        ...milestone,
                        goalId: goal.id,
                    });
                }
            }

            // Migrate habits
            for (const habit of data.habits) {
                await this.request(ENDPOINTS.HABITS, 'POST', habit);
            }

            // Migrate journal entries
            for (const entry of data.journalEntries) {
                await this.request(ENDPOINTS.JOURNAL, 'POST', entry);
            }

            return { success: true, message: 'Migration completed successfully' };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: `Migration failed: ${errorMessage}` };
        }
    }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types for convenience
export type { Goal, Habit, JournalEntry, Milestone };
