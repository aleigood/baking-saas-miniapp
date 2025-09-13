<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="制作历史" />
		<DetailPageLayout @scrolltolower="handleLoadMore" @scroll="handleScroll">
			<view class="page-content">
				<view class="loading-spinner" v-if="isLoading && Object.keys(dataStore.historicalTasks).length === 0">
					<text>加载中...</text>
				</view>
				<template v-else>
					<view v-if="Object.keys(dataStore.historicalTasks).length > 0">
						<view v-for="(tasks, date) in dataStore.historicalTasks" :key="date" class="task-group">
							<view class="date-header">{{ date }}</view>
							<ListItem v-for="task in tasks" :key="task.id" card-mode :style="getTaskCardStyle(task)" @click="navigateToDetail(task)">
								<view class="task-info">
									<view class="title">{{ getTaskTitle(task) }}</view>
									<view class="details">{{ getTaskDetails(task) }}</view>
									<view v-if="task.status === 'COMPLETED' || task.status === 'CANCELLED'" class="details end-time">
										{{ task.status === 'COMPLETED' ? '完成于' : '取消于' }}:
										{{ formatEventTime(task.startDate, task.updatedAt) }}
									</view>
								</view>
								<view class="status-tag" :class="getStatusClass(task.status)">
									{{ getStatusText(task.status) }}
								</view>
							</ListItem>
						</view>
					</view>
					<view v-else class="empty-state">
						<text>暂无历史任务</text>
					</view>
					<view class="load-more-container">
						<view v-if="isLoadingMore" class="loading-spinner">加载中...</view>
						<view v-if="!dataStore.historicalTasksMeta.hasMore && !isLoading && Object.keys(dataStore.historicalTasks).length > 0" class="no-more-tasks">
							没有更多了
						</view>
					</view>
				</template>
			</view>
		</DetailPageLayout>
		<ExpandingFab :actions="fabActions" :no-tab-bar="true" :visible="isFabVisible" />
	</view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast'; // [核心新增] 引入toastStore
import { useUiStore } from '@/store/ui'; // [核心新增] 引入uiStore
import type { ProductionTaskDto } from '@/types/api';
import ListItem from '@/components/ListItem.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import ExpandingFab from '@/components/ExpandingFab.vue';
import { formatChineseDate, formatEventTime } from '@/utils/format';

defineOptions({
	inheritAttrs: false
});

const userStore = useUserStore();
const dataStore = useDataStore();
const toastStore = useToastStore(); // [核心新增] 获取toastStore实例
const uiStore = useUiStore(); // [核心新增] 获取uiStore实例
const isLoading = ref(false);
const isLoadingMore = ref(false);
// [核心改造] 新增导航锁
const isNavigating = ref(false);
// [核心新增] FAB 按钮可见性控制
const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const fabActions = computed(() => {
	return [
		{
			icon: '/static/icons/stats.svg',
			text: '生产统计',
			action: navigateToStats
		}
	];
});

onShow(async () => {
	// [核心改造] 每次页面显示时，重置导航锁
	isNavigating.value = false;

	// [核心新增] 指定自己的地址来消费Toast
	const toastMessage = uiStore.consumeNextPageToast('/pages/production/history');
	if (toastMessage) {
		toastStore.show(toastMessage);
	}

	// [核心改造] 实现按需刷新逻辑
	if (dataStore.dataStale.historicalTasks || !dataStore.dataLoaded.historicalTasks) {
		isLoading.value = true;
		await dataStore.fetchHistoricalTasks(false);
		isLoading.value = false;
	}
});

// [核心修复] 为滚动事件处理函数增加健壮性检查
const handleScroll = (event?: any) => {
	if (!event || !event.detail) {
		return;
	}
	const scrollTop = event.detail.scrollTop;

	if (Math.abs(scrollTop - lastScrollTop.value) <= scrollThreshold) {
		return;
	}

	if (scrollTop > lastScrollTop.value && scrollTop > 50) {
		// 向下滚动，隐藏按钮
		isFabVisible.value = false;
	} else {
		// 向上滚动，显示按钮
		isFabVisible.value = true;
	}

	lastScrollTop.value = scrollTop < 0 ? 0 : scrollTop;
};

const handleLoadMore = async () => {
	if (dataStore.historicalTasksMeta.hasMore && !isLoadingMore.value) {
		isLoadingMore.value = true;
		await dataStore.fetchHistoricalTasks(true);
		isLoadingMore.value = false;
	}
};

const getTaskTitle = (task: ProductionTaskDto) => {
	if (!task.items || task.items.length === 0) {
		return '未知任务';
	}
	return task.items.map((item) => `${item.product.name} x${item.quantity}`).join('、');
};

const getTotalQuantity = (task: ProductionTaskDto) => {
	if (!task.items) return 0;
	return task.items.reduce((sum, item) => sum + item.quantity, 0);
};

const getTaskDetails = (task: ProductionTaskDto) => {
	const formattedDate = formatChineseDate(task.startDate);
	const creator = userStore.userInfo?.name || userStore.userInfo?.phone || '创建人';
	const totalQuantity = getTotalQuantity(task);
	return `${formattedDate} - by ${creator} | 总数: ${totalQuantity}`;
};

const getStatusText = (status: ProductionTaskDto['status']) => {
	const map = {
		PENDING: '待开始',
		IN_PROGRESS: '进行中',
		COMPLETED: '已完成',
		CANCELLED: '已取消'
	};
	return map[status] || '未知';
};

const getStatusClass = (status: ProductionTaskDto['status']) => {
	const map = {
		PENDING: 'status-pending',
		IN_PROGRESS: 'status-inprogress',
		COMPLETED: 'status-completed',
		CANCELLED: 'status-cancelled'
	};
	return map[status] || '';
};

const getTaskCardStyle = (task: ProductionTaskDto) => {
	const colorMap = {
		COMPLETED: '#a9c1de',
		CANCELLED: '#a8a8a8'
	};
	const color = colorMap[task.status] || 'transparent';
	return {
		'--card-border-color': color
	};
};

const navigateToDetail = (task: ProductionTaskDto) => {
	// [核心改造] 增加导航锁
	if (isNavigating.value) return;
	isNavigating.value = true;

	uni.navigateTo({
		url: `/pages/production/detail?taskId=${task.id}&from=history`
	});
};

const navigateToStats = () => {
	// [核心改造] 增加导航锁
	if (isNavigating.value) return;
	isNavigating.value = true;
	uni.navigateTo({
		url: '/pages/production/stats'
	});
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.task-group {
	margin-bottom: 20px;
}

.date-header {
	font-size: 16px;
	font-weight: 600;
	color: var(--text-primary);
	padding: 0 5px 15px;
}

.task-info {
	flex: 1;
	margin-right: 15px;
}

.title {
	font-size: 16px;
	font-weight: 400;
	margin-bottom: 8px;
	word-break: break-all;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	line-height: 1.4;
}

.details {
	color: var(--text-secondary);
	font-size: 13px;
	margin-bottom: 4px;
}

.end-time {
	color: var(--text-secondary);
	font-size: 13px;
}

.status-tag {
	padding: 4px 12px;
	border-radius: 15px;
	font-size: 13px;
	color: white;
	font-weight: 500;
	white-space: nowrap;
}

.status-tag.status-completed {
	background-color: #a9c1de;
}

.status-tag.status-cancelled {
	background-color: #a8a8a8;
}

.load-more-container {
	padding: 15px;
	text-align: center;
	color: #999;
	font-size: 14px;
}
</style>
