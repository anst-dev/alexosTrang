import React, { useState } from 'react';
import { ProgressBar } from '../ui/BrutalComponents';
import { useApp, UpdateHabitDTO } from '../../context/AppContext';
import { Modal, FormInput, FormSelect, FormActions } from '../ui/Modal';
import { Habit } from '../../types';
import { Icon } from '../ui/Icon';

export const HabitsView: React.FC = () => {
  const { habits, addHabit, toggleHabit, deleteHabit, updateHabit } = useApp();
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Chung');
  const [filter, setFilter] = useState('Tất cả');
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStreak, setEditStreak] = useState('0');

  const categories = ['Sáng', 'Chiều', 'Tối', 'Chung', 'Sức khỏe'];
  const filterCategories = ['Tất cả', ...categories];

  const handleAddHabit = () => {
    if (newHabitName.trim()) {
      addHabit(newHabitName, selectedCategory);
      setNewHabitName('');
    }
  };

  // Edit handlers
  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit);
    setEditName(habit.name);
    setEditCategory(habit.category);
    setEditStreak(habit.streak.toString());
    setIsEditModalOpen(true);
  };

  const handleEditSave = () => {
    if (editingHabit && editName.trim()) {
      const dto: UpdateHabitDTO = {
        id: editingHabit.id,
        name: editName,
        category: editCategory,
        streak: parseInt(editStreak) || 0,
      };
      updateHabit(dto);
      setIsEditModalOpen(false);
      setEditingHabit(null);
    }
  };

  const completedCount = habits.filter(h => h.completedToday).length;
  const progress = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  const filteredHabits = filter === 'Tất cả' 
    ? habits 
    : habits.filter(h => h.category === filter);

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Header Widget */}
      <div className="bg-white border-4 border-neo-black shadow-hard mb-8">
        <div className="p-6 border-b-4 border-neo-black">
           <div className="flex justify-between items-start mb-6">
              <div>
                 <span className="bg-neo-black text-white px-2 py-1 text-xs font-bold uppercase">Quy trình hằng ngày</span>
                 <div className="flex items-end gap-2 mt-2">
                    <span className="text-6xl font-display font-black leading-none">{progress}%</span>
                    <span className="font-mono font-bold text-sm uppercase mb-1">Thực hiện</span>
                 </div>
              </div>
              <div className="text-right">
                 <div className="text-xs font-bold uppercase mb-1">Trạng thái</div>
                 <div className="text-2xl font-black font-mono">{completedCount}/{habits.length}</div>
              </div>
           </div>
           <ProgressBar progress={progress} heightClass="h-8" />
        </div>
        <div className="grid grid-cols-2 p-6 bg-gray-50">
           <div>
              <span className="text-xs font-bold uppercase text-gray-500">Tổng chuỗi</span>
              <div className="flex items-center gap-2">
                 <Icon name="local_fire_department" size={20} />
                 <span className="text-xl font-black font-mono">
                    {habits.reduce((acc, curr) => acc + curr.streak, 0)} Ngày
                 </span>
              </div>
           </div>
           <div className="border-l-4 border-neo-black pl-6">
              <span className="text-xs font-bold uppercase text-gray-500">Cấp độ</span>
              <div className="flex items-center gap-2">
                 <Icon name="emoji_events" size={20} />
                 <span className="text-xl font-black font-mono">0{Math.floor(habits.reduce((acc, curr) => acc + curr.streak, 0) / 10) + 1}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Input */}
      <div className="flex flex-col md:flex-row gap-2 mb-8 bg-white p-2 border-4 border-neo-black shadow-hard">
         <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-3 font-mono font-bold uppercase border-2 border-neo-black focus:outline-none bg-gray-50"
         >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
         </select>
         <input 
            type="text" 
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
            className="flex-1 p-3 font-mono font-bold uppercase focus:outline-none border-2 border-transparent focus:border-neo-black placeholder:text-gray-400" 
            placeholder="NHẬP THÓI QUEN MỚI..." 
         />
         <button 
            onClick={handleAddHabit}
            className="w-full md:w-16 bg-neo-black text-white p-3 flex items-center justify-center hover:bg-neo-lime hover:text-black transition-colors"
         >
            <Icon name="add" size={24} />
         </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6 mb-2">
         {filterCategories.map((tab, i) => (
            <button 
               key={i} 
               onClick={() => setFilter(tab)}
               className={`
                  px-6 py-2 border-2 border-neo-black font-mono font-bold uppercase text-sm whitespace-nowrap shadow-hard-sm transition-all
                  ${filter === tab ? 'bg-neo-black text-white' : 'bg-white hover:bg-gray-100'}
               `}
            >
               {tab}
            </button>
         ))}
      </div>

      {/* List */}
      <div className="space-y-4">
          {filteredHabits.length === 0 && (
             <div className="text-center font-mono text-gray-400 py-8">Không có thói quen nào trong mục này.</div>
          )}

          {filteredHabits.map((habit) => (
             <div 
               key={habit.id} 
               className={`flex justify-between items-center bg-white border-4 border-neo-black p-4 shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group ${habit.completedToday ? 'bg-gray-50' : ''}`}
             >
                <div 
                  className="flex items-center gap-4 flex-1 cursor-pointer"
                  onClick={() => toggleHabit(habit.id)}
                >
                   <div className={`w-12 h-12 border-2 border-neo-black flex items-center justify-center transition-colors ${habit.completedToday ? 'bg-neo-black text-white' : 'bg-white'}`}>
                      <Icon name={habit.completedToday ? 'check' : 'bolt'} size={20} />
                   </div>
                   <div>
                      <p className={`font-bold uppercase group-hover:underline decoration-2 underline-offset-4 ${habit.completedToday ? 'line-through text-gray-500' : ''}`}>
                         {habit.name}
                      </p>
                      <p className="text-xs font-mono font-bold text-gray-500 flex items-center gap-2">
                         <span className="bg-neo-lime px-1 border border-black text-black text-[10px]">{habit.category}</span>
                         {habit.streak > 0 && <span className="bg-neo-black text-white px-1">🔥 {habit.streak}</span>}
                      </p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   {/* Edit Button */}
                   <button 
                     onClick={(e) => { e.stopPropagation(); openEditModal(habit); }}
                     className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-neo-blue hover:bg-blue-50 rounded-full"
                     title="Chỉnh sửa"
                   >
                      <Icon name="edit" size={18} />
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                     className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-neo-red hover:bg-gray-100 rounded-full"
                   >
                      <Icon name="delete" size={18} />
                   </button>
                   <div 
                     onClick={() => toggleHabit(habit.id)}
                     className={`w-8 h-8 border-2 border-neo-black transition-colors cursor-pointer ${habit.completedToday ? 'bg-neo-lime' : 'bg-white hover:bg-gray-100'}`}
                   ></div>
                </div>
             </div>
          ))}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa thói quen"
      >
        <FormInput
          label="Tên thói quen"
          value={editName}
          onChange={setEditName}
          placeholder="Nhập tên thói quen..."
          required
        />
        <FormSelect
          label="Danh mục"
          value={editCategory}
          onChange={setEditCategory}
          options={categories}
        />
        <FormInput
          label="Chuỗi ngày (streak)"
          value={editStreak}
          onChange={setEditStreak}
          type="number"
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