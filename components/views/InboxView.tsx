import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Modal, FormInput, FormSelect, FormActions } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { Goal, Milestone, formatDeadlineDisplay, getDaysLeft, GOAL_CATEGORIES, GoalCategory } from '../../types';

interface FlatMilestone {
  goalId: string;
  goalTitle: string;
  goalColor: string;
  milestone: Milestone;
  daysLeft: number;
}

export const InboxView: React.FC = () => {
  const { goals, addMilestone, toggleMilestone, deleteMilestone, updateMilestone, addGoal } = useApp();
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  
  // Add Goal Modal
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<GoalCategory>('Sự nghiệp');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  
  // Edit Milestone Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<FlatMilestone | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Flatten all milestones from all goals
  const allMilestones = useMemo<FlatMilestone[]>(() => {
    const list: FlatMilestone[] = [];
    goals.forEach(goal => {
      goal.milestones.forEach(m => {
        list.push({
          goalId: goal.id,
          goalTitle: goal.title,
          goalColor: goal.colorClass,
          milestone: m,
          daysLeft: m.dueDate ? getDaysLeft(m.dueDate) : Infinity,
        });
      });
    });
    // Sort: incomplete first, then by due date
    return list.sort((a, b) => {
      if (a.milestone.completed !== b.milestone.completed) {
        return a.milestone.completed ? 1 : -1;
      }
      return a.daysLeft - b.daysLeft;
    });
  }, [goals]);

  const handleCapture = () => {
    if (inputText.trim() && selectedGoalId) {
      addMilestone({ goalId: selectedGoalId, title: inputText });
      setInputText('');
      showToast('Đã thêm nhiệm vụ!', 'success');
    } else if (inputText.trim()) {
      showToast('Vui lòng chọn mục tiêu trước!', 'warning');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleCapture();
    }
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim() || !newGoalDeadline.trim()) {
      showToast('Vui lòng điền đầy đủ thông tin!', 'warning');
      return;
    }
    addGoal(newGoalTitle, newGoalCategory, newGoalDeadline);
    setNewGoalTitle('');
    setNewGoalCategory('Sự nghiệp');
    setNewGoalDeadline('');
    setIsAddGoalModalOpen(false);
  };

  // Edit handlers
  const openEditModal = (item: FlatMilestone) => {
    setEditingMilestone(item);
    setEditTitle(item.milestone.title);
    setEditDueDate(item.milestone.dueDate || '');
    setIsEditModalOpen(true);
  };

  const handleEditSave = () => {
    if (editingMilestone && editTitle.trim()) {
      updateMilestone({
        goalId: editingMilestone.goalId,
        milestoneId: editingMilestone.milestone.id,
        title: editTitle,
        dueDate: editDueDate || undefined,
      });
      setIsEditModalOpen(false);
      setEditingMilestone(null);
    }
  };

  const completedCount = allMilestones.filter(m => m.milestone.completed).length;
  const totalCount = allMilestones.length;

  return (
    <div className="h-full flex flex-col pb-20">
      <header className="flex flex-col gap-6 border-b-4 border-neo-black pb-8 mb-8">
        <div className="flex items-center gap-2 bg-neo-lime border-2 border-neo-black w-fit px-3 py-1 shadow-hard-sm">
          <Icon name="calendar_month" size={18} />
          <p className="text-xs font-bold font-mono uppercase tracking-widest">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
          </p>
        </div>
        <h2 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tighter leading-none">
          Tất cả<br/>Nhiệm vụ.
        </h2>
      </header>

      {/* Capture Area - Add Milestone */}
      <section className="flex flex-col w-full bg-white border-4 border-neo-black shadow-hard mb-12">
        <div className="h-10 border-b-4 border-neo-black bg-gray-50 flex items-center px-4 justify-between select-none">
          <div className="flex gap-2">
            <div className="w-3 h-3 border-2 border-neo-black bg-white"></div>
            <div className="w-3 h-3 border-2 border-neo-black bg-neo-black"></div>
            <div className="w-3 h-3 border-2 border-neo-black bg-neo-lime"></div>
          </div>
          <span className="text-[10px] font-bold font-mono uppercase tracking-widest">Thêm_nhiệm_vụ</span>
        </div>
        
        <div className="p-4 border-b-2 border-neo-black bg-gray-50 flex flex-wrap gap-3 items-center">
          <label className="font-mono text-sm font-bold uppercase">Mục tiêu:</label>
          <select 
            value={selectedGoalId}
            onChange={(e) => setSelectedGoalId(e.target.value)}
            className="flex-1 min-w-[200px] border-2 border-neo-black p-2 font-mono focus:outline-none focus:border-neo-blue"
          >
            <option value="">-- Chọn mục tiêu --</option>
            {goals.map(g => (
              <option key={g.id} value={g.id}>{g.title} ({g.category})</option>
            ))}
          </select>
          <button 
            onClick={() => setIsAddGoalModalOpen(true)}
            className="px-3 py-2 bg-neo-yellow border-2 border-neo-black font-bold text-xs uppercase shadow-hard-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-1"
          >
            <Icon name="add" size={14} /> Thêm mục tiêu
          </button>
        </div>
        
        <textarea 
          autoFocus 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-32 md:h-40 p-6 text-xl md:text-2xl font-display font-bold uppercase resize-none focus:outline-none placeholder:text-gray-300"
          placeholder="NHẬP NHIỆM VỤ MỚI..."
        ></textarea>

        <div className="flex flex-col md:flex-row justify-between items-center p-6 border-t-4 border-neo-black bg-white gap-4">
          <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <div className="px-4 py-2 bg-neo-black text-white border-2 border-neo-black shadow-hard-sm font-bold text-xs uppercase whitespace-nowrap">
              {completedCount}/{totalCount} Đã xong
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <span className="hidden md:block text-[10px] font-bold font-mono uppercase bg-gray-100 px-2 py-1 border border-neo-black">CMD + ENTER</span>
            <button 
              onClick={handleCapture}
              disabled={!selectedGoalId || !inputText.trim()}
              className="flex-1 md:flex-none h-12 px-8 bg-neo-lime border-2 border-neo-black hover:bg-lime-400 font-bold uppercase flex items-center justify-center gap-2 shadow-hard hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Thêm nhiệm vụ</span>
              <Icon name="arrow_forward" size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* All Milestones List */}
      <section>
        <div className="flex items-center justify-between border-b-4 border-neo-black pb-2 mb-6">
          <h2 className="text-2xl font-display font-black uppercase">Danh sách nhiệm vụ</h2>
        </div>
        
        <div className="flex flex-col border-4 border-neo-black bg-white shadow-hard">
          {allMilestones.length === 0 && (
            <div className="p-8 text-center text-gray-500 font-mono">
              Chưa có nhiệm vụ nào. Hãy thêm milestone vào mục tiêu!
            </div>
          )}
          {allMilestones.map((item) => {
            const isOverdue = item.daysLeft < 0;
            const isUrgent = item.daysLeft >= 0 && item.daysLeft <= 3;
            
            return (
              <div 
                key={`${item.goalId}-${item.milestone.id}`} 
                className={`group relative flex items-start gap-4 p-6 border-b-2 border-neo-black last:border-b-0 transition-colors
                  ${item.milestone.completed ? 'bg-gray-100' : isOverdue ? 'bg-red-50' : isUrgent ? 'bg-orange-50' : 'bg-white hover:bg-gray-50'}
                `}
              >
                {/* Checkbox */}
                <button 
                  onClick={() => toggleMilestone(item.goalId, item.milestone.id)}
                  className={`mt-1 w-6 h-6 border-2 border-neo-black flex items-center justify-center cursor-pointer transition-colors
                    ${item.milestone.completed ? 'bg-neo-black text-white' : 'bg-white hover:bg-neo-yellow'}
                  `}
                >
                  {item.milestone.completed && <Icon name="check" size={14} />}
                </button>

                {/* Content */}
                <div className="flex-1">
                  <p className={`text-lg font-bold font-display leading-tight mb-2 ${item.milestone.completed ? 'line-through opacity-50 text-gray-500' : ''}`}>
                    {item.milestone.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 ${item.goalColor} text-white border border-neo-black`}>
                      {item.goalTitle}
                    </span>
                    {item.milestone.dueDate && (
                      <span className={`text-[10px] font-bold uppercase ${isOverdue ? 'text-neo-red' : isUrgent ? 'text-neo-orange' : 'text-gray-500'}`}>
                        {formatDeadlineDisplay(item.milestone.dueDate)}
                      </span>
                    )}
                    {item.milestone.completed && (
                      <span className="text-[10px] font-bold uppercase text-green-600 bg-green-100 px-2 py-0.5 border border-green-600">
                        Đã xong
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openEditModal(item)}
                    className="p-2 text-gray-400 hover:text-neo-blue hover:bg-blue-50 transition-all rounded"
                    title="Chỉnh sửa"
                  >
                    <Icon name="edit" size={20} />
                  </button>
                  <button 
                    onClick={() => deleteMilestone(item.goalId, item.milestone.id)}
                    className="p-2 text-gray-400 hover:text-neo-red hover:bg-gray-200 transition-all rounded"
                    title="Xóa"
                  >
                    <Icon name="delete" size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Goal Modal */}
      <Modal
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        title="Thêm mục tiêu mới"
      >
        <FormInput
          label="Tên mục tiêu"
          value={newGoalTitle}
          onChange={setNewGoalTitle}
          placeholder="VD: Học tiếng Anh"
          required
        />
        <FormSelect
          label="Danh mục"
          value={newGoalCategory}
          onChange={(v) => setNewGoalCategory(v as GoalCategory)}
          options={GOAL_CATEGORIES as unknown as string[]}
        />
        <FormInput
          label="Deadline (YYYY-MM-DD)"
          value={newGoalDeadline}
          onChange={setNewGoalDeadline}
          placeholder="VD: 2025-12-31"
          type="date"
        />
        <FormActions
          onCancel={() => setIsAddGoalModalOpen(false)}
          onSubmit={handleAddGoal}
          submitLabel="Tạo mục tiêu"
        />
      </Modal>

      {/* Edit Milestone Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa nhiệm vụ"
      >
        <FormInput
          label="Tiêu đề"
          value={editTitle}
          onChange={setEditTitle}
          placeholder="Nhập tiêu đề..."
          required
        />
        <FormInput
          label="Ngày hết hạn (YYYY-MM-DD)"
          value={editDueDate}
          onChange={setEditDueDate}
          placeholder="VD: 2025-12-31"
          type="date"
        />
        <FormActions
          onCancel={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSave}
          submitLabel="Lưu thay đổi"
        />
      </Modal>
    </div>
  );
};