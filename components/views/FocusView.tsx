import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Icon } from '../ui/Icon';
import { BrutalCard, BrutalButton } from '../ui/BrutalComponents';
import { FocusTask } from '../../types';

// Helper functions
const generateId = () => `focus-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

// Tính thời gian nghỉ theo quy tắc Flowtime
const calculateSuggestedRestTime = (durationMs: number): number => {
  const minutes = durationMs / 60000;
  if (minutes < 25) return 5 * 60000; // 5 phút
  if (minutes <= 50) return 8 * 60000; // 8 phút
  return 12 * 60000; // 10-15 phút (lấy trung bình 12)
};

const STORAGE_KEY = 'bovanav2_focus_tasks';

// Load tasks từ localStorage
const loadTasks = (): FocusTask[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save tasks vào localStorage
const saveTasks = (tasks: FocusTask[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

export const FocusView: React.FC = () => {
  const [tasks, setTasks] = useState<FocusTask[]>(() => loadTasks());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [restElapsedTime, setRestElapsedTime] = useState(0);

  // Form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Complete dialog states
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completeLog, setCompleteLog] = useState('');
  const [completeRating, setCompleteRating] = useState<number>(7);
  const [completeNotes, setCompleteNotes] = useState('');

  const timerRef = useRef<number | null>(null);
  const restTimerRef = useRef<number | null>(null);

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
      if (timerRef.current) clearInterval(timerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  // Save tasks khi thay đổi
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  // Timer cho active task
  useEffect(() => {
    const activeTask = tasks.find(t => t.id === activeTaskId && t.status === 'active');

    if (activeTask && activeTask.startTime) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - activeTask.startTime!);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTaskId, tasks]);

  // Timer cho rest
  useEffect(() => {
    const restingTask = tasks.find(t => t.status === 'resting');

    if (restingTask && restingTask.restStartTime) {
      restTimerRef.current = window.setInterval(() => {
        setRestElapsedTime(Date.now() - restingTask.restStartTime!);
      }, 1000);
    } else {
      setRestElapsedTime(0);
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [tasks]);

  // CRUD Functions
  const addTask = useCallback(() => {
    if (!newTaskTitle.trim()) return;

    const newTask: FocusTask = {
      id: generateId(),
      title: newTaskTitle.trim(),
      startTime: null,
      endTime: null,
      duration: 0,
      status: 'pending',
      logs: [],
      rating: null,
      notes: '',
      restStartTime: null,
      restEndTime: null,
      restDuration: 0,
      suggestedRestTime: 0,
      createdAt: Date.now(),
    };

    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setIsAddModalOpen(false);
  }, [newTaskTitle]);

  const updateTask = useCallback((id: string, updates: Partial<FocusTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  }, [activeTaskId]);

  // Timer Functions
  const startTask = useCallback((id: string) => {
    const now = Date.now();
    updateTask(id, { startTime: now, status: 'active' });
    setActiveTaskId(id);
  }, [updateTask]);

  const openCompleteDialog = useCallback((id: string) => {
    setCompletingTaskId(id);
    setCompleteLog('');
    setCompleteRating(7);
    setCompleteNotes('');
  }, []);

  const completeTask = useCallback(() => {
    if (!completingTaskId) return;

    const task = tasks.find(t => t.id === completingTaskId);
    if (!task || !task.startTime) return;

    const now = Date.now();
    const duration = now - task.startTime;
    const suggestedRest = calculateSuggestedRestTime(duration);

    updateTask(completingTaskId, {
      endTime: now,
      duration,
      status: 'completed',
      logs: completeLog.trim() ? [...task.logs, completeLog.trim()] : task.logs,
      rating: completeRating,
      notes: completeNotes.trim(),
      suggestedRestTime: suggestedRest,
    });

    setActiveTaskId(null);
    setCompletingTaskId(null);
  }, [completingTaskId, tasks, completeLog, completeRating, completeNotes, updateTask]);

  const startRest = useCallback((id: string) => {
    const now = Date.now();
    updateTask(id, { restStartTime: now, status: 'resting' });
  }, [updateTask]);

  const endRest = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !task.restStartTime) return;

    const now = Date.now();
    const restDuration = now - task.restStartTime;

    updateTask(id, {
      restEndTime: now,
      restDuration,
      status: 'completed',
    });
  }, [tasks, updateTask]);

  // Get active and completed tasks
  const activeTask = tasks.find(t => t.id === activeTaskId && t.status === 'active');
  const restingTask = tasks.find(t => t.status === 'resting');
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed').slice(0, 10);

  // Format timer display
  const formatTimerDisplay = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
      h: hours < 10 ? `0${hours}` : hours,
      m: minutes < 10 ? `0${minutes}` : minutes,
      s: seconds < 10 ? `0${seconds}` : seconds,
    };
  };

  const timerDisplay = formatTimerDisplay(elapsedTime);
  const restDisplay = formatTimerDisplay(restElapsedTime);

  return (
    <div className="flex flex-col min-h-[80vh] text-white pb-20">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl md:text-6xl font-display font-black uppercase leading-none mb-2">
          Flowtime
        </h1>
        <p className="font-mono text-sm text-gray-400 uppercase tracking-widest">
          Làm việc linh hoạt • Nghỉ ngơi thông minh
        </p>
      </header>

      {/* Active Timer Section */}
      {activeTask && (
        <section className="mb-12">
          <div className="bg-neutral-900 border-4 border-neo-lime p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-neo-lime animate-pulse"></div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-neo-lime">
                ĐANG TẬP TRUNG
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-display font-black uppercase mb-6">
              {activeTask.title}
            </h2>

            {/* Timer */}
            <div className="flex items-baseline justify-center gap-2 md:gap-4 mb-8">
              <span className="text-5xl md:text-7xl font-display font-black text-neutral-600">{timerDisplay.h}</span>
              <span className="text-4xl md:text-5xl font-black">:</span>
              <span className="text-5xl md:text-7xl font-display font-black text-white">{timerDisplay.m}</span>
              <span className="text-4xl md:text-5xl font-black">:</span>
              <span className="text-5xl md:text-7xl font-display font-black text-neo-lime">{timerDisplay.s}</span>
            </div>

            <div className="flex justify-center">
              <BrutalButton
                variant="danger"
                icon="stop"
                onClick={() => openCompleteDialog(activeTask.id)}
              >
                Kết thúc
              </BrutalButton>
            </div>
          </div>
        </section>
      )}

      {/* Resting Section */}
      {restingTask && (
        <section className="mb-12">
          <div className="bg-neutral-900 border-4 border-neo-blue p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-neo-blue animate-pulse"></div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-neo-blue">
                ĐANG NGHỈ NGƠI
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-display uppercase mb-2">
              Sau: {restingTask.title}
            </h2>
            <p className="font-mono text-sm text-gray-400 mb-6">
              Đề xuất nghỉ: {formatDuration(restingTask.suggestedRestTime)}
            </p>

            {/* Rest Timer */}
            <div className="flex items-baseline justify-center gap-2 md:gap-4 mb-8">
              <span className="text-4xl md:text-6xl font-display font-black text-neo-blue">{restDisplay.m}</span>
              <span className="text-3xl md:text-4xl font-black">:</span>
              <span className="text-4xl md:text-6xl font-display font-black text-white">{restDisplay.s}</span>
            </div>

            <div className="flex justify-center">
              <BrutalButton
                variant="accent"
                icon="play_arrow"
                onClick={() => endRest(restingTask.id)}
              >
                Kết thúc nghỉ
              </BrutalButton>
            </div>
          </div>
        </section>
      )}

      {/* Task List */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-display uppercase">Task chờ</h3>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-10 h-10 border-2 border-white bg-neo-lime text-black hover:bg-white flex items-center justify-center transition-all shadow-[3px_3px_0px_0px_#ffffff]"
          >
            <Icon name="add" size={24} />
          </button>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="border-2 border-dashed border-neutral-600 p-8 text-center">
            <p className="font-mono text-gray-500">Chưa có task nào. Bấm + để thêm mới.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map(task => (
              <div
                key={task.id}
                className="bg-neutral-900 border-2 border-neutral-700 p-4 flex items-center justify-between group hover:border-white transition-all"
              >
                <div className="flex-1">
                  {editingTaskId === task.id ? (
                    <input
                      type="text"
                      defaultValue={task.title}
                      autoFocus
                      onBlur={(e) => {
                        updateTask(task.id, { title: e.target.value });
                        setEditingTaskId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateTask(task.id, { title: (e.target as HTMLInputElement).value });
                          setEditingTaskId(null);
                        }
                        if (e.key === 'Escape') setEditingTaskId(null);
                      }}
                      className="bg-transparent border-b-2 border-neo-lime text-white font-mono w-full focus:outline-none"
                    />
                  ) : (
                    <span className="font-mono">{task.title}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 transition-opacity">
                  <button
                    onClick={() => setEditingTaskId(task.id)}
                    className="w-8 h-8 border border-neutral-600 hover:border-white hover:bg-white hover:text-black flex items-center justify-center transition-all"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="w-8 h-8 border border-neutral-600 hover:border-neo-red hover:bg-neo-red flex items-center justify-center transition-all"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                  <button
                    onClick={() => startTask(task.id)}
                    disabled={!!activeTask}
                    className="w-8 h-8 border border-neo-lime bg-neo-lime text-black hover:bg-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Icon name="play_arrow" size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Completed Tasks History */}
      {completedTasks.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-display uppercase">Lịch sử</h3>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {completedTasks.map(task => (
              <div key={task.id} className="border-2 border-neutral-600 p-4 bg-neutral-800">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-display font-bold uppercase text-white">{task.title}</h4>
                  {task.rating && (
                    <span className="font-mono text-xs bg-neo-lime text-black px-2 py-1 border border-neo-lime font-bold">
                      {task.rating}/10
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-mono text-gray-400 mb-2">
                  {task.startTime && (
                    <span>{formatTime(task.startTime)} → {task.endTime ? formatTime(task.endTime) : '--:--'}</span>
                  )}
                  <span className="bg-neo-blue text-white px-2">{formatDuration(task.duration)}</span>
                  {task.restDuration > 0 && (
                    <span className="bg-neutral-600 text-white px-2">Nghỉ: {formatDuration(task.restDuration)}</span>
                  )}
                </div>

                {task.logs.length > 0 && (
                  <div className="text-sm text-gray-300 mb-1">
                    <span className="font-bold text-neo-lime">Log:</span> {task.logs.join(' • ')}
                  </div>
                )}

                {task.notes && (
                  <div className="text-sm text-gray-400 italic">
                    {task.notes}
                  </div>
                )}

                {task.status === 'completed' && task.endTime && !task.restStartTime && (
                  <button
                    onClick={() => startRest(task.id)}
                    className="mt-3 font-mono text-xs uppercase bg-neo-blue text-white px-3 py-1 border border-neo-blue hover:bg-blue-600 transition-all"
                  >
                    Bắt đầu nghỉ
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border-4 border-white w-full max-w-md p-6">
            <h3 className="text-xl font-display uppercase mb-4">Thêm Task Mới</h3>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Nhập tên task..."
              autoFocus
              className="w-full bg-neutral-800 border-2 border-neutral-600 p-3 text-white font-mono focus:outline-none focus:border-neo-lime mb-4"
            />
            <div className="flex gap-3">
              <BrutalButton variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                Hủy
              </BrutalButton>
              <BrutalButton variant="accent" onClick={addTask}>
                Thêm
              </BrutalButton>
            </div>
          </div>
        </div>
      )}

      {/* Complete Task Dialog */}
      {completingTaskId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border-4 border-neo-lime w-full max-w-lg p-6">
            <h3 className="text-xl font-display uppercase mb-2">🎉 Hoàn thành Task</h3>
            <p className="font-mono text-sm text-gray-400 mb-6">
              Thời gian: {formatDuration(elapsedTime)}
            </p>

            {/* Log */}
            <div className="mb-4">
              <label className="font-mono text-xs uppercase text-gray-400 mb-2 block">
                Bạn đã làm gì?
              </label>
              <textarea
                value={completeLog}
                onChange={(e) => setCompleteLog(e.target.value)}
                placeholder="Mô tả công việc đã thực hiện..."
                className="w-full bg-neutral-800 border-2 border-neutral-600 p-3 text-white font-mono focus:outline-none focus:border-neo-lime h-20 resize-none"
              />
            </div>

            {/* Rating */}
            <div className="mb-4">
              <label className="font-mono text-xs uppercase text-gray-400 mb-2 block">
                Đánh giá hiệu quả: {completeRating}/10
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setCompleteRating(n)}
                    className={`w-8 h-8 border-2 font-mono font-bold transition-all ${n <= completeRating
                      ? 'bg-neo-lime border-neo-lime text-black'
                      : 'border-neutral-600 text-neutral-600 hover:border-white hover:text-white'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="font-mono text-xs uppercase text-gray-400 mb-2 block">
                Ghi chú (tùy chọn)
              </label>
              <input
                type="text"
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Cảm nhận, khó khăn, cải thiện..."
                className="w-full bg-neutral-800 border-2 border-neutral-600 p-3 text-white font-mono focus:outline-none focus:border-neo-lime"
              />
            </div>

            <div className="flex gap-3">
              <BrutalButton
                variant="secondary"
                onClick={() => setCompletingTaskId(null)}
              >
                Tiếp tục làm
              </BrutalButton>
              <BrutalButton variant="accent" onClick={completeTask}>
                Hoàn thành
              </BrutalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};