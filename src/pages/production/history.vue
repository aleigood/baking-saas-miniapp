<template>
	<view class="page-container">
		<view class="page-header">
			<view class="detail-header">
				<view class="back-btn" @click="navigateBack">&#10094;</view>
				<h2 class="detail-title">制作历史</h2>
			</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<!-- [核心修改] 使用新的 groupedTasks 计算属性进行渲染 -->
				<view v-if="Object.keys(groupedTasks).length > 0">
					<view v-for="(tasks, date) in groupedTasks" :key="date" class="task-group">
						<view class="date-header">{{ date }}</view>
						<view v-for="task in tasks" :key="task.id" class="task-card"
							:class="getStatusClass(task.status)" @click="navigateToDetail(task)">
							<view class="task-info">
								<view class="title">{{ getTaskTitle(task) }}</view>
								<view class="details">{{ getTaskDetails(task) }}</view>
							</view>
							<view class="status-tag" :class="getStatusClass(task.status)">
								{{ getStatusText(task.status) }}
							</view>
						</view>
					</view>
				</view>
				<view v-else class="empty-state">
					<text>暂无历史任务</text>
				</view>
				<!-- [核心新增] 加载更多和没有更多的提示 -->
				<view class="load-more-container">
					<view v-if="isLoadingMore" class="loading-spinner">加载中...</view>
					<view v-if="!hasMoreTasks && !isLoading" class="no-more-tasks">没有更多了</view>
				</view>
			</template>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	// [核心修改] 引入 onReachBottom 钩子
	import { onShow, onReachBottom } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import type { ProductionTaskDto } from '@/types/api';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const isLoading = ref(true);

	// [核心新增] 分页相关状态
	const daysToShow = ref(3); // 初始加载3天的数据
	const isLoadingMore = ref(false); // 是否正在加载更多

	onShow(async () => {
		isLoading.value = true;
		await dataStore.fetchHistoricalTasks();
		isLoading.value = false;
	});

	// [核心新增] 页面滚动到底部时触发加载更多
	onReachBottom(() => {
		if (hasMoreTasks.value && !isLoadingMore.value) {
			isLoadingMore.value = true;
			// 模拟网络延迟
			setTimeout(() => {
				daysToShow.value += 3; // 每次多加载3天
				isLoadingMore.value = false;
			}, 500);
		}
	});

	// [核心新增] 计算属性，将所有历史任务按日期分组
	const allTasksByDate = computed(() => {
		const groups : { [key : string] : ProductionTaskDto[] } = {};
		for (const task of dataStore.historicalTasks) {
			const date = new Date(task.plannedDate);
			const day = date.getDate();
			const month = date.getMonth() + 1;
			const dayOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
			const key = `${month}月${day}日 ${dayOfWeek}`;

			if (!groups[key]) {
				groups[key] = [];
			}
			groups[key].push(task);
		}
		return groups;
	});

	// [核心新增] 获取所有日期的排序列表
	const sortedDates = computed(() => {
		return Object.keys(allTasksByDate.value).sort((a, b) => {
			// 将 "M月d日" 格式转回日期对象进行比较
			const dateA = new Date(new Date().getFullYear(), parseInt(a.split('月')[0]) - 1, parseInt(a.split('月')[1].split('日')[0]));
			const dateB = new Date(new Date().getFullYear(), parseInt(b.split('月')[0]) - 1, parseInt(b.split('月')[1].split('日')[0]));
			return dateB.getTime() - dateA.getTime();
		});
	});

	// [核心新增] 计算当前需要展示的日期
	const displayedDates = computed(() => {
		return sortedDates.value.slice(0, daysToShow.value);
	});

	// [核心新增] 判断是否还有更多数据可以加载
	const hasMoreTasks = computed(() => {
		return displayedDates.value.length < sortedDates.value.length;
	});

	// [核心修改] groupedTasks 现在基于 displayedDates 来生成
	const groupedTasks = computed(() => {
		const groups : { [key : string] : ProductionTaskDto[] } = {};
		for (const dateKey of displayedDates.value) {
			groups[dateKey] = allTasksByDate.value[dateKey];
		}
		return groups;
	});


	// [核心修改] 更新 getTaskTitle 逻辑以匹配主页
	const getTaskTitle = (task : ProductionTaskDto) => {
		if (!task.items || task.items.length === 0) {
			return '未知任务';
		}
		return task.items.map(item => `${item.product.name} x${item.quantity}`).join('、');
	};

	const getTotalQuantity = (task : ProductionTaskDto) => {
		if (!task.items) return 0;
		return task.items.reduce((sum, item) => sum + item.quantity, 0);
	};

	const getTaskDetails = (task : ProductionTaskDto) => {
		const date = new Date(task.plannedDate);
		const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
		const creator = userStore.userInfo?.name || userStore.userInfo?.phone || '创建人';
		const totalQuantity = getTotalQuantity(task);
		return `${formattedDate} - by ${creator} | 总数: ${totalQuantity}`;
	};

	const getStatusText = (status : ProductionTaskDto['status']) => {
		const map = {
			PENDING: '待开始',
			IN_PROGRESS: '进行中',
			COMPLETED: '已完成',
			CANCELLED: '已取消'
		};
		return map[status] || '未知';
	};

	const getStatusClass = (status : ProductionTaskDto['status']) => {
		const map = {
			PENDING: 'status-pending',
			IN_PROGRESS: 'status-inprogress',
			COMPLETED: 'status-completed',
			CANCELLED: 'status-cancelled'
		};
		return map[status] || '';
	};

	const navigateToDetail = (task : ProductionTaskDto) => {
		uni.navigateTo({
			url: `/pages/production/detail?taskId=${task.id}`
		});
	};

	const navigateBack = () => {
		uni.navigateBack();
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	/* [核心新增] 日期分组样式 */
	.task-group {
		margin-bottom: 20px;
	}

	.date-header {
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
		padding: 0 5px 15px;
	}

	.task-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--card-bg);
		padding: 20px;
		border-radius: 20px;
		margin-bottom: 15px;
		cursor: pointer;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
		border-left: 5px solid;
	}

	.task-card.status-completed {
		border-color: #a9c1de;
	}

	.task-card.status-cancelled {
		border-color: #a8a8a8;
	}

	.task-info {
		flex: 1;
		margin-right: 15px;
	}

	/* [核心修改] 更新标题样式以匹配主页，实现多行截断 */
	.task-card .title {
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

	.task-card .details {
		color: var(--text-secondary);
		font-size: 14px;
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

	/* [核心新增] 加载更多提示样式 */
	.load-more-container {
		padding: 15px;
		text-align: center;
		color: #999;
		font-size: 14px;
	}
</style>