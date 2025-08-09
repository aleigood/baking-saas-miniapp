<template>
	<view class="custom-tab-bar">
		<view v-for="item in list" :key="item.pagePath" class="tab-item" @click="switchTab(item)">
			<image class="icon" :src="currentPath.includes(item.pagePath) ? item.selectedIconPath : item.iconPath" />
			<view class="text" :class="{ 'text-active': currentPath.includes(item.pagePath) }">{{ item.text }}</view>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, onMounted } from 'vue';

	// 获取当前页面路由
	const pages = getCurrentPages();
	const currentPage = pages[pages.length - 1];
	const currentPath = currentPage.route;

	const list = ref([{
		pagePath: "pages/production/production",
		text: "制作",
		iconPath: "/static/tabbar/production.svg",
		selectedIconPath: "/static/tabbar/production_active.svg"
	}, {
		pagePath: "pages/ingredients/ingredients",
		text: "原料",
		iconPath: "/static/tabbar/ingredients.svg",
		selectedIconPath: "/static/tabbar/ingredients_active.svg"
	}, {
		pagePath: "pages/recipes/recipes",
		text: "配方",
		iconPath: "/static/tabbar/recipes.svg",
		selectedIconPath: "/static/tabbar/recipes_active.svg"
	}, {
		pagePath: "pages/personnel/personnel",
		text: "人员",
		iconPath: "/static/tabbar/personnel.svg",
		selectedIconPath: "/static/tabbar/personnel_active.svg"
	}]);

	const switchTab = (item) => {
		const url = '/' + item.pagePath;
		// [核心修改] 增加 animationType: 'none' 来消除页面切换动画，减少闪烁感
		uni.reLaunch({
			url,
			animationType: 'none'
		});
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
		z-index: 1000;
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