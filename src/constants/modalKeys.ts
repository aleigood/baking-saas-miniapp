/**
 * 文件路径: src/constants/modalKeys.ts
 * 文件描述: [新增] 定义并导出所有模态框的键名常量，消除魔术字符串。
 */

export const MODAL_KEYS = {
	STORE: 'store',
	USER_OPTIONS: 'userOptions',
	LOGOUT_CONFIRM: 'logoutConfirm',
	INVITE: 'invite',
	TASK_ACTIONS: 'taskActions',
	PROCUREMENT_ACTIONS: 'procurementActions',
	INGREDIENT_ACTIONS: 'ingredientActions',
	DELETE_INGREDIENT_CONFIRM: 'deleteIngredientConfirm',
	UPDATE_STOCK_CONFIRM: 'updateStockConfirm',
	// [核心新增] 新增创建原料的模态框键名
	CREATE_INGREDIENT: 'createIngredient',
	RECIPE_ACTIONS: 'recipeActions',
	DISCONTINUE_RECIPE_CONFIRM: 'discontinueRecipeConfirm',
	RESTORE_RECIPE_CONFIRM: 'restoreRecipeConfirm',
	DELETE_RECIPE_CONFIRM: 'deleteRecipeConfirm',
	TEMPERATURE_SETTINGS: 'temperatureSettings',
} as const;

export type ModalKey = typeof MODAL_KEYS[keyof typeof MODAL_KEYS];