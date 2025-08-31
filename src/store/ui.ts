import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MODAL_KEYS, type ModalKey } from '@/constants/modalKeys';

// 定义 UI 相关的状态
export const useUiStore = defineStore('ui', () => {
	const activeTab = ref('production');

	const toastMessageQueue = ref<{ message : string; type : 'success' | 'error' | 'info'; duration ?: number } | null>(null);

	const modalVisibility = ref<Record<ModalKey, boolean>>({
		[MODAL_KEYS.STORE]: false,
		[MODAL_KEYS.USER_OPTIONS]: false,
		[MODAL_KEYS.LOGOUT_CONFIRM]: false,
		[MODAL_KEYS.INVITE]: false,
		[MODAL_KEYS.TASK_ACTIONS]: false,
		[MODAL_KEYS.PROCUREMENT_ACTIONS]: false,
		[MODAL_KEYS.INGREDIENT_ACTIONS]: false,
		[MODAL_KEYS.DELETE_INGREDIENT_CONFIRM]: false,
		[MODAL_KEYS.UPDATE_STOCK_CONFIRM]: false,
		// [核心新增] 初始化新模态框的状态
		[MODAL_KEYS.CREATE_INGREDIENT]: false,
		[MODAL_KEYS.RECIPE_ACTIONS]: false,
		[MODAL_KEYS.DISCONTINUE_RECIPE_CONFIRM]: false,
		[MODAL_KEYS.RESTORE_RECIPE_CONFIRM]: false,
		[MODAL_KEYS.DELETE_RECIPE_CONFIRM]: false,
		[MODAL_KEYS.TEMPERATURE_SETTINGS]: false,
	});

	const showStoreModal = computed(() => modalVisibility.value[MODAL_KEYS.STORE]);
	const showUserOptionsModal = computed(() => modalVisibility.value[MODAL_KEYS.USER_OPTIONS]);
	const showLogoutConfirmModal = computed(() => modalVisibility.value[MODAL_KEYS.LOGOUT_CONFIRM]);
	const showInviteModal = computed(() => modalVisibility.value[MODAL_KEYS.INVITE]);
	const showTaskActionsModal = computed(() => modalVisibility.value[MODAL_KEYS.TASK_ACTIONS]);
	const showProcurementActionsModal = computed(() => modalVisibility.value[MODAL_KEYS.PROCUREMENT_ACTIONS]);
	const showIngredientActionsModal = computed(() => modalVisibility.value[MODAL_KEYS.INGREDIENT_ACTIONS]);
	const showDeleteIngredientConfirmModal = computed(() => modalVisibility.value[MODAL_KEYS.DELETE_INGREDIENT_CONFIRM]);
	const showUpdateStockConfirmModal = computed(() => modalVisibility.value[MODAL_KEYS.UPDATE_STOCK_CONFIRM]);
	// [核心新增] 暴露新模态框的 computed 状态
	const showCreateIngredientModal = computed(() => modalVisibility.value[MODAL_KEYS.CREATE_INGREDIENT]);
	const showRecipeActionsModal = computed(() => modalVisibility.value[MODAL_KEYS.RECIPE_ACTIONS]);
	const showDiscontinueRecipeConfirmModal = computed(() => modalVisibility.value[MODAL_KEYS.DISCONTINUE_RECIPE_CONFIRM]);
	const showRestoreRecipeConfirmModal = computed(() => modalVisibility.value[MODAL_KEYS.RESTORE_RECIPE_CONFIRM]);
	const showDeleteRecipeConfirmModal = computed(() => modalVisibility.value[MODAL_KEYS.DELETE_RECIPE_CONFIRM]);
	const showTemperatureSettingsModal = computed(() => modalVisibility.value[MODAL_KEYS.TEMPERATURE_SETTINGS]);

	const isAnyModalOpen = computed(() => Object.values(modalVisibility.value).some(isOpen => isOpen));

	function setActiveTab(tabKey : string) {
		activeTab.value = tabKey;
	}

	function openModal(modalName : ModalKey) {
		modalVisibility.value[modalName] = true;
	}

	function closeModal(modalName : ModalKey) {
		modalVisibility.value[modalName] = false;
	}

	function setNextPageToast(options : { message : string; type : 'success' | 'error' | 'info'; duration ?: number }) {
		toastMessageQueue.value = options;
	}

	function consumeNextPageToast() {
		const message = toastMessageQueue.value;
		toastMessageQueue.value = null;
		return message;
	}


	return {
		activeTab,
		setActiveTab,
		showStoreModal,
		showUserOptionsModal,
		showLogoutConfirmModal,
		showInviteModal,
		showTaskActionsModal,
		showProcurementActionsModal,
		showIngredientActionsModal,
		showDeleteIngredientConfirmModal,
		showUpdateStockConfirmModal,
		showCreateIngredientModal, // [核心新增]
		showRecipeActionsModal,
		showDiscontinueRecipeConfirmModal,
		showRestoreRecipeConfirmModal,
		showDeleteRecipeConfirmModal,
		showTemperatureSettingsModal,
		openModal,
		closeModal,
		isAnyModalOpen,
		setNextPageToast,
		consumeNextPageToast,
	};
});