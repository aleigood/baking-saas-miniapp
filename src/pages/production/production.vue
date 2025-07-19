<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{ userStore.userInfo?.name[0] || '管' }}</view>
		</view>
		<view class="page-content">
			<view class="loading-spinner" v-if="dataStore.isLoading">
				<!-- 这里可以放置一个更美观的加载动画组件 -->
				<text>加载中...</text>
			</view>
			<template v-else>
				<view class="card-title-wrapper">
					<span class="card-title">进行中的任务</span>
					<span class="header-action">制作历史</span>
				</view>
				<view v-if="dataStore.production.length > 0">
					<view v-for="entry in dataStore.production" :key="entry.id" class="card">
						<view class="list-item">
							<view class="main-info">
								<view class="name">批次 #{{ entry.id }} - {{ entry.recipeName }}</view>
								<view class="desc">{{ entry.time }} by {{ entry.creator }}</view>
							</view>
							<view class="side-info">
								<view class="status-tag">{{ entry.status }}</view>
							</view>
						</view>
					</view>
				</view>
				<view v-else class="empty-state">
					<text>暂无进行中的任务</text>
				</view>
			</template>
		</view>
		<view class="fab">+</view>

		<!-- Modals -->
		<view v-if="showStoreModal" class="modal-overlay" @click="showStoreModal = false">
			<view class="modal-content" @click.stop>
				<view class="card-title" style="margin-bottom: 10px;">选择门店</view>
				<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
					@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
			</view>
		</view>
		<view v-if="showUserMenu" class="modal-overlay" @click="showUserMenu = false">
			<view class="modal-content" @click.stop
				style="width: auto; position: absolute; top: 85px; right: 15px; padding: 5px;">
				<view class="list-item" style="border: none; padding: 10px 15px;" @click="userStore.logout()">退出登录
				</view>
			</view>
		</view>

	</view>
</template>
<script setup lang="ts">
	import { ref } from 'vue';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);

	const handleSelectTenant = async (tenantId : string) => {
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
	};
</script>
<style scoped lang="scss">
	.status-tag {
		background-color: var(--accent-color);
		color: white;
		padding: 4px 12px;
		border-radius: 15px;
		font-size: 13px;
	}
</style>