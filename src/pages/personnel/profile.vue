<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="个人信息" />
		<DetailPageLayout>
			<view class="page-content" v-if="editableUser">
				<view class="card">
					<view class="avatar-section" @click="openAvatarPicker">
						<UserAvatar :user-id="editableUser.id" :avatar-url="editableUser.avatarUrl" :size="100" />
						<text class="avatar-action">更换头像</text>
					</view>
					<FormItem label="姓名（选填）">
						<input class="input-field" type="text" v-model="editableUser.name" placeholder="可稍后补充姓名" />
					</FormItem>
					<FormItem label="手机号">
						<input class="input-field is-disabled" type="text" :value="editableUser.phone" disabled />
					</FormItem>
					<AppButton type="primary" full-width @click="handleUpdateProfile" :disabled="isSubmitting" :loading="isSubmitting">
						{{ isSubmitting ? '' : '保存修改' }}
					</AppButton>
				</view>

				<view class="card">
					<view class="card-title">修改密码</view>
					<FormItem label="当前密码">
						<input class="input-field" type="password" v-model="passwordForm.currentPassword" placeholder="请输入当前密码" />
					</FormItem>
					<FormItem label="新密码">
						<input class="input-field" type="password" v-model="passwordForm.newPassword" placeholder="请输入新密码" />
					</FormItem>
					<FormItem label="确认新密码">
						<input class="input-field" type="password" v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
					</FormItem>
					<AppButton type="secondary" full-width @click="handleChangePassword" :disabled="isChangingPassword" :loading="isChangingPassword">
						{{ isChangingPassword ? '' : '确认修改密码' }}
					</AppButton>
				</view>
			</view>
			<view class="loading-spinner" v-else>
				<text>加载中...</text>
			</view>
		</DetailPageLayout>

		<AppModal v-model:visible="showAvatarPicker" title="选择头像">
			<scroll-view scroll-y class="avatar-scroll" :show-scrollbar="false">
				<view v-if="loadingAvatars" class="avatar-loading">加载中...</view>
				<view v-else class="avatar-grid">
					<view
						v-for="avatar in avatarOptions"
						:key="avatar.id"
						class="avatar-option"
						:class="{ selected: pendingAvatarId === avatar.id }"
						@click="pendingAvatarId = avatar.id"
					>
						<UserAvatar :avatar-url="avatar.url" :size="50" />
					</view>
				</view>
			</scroll-view>
			<view class="modal-actions">
				<AppButton type="secondary" @click="showAvatarPicker = false">取消</AppButton>
				<AppButton type="primary" :disabled="!pendingAvatarId" @click="confirmAvatar">完成</AppButton>
			</view>
		</AppModal>
	</view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import { updateProfile, changePassword, getAvatarOptions, type AvatarOption } from '@/api/user';
import FormItem from '@/components/FormItem.vue';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import AppModal from '@/components/AppModal.vue';

// 定义组件选项
defineOptions({
	inheritAttrs: false
});

// Store 初始化
const userStore = useUserStore();
const toastStore = useToastStore();

// 响应式状态
const isSubmitting = ref(false);
const isChangingPassword = ref(false);
const editableUser = ref<{ id: string; name: string | null; phone: string; avatarId: string | null; avatarUrl: string | null } | null>(null);
const avatarOptions = ref<AvatarOption[]>([]);
const loadingAvatars = ref(false);
const showAvatarPicker = ref(false);
const pendingAvatarId = ref<string | null>(null);

const passwordForm = reactive({
	currentPassword: '',
	newPassword: '',
	confirmPassword: ''
});

// onMounted钩子：页面加载时，深拷贝用户信息以进行编辑
onMounted(() => {
	if (userStore.userInfo) {
		editableUser.value = JSON.parse(
			JSON.stringify({
				id: userStore.userInfo.id,
				name: userStore.userInfo.name,
				phone: userStore.userInfo.phone,
				avatarId: userStore.userInfo.avatarId,
				avatarUrl: userStore.userInfo.avatarUrl
			})
		);
	}
});

const loadAvatarOptions = async () => {
	if (avatarOptions.value.length > 0 || loadingAvatars.value) return;
	loadingAvatars.value = true;
	try {
		avatarOptions.value = await getAvatarOptions();
	} finally {
		loadingAvatars.value = false;
	}
};

const openAvatarPicker = async () => {
	if (!editableUser.value) return;
	pendingAvatarId.value = editableUser.value.avatarId;
	showAvatarPicker.value = true;
	await loadAvatarOptions();
};

const confirmAvatar = () => {
	if (!editableUser.value || !pendingAvatarId.value) return;
	const selected = avatarOptions.value.find((avatar) => avatar.id === pendingAvatarId.value);
	if (!selected) return;
	editableUser.value.avatarId = selected.id;
	editableUser.value.avatarUrl = selected.url;
	showAvatarPicker.value = false;
};

// 事件处理器：更新个人资料
const handleUpdateProfile = async () => {
	if (!editableUser.value) return;

	isSubmitting.value = true;
	try {
		const updatedInfo = await updateProfile({
			name: editableUser.value.name || '',
			avatarId: editableUser.value.avatarId || undefined
		});

		// 更新 Pinia store 中的用户信息
		userStore.userInfo!.name = updatedInfo.name;
		userStore.userInfo!.avatarId = updatedInfo.avatarId;
		userStore.userInfo!.avatarUrl = updatedInfo.avatarUrl;

		toastStore.show({ message: '个人信息更新成功', type: 'success' });
		uni.navigateBack();
	} catch (error) {
		console.error('更新个人信息失败:', error);
	} finally {
		isSubmitting.value = false;
	}
};

// 事件处理器：修改密码
const handleChangePassword = async () => {
	if (passwordForm.newPassword !== passwordForm.confirmPassword) {
		toastStore.show({ message: '两次输入的新密码不一致', type: 'error' });
		return;
	}
	if (!passwordForm.currentPassword || !passwordForm.newPassword) {
		toastStore.show({ message: '请输入当前密码和新密码', type: 'error' });
		return;
	}

	isChangingPassword.value = true;
	try {
		await changePassword(passwordForm);
		toastStore.show({ message: '密码修改成功', type: 'success' });
		// 重置表单
		passwordForm.currentPassword = '';
		passwordForm.newPassword = '';
		passwordForm.confirmPassword = '';
	} catch (error: any) {
		console.error('修改密码失败:', error);
	} finally {
		isChangingPassword.value = false;
	}
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include form-control-styles;

.page-wrapper {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.avatar-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	margin-bottom: 20px;
	cursor: pointer;
}

.avatar-action {
	margin-top: 10px;
	font-size: 13px;
	font-weight: 600;
	color: var(--primary-color);
}

.avatar-scroll {
	height: min(420px, 54vh);
}

.avatar-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 12px;
	padding: 4px 2px 12px;
}

.avatar-option {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 5px;
	border: 2px solid transparent;
	border-radius: 18px;
	background: #faf7f3;
	transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;

	&:active {
		transform: scale(0.96);
	}

	&.selected {
		border-color: var(--primary-color);
		background: #fff4ec;
	}
}

.avatar-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 240px;
	font-size: 14px;
	color: var(--text-secondary);
}

</style>
