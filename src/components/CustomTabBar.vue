<template>
	<view class="custom-tab-bar">
		<view v-for="item in list" :key="item.key" class="tab-item" @click="switchTab(item)">
			<image class="icon" :src="uiStore.activeTab === item.key ? item.selectedIconPath : item.iconPath" />
			<view class="text" :class="{ 'text-active': uiStore.activeTab === item.key }">{{ item.text }}</view>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { useUiStore } from '@/store/ui'; // [核心新增] 引入 uiStore

	const uiStore = useUiStore(); // [核心新增] 初始化 uiStore

	// [核心修改] 为每个 tab 增加一个唯一的 key
	const list = ref([{
		key: "production",
		text: "制作",
		iconPath: "/static/tabbar/production.svg",
		selectedIconPath: "/static/tabbar/production_active.svg"
	}, {
		key: "ingredients",
		text: "原料",
		iconPath: "/static/tabbar/ingredients.svg",
		selectedIconPath: "/static/tabbar/ingredients_active.svg"
	}, {
		key: "recipes",
		text: "配方",
		iconPath: "/static/tabbar/recipes.svg",
		selectedIconPath: "/static/tabbar/recipes_active.svg"
	}, {
		key: "personnel",
		text: "人员",
		iconPath: "/static/tabbar/personnel.svg",
		selectedIconPath: "/static/tabbar/personnel_active.svg"
	}]);

	// [核心修改] 点击事件不再跳转页面，而是修改全局状态
	const switchTab = (item) => {
		uiStore.setActiveTab(item.key);
	};
</script>

<style scoped lang="scss">
	.custom-tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: calc(env(safe-area-inset-bottom) + 60px);
		padding-bottom: env(safe-area-inset-bottom);
		background-color: #ffffff;
		display: flex;
		justify-content: space-around;
		/* [核心修改] 将 align-items 从 flex-start 改为 center，确保 tab-item 在交叉轴上居中 */
		align-items: center;
		border-top: 1px solid var(--border-color);
		box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.04);
		/* [核心修改] 调整 z-index 层级，确保在页面内容之上，但在模态框之下 */
		z-index: 9998;
	}

	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 60px;
		flex: 1;
		/* [核心修改] 移除 padding-top，让 justify-content 完全控制垂直居中 */
	}

	.icon {
		width: 24px;
		height: 24px;
		margin-bottom: 4px;
	}

	.text {
		font-size: 10px;
		color: var(--text-secondary);
	}

	.text-active {
		color: var(--primary-color);
	}
</style>