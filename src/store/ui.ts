import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MODAL_KEYS, type ModalKey } from '@/constants/modalKeys';

// 定义 UI 相关的状态
export const useUiStore = defineStore('ui', () => {
	// 当前激活的 Tab，默认为 'production'
	const activeTab = ref('production');

	// [重构] 将所有模态框的可见性状态统一管理在一个对象中
	const modalVisibility = ref<Record<ModalKey, boolean>>({
		[MODAL_KEYS.STORE]: false,
		[MODAL_KEYS.USER_OPTIONS]: false,
		[MODAL_KEYS.LOGOUT_CONFIRM]: false,
		[MODAL_KEYS.INVITE]: false,
		[MODAL_KEYS.TASK_ACTIONS]: false,
		[MODAL_KEYS.PROCUREMENT_ACTIONS]: false,
	});

	// [重构] 通过 computed 属性暴露各个模态框的状态，方便模板中使用
	const showStoreModal = computed(() => modalVisibility.value[MODAL_KEYS.STORE]);
	const showUserOptionsModal = computed(() => modalVisibility.value[MODAL_KEYS.USER_OPTIONS]);
	const showLogoutConfirmModal = computed(() => modalVisibility.value[MODAL_KEYS.LOGOUT_CONFIRM]);
	const showInviteModal = computed(() => modalVisibility.value[MODAL_KEYS.INVITE]);
	const showTaskActionsModal = computed(() => modalVisibility.value[MODAL_KEYS.TASK_ACTIONS]);
	const showProcurementActionsModal = computed(() => modalVisibility.value[MODAL_KEYS.PROCUREMENT_ACTIONS]);

	const isAnyModalOpen = computed(() => Object.values(modalVisibility.value).some(isOpen => isOpen));

	function setActiveTab(tabKey : string) {
		activeTab.value = tabKey;
	}

	// [重构] 简化 openModal 和 closeModal 函数
	function openModal(modalName : ModalKey) {
		modalVisibility.value[modalName] = true;
	}

	function closeModal(modalName : ModalKey) {
		modalVisibility.value[modalName] = false;
	}

	return {
		activeTab,
		setActiveTab,
		// 暴露 computed 属性和方法
		showStoreModal,
		showUserOptionsModal,
		showLogoutConfirmModal,
		showInviteModal,
		showTaskActionsModal,
		showProcurementActionsModal,
		openModal,
		closeModal,
		isAnyModalOpen,
	};
});