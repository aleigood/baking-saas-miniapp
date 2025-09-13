/**
 * 文件路径: src/constants/modalKeys.ts
 * 文件描述: [核心改造] 移除所有仅在单个页面中使用的模态框键名。
 */

export const MODAL_KEYS = {
	// --- 全局模态框 (保留) ---
	STORE: 'store',
	USER_OPTIONS: 'userOptions',
	LOGOUT_CONFIRM: 'logoutConfirm'
} as const;

export type ModalKey = (typeof MODAL_KEYS)[keyof typeof MODAL_KEYS];
