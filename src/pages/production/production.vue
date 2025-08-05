<template>
	<view class="page-container">
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">
				{{ dataStore.currentTenant?.name || '请选择店铺' }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{
        userStore.userInfo?.phone[0] || '管'
      }}</view>
		</view>

		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
				<text>加载中...</text>
			</view>
			<template v-else>
				<!--进行中的任务 -->
				<view class="card-title-wrapper">
					<span class="card-title">进行中的任务</span>
					<image v-if="dataStore.production.length > 0" class="header-icon"
						src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238c5a3b'%3E%3Cpath d='M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8H12z'/%3E%3C/svg%3E"
						@click="alert('查看制作历史')" />
				</view>
				<view v-if="dataStore.production.length > 0">
					<view v-for="entry in dataStore.production" :key="entry.id" class="card">
						<view class="list-item">
							<view class="main-info">
								<view class="name">{{ entry.product.name }}</view>
								<view class="desc">{{ new Date(entry.plannedDate).toLocaleString() }} | 计划:
									{{ entry.quantity }}
								</view>
							</view>
							<view class="side-info">
								<view class="status-tag" :class="`status-${entry.status.toLowerCase()}`">
									{{ entry.status }}
								</view>
							</view>
						</view>
					</view>
				</view>
				<view v-else class="empty-state">
					<text>暂无进行中的任务</text>
				</view>
			</template>
		</view>

		<AppFab @click="navigateToCreatePage" />

		<AppModal v-model:visible="showStoreModal" title="选择门店">
			<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
				@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
		</AppModal>

		<AppModal v-model:visible="showUserMenu">
			<view class="list-item" style="border: none; padding: 10px 15px" @click="userStore.logout()">退出登录
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
	import { ref } from 'vue';
	import { onShow } from '@dcloudio/uni-app';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import AppModal from '@/components/AppModal.vue';
	import AppFab from '@/components/AppFab.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	const isLoading = ref(false);
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);

	onShow(async () => {
		isLoading.value = true;
		await dataStore.fetchProductionData();
		isLoading.value = false;
	});

	const navigateToCreatePage = () => {
		uni.navigateTo({
			url: '/pages/production/create',
		});
	};

	const handleSelectTenant = async (tenantId : string) => {
		if (dataStore.currentTenantId === tenantId) {
			showStoreModal.value = false;
			return;
		}
		isLoading.value = true;
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
		await dataStore.fetchProductionData();
		isLoading.value = false;
	};

	const alert = (msg : string) => {
		uni.showToast({ title: msg, icon: 'none' });
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';

	.status-tag {
		padding: 4px 12px;
		border-radius: 15px;
		font-size: 13px;
		color: white;
		font-weight: 500;
	}

	.status-pending {
		background-color: #f9ae3d;
	}

	.status-in_progress {
		background-color: #007bff;
	}

	.status-completed {
		background-color: #5ac725;
	}

	.status-cancelled {
		background-color: #a8a8a8;
	}

	.header-icon {
		width: 24px;
		height: 24px;
	}
</style>