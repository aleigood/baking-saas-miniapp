/**
* 文件路径: /src/pages/index/index.vue (UI已更新)
* 文件描述: 首页设计为仪表盘（Dashboard）样式。
*/
<template>
	<view class="dashboard-page">
		<view class="header">
			<view class="user-greeting">
				<text class="greeting">你好,</text>
				<text class="user-name">{{ userStore.userInfo?.name || '用户' }}</text>
			</view>
			<button class="logout-btn" @click="userStore.logout()">退出</button>
		</view>

		<view class="main-content">
			<view class="stats-overview">
				<view class="stat-card">
					<text class="stat-value">12</text>
					<text class="stat-label">今日订单</text>
				</view>
				<view class="stat-card">
					<text class="stat-value">¥ 1,280</text>
					<text class="stat-label">今日销售额</text>
				</view>
				<view class="stat-card">
					<text class="stat-value">3</text>
					<text class="stat-label">待处理事项</text>
				</view>
			</view>

			<view class="quick-actions">
				<view class="section-title">快捷操作</view>
				<view class="actions-grid">
					<view class="action-card">
						<!-- 注意：您需要自己在/static/目录下提供这些图标 -->
						<image class="action-icon" src="/static/icon-new-order.png" />
						<text class="action-text">新建订单</text>
					</view>
					<view class="action-card">
						<image class="action-icon" src="/static/icon-products.png" />
						<text class="action-text">商品管理</text>
					</view>
					<view class="action-card">
						<image class="action-icon" src="/static/icon-customers.png" />
						<text class="action-text">客户列表</text>
					</view>
					<view class="action-card">
						<image class="action-icon" src="/static/icon-reports.png" />
						<text class="action-text">数据报表</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { useUserStore } from '@/store/user';
	const userStore = useUserStore();
</script>

<style scoped>
	.dashboard-page {
		background-color: #f7f8fa;
		min-height: 100vh;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px;
		padding-top: 40px;
		/* 适配刘海屏 */
		background-color: #fff;
		border-bottom: 1px solid #eee;
	}

	.user-greeting {
		display: flex;
		flex-direction: column;
	}

	.greeting {
		font-size: 14px;
		color: #999;
	}

	.user-name {
		font-size: 20px;
		font-weight: bold;
		color: #333;
	}

	.logout-btn {
		background-color: #fdecea;
		color: #e54d42;
		border: none;
		padding: 0 15px;
		height: 32px;
		line-height: 32px;
		border-radius: 16px;
		font-size: 14px;
		margin: 0;
	}

	.main-content {
		padding: 20px;
	}

	.stats-overview {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 20px;
	}

	.stat-card {
		flex: 1;
		background-color: #fff;
		padding: 20px;
		border-radius: 12px;
		text-align: center;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.03);
	}

	.stat-value {
		display: block;
		font-size: 24px;
		font-weight: bold;
		color: #8c5a3b;
		margin-bottom: 5px;
	}

	.stat-label {
		font-size: 12px;
		color: #999;
	}

	.quick-actions {
		background-color: #fff;
		padding: 20px;
		border-radius: 12px;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.03);
	}

	.section-title {
		font-size: 16px;
		font-weight: bold;
		margin-bottom: 20px;
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 15px;
	}

	.action-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.action-icon {
		width: 40px;
		height: 40px;
		margin-bottom: 8px;
	}

	.action-text {
		font-size: 12px;
		color: #666;
	}
</style>