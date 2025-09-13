import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue'; // [核心修改] 引入 reactive
import { MODAL_KEYS, type ModalKey } from '@/constants/modalKeys';

// [核心新增] 定义 Toast 消息和目标地址的类型
type ToastMessage = { message: string; type: 'success' | 'error' | 'info'; duration?: number };
type ToastTarget = string;

// 定义 UI 相关的状态
export const useUiStore = defineStore('ui', () => {
	const activeTab = ref('production');

	// [核心改造] 将 toastMessageQueue 从单个对象升级为按目标地址存储的“信箱”
	const toastMessageQueue = reactive<Record<ToastTarget, ToastMessage>>({});

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

	/**
	 * [核心改造] setNextPageToast 现在接收一个 target 参数
	 * @param options - Toast 的配置对象
	 * @param target - 目标页面的路由路径
	 */
	function setNextPageToast(options: ToastMessage, target: ToastTarget) {
		toastMessageQueue[target] = options;
	}

	/**
	 * [核心改造] consumeNextPageToast 现在根据 target 参数来消费消息
	 * @param target - 当前页面的路由路径
	 * @returns 如果有匹配的消息，则返回消息对象，否则返回 null
	 */
	function consumeNextPageToast(target: ToastTarget): ToastMessage | null {
		const message = toastMessageQueue[target];
		if (message) {
			delete toastMessageQueue[target]; // 取出后立即销毁
		}
		return message || null;
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
