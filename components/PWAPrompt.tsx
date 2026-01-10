import React, { useState, useEffect } from 'react';
import { Icon } from './ui/Icon';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Kiểm tra xem app đã được cài đặt chưa
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Lắng nghe sự kiện beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Lắng nghe sự kiện app đã được cài đặt
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Lưu vào localStorage để không hiện lại trong 7 ngày
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Kiểm tra xem đã dismiss gần đây chưa
  useEffect(() => {
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setShowPrompt(false);
      }
    }
  }, []);

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-50 animate-slide-up">
      <div className="bg-neo-lime border-4 border-neo-black shadow-hard p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-neo-black flex items-center justify-center flex-shrink-0">
            <Icon name="download" size={24} className="text-neo-lime" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Cài đặt Alex OS</h3>
            <p className="text-sm opacity-80 mb-3">
              Thêm vào màn hình chính để truy cập nhanh hơn!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-neo-black text-white py-2 px-4 font-bold hover:bg-gray-800 transition-colors"
              >
                Cài đặt
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 border-2 border-neo-black font-bold hover:bg-neo-yellow transition-colors"
              >
                Để sau
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
