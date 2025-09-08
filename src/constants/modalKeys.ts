/**
 * 文件路径: src/constants/modalKeys.ts
 * 文件描述: [核心改造] 移除所有仅在单个页面中使用的模态框键名。
 */

export const MODAL_KEYS = {
	// --- 全局模态框 (保留) ---
	STORE: 'store',
	USER_OPTIONS: 'userOptions',
	LOGOUT_CONFIRM: 'logoutConfirm',

	// --- 页面级模态框 (将被移除) ---
	// [移除] INVITE
	// [移除] TASK_ACTIONS
	// [移除] PROCUREMENT_ACTIONS
	// [移除] INGREDIENT_ACTIONS
	// [移除] DELETE_INGREDIENT_CONFIRM
	// [移除] UPDATE_STOCK_CONFIRM
	// [移除] CREATE_INGREDIENT
	// [移除] RECIPE_ACTIONS
	// [移除] DISCONTINUE_RECIPE_CONFIRM
	// [移除] RESTORE_RECIPE_CONFIRM
	// [移除] DELETE_RECIPE_CONFIRM
	// [移除] TEMPERATURE_SETTINGS
} as const;

export type ModalKey = typeof MODAL_KEYS[keyof typeof MODAL_KEYS];