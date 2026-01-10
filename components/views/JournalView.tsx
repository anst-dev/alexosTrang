import React, { useState } from 'react';
import { useApp, UpdateJournalDTO } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Modal, FormTextarea, FormSelect, FormActions } from '../ui/Modal';
import { JournalEntry } from '../../types';
import { Icon } from '../ui/Icon';

export const JournalView: React.FC = () => {
  const { addJournalEntry, journalEntries, deleteJournalEntry, updateJournalEntry } = useApp();
  const { showToast } = useToast();
  
  // 3 câu hỏi cốt lõi
  const [mostValuable, setMostValuable] = useState(''); // Việc nào hôm nay đáng giá nhất?
  const [mostBlameworthy, setMostBlameworthy] = useState(''); // Sai lầm nào đáng trách nhất?
  const [wouldChange, setWouldChange] = useState(''); // Nếu được làm lại, tôi sẽ thay đổi điều gì?
  
  const [activeMood, setActiveMood] = useState('Bận');
  const [showHistory, setShowHistory] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood] = useState('');

  const moods = ['Vui', 'Bình tĩnh', 'Bận', 'Mệt'];

  const handleSave = () => {
     if (mostValuable.trim() || mostBlameworthy.trim() || wouldChange.trim()) {
        // Định dạng nội dung với 3 câu hỏi cốt lõi
        const fullContent = [
          '📌 VIỆC ĐÁNG GIÁ NHẤT:',
          mostValuable.trim() || '(chưa ghi)',
          '',
          '⚠️ SAI LẦM ĐÁNG TRÁCH NHẤT:',
          mostBlameworthy.trim() || '(chưa ghi)',
          '',
          '🔄 NẾU LÀM LẠI, SẼ THAY ĐỔI:',
          wouldChange.trim() || '(chưa ghi)',
        ].join('\n');
        
        addJournalEntry(fullContent, activeMood);
        setMostValuable('');
        setMostBlameworthy('');
        setWouldChange('');
        showToast('Đã lưu nhật ký!', 'success');
     }
  };

  const hasContent = mostValuable.trim() || mostBlameworthy.trim() || wouldChange.trim();

  // Edit handlers
  const openEditModal = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditContent(entry.content);
    setEditMood(entry.mood);
    setIsEditModalOpen(true);
  };

  const handleEditSave = () => {
    if (editingEntry && editContent.trim()) {
      const dto: UpdateJournalDTO = {
        id: editingEntry.id,
        content: editContent,
        mood: editMood,
      };
      updateJournalEntry(dto);
      setIsEditModalOpen(false);
      setEditingEntry(null);
    }
  };

  // Map moods to icons
  const moodIcons: Record<string, string> = {
    'Vui': 'sentiment_satisfied',
    'Bình tĩnh': 'sentiment_neutral',
    'Bận': 'bolt',
    'Mệt': 'battery_alert'
  };

  return (
    <div className="max-w-3xl mx-auto pb-32">
       {/* Header */}
       <header className="border-4 border-neo-black mb-12 shadow-hard-lg">
          <div className="flex justify-between bg-neo-black text-white p-4 font-mono text-sm uppercase">
             <div className="flex items-center gap-2">
                <Icon name="edit_note" size={14} />
                Nhật_ký_số_#8392
             </div>
             <div>{new Date().toLocaleDateString('vi-VN')}</div>
          </div>
          <div className="bg-neo-yellow p-8 border-t-4 border-neo-black flex justify-between items-end">
             <div>
                <h2 className="text-5xl md:text-7xl font-display font-black uppercase leading-[0.85] tracking-tighter mb-4 text-black">
                    3 Câu Hỏi<br/>Mỗi Tối
                </h2>
                <p className="font-mono font-bold text-sm md:text-base">// {journalEntries.length} BÀI VIẾT ĐÃ LƯU</p>
             </div>
             <button 
                onClick={() => setShowHistory(!showHistory)}
                className="bg-white border-2 border-neo-black p-2 font-bold uppercase text-xs shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
             >
                {showHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
             </button>
          </div>
       </header>

        {/* History Section (Collapsible) */}
        {showHistory && (
            <section className="mb-12 space-y-4 animate-in slide-in-from-top-4 duration-300">
                <h3 className="text-xl font-black uppercase border-l-4 border-neo-black pl-4">Lịch sử gần đây</h3>
                <div className="grid gap-4">
                    {journalEntries.length === 0 && <p className="font-mono text-gray-400 italic">Chưa có nhật ký nào.</p>}
                    {journalEntries.map(entry => (
                        <div key={entry.id} className="bg-white border-2 border-neo-black p-4 shadow-hard flex justify-between gap-4 group">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-neo-black text-white text-[10px] px-2 py-0.5 font-bold uppercase">{new Date(entry.createdAt).toLocaleDateString('vi-VN')}</span>
                                    <span className="font-mono text-xs font-bold uppercase text-gray-500">Tâm trạng: {entry.mood}</span>
                                </div>
                                <p className="font-mono text-sm whitespace-pre-wrap line-clamp-3">{entry.content}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                <button 
                                    onClick={() => openEditModal(entry)}
                                    className="h-8 w-8 flex items-center justify-center hover:bg-neo-blue hover:text-white border-2 border-transparent hover:border-neo-black transition-colors"
                                    title="Chỉnh sửa"
                                >
                                    <Icon name="edit" size={18} />
                                </button>
                                <button 
                                    onClick={() => deleteJournalEntry(entry.id)}
                                    className="h-8 w-8 flex items-center justify-center hover:bg-neo-red hover:text-white border-2 border-transparent hover:border-neo-black transition-colors"
                                    title="Xóa"
                                >
                                    <Icon name="delete" size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )}

       {/* Form */}
       <div className="space-y-12">
          {/* Status */}
          <section className="space-y-4">
             <h3 className="text-xl font-black uppercase border-l-4 border-neo-black pl-4">Trạng thái hiện tại</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Vui', icon: 'sentiment_satisfied' },
                  { label: 'Bình tĩnh', icon: 'sentiment_neutral' },
                  { label: 'Bận', icon: 'bolt' },
                  { label: 'Mệt', icon: 'priority_high' },
                ].map((status, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveMood(status.label)}
                    className={`
                    h-14 flex items-center justify-center gap-2 border-2 border-neo-black shadow-hard hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-mono font-bold uppercase text-sm
                    ${activeMood === status.label ? 'bg-neo-black text-white' : 'bg-white text-black hover:bg-gray-50'}
                  `}>
                     <Icon name={status.icon} size={18} />
                     {status.label}
                  </button>
                ))}
             </div>
          </section>

          {/* Câu hỏi 1: Việc đáng giá nhất */}
          <section>
             <div className="flex justify-between items-center bg-neo-lime text-black p-3 border-4 border-neo-black border-b-0">
                <h3 className="text-xl font-black uppercase flex items-center gap-2">
                   <Icon name="star" size={20} />
                   Việc nào hôm nay đáng giá nhất?
                </h3>
                <span className="font-mono text-xs">CÂU_HỎI_01</span>
             </div>
             <div className="relative border-4 border-neo-black bg-white shadow-hard group">
                <textarea 
                  value={mostValuable}
                  onChange={(e) => setMostValuable(e.target.value)}
                  className="w-full h-32 p-6 font-mono text-sm md:text-base resize-none focus:outline-none focus:bg-yellow-50 transition-colors"
                  placeholder="Thành tựu, việc làm tốt, điều đáng tự hào hôm nay..."
                ></textarea>
             </div>
          </section>

          {/* Câu hỏi 2: Sai lầm đáng trách nhất */}
          <section>
             <div className="flex justify-between items-center bg-neo-red text-white p-3 border-4 border-neo-black border-b-0">
                <h3 className="text-xl font-black uppercase flex items-center gap-2">
                   <Icon name="warning" size={20} />
                   Sai lầm nào đáng trách nhất?
                </h3>
                <span className="font-mono text-xs">CÂU_HỎI_02</span>
             </div>
             <div className="relative border-4 border-neo-black bg-white shadow-hard group">
                <textarea 
                  value={mostBlameworthy}
                  onChange={(e) => setMostBlameworthy(e.target.value)}
                  className="w-full h-32 p-6 font-mono text-sm md:text-base resize-none focus:outline-none focus:bg-red-50 transition-colors"
                  placeholder="Lỗi sai, quyết định tệ, điều hối tiếc hôm nay..."
                ></textarea>
             </div>
          </section>

          {/* Câu hỏi 3: Nếu làm lại, sẽ thay đổi điều gì */}
          <section>
             <div className="flex justify-between items-center bg-neo-blue text-white p-3 border-4 border-neo-black border-b-0">
                <h3 className="text-xl font-black uppercase flex items-center gap-2">
                   <Icon name="autorenew" size={20} />
                   Nếu được làm lại, tôi sẽ thay đổi điều gì?
                </h3>
                <span className="font-mono text-xs">CÂU_HỎI_03</span>
             </div>
             <div className="relative border-4 border-neo-black bg-white shadow-hard group">
                <textarea 
                  value={wouldChange}
                  onChange={(e) => setWouldChange(e.target.value)}
                  className="w-full h-32 p-6 font-mono text-sm md:text-base resize-none focus:outline-none focus:bg-blue-50 transition-colors"
                  placeholder="Bài học rút ra, cách tiếp cận khác, điều sẽ làm tốt hơn..."
                ></textarea>
             </div>
          </section>
       </div>

       {/* Footer Actions */}
       <div className="fixed bottom-0 left-0 md:left-72 right-0 bg-white border-t-4 border-neo-black p-0 z-10">
          <div className="flex h-20 items-stretch">
             <button 
               onClick={() => { setMostValuable(''); setMostBlameworthy(''); setWouldChange(''); }}
               className="w-1/3 md:w-auto px-8 md:px-12 font-mono font-bold uppercase hover:bg-neo-red hover:text-white border-r-4 border-neo-black flex items-center justify-center gap-2 transition-colors"
             >
                <Icon name="delete" size={20} />
                <span className="hidden sm:inline">Hủy</span>
             </button>
             <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400 font-mono font-bold uppercase text-xs">
                <span className="animate-pulse mr-2">●</span> {hasContent ? '3 câu hỏi cốt lõi' : 'Sẵn sàng lưu'}
             </div>
             <button 
               onClick={handleSave}
               disabled={!hasContent}
               className="w-1/2 md:w-auto px-12 md:px-20 bg-neo-black text-white hover:bg-neo-lime hover:text-black font-black uppercase text-xl flex items-center justify-center gap-2 transition-colors border-l-4 border-neo-black disabled:opacity-50 disabled:cursor-not-allowed"
             >
                <span>Lưu lại</span>
                <Icon name="arrow_forward" size={20} />
             </button>
          </div>
       </div>

       {/* Edit Modal */}
       <Modal
         isOpen={isEditModalOpen}
         onClose={() => setIsEditModalOpen(false)}
         title="Chỉnh sửa nhật ký"
       >
         <FormTextarea
           label="Nội dung"
           value={editContent}
           onChange={setEditContent}
           placeholder="Nhập nội dung nhật ký..."
           rows={6}
         />
         <FormSelect
           label="Tâm trạng"
           value={editMood}
           onChange={setEditMood}
           options={moods}
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