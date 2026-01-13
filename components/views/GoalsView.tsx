import React, { useState, useCallback } from 'react';
import { BrutalCard, ProgressBar } from '../ui/BrutalComponents';
import { useApp, UpdateGoalDTO } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Modal, FormInput, FormSelect, FormActions, InputModal, FormColorSelect } from '../ui/Modal';
import { Goal, GOAL_CATEGORIES, GoalCategory, formatDeadlineDisplay, getDaysLeft } from '../../types';
import { Icon } from '../ui/Icon';

// Webhook URL cho ghi chú nhanh - ENABLED
const BASE_URL = import.meta.env.VITE_BASE_URL;
const QUICK_NOTE_WEBHOOK_URL = `${BASE_URL}/webhook/logTimeTrang`;

export const GoalsView: React.FC = () => {
  const {
    habits,
    goals,
    updateGoalProgress,
    addGoal,
    deleteGoal,
    updateGoal,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
    upcomingDeadlines,
    categoryProgress,
  } = useApp();
  const { showToast } = useToast();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editProgress, setEditProgress] = useState('0');
  const [editImage, setEditImage] = useState('');
  const [editColor, setEditColor] = useState('');

  // Add Goal Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<GoalCategory>('Sự nghiệp');
  const [newDeadline, setNewDeadline] = useState('');

  // Add Milestone State
  const [addingMilestoneForGoal, setAddingMilestoneForGoal] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  // Progress Update Modal State
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressGoalId, setProgressGoalId] = useState<string | null>(null);
  const [currentProgressValue, setCurrentProgressValue] = useState('0');

  // Quick Note State
  const [quickNote, setQuickNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const colorOptions = ['bg-neo-black', 'bg-neo-blue', 'bg-neo-purple', 'bg-neo-orange', 'bg-neo-lime', 'bg-neo-red'];

  // Lấy các chỉ số chính từ categoryProgress thật
  const lifeStats = [
    { label: 'Sự nghiệp', val: categoryProgress['Sự nghiệp'] || 0, color: 'bg-neo-blue', icon: 'work' },
    { label: 'Sức khỏe', val: categoryProgress['Sức khỏe'] || 0, color: 'bg-neo-red', icon: 'favorite' },
    { label: 'Tài chính', val: categoryProgress['Tài chính'] || 0, color: 'bg-green-500', icon: 'payments' },
    { label: 'Học tập', val: categoryProgress['Học tập'] || 0, color: 'bg-neo-purple', icon: 'school' },
  ];

  const handleUpdateProgress = (id: string, currentProgress: number) => {
    setProgressGoalId(id);
    setCurrentProgressValue(currentProgress.toString());
    setIsProgressModalOpen(true);
  };

  const handleSubmitProgress = (value: string) => {
    if (progressGoalId) {
      const newProgress = parseInt(value);
      if (!isNaN(newProgress) && newProgress >= 0 && newProgress <= 100) {
        updateGoalProgress(progressGoalId, newProgress);
        showToast('Đã cập nhật tiến độ!', 'success');
      } else {
        showToast('Vui lòng nhập số hợp lệ từ 0 đến 100.', 'error');
      }
    }
  };

  const handleAddGoal = () => {
    if (!newTitle.trim()) {
      showToast('Vui lòng nhập tên mục tiêu!', 'warning');
      return;
    }
    if (!newDeadline.trim()) {
      showToast('Vui lòng nhập deadline!', 'warning');
      return;
    }
    addGoal(newTitle, newCategory, newDeadline);
    setNewTitle('');
    setNewCategory('Sự nghiệp');
    setNewDeadline('');
    setIsAddModalOpen(false);
    showToast('Đã thêm mục tiêu mới!', 'success');
  };

  const handleAddMilestone = (goalId: string) => {
    if (!newMilestoneTitle.trim()) return;
    addMilestone({ goalId, title: newMilestoneTitle });
    setNewMilestoneTitle('');
    setAddingMilestoneForGoal(null);
  };

  // Edit handlers
  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditCategory(goal.category);
    setEditDeadline(goal.deadline);
    setEditProgress(goal.progress.toString());
    setEditImage(goal.image);
    setEditColor(goal.colorClass);
    setIsEditModalOpen(true);
  };

  const handleEditSave = () => {
    if (editingGoal && editTitle.trim()) {
      const dto: UpdateGoalDTO = {
        id: editingGoal.id,
        title: editTitle,
        category: editCategory as GoalCategory,
        deadline: editDeadline,
        progress: parseInt(editProgress) || 0,
        image: editImage,
        colorClass: editColor,
      };
      updateGoal(dto);
      setIsEditModalOpen(false);
      setEditingGoal(null);
    }
  };

  // Gửi ghi chú nhanh đến webhook
  const sendQuickNote = useCallback(async () => {
    if (!quickNote.trim()) {
      showToast('Vui lòng nhập ghi chú!', 'warning');
      return;
    }

    setIsSubmittingNote(true);
    try {
      const response = await fetch(QUICK_NOTE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'ngrok-skip-browser-warning': 'true',
        },
        body: quickNote,
      });

      if (response.ok) {
        showToast('Đã ghi lại thành công!', 'success');
        setQuickNote('');
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Lỗi gửi ghi chú:', error);
      showToast('Lỗi khi gửi ghi chú. Vui lòng thử lại!', 'error');
    } finally {
      setIsSubmittingNote(false);
    }
  }, [quickNote, showToast]);

  // Lấy top 5 upcoming deadlines
  const topUpcoming = upcomingDeadlines.slice(0, 5);

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-dashed border-neo-black pb-8">
        <div>
          <h1 className="text-5xl md:text-6xl font-display uppercase tracking-tighter mb-4">Mục tiêu & Tiến độ</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-bold font-mono">
            <span className="bg-white border-2 border-neo-black px-3 py-1 shadow-hard-sm flex items-center gap-2">
              <Icon name="calendar_today" size={18} />
              {new Date().toLocaleDateString('vi-VN')}
            </span>
            <span className="bg-neo-yellow border-2 border-neo-black px-3 py-1 italic">
              "Kiên trì là mã nguồn của thành công."
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Habits & Stats */}
        <div className="lg:col-span-4 space-y-8">
          {/* Thói quen hỗ trợ mục tiêu */}
          <BrutalCard title="Thói quen ngày" icon="bolt" noPadding collapsible>
            <div className="p-4 bg-gray-50 border-b-4 border-neo-black flex justify-between items-center">
              <span className="font-mono font-bold uppercase">Trạng thái</span>
              <span className="bg-neo-black text-white text-xs font-bold px-2 py-1">
                XONG {habits.filter(h => h.completedToday).length}/{habits.length}
              </span>
            </div>
            <div className="p-6 space-y-4">
              {habits.slice(0, 5).map((habit) => (
                <div
                  key={habit.id}
                  className={`flex items-center justify-between p-3 border-2 border-neo-black shadow-hard-sm ${habit.completedToday ? 'bg-gray-100 opacity-60' : 'bg-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 border-2 border-neo-black flex items-center justify-center ${habit.completedToday ? 'bg-neo-black text-white' : 'bg-white'}`}>
                      {habit.completedToday && <Icon name="check" size={14} />}
                    </div>
                    <div>
                      <p className={`font-bold uppercase text-sm ${habit.completedToday && 'line-through'}`}>{habit.name}</p>
                      <p className="font-mono text-xs text-gray-500">{habit.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-black">{habit.streak}</span>
                    <span className="text-[10px] font-mono uppercase text-gray-500">Chuỗi</span>
                  </div>
                </div>
              ))}
              {habits.length === 0 && <p className="text-sm font-mono text-gray-500">Chưa có thói quen.</p>}
            </div>
          </BrutalCard>

          {/* Chỉ số cuộc sống - Tính từ goals thật */}
          <BrutalCard title="Tiến độ theo danh mục" icon="emoji_events" collapsible>
            <div className="space-y-6">
              {lifeStats.map((stat, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold uppercase mb-2">
                    <span className="flex items-center gap-2">
                      <Icon name={stat.icon} size={14} />
                      {stat.label}
                    </span>
                    <span>{stat.val}%</span>
                  </div>
                  <ProgressBar progress={stat.val} colorClass={stat.color} heightClass="h-4" />
                </div>
              ))}
            </div>
          </BrutalCard>
        </div>

        {/* Middle Column: Projects/Goals */}
        <div className="lg:col-span-5 space-y-8">
          <div className="flex items-center justify-between border-b-2 border-neo-black pb-2">
            <h3 className="text-xl font-display uppercase">Mục tiêu đang chạy</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1 text-xs font-bold uppercase border-2 border-neo-black bg-neo-black text-white hover:bg-neo-lime hover:text-black transition-colors flex items-center gap-1"
              >
                <Icon name="add" size={14} />
                Thêm Mục Tiêu
              </button>
            </div>
          </div>

          {goals.map((goal) => {
            const daysLeft = getDaysLeft(goal.deadline);
            const isOverdue = daysLeft < 0;
            const isUrgent = daysLeft >= 0 && daysLeft <= 7;

            return (
              <div key={goal.id} className="bg-white border-4 border-neo-black shadow-hard-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-hard transition-all group relative">
                {/* Edit Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); openEditModal(goal); }}
                  className="absolute top-2 right-12 bg-white border-2 border-neo-black p-1 text-neo-blue transition-opacity z-10 hover:bg-neo-blue hover:text-white"
                  title="Chỉnh sửa"
                >
                  <Icon name="edit" size={18} />
                </button>
                {/* Delete Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm('Bạn có chắc muốn xóa mục tiêu này?')) deleteGoal(goal.id); }}
                  className="absolute top-2 right-2 bg-white border-2 border-neo-black p-1 text-neo-red transition-opacity z-10 hover:bg-neo-red hover:text-white"
                  title="Xóa mục tiêu"
                >
                  <Icon name="delete" size={18} />
                </button>

                {/* Image Header */}
                <div className="h-32 bg-cover bg-center relative border-b-4 border-neo-black grayscale group-hover:grayscale-0 transition-all duration-500" style={{ backgroundImage: `url("${goal.image}")` }}>
                  <div className="absolute inset-0 bg-black/40"></div>
                  <div className="absolute bottom-4 left-4">
                    <span className="inline-block border-2 border-neo-black text-[10px] font-bold px-2 py-0.5 uppercase mb-2 shadow-hard-sm bg-white text-black">{goal.category}</span>
                    <h4 className="text-white font-display uppercase font-bold text-2xl drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">{goal.title}</h4>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Progress */}
                  <div className="flex justify-between text-xs font-bold uppercase mb-2">
                    <span>Tiến độ</span>
                    <span className={`${goal.colorClass} text-white px-1`}>{goal.progress}%</span>
                  </div>
                  <ProgressBar progress={goal.progress} colorClass={goal.colorClass} />

                  {/* Milestones (Tasks con) */}
                  {goal.milestones.length > 0 && (
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200">
                      <p className="text-xs font-bold uppercase text-gray-500 mb-2">Nhiệm vụ con</p>
                      <div className="space-y-2">
                        {goal.milestones.map(milestone => (
                          <div
                            key={milestone.id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <button
                              onClick={() => toggleMilestone(goal.id, milestone.id)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              <div className={`w-4 h-4 border-2 border-neo-black flex items-center justify-center text-xs ${milestone.completed ? 'bg-neo-black text-white' : 'bg-white'}`}>
                                {milestone.completed && <Icon name="check" size={10} />}
                              </div>
                              <span className={milestone.completed ? 'line-through text-gray-400' : ''}>{milestone.title}</span>
                            </button>
                            <button
                              onClick={() => deleteMilestone(goal.id, milestone.id)}
                              className="text-gray-300 hover:text-neo-red"
                            >
                              <Icon name="close" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Milestone */}
                  {addingMilestoneForGoal === goal.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={newMilestoneTitle}
                        onChange={(e) => setNewMilestoneTitle(e.target.value)}
                        placeholder="Tên nhiệm vụ..."
                        className="flex-1 border-2 border-neo-black px-2 py-1 text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone(goal.id)}
                      />
                      <button
                        onClick={() => handleAddMilestone(goal.id)}
                        className="bg-neo-black text-white px-2 py-1 text-xs font-bold"
                      >
                        Thêm
                      </button>
                      <button
                        onClick={() => { setAddingMilestoneForGoal(null); setNewMilestoneTitle(''); }}
                        className="border-2 border-neo-black px-2 py-1 text-xs font-bold"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingMilestoneForGoal(goal.id)}
                      className="mt-3 text-xs font-bold text-gray-400 hover:text-neo-black flex items-center gap-1"
                    >
                      <Icon name="add" size={12} /> Thêm nhiệm vụ con
                    </button>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-dashed border-gray-300">
                    <div className="flex items-center gap-2">
                      <Icon name="schedule" size={18} />
                      <span className={`text-xs font-bold uppercase ${isOverdue ? 'text-neo-red' : isUrgent ? 'text-neo-orange' : ''}`}>
                        {formatDeadlineDisplay(goal.deadline)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUpdateProgress(goal.id, goal.progress)}
                      className="text-xs font-bold uppercase hover:bg-neo-yellow px-2 py-1 transition-colors border-2 border-transparent hover:border-neo-black"
                    >
                      Cập nhật %
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {goals.length === 0 && (
            <div className="p-8 border-4 border-dashed border-neo-black text-center font-mono text-gray-500 uppercase bg-gray-50">
              Chưa có mục tiêu nào. Hãy thêm mới!
            </div>
          )}
        </div>

        {/* Right Column: Widgets */}
        <div className="lg:col-span-3 space-y-8">
          {/* Sắp tới - Lấy từ deadlines thật */}
          <BrutalCard title="Sắp tới" icon="calendar_today" collapsible>
            <div className="space-y-4">
              {topUpcoming.length === 0 ? (
                <p className="text-sm font-mono text-gray-500">Không có deadline sắp tới</p>
              ) : (
                topUpcoming.map((item, i) => {
                  const isOverdue = item.daysLeft < 0;
                  const isUrgent = item.daysLeft >= 0 && item.daysLeft <= 3;
                  const isSoon = item.daysLeft > 3 && item.daysLeft <= 7;

                  return (
                    <div
                      key={i}
                      className={`flex gap-3 items-start group p-2 border-2 transition-all cursor-pointer
                        ${isOverdue ? 'border-neo-red bg-red-50' : isUrgent ? 'border-neo-orange bg-orange-50' : isSoon ? 'border-neo-yellow bg-yellow-50' : 'border-transparent hover:border-neo-black hover:shadow-hard-sm'}
                      `}
                    >
                      <Icon
                        name={item.type === 'goal' ? 'flag' : 'check_circle'}
                        size={20}
                        className={isOverdue ? 'text-neo-red' : isUrgent ? 'text-neo-orange' : ''}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold uppercase truncate">
                          {item.type === 'milestone' ? item.milestoneTitle : item.goalTitle}
                        </p>
                        {item.type === 'milestone' && (
                          <p className="text-[10px] font-mono text-gray-500 truncate">{item.goalTitle}</p>
                        )}
                        <p className={`text-xs font-mono font-bold ${isOverdue ? 'text-neo-red' : isUrgent ? 'text-neo-orange' : 'text-gray-500'}`}>
                          {formatDeadlineDisplay(item.deadline)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </BrutalCard>

          {/* Quick note */}
          <BrutalCard title="Ghi chú nhanh" icon="edit_note" collapsible>
            <textarea
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendQuickNote();
                }
              }}
              className="w-full bg-gray-50 border-2 border-neo-black p-3 text-sm font-mono focus:outline-none focus:bg-white resize-none h-24 mb-4"
              placeholder="GHI_LẠI_Ý_TƯỞNG... (Ctrl/Cmd + Enter để gửi)"
              disabled={isSubmittingNote}
            ></textarea>
            <button
              onClick={sendQuickNote}
              disabled={isSubmittingNote || !quickNote.trim()}
              className="w-full bg-neo-black text-white hover:bg-neo-lime hover:text-black border-2 border-neo-black font-bold text-sm uppercase py-3 flex items-center justify-center gap-2 shadow-hard hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingNote ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Đang gửi...
                </>
              ) : (
                <>
                  <span>Ghi lại</span>
                  <Icon name="send" size={14} />
                </>
              )}
            </button>
          </BrutalCard>
        </div>
      </div>

      {/* Add Goal Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm mục tiêu mới"
      >
        <FormInput
          label="Tên mục tiêu"
          value={newTitle}
          onChange={setNewTitle}
          placeholder="VD: Học tiếng Anh giao tiếp"
          required
        />
        <FormSelect
          label="Danh mục"
          value={newCategory}
          onChange={(v) => setNewCategory(v as GoalCategory)}
          options={GOAL_CATEGORIES as unknown as string[]}
        />
        <FormInput
          label="Deadline (YYYY-MM-DD)"
          value={newDeadline}
          onChange={setNewDeadline}
          placeholder="VD: 2025-12-31"
          type="date"
        />
        <FormActions
          onCancel={() => setIsAddModalOpen(false)}
          onSubmit={handleAddGoal}
          submitLabel="Tạo mục tiêu"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa mục tiêu"
      >
        <FormInput
          label="Tên mục tiêu"
          value={editTitle}
          onChange={setEditTitle}
          placeholder="Nhập tên mục tiêu..."
          required
        />
        <FormSelect
          label="Danh mục"
          value={editCategory}
          onChange={setEditCategory}
          options={GOAL_CATEGORIES as unknown as string[]}
        />
        <FormInput
          label="Deadline (YYYY-MM-DD)"
          value={editDeadline}
          onChange={setEditDeadline}
          placeholder="VD: 2025-12-31"
          type="date"
        />
        <FormInput
          label="Tiến độ (%)"
          value={editProgress}
          onChange={setEditProgress}
          type="number"
        />
        <FormInput
          label="URL ảnh bìa"
          value={editImage}
          onChange={setEditImage}
          placeholder="https://..."
        />
        <FormColorSelect
          label="Màu sắc"
          value={editColor}
          onChange={setEditColor}
          options={colorOptions}
        />
        <FormActions
          onCancel={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSave}
          submitLabel="Lưu thay đổi"
        />
      </Modal>

      {/* Progress Update Modal */}
      <InputModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        onSubmit={handleSubmitProgress}
        title="Cập nhật tiến độ"
        placeholder="Nhập % (0-100)"
        defaultValue={currentProgressValue}
        inputType="number"
        submitLabel="Cập nhật"
      />
    </div>
  );
};