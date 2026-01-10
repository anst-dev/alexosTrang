/// <reference types="vite/client" />

declare module 'virtual:pwa-register/react' {
    import type { Dispatch, SetStateAction } from 'react';

    export interface RegisterSWOptions {
        immediate?: boolean;
        onNeedRefresh?: () => void;
        onOfflineReady?: () => void;
        onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
        onRegisterError?: (error: any) => void;
    }

    export function useRegisterSW(options?: RegisterSWOptions): {
        needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
        offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
        updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
    };
}

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
    // thêm các biến môi trường khác ở đây
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
