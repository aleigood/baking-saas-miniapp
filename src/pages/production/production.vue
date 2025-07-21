<template>
	<view class="page-container">
		<!-- 页面头部 -->
		<view class="page-header">
			<view class="store-selector" @click="showStoreModal = true">{{ dataStore.currentTenant?.name }} &#9662;
			</view>
			<view class="user-avatar" @click="showUserMenu = true">{{ userStore.userInfo?.name[0] || '管' }}</view>
		</view>

		<!-- 页面内容 -->
		<view class="page-content">
			<view class="loading-spinner" v-if="isLoading">
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
								<view class="name">{{ entry.recipeName }}</view>
								<view class="desc">{{ new Date(entry.time).toLocaleString() }} by {{ entry.creator }}
								</view>
							</view>
							<view class="side-info">
								<view class="status-tag" :class="`status-${entry.status.toLowerCase()}`">
									{{ entry.status }}</view>
							</view>
						</view>
					</view>
				</view>
				<view v-else class="empty-state">
					<text>暂无进行中的任务</text>
				</view>
			</template>
		</view>

		<!-- 新建按钮 -->
		<view class="fab" @click="openCreateModal">+</view>

		<!-- [核心重构] 使用 AppModal 组件 -->
		<AppModal v-model:visible="showStoreModal" title="选择门店">
			<view v-for="tenant in dataStore.tenants" :key="tenant.id" class="list-item"
				@click="handleSelectTenant(tenant.id)">{{ tenant.name }}</view>
		</AppModal>

		<AppModal v-model:visible="showUserMenu">
			<view class="list-item" style="border: none; padding: 10px 15px;" @click="userStore.logout()">退出登录
			</view>
		</AppModal>

		<AppModal v-model:visible="showCreateModal" title="新建生产任务">
			<FormItem label="选择产品">
				<picker mode="selector" :range="recipeOptions" range-key="name" @change="onRecipeChange">
					<view class="picker">
						{{ selectedRecipeName || '请选择要制作的产品' }}
					</view>
				</picker>
			</FormItem>
			<FormItem label="计划数量">
				<input class="input-field" type="number" v-model.number="newTask.plannedQuantity" placeholder="请输入数量" />
			</FormItem>
			<view class="modal-actions">
				<button class="btn-cancel" @click="showCreateModal = false">取消</button>
				<button class="btn-confirm" @click="handleCreateTask" :disabled="isCreating" :loading="isCreating">
					{{ isCreating ? '创建中...' : '确认创建' }}
				</button>
			</view>
		</AppModal>

	</view>
</template>

<script setup lang="ts">
	import { ref, computed } from 'vue';
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { createTask } from '@/api/tasks';
	// [核心重构] 引入可复用组件
	import AppModal from '@/components/AppModal.vue';
	import FormItem from '@/components/FormItem.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();

	// 页面状态
	const isLoading = ref(false);
	const showStoreModal = ref(false);
	const showUserMenu = ref(false);
	const showCreateModal = ref(false);
	const isCreating = ref(false);

	// 新建任务表单
	const newTask = ref({
		productId: '',
		plannedQuantity: 1,
	});

	// --- 新建任务相关逻辑 ---
	const recipeOptions = computed(() => dataStore.recipes.map(r => ({ id: r.id, name: r.name })));
	const selectedRecipeName = computed(() => {
		const recipe = recipeOptions.value.find(r => r.id === newTask.value.productId);
		return recipe ? recipe.name : '';
	});

	const openCreateModal = () => {
		newTask.value = { productId: '', plannedQuantity: 1 };
		showCreateModal.value = true;
	};

	const onRecipeChange = (e : any) => {
		const selectedIndex = e.detail.value;
		newTask.value.productId = recipeOptions.value[selectedIndex].id;
	};

	const handleCreateTask = async () => {
		if (!newTask.value.productId) {
			uni.showToast({ title: '请选择产品', icon: 'none' });
			return;
		}
		if (!newTask.value.plannedQuantity || newTask.value.plannedQuantity <= 0) {
			uni.showToast({ title: '请输入有效的计划数量', icon: 'none' });
			return;
		}

		isCreating.value = true;
		try {
			await createTask(newTask.value);
			uni.showToast({ title: '创建成功', icon: 'success' });
			showCreateModal.value = false;
			await dataStore.loadDataForCurrentTenant();
		} catch (error) {
			console.error("Failed to create task:", error);
			uni.showToast({ title: '创建失败，请重试', icon: 'none' });
		} finally {
			isCreating.value = false;
		}
	};

	// --- 其他页面逻辑 ---
	const handleSelectTenant = async (tenantId : string) => {
		isLoading.value = true;
		await dataStore.selectTenant(tenantId);
		showStoreModal.value = false;
		isLoading.value = false;
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

	.status-in_progress {
		background-color: #f9ae3d;
	}

	.status-completed {
		background-color: #5ac725;
	}

	.status-canceled {
		background-color: #a8a8a8;
	}

	.picker,
	.input-field {
		width: 100%;
		height: 44px;
		line-height: 44px;
		padding: 0 12px;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		font-size: 14px;
		background-color: #f8f9fa;
		box-sizing: border-box;
		text-align: left;
	}

	.modal-actions {
		display: flex;
		gap: 10px;
		margin-top: 30px;
	}

	.modal-actions button {
		flex: 1;
		padding: 12px;
		border: none;
		border-radius: 12px;
		font-size: 16px;
		font-weight: 500;
	}

	.btn-cancel {
		background-color: #f3e9e3;
		color: var(--text-secondary);
	}

	.btn-confirm {
		background-color: var(--primary-color);
		color: white;
	}
</style>