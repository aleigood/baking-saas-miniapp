<template>
	<view>
		<view class="page-header">
			<!-- [核心修改] 使用 IconButton 组件包裹用户头像 -->
			<view class="store-selector" @click="uiStore.openModal('store')">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<IconButton circle class="user-avatar" @click="uiStore.openModal('userMenu')">
				{{ userStore.userInfo?.name?.[0] || '管' }}
			</IconButton>
		</view>
		<view class="page-content page-content-with-tabbar-fab">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<!-- [DELETED] 移除原料消耗排行图表 -->

				<FilterTabs>
					<FilterTab :active="ingredientFilter === 'all'" @click="ingredientFilter = 'all'">全部</FilterTab>
					<FilterTab :active="ingredientFilter === 'low'" @click="ingredientFilter = 'low'">库存紧张</FilterTab>
				</FilterTabs>
				<ListItem v-for="ing in filteredIngredients" :key="ing.id" @click="navigateToDetail(ing.id)">
					<view class="main-info">
						<view class="name">{{ ing.name }}</view>
						<view class="desc">品牌: {{ ing.activeSku?.brand || '未设置' }}</view>
					</view>
					<view class="side-info">
						<!-- [REFACTORED] 根据不同的筛选条件，展示不同的数据布局 -->
						<template v-if="ingredientFilter === 'low'">
							<!-- “库存紧张”视图：优先显示剩余天数 -->
							<view class="value-tag" :class="getStockStatusClass(ing.daysOfSupply)">
								{{ getDaysOfSupplyText(ing.daysOfSupply) }}
							</view>
							<view class="desc">库存: {{ (ing.currentStockInGrams / 1000).toFixed(2) }} kg</view>
						</template>
						<template v-else>
							<!-- “全部”视图：优先显示库存量，并附带总消耗量 -->
							<view class="value">
								{{ (ing.currentStockInGrams / 1000).toFixed(2) }} kg
							</view>
							<view v-if="ing.totalConsumptionInGrams > 0" class="desc consumption">
								已消耗: {{ (ing.totalConsumptionInGrams / 1000).toFixed(2) }} kg
							</view>
						</template>
					</view>
				</ListItem>
			</template>
		</view>
		<AppFab @click="navigateToEditPage" />
	</view>
</template>
<script setup lang="ts">
	import IconButton from '@/components/IconButton.vue'; // 引入 IconButton 组件
	import { ref, computed } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui';
	import type { Ingredient } from '@/types/api';
	import AppFab from '@/components/AppFab.vue';
	import BarChart from '@/components/BarChart.vue';
	import ListItem from '@/components/ListItem.vue';
	import FilterTabs from '@/components/FilterTabs.vue'; // 引入新组件
	import FilterTab from '@/components/FilterTab.vue'; // 引入新组件

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();
	const ingredientFilter = ref('all');
	const isLoading = ref(false);

	onShow(async () => {
		if (!dataStore.dataLoaded.ingredients) {
			isLoading.value = true;
			await dataStore.fetchIngredientsData();
			isLoading.value = false;
		}
	});

	// [REFACTORED] 重构 filteredIngredients 计算属性以支持新的排序逻辑
	const filteredIngredients = computed(() => {
		// 创建一个新数组副本以进行排序而不改变原始store状态
		const ingredientsCopy = [...dataStore.ingredients];

		if (ingredientFilter.value === 'low') {
			// 按可供应天数筛选和排序
			return ingredientsCopy
				.filter((ing) => ing.daysOfSupply < 7) // 筛选出供应天数少于7天的原料
				.sort((a, b) => a.daysOfSupply - b.daysOfSupply); // 按天数升序排列
		}

		// 默认（'all'）按总消耗量降序排序
		return ingredientsCopy.sort((a, b) => b.totalConsumptionInGrams - a.totalConsumptionInGrams);
	});


	const getDaysOfSupplyText = (days : number) => {
		if (!isFinite(days) || days > 365) {
			return '充足';
		}
		if (days < 1 && days > 0) {
			return '不足1天';
		}
		if (days <= 0) {
			return '已用尽';
		}
		return `约剩 ${Math.floor(days)} 天`;
	};

	// [ADDED] 新增一个方法来根据剩余天数返回对应的CSS类
	const getStockStatusClass = (days : number) => {
		if (days <= 0) {
			return 'stock-danger'; // 已用尽
		}
		if (days < 7) {
			return 'stock-warning'; // 库存紧张
		}
		return ''; // 正常
	};

	const navigateToEditPage = () => {
		uni.navigateTo({
			url: '/pages/ingredients/edit',
		});
	};

	const navigateToDetail = (ingredientId : string) => {
		uni.navigateTo({
			url: `/pages/ingredients/detail?ingredientId=${ingredientId}`,
		});
	};
</script>
<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [DELETED] 移除旧的 .stock-low 样式 */

	/* [ADDED] 为消耗量文本添加一点额外的上边距 */
	.side-info .consumption {
		margin-top: 2px;
	}

	/* [ADDED] 新增库存状态标签的样式 */
	.value-tag {
		font-size: 12px;
		/* 字体稍小一些 */
		font-weight: 500;
		/* 字体不过于粗 */
		padding: 3px 8px;
		border-radius: 6px;
		color: var(--text-secondary);
		background-color: #f3f4f6;
		/* 默认灰色背景 */
		display: inline-block;
		/* 使其成为块级元素以便应用padding */
	}

	.value-tag.stock-warning {
		background-color: #fef3c7;
		/* 柔和的黄色背景 */
		color: #92400e;
		/* 深琥珀色文字 */
	}

	.value-tag.stock-danger {
		background-color: #fee2e2;
		/* 柔和的红色背景 */
		color: #991b1b;
		/* 深红色文字 */
	}
</style>