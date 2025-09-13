import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MODAL_KEYS, type ModalKey } from '@/constants/modalKeys';

// 定义 UI 相关的状态
export const useUiStore = defineStore('ui', () => {
	const activeTab = ref('production');

	const toastMessageQueue = ref<{ message: string; type: 'success' | 'error' | 'info'; duration?: number } | null>(null);

	// [核心改造] 大幅精简 modalVisibility，只保留全局状态
	const modalVisibility = ref<Record<ModalKey, boolean>>({
		[MODAL_KEYS.STORE]: false,
		[MODAL_KEYS.USER_OPTIONS]: false,
		[MODAL_KEYS.LOGOUT_CONFIRM]: false
	});

	// [核心改造] 移除所有被本地化的 computed 属性
	const showStoreModal = computed(() => modalVisibility.value[MODAL_KEYS.STORE]);
	const showUserOptionsModal = computed(() => modalVisibility.value[MODAL_KEYS.USER_OPTIONS]);
	const showLogoutConfirmModal = computed(() => modalVisibility.value[MODAL_KEYS.LOGOUT_CONFIRM]);

	const isAnyModalOpen = computed(() => Object.values(modalVisibility.value).some((isOpen) => isOpen));

	function setActiveTab(tabKey: string) {
		activeTab.value = tabKey;
	}

	function openModal(modalName: ModalKey) {
		modalVisibility.value[modalName] = true;
	}

	function closeModal(modalName: ModalKey) {
		modalVisibility.value[modalName] = false;
	}

	function setNextPageToast(options: { message: string; type: 'success' | 'error' | 'info'; duration?: number }) {
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
		// [核心改造] 更新导出的状态列表
		showStoreModal,
		showUserOptionsModal,
		showLogoutConfirmModal,
		openModal,
		closeModal,
		isAnyModalOpen,
		setNextPageToast,
		consumeNextPageToast
	};
});
