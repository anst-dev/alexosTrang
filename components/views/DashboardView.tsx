import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BrutalCard, ProgressBar } from '../ui/BrutalComponents';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../ui/Icon';
import { InputModal } from '../ui/Modal';
import { formatDeadlineDisplay, getDaysLeft } from '../../types';
import { QuickNoteSection } from './QuickNoteSection';

// API URL để lấy danh sách log
const GET_ALL_LOGS_URL = 'https://unsupercilious-leonarda-unreaving.ngrok-free.dev/webhook/GetAllLogTrang';
// Flag để enable/disable API calls
const ENABLE_QUICK_NOTE_API = true;

// Interface cho log entry từ API
interface LogEntry {
  row_number?: number;
  'Từ'?: string;
  'Thời gian'?: string;
  'nội dung'?: string;
  topic?: string;
  Category?: string;
  sentiment?: string;
  summary?: string;
  'Giờ'?: string;
  'Phút'?: string;
  'Ngày '?: string;
  'Tháng '?: string;
  'Năm'?: string;
  'Tuần'?: number;
  [key: string]: any;
}

// Nhóm logs theo ngày
interface GroupedLogs {
  date: string;
  dateLabel: string;
  logs: LogEntry[];
}

// Hàm format thời gian từ ISO string sang HH:mm
const formatTime = (isoString?: string): string => {
  if (!isoString) return '--:--';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

// Hàm tính thời lượng giữa 2 thời gian (trả về chuỗi như "1h 30m")
const calculateDuration = (fromIso?: string, toIso?: string): string => {
  if (!fromIso || !toIso) return '';
  try {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    const diffMs = to.getTime() - from.getTime();
    if (diffMs <= 0) return '';

    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  } catch {
    return '';
  }
};

// Hàm lấy thời gian "Từ" - nếu không có thì lấy từ row trước đó (row_number - 1)
const getFromTime = (log: LogEntry, allLogs: LogEntry[]): string | undefined => {
  // Nếu đã có "Từ" thì dùng luôn
  if (log['Từ']) return log['Từ'];

  // Tìm row có row_number = current_row_number - 1
  const currentRowNumber = log.row_number;
  if (currentRowNumber === undefined || currentRowNumber <= 1) return undefined;

  const prevLog = allLogs.find(l => l.row_number === currentRowNumber - 1);
  return prevLog?.['Thời gian'];
};

// Hàm nhóm logs theo ngày - sử dụng cột "Thời gian" để chia ngày
const groupLogsByDate = (logs: LogEntry[]): GroupedLogs[] => {
  const groups: Record<string, LogEntry[]> = {};

  logs.forEach(log => {
    // Nhiệm vụ 4: Chia ngày theo cột "Thời gian"
    const thoiGian = log['Thời gian'];

    if (thoiGian) {
      try {
        const date = new Date(thoiGian);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(log);
      } catch {
        // Fallback nếu không parse được
        const unknownKey = 'unknown';
        if (!groups[unknownKey]) {
          groups[unknownKey] = [];
        }
        groups[unknownKey].push(log);
      }
    }
    // Không thêm log nếu không có "Thời gian"
  });

  // Sắp xếp theo ngày mới nhất
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, logs]) => {
      let dateLabel = 'Không xác định';
      if (dateKey !== 'unknown') {
        const [year, month, day] = dateKey.split('-');
        dateLabel = `${day}/${month}/${year}`;
      }
      // Sắp xếp logs trong ngày theo thời gian mới nhất
      const sortedLogs = logs.sort((a, b) => {
        const timeA = a['Thời gian'] || '';
        const timeB = b['Thời gian'] || '';
        return timeB.localeCompare(timeA);
      });
      return { date: dateKey, dateLabel, logs: sortedLogs };
    });
};

export const DashboardView: React.FC = () => {
  const {
    goals,
    habits,
    toggleHabit,
    addHabit,
    toggleMilestone,
    upcomingDeadlines,
    categoryProgress,
    addMilestone,
  } = useApp();
  const { showToast } = useToast();

  const [brainDumpText, setBrainDumpText] = useState('');
  const [selectedGoalForTask, setSelectedGoalForTask] = useState<string | null>(null);

  // Modal state for adding new habit
  const [isAddHabitModalOpen, setIsAddHabitModalOpen] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Lấy ngày hiện tại để so sánh
  const todayDateKey = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // State để quản lý mở rộng các nhóm ngày (mặc định chỉ ngày hiện tại mở)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set([todayDateKey]));

  // Toggle thu nhỏ/mở rộng nhóm ngày
  const toggleDayExpand = useCallback((dateKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  }, []);

  // Copy toàn bộ notes của một ngày
  const copyDayNotes = useCallback((group: GroupedLogs) => {
    const text = group.logs.map(log => {
      const fromTimeValue = getFromTime(log, logs);
      const fromTime = formatTime(fromTimeValue);
      const toTime = formatTime(log['Thời gian']);
      const content = log['nội dung'] || '';
      const timeStr = toTime !== '--:--' ? `${fromTime} → ${toTime}` : fromTime;
      return `${timeStr}: ${content}`;
    }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      showToast(`Đã copy ${group.logs.length} ghi chú ngày ${group.dateLabel}!`, 'success');
    }).catch(() => {
      showToast('Lỗi khi copy!', 'error');
    });
  }, [showToast, logs]);

  // Copy một log đơn lẻ
  const copySingleLog = useCallback((log: LogEntry) => {
    const fromTimeValue = getFromTime(log, logs);
    const fromTime = formatTime(fromTimeValue);
    const toTime = formatTime(log['Thời gian']);
    const content = log['nội dung'] || '';
    const timeStr = toTime !== '--:--' ? `${fromTime} → ${toTime}` : fromTime;
    const text = `${timeStr}: ${content}`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Đã copy ghi chú!', 'success');
    }).catch(() => {
      showToast('Lỗi khi copy!', 'error');
    });
  }, [showToast, logs]);

  // Fetch logs từ API - Tắt tạm thời
  const fetchLogs = useCallback(async () => {
    if (!ENABLE_QUICK_NOTE_API || !GET_ALL_LOGS_URL) {
      setIsLoadingLogs(false);
      return;
    }
    setIsLoadingLogs(true);
    try {
      const response = await fetch(GET_ALL_LOGS_URL, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // API trả về array of objects
        setLogs(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách log:', error);
      showToast('Không thể tải danh sách ghi chú!', 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  }, [showToast]);

  // Fetch logs khi component mount - Tắt tạm thời
  useEffect(() => {
    if (ENABLE_QUICK_NOTE_API) {
      fetchLogs();
    }
  }, [fetchLogs]);



  // Xin quyền thông báo và thiết lập nhắc nhở mỗi giờ vào phút 50
  useEffect(() => {
    // Xin quyền thông báo
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Hàm hiển thị thông báo
    const showNotification = () => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('📝 Ghi Chú Nhanh', {
          body: 'Đã 1 tiếng rồi, bạn có gì muốn ghi lại không?',
          icon: '/pwa-192x192.png',
          tag: 'quick-note-reminder',
        });
      }
    };

    // Tính thời gian đến phút 50 tiếp theo
    const scheduleNextNotification = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const milliseconds = now.getMilliseconds();

      let minutesToWait: number;
      if (minutes < 50) {
        minutesToWait = 50 - minutes;
      } else {
        minutesToWait = 60 - minutes + 50; // Đợi đến phút 50 giờ tiếp theo
      }

      const msToWait = (minutesToWait * 60 - seconds) * 1000 - milliseconds;

      return setTimeout(() => {
        showNotification();
        // Lập lịch cho giờ tiếp theo (60 phút)
        const hourlyInterval = setInterval(showNotification, 60 * 60 * 1000);
        // Lưu interval để cleanup
        (window as any).__quickNoteInterval = hourlyInterval;
      }, msToWait);
    };

    const timeoutId = scheduleNextNotification();

    return () => {
      clearTimeout(timeoutId);
      if ((window as any).__quickNoteInterval) {
        clearInterval((window as any).__quickNoteInterval);
      }
    };
  }, []);

  // Tính toán tiến độ ngày từ habits
  const completedHabits = habits.filter(h => h.completedToday).length;
  const totalHabits = habits.length;
  const progressPercentage = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

  // Lấy các milestone chưa hoàn thành sắp đến hạn - "3 Việc Lớn" hôm nay
  const todayPriorities = useMemo(() => {
    const priorities: Array<{
      goalId: string;
      goalTitle: string;
      milestoneId: string;
      milestoneTitle: string;
      completed: boolean;
      daysLeft: number;
      colorClass: string;
    }> = [];

    goals.forEach(goal => {
      goal.milestones.forEach(m => {
        if (!m.completed) {
          const daysLeft = m.dueDate ? getDaysLeft(m.dueDate) : Infinity;
          // Ưu tiên các task sắp đến hạn hoặc quá hạn
          if (daysLeft <= 7) {
            priorities.push({
              goalId: goal.id,
              goalTitle: goal.title,
              milestoneId: m.id,
              milestoneTitle: m.title,
              completed: m.completed,
              daysLeft,
              colorClass: goal.colorClass,
            });
          }
        }
      });

      // Nếu goal có ít milestone, thêm goal chính vào priorities
      if (goal.milestones.length === 0 && goal.progress < 100) {
        const daysLeft = getDaysLeft(goal.deadline);
        if (daysLeft <= 14) {
          priorities.push({
            goalId: goal.id,
            goalTitle: goal.title,
            milestoneId: '',
            milestoneTitle: `Hoàn thành: ${goal.title}`,
            completed: goal.progress >= 100,
            daysLeft,
            colorClass: goal.colorClass,
          });
        }
      }
    });

    // Sắp xếp: quá hạn trước, rồi theo ngày
    return priorities.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  }, [goals]);

  // Tổng tiến độ goals
  const overallProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const total = goals.reduce((sum, g) => sum + g.progress, 0);
    return Math.round(total / goals.length);
  }, [goals]);

  // Check all today priorities done
  const allPriorityDone = todayPriorities.length > 0 && todayPriorities.every(p => p.completed);

  const handleBrainDump = () => {
    if (brainDumpText.trim() && selectedGoalForTask) {
      addMilestone({ goalId: selectedGoalForTask, title: brainDumpText });
      setBrainDumpText('');
      setSelectedGoalForTask(null);
      showToast('Đã thêm nhiệm vụ vào mục tiêu!', 'success');
    } else if (brainDumpText.trim()) {
      showToast('Vui lòng chọn mục tiêu để gán nhiệm vụ này!', 'warning');
    }
  };

  const handleQuickAddHabit = () => {
    setIsAddHabitModalOpen(true);
  };

  const handleSubmitNewHabit = (name: string) => {
    if (name.trim()) {
      addHabit(name, 'Chung');
      showToast(`Đã thêm thói quen "${name}"!`, 'success');
    }
  };

  const handleTogglePriority = (priority: typeof todayPriorities[0]) => {
    if (priority.milestoneId) {
      toggleMilestone(priority.goalId, priority.milestoneId);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 border-b-4 border-neo-black pb-8">
        <div>
          {/* <h1 className="text-6xl md:text-8xl font-display font-black uppercase leading-[0.85] italic mb-4">
            Wake<br />Up.
          </h1> */}
          <div className="inline-flex items-center gap-4 bg-white border-l-4 border-neo-lime pl-4 py-2">
            <span className="font-mono text-xl font-bold uppercase">{today}</span>
            <span className="font-black text-xl">///</span>
            <span className="font-mono text-xl font-bold">CHẾ ĐỘ TẬP TRUNG: BẬT</span>
          </div>
        </div>

        {/* <div className="w-full md:w-80 bg-white border-2 border-neo-black p-4 shadow-hard">
          <div className="flex justify-between items-end mb-2">
            <span className="font-mono text-sm font-bold uppercase">Tiến độ tổng</span>
            <span className="font-display text-2xl font-black">{overallProgress}%</span>
          </div>
          <ProgressBar progress={overallProgress} colorClass="bg-neo-orange" />
          <p className="text-xs font-mono text-gray-500 mt-2">{goals.length} mục tiêu đang theo dõi</p>
        </div> */}
      </header>



      {/* Grid 2 cột cho Ưu tiên hôm nay và Sắp tới */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today Priorities - Từ Milestones của Goals */}
        <section>
          <div className="bg-neo-black text-white p-4 border-4 border-neo-black flex items-center justify-between gap-4 mb-6 shadow-hard">
            <div className="flex items-center gap-4">
              <div className="bg-neo-lime text-black p-1 border-2 border-white animate-pulse">
                <Icon name="priority_high" size={30} />
              </div>
              <div>
                <h2 className="font-display text-2xl lg:text-3xl uppercase leading-none">Ưu tiên hôm nay</h2>
                <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">Nhiệm vụ sắp đến hạn</p>
              </div>
            </div>
          </div>

          {allPriorityDone && (
            <div className="mb-6 p-4 border-4 border-dashed border-neo-black bg-neo-yellow text-center font-mono font-bold uppercase animate-bounce">
              Tuyệt vời! Đã xong việc quan trọng!
            </div>
          )}

          <div className="grid gap-4">
            {todayPriorities.length === 0 ? (
              <div className="p-8 border-4 border-dashed border-neo-black text-center font-mono text-gray-500">
                Không có nhiệm vụ nào sắp đến hạn. Hãy thêm milestones vào mục tiêu!
              </div>
            ) : (
              todayPriorities.map((item, idx) => {
                const isOverdue = item.daysLeft < 0;
                const isUrgent = item.daysLeft >= 0 && item.daysLeft <= 2;

                return (
                  <div
                    key={`${item.goalId}-${item.milestoneId}-${idx}`}
                    className={`group flex items-center justify-between p-4 border-4 border-neo-black bg-white shadow-hard transition-all 
                      ${item.completed ? 'opacity-60 bg-gray-100' : 'hover:-translate-y-1 hover:shadow-hard-lg'}
                      ${isOverdue ? 'border-neo-red' : isUrgent ? 'border-neo-orange' : ''}
                    `}
                  >
                    <label className="flex items-center gap-4 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleTogglePriority(item)}
                        disabled={!item.milestoneId}
                        className="appearance-none w-8 h-8 border-4 border-neo-black bg-white checked:bg-neo-black relative cursor-pointer shrink-0 checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-xl checked:after:font-black disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col">
                        <span className={`text-lg lg:text-xl font-display font-black uppercase leading-none ${item.completed ? 'line-through decoration-4 decoration-neo-black' : ''}`}>
                          {item.milestoneTitle}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`font-mono text-[10px] font-bold px-1 w-fit border border-neo-black ${item.colorClass} text-white`}>
                            {item.goalTitle}
                          </span>
                          <span className={`font-mono text-[10px] font-bold ${isOverdue ? 'text-neo-red' : isUrgent ? 'text-neo-orange' : 'text-gray-500'}`}>
                            {item.daysLeft < 0 ? `Quá hạn ${Math.abs(item.daysLeft)} ngày` :
                              item.daysLeft === 0 ? 'Hôm nay' :
                                item.daysLeft === 1 ? 'Ngày mai' : `${item.daysLeft} ngày`}
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </section>

      
      </div>

      {/* Quick Note Section - Ghi Chú Nhanh (Component riêng để tránh re-render) */}
      <QuickNoteSection onNoteSubmitted={fetchLogs} />

      {/* Logs List Section - Danh sách ghi chú nhóm theo ngày */}
      <section className="mb-8">
        <BrutalCard
          collapsible
          title={
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-2">
                <Icon name="history" size={20} />
                Lịch sử ghi chú
              </span>
              <button
                onClick={fetchLogs}
                disabled={isLoadingLogs}
                className="w-8 h-8 border-2 border-neo-black bg-neo-lime hover:bg-black hover:text-white flex items-center justify-center transition-all shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
                title="Tải lại"
              >
                <Icon name={isLoadingLogs ? "hourglass_empty" : "refresh"} size={16} className={isLoadingLogs ? "animate-spin" : ""} />
              </button>
            </div>
          }
        >
          {isLoadingLogs ? (
            <div className="text-center py-8 font-mono text-gray-500">
              <span className="animate-pulse">Đang tải...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 font-mono text-gray-500">
              Chưa có ghi chú nào.
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto overflow-x-hidden min-w-0">
              {groupLogsByDate(logs).map((group) => {
                const isExpanded = expandedDays.has(group.date);

                return (
                  <div key={group.date} className="border-2 border-neo-black min-w-0">
                    {/* Header ngày - có thể click để thu nhỏ/mở rộng */}
                    <div className="bg-neo-black text-white px-4 py-2 font-mono font-bold uppercase flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleDayExpand(group.date)}
                          className="hover:bg-white/20 p-1 rounded transition-all"
                          title={isExpanded ? "Thu nhỏ" : "Mở rộng"}
                        >
                          <Icon name={isExpanded ? "expand_less" : "expand_more"} size={16} />
                        </button>
                        <Icon name="calendar_today" size={16} />
                        <span>{group.dateLabel}</span>
                        <span className="text-neo-lime text-xs">({group.logs.length} ghi chú)</span>
                      </div>
                      <button
                        onClick={() => copyDayNotes(group)}
                        className="hover:bg-white/20 p-1 rounded transition-all"
                        title="Copy toàn bộ ghi chú ngày này"
                      >
                        <Icon name="copy" size={16} />
                      </button>
                    </div>
                    {/* Logs trong ngày - ẩn nếu không expanded */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-200 min-w-0">
                        {group.logs.map((log, index) => {
                          const fromTimeValue = getFromTime(log, logs);
                          const fromTime = formatTime(fromTimeValue);
                          const toTime = formatTime(log['Thời gian']);
                          const content = log['nội dung'] || '';
                          const showFromTime = fromTime !== '--:--';
                          const duration = calculateDuration(fromTimeValue, log['Thời gian']);
                          const topic = log.topic || '';
                          const category = log.Category || '';

                          return (
                            <div
                              key={`${group.date}-${index}`}
                              className="px-4 py-2 bg-white hover:bg-gray-50 transition-all min-w-0 group/item"
                            >
                              {/* Thời gian: Từ → Đến + Duration + Topic + Category */}
                              <div className="flex items-center gap-1 flex-wrap mb-1">
                                {showFromTime && (
                                  <span className="font-mono text-xs bg-neo-lime px-2 py-0.5 border border-neo-black font-bold">
                                    {fromTime}
                                  </span>
                                )}
                                {showFromTime && (
                                  <span className="font-mono text-xs text-gray-400">→</span>
                                )}
                                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 border border-neo-black">
                                  {toTime}
                                </span>
                                {/* Hiển thị thời lượng */}
                                {duration && (
                                  <span className="font-mono text-xs bg-neo-blue text-white px-2 py-0.5 border border-neo-black font-bold">
                                    {duration}
                                  </span>
                                )}
                                {/* Hiển thị Topic */}
                                {topic && (
                                  <span className="font-mono text-xs bg-neo-orange text-white px-2 py-0.5 border border-neo-black font-bold">
                                    {topic}
                                  </span>
                                )}
                                {/* Hiển thị Category */}
                                {category && (
                                  <span className="font-mono text-xs bg-neo-purple text-white px-2 py-0.5 border border-neo-black font-bold">
                                    {category}
                                  </span>
                                )}
                                {/* Nút Copy */}
                                <button
                                  onClick={() => copySingleLog(log)}
                                  className="ml-auto opacity-0 group-hover/item:opacity-100 hover:bg-neo-lime p-1 rounded transition-all border border-transparent hover:border-neo-black"
                                  title="Copy ghi chú này"
                                >
                                  <Icon name="content_copy" size={14} />
                                </button>
                              </div>
                              {/* Nội dung - xuống dòng trên mobile */}
                              <p className="font-mono text-sm whitespace-pre-wrap break-all">{content}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </BrutalCard>
      </section>

  {/* Upcoming Deadlines Quick View */}
        <section>
          <BrutalCard title="Sắp tới" icon="calendar_today" collapsible>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingDeadlines.slice(0, 4).map((item, i) => {
                const isOverdue = item.daysLeft < 0;
                const isUrgent = item.daysLeft >= 0 && item.daysLeft <= 3;

                return (
                  <div
                    key={i}
                    className={`p-4 border-2 border-neo-black ${isOverdue ? 'bg-red-50 border-neo-red' : isUrgent ? 'bg-orange-50 border-neo-orange' : 'bg-white'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name={item.type === 'goal' ? 'flag' : 'check_circle'} size={16} />
                      <span className={`font-mono text-xs font-bold ${isOverdue ? 'text-neo-red' : isUrgent ? 'text-neo-orange' : 'text-gray-500'}`}>
                        {formatDeadlineDisplay(item.deadline)}
                      </span>
                    </div>
                    <p className="font-bold text-sm uppercase truncate">
                      {item.type === 'milestone' ? item.milestoneTitle : item.goalTitle}
                    </p>
                    {item.type === 'milestone' && (
                      <p className="text-xs text-gray-500 truncate">{item.goalTitle}</p>
                    )}
                  </div>
                );
              })}
              {upcomingDeadlines.length === 0 && (
                <p className="col-span-2 text-center font-mono text-gray-500 py-4">Không có deadline sắp tới</p>
              )}
            </div>
          </BrutalCard>
        </section>
        
      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        {/* Daily Routine Summary */}
        <div className="bg-white border-4 border-neo-black shadow-hard flex flex-col h-full">
          <div className="border-b-4 border-neo-black p-4 bg-gray-50 flex items-center justify-between">
            <h3 className="text-xl font-display uppercase tracking-tight flex items-center gap-3">
              <Icon name="bolt" size={20} />
              Thói quen ngày
            </h3>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold">{completedHabits}/{totalHabits}</span>
              <button
                onClick={handleQuickAddHabit}
                className="w-8 h-8 border-2 border-neo-black bg-neo-lime hover:bg-black hover:text-white flex items-center justify-center transition-all shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                title="Thêm nhanh thói quen"
              >
                <Icon name="add" size={18} />
              </button>
            </div>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            {habits.slice(0, 5).map((habit) => (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`flex flex-col items-center justify-center p-6 border-2 border-neo-black transition-all shadow-hard active:shadow-none active:translate-x-1 active:translate-y-1
                  ${habit.completedToday ? 'bg-neo-blue text-white' : 'hover:bg-gray-100'}
                `}
              >
                <Icon name={habit.completedToday ? 'check_circle' : 'check'} size={36} className="mb-2" />
                <span className="font-mono font-bold uppercase text-center text-sm">{habit.name}</span>
              </button>
            ))}
            {habits.length === 0 && <p className="col-span-2 text-center font-mono text-sm text-gray-500">Chưa có thói quen.</p>}
          </div>
        </div>

        {/* Brain Dump -> Add Task to Goal */}
        <div className="bg-neo-black border-4 border-neo-black shadow-hard-lg flex flex-col">
          <div className="p-4 border-b-4 border-white flex items-center gap-3">
            <Icon name="psychology" size={30} className="text-neo-lime" />
            <h3 className="text-white font-display text-2xl uppercase">Thêm nhiệm vụ nhanh</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            {/* Goal Selector */}
            <div>
              <label className="text-white text-sm font-mono uppercase mb-2 block">Chọn mục tiêu:</label>
              <select
                value={selectedGoalForTask || ''}
                onChange={(e) => setSelectedGoalForTask(e.target.value || null)}
                className="w-full bg-gray-900 border-2 border-white p-3 text-white font-mono focus:outline-none focus:border-neo-lime"
              >
                <option value="">-- Chọn mục tiêu --</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>

            <textarea
              value={brainDumpText}
              onChange={(e) => setBrainDumpText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleBrainDump() }}
              className="w-full h-32 bg-gray-900 border-2 border-white p-4 text-white font-mono placeholder-gray-600 focus:outline-none focus:border-neo-lime resize-none"
              placeholder="// NHẬP NHIỆM VỤ MỚI... (CMD + ENTER ĐỂ LƯU)"
            ></textarea>
            <button
              onClick={handleBrainDump}
              disabled={!selectedGoalForTask || !brainDumpText.trim()}
              className="w-full py-4 bg-neo-lime border-2 border-white font-black uppercase hover:bg-white transition-all shadow-[4px_4px_0px_0px_#ffffff] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Thêm vào mục tiêu
            </button>
          </div>
        </div>
      </div>


      {/* Add Habit Modal */}
      <InputModal
        isOpen={isAddHabitModalOpen}
        onClose={() => setIsAddHabitModalOpen(false)}
        onSubmit={handleSubmitNewHabit}
        title="Thêm thói quen mới"
        placeholder="Nhập tên thói quen..."
        submitLabel="Thêm"
      />
    </div>
  );
};