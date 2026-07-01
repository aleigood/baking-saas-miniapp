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
					<FormItem label="微信昵称">
						<input class="input-field" type="nickname" :value="editableUser.wechatNickname" @blur="onNicknameBlur" placeholder="点击快速填入微信昵称" />
					</FormItem>
					<AppButton type="primary" full-width @click="handleUpdateProfile" :disabled="isSubmitting" :loading="isSubmitting">
						{{ isSubmitting ? '' : '保存修改' }}
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
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/store/user';
import { useToastStore } from '@/store/toast';
import { updateProfile, getAvatarOptions, type AvatarOption } from '@/api/user';
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
const editableUser = ref<{ id: string; wechatNickname: string | null; avatarId: string | null; avatarUrl: string | null } | null>(null);
const avatarOptions = ref<AvatarOption[]>([]);
const loadingAvatars = ref(false);
const showAvatarPicker = ref(false);
const pendingAvatarId = ref<string | null>(null);


// onMounted钩子：页面加载时，深拷贝用户信息以进行编辑，并后台预加载头像选项
onMounted(() => {
	if (userStore.userInfo) {
		editableUser.value = JSON.parse(
			JSON.stringify({
				id: userStore.userInfo.id,
				wechatNickname: userStore.userInfo.wechatNickname,
				avatarId: userStore.userInfo.avatarId,
				avatarUrl: userStore.userInfo.avatarUrl
			})
		);
	}
	// 预加载头像选项，避免打开弹窗时再等待接口请求
	loadAvatarOptions();
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

const onNicknameBlur = (event: { detail: { value: string } }) => {
	if (editableUser.value) editableUser.value.wechatNickname = event.detail.value.trim();
};

// 事件处理器：更新个人资料
const handleUpdateProfile = async () => {
	if (!editableUser.value) return;
	if (!editableUser.value.wechatNickname) {
		toastStore.show({ message: '请填写微信昵称', type: 'error' });
		return;
	}

	isSubmitting.value = true;
	try {
		const updatedInfo = await updateProfile({
			wechatNickname: editableUser.value.wechatNickname,
			avatarId: editableUser.value.avatarId || undefined
		});

		// 更新 Pinia store 中的用户信息
		userStore.userInfo!.wechatNickname = updatedInfo.wechatNickname;
		userStore.userInfo!.displayName = updatedInfo.displayName;
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
