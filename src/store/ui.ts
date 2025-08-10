import { defineStore } from 'pinia';
import { ref } from 'vue';

// 定义 UI 相关的状态
export const useUiStore = defineStore('ui', () => {
	// 当前激活的 Tab，默认为 'production'
	const activeTab = ref('production');

	// [核心新增] 全局模态框的显示状态
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const showInviteModal = ref(false);

	/**
	 * 设置当前激活的 Tab
	 * @param tabKey Tab的唯一标识
	 */
	function setActiveTab(tabKey : string) {
		activeTab.value = tabKey;
	}

	// [核心新增] 用于打开和关闭模态框的函数
	function openModal(modalName : 'store' | 'userMenu' | 'invite') {
		if (modalName === 'store') showStoreModal.value = true;
		if (modalName === 'userMenu') showUserMenu.value = true;
		if (modalName === 'invite') showInviteModal.value = true;
	}

	function closeModal(modalName : 'store' | 'userMenu' | 'invite') {
		if (modalName === 'store') showStoreModal.value = false;
		if (modalName === 'userMenu') showUserMenu.value = false;
		if (modalName === 'invite') showInviteModal.value = false;
	}


	return {
		activeTab,
		setActiveTab,
		// 暴露状态和方法
		showStoreModal,
		showUserMenu,
		showInviteModal,
		openModal,
		closeModal,
	};
});