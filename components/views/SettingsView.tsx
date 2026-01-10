import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Icon } from '../ui/Icon';
import { BrutalCard } from '../ui/BrutalComponents';
import { FocusTask } from '../../types';

const FOCUS_TASKS_STORAGE_KEY = 'bovanav2_focus_tasks';

// Helper để lấy Focus Tasks từ localStorage
const getFocusTasks = (): FocusTask[] => {
  try {
    const saved = localStorage.getItem(FOCUS_TASKS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Helper để lưu Focus Tasks vào localStorage
const setFocusTasks = (tasks: FocusTask[]) => {
  localStorage.setItem(FOCUS_TASKS_STORAGE_KEY, JSON.stringify(tasks));
};

export const SettingsView: React.FC = () => {
  const {
    goals, habits, journalEntries,
    importDataFromJSON, importGoalsCSV, importHabitsCSV, importJournalCSV,
    exportDataToJSON, exportGoalsCSV, exportHabitsCSV, exportJournalCSV, exportMilestonesCSV
  } = useApp();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'json' | 'goals' | 'habits' | 'journal' | 'focus' | null>(null);

  // State cho Focus Tasks count (trigger re-render khi import)
  const [focusTasksCount, setFocusTasksCount] = useState(() => getFocusTasks().length);

  // Export handlers - use context functions
  const handleExportJSON = () => {
    try {
      exportDataToJSON();
      showToast('Đã xuất file JSON thành công!', 'success');
    } catch (error) {
      showToast('Lỗi khi xuất file JSON', 'error');
    }
  };

  const handleExportGoalsCSV = () => {
    try {
      exportGoalsCSV();
      showToast('Đã xuất Goals CSV thành công!', 'success');
    } catch (error) {
      showToast('Lỗi khi xuất Goals CSV', 'error');
    }
  };

  const handleExportHabitsCSV = () => {
    try {
      exportHabitsCSV();
      showToast('Đã xuất Habits CSV thành công!', 'success');
    } catch (error) {
      showToast('Lỗi khi xuất Habits CSV', 'error');
    }
  };

  const handleExportJournalCSV = () => {
    try {
      exportJournalCSV();
      showToast('Đã xuất Journal CSV thành công!', 'success');
    } catch (error) {
      showToast('Lỗi khi xuất Journal CSV', 'error');
    }
  };

  const handleExportMilestonesCSV = () => {
    try {
      exportMilestonesCSV();
      showToast('Đã xuất Milestones CSV thành công!', 'success');
    } catch (error) {
      showToast('Lỗi khi xuất Milestones CSV', 'error');
    }
  };

  // Export Focus Tasks
  const handleExportFocusCSV = () => {
    try {
      const tasks = getFocusTasks();
      if (tasks.length === 0) {
        showToast('Không có Focus Task nào để xuất', 'warning');
        return;
      }

      // CSV header
      const headers = ['ID', 'Tiêu đề', 'Trạng thái', 'Bắt đầu', 'Kết thúc', 'Thời lượng (phút)', 'Đánh giá', 'Log', 'Ghi chú', 'Nghỉ (phút)'];
      const rows = tasks.map(t => [
        t.id,
        t.title,
        t.status,
        t.startTime ? new Date(t.startTime).toLocaleString('vi-VN') : '',
        t.endTime ? new Date(t.endTime).toLocaleString('vi-VN') : '',
        Math.round(t.duration / 60000),
        t.rating || '',
        t.logs.join(' | '),
        t.notes,
        Math.round(t.restDuration / 60000)
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focus_tasks_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      showToast(`Đã xuất ${tasks.length} Focus Tasks!`, 'success');
    } catch (error) {
      showToast('Lỗi khi xuất Focus Tasks', 'error');
    }
  };

  // Import handlers
  const triggerImport = (mode: 'json' | 'goals' | 'habits' | 'journal' | 'focus') => {
    setImportMode(mode);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importMode) return;

    try {
      let result;

      switch (importMode) {
        case 'json':
          result = await importDataFromJSON(file);
          if (result.success && result.data) {
            showToast(`Đã import ${result.data.goals.length} goals, ${result.data.habits.length} habits, ${result.data.journalEntries.length} journal entries!`, 'success');
          }
          break;

        case 'goals':
          result = await importGoalsCSV(file);
          if (result.success && result.data) {
            showToast(`Đã import ${result.data.goals.length} goals!`, 'success');
          }
          break;

        case 'habits':
          result = await importHabitsCSV(file);
          if (result.success && result.data) {
            showToast(`Đã import ${result.data.habits.length} habits!`, 'success');
          }
          break;

        case 'journal':
          result = await importJournalCSV(file);
          if (result.success && result.data) {
            showToast(`Đã import ${result.data.journalEntries.length} journal entries!`, 'success');
          }
          break;

        case 'focus':
          // Import Focus Tasks from JSON
          const text = await file.text();
          try {
            const imported = JSON.parse(text) as FocusTask[];
            if (Array.isArray(imported)) {
              const existing = getFocusTasks();
              const merged = [...imported, ...existing];
              setFocusTasks(merged);
              setFocusTasksCount(merged.length);
              showToast(`Đã import ${imported.length} Focus Tasks!`, 'success');
              result = { success: true };
            } else {
              result = { success: false, message: 'File không hợp lệ' };
            }
          } catch {
            result = { success: false, message: 'Lỗi parse JSON Focus Tasks' };
          }
          break;
      }

      if (result && !result.success) {
        showToast(result.message || 'Lỗi khi import file', 'error');
      }
    } catch (error) {
      showToast('Lỗi khi import file', 'error');
    }

    // Reset
    setImportMode(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-4 border-neo-black bg-white p-6 shadow-hard">
        <h1 className="text-3xl font-display font-black uppercase flex items-center gap-3">
          <Icon name="settings" size={32} />
          Cài đặt
        </h1>
        <p className="text-gray-600 mt-2 font-mono">Quản lý dữ liệu và cấu hình ứng dụng</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Export Section */}
      <BrutalCard
        title={
          <span className="flex items-center gap-2">
            <Icon name="download" size={20} />
            Xuất dữ liệu (Export)
          </span>
        }
        collapsible
        defaultCollapsed
      >
        <p className="font-mono text-sm text-gray-600 mb-4">
          Tải xuống dữ liệu của bạn dưới dạng file JSON hoặc CSV để backup.
        </p>

        {/* Export All JSON */}
        <button
          onClick={handleExportJSON}
          className="w-full p-4 border-4 border-neo-black bg-neo-yellow hover:bg-neo-orange transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1 flex items-center gap-3 mb-4"
        >
          <Icon name="file_download" size={24} />
          <div className="text-left">
            <div className="font-bold uppercase">Xuất tất cả (JSON)</div>
            <div className="text-sm font-mono text-gray-700">Goals, Habits, Journal - 1 file backup</div>
          </div>
        </button>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={handleExportGoalsCSV}
            className="p-4 border-4 border-neo-black bg-white hover:bg-neo-blue hover:text-white transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Icon name="flag" size={20} />
            <div className="font-bold uppercase mt-2">Goals CSV</div>
            <div className="text-xs font-mono">{goals.length} mục tiêu</div>
          </button>

          <button
            onClick={handleExportHabitsCSV}
            className="p-4 border-4 border-neo-black bg-white hover:bg-neo-purple hover:text-white transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Icon name="check_box" size={20} />
            <div className="font-bold uppercase mt-2">Habits CSV</div>
            <div className="text-xs font-mono">{habits.length} thói quen</div>
          </button>

          <button
            onClick={handleExportJournalCSV}
            className="p-4 border-4 border-neo-black bg-white hover:bg-neo-pink transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Icon name="book" size={20} />
            <div className="font-bold uppercase mt-2">Journal CSV</div>
            <div className="text-xs font-mono">{journalEntries.length} bài viết</div>
          </button>

          <button
            onClick={handleExportMilestonesCSV}
            className="p-4 border-4 border-neo-black bg-white hover:bg-neo-orange transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Icon name="task_alt" size={20} />
            <div className="font-bold uppercase mt-2">Milestones CSV</div>
            <div className="text-xs font-mono">Từ {goals.length} goals</div>
          </button>

          <button
            onClick={handleExportFocusCSV}
            className="p-4 border-4 border-neo-black bg-white hover:bg-neo-lime transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Icon name="timer" size={20} />
            <div className="font-bold uppercase mt-2">Focus Tasks</div>
            <div className="text-xs font-mono">{focusTasksCount} phiên</div>
          </button>
        </div>
      </BrutalCard>

      {/* Import Section */}
      <BrutalCard
        title={
          <span className="flex items-center gap-2">
            <Icon name="upload" size={20} />
            Nhập dữ liệu (Import)
          </span>
        }
        collapsible
        defaultCollapsed
      >
        <p className="font-mono text-sm text-gray-600 mb-4">
          Khôi phục dữ liệu từ file backup hoặc nhập từ Excel/CSV.
        </p>

        <button
          onClick={() => triggerImport('json')}
          className="w-full p-4 border-4 border-neo-black bg-neo-lime hover:bg-neo-yellow transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1 flex items-center gap-3 mb-4"
        >
          <Icon name="file_upload" size={24} />
          <div className="text-left">
            <div className="font-bold uppercase">Nhập từ JSON</div>
            <div className="text-sm font-mono text-gray-700">Khôi phục từ file backup đầy đủ</div>
          </div>
        </button>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => triggerImport('goals')}
            className="p-4 border-4 border-neo-black bg-white hover:bg-gray-100 transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Icon name="flag" size={20} />
            <div className="font-bold uppercase mt-2 text-sm">Import Goals</div>
          </button>

          <button
            onClick={() => triggerImport('habits')}
            className="p-4 border-4 border-neo-black bg-white hover:bg-gray-100 transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Icon name="check_box" size={20} />
            <div className="font-bold uppercase mt-2 text-sm">Import Habits</div>
          </button>

          <button
            onClick={() => triggerImport('journal')}
            className="p-4 border-4 border-neo-black bg-white hover:bg-gray-100 transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Icon name="book" size={20} />
            <div className="font-bold uppercase mt-2 text-sm">Import Journal</div>
          </button>

          <button
            onClick={() => triggerImport('focus')}
            className="p-4 border-4 border-neo-black bg-white hover:bg-neo-lime transition-colors shadow-hard hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <Icon name="timer" size={20} />
            <div className="font-bold uppercase mt-2 text-sm">Import Focus</div>
          </button>
        </div>
      </BrutalCard>

      {/* Data Stats */}
      <BrutalCard
        title={
          <span className="flex items-center gap-2">
            <Icon name="analytics" size={20} />
            Thống kê dữ liệu
          </span>
        }
        collapsible
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-sm">
          <div className="bg-gray-50 p-4 border-2 border-neo-black">
            <div className="text-2xl font-bold text-neo-blue">{goals.length}</div>
            <div>Mục tiêu</div>
          </div>
          <div className="bg-gray-50 p-4 border-2 border-neo-black">
            <div className="text-2xl font-bold text-neo-purple">{habits.length}</div>
            <div>Thói quen</div>
          </div>
          <div className="bg-gray-50 p-4 border-2 border-neo-black">
            <div className="text-2xl font-bold text-neo-pink">{journalEntries.length}</div>
            <div>Nhật ký</div>
          </div>
          <div className="bg-gray-50 p-4 border-2 border-neo-black">
            <div className="text-2xl font-bold text-neo-lime">{focusTasksCount}</div>
            <div>Focus Tasks</div>
          </div>
        </div>
      </BrutalCard>
    </div>
  );
};

