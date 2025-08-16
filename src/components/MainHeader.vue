<template>
	<view class="page-header" :style="headerStyle">
		<view class="header-content" :style="contentStyle">
			<view class="store-selector" @click="uiStore.openModal(MODAL_KEYS.STORE)">
				{{ dataStore.currentTenant?.name || '请选择店铺' }} &#9662;
			</view>
			<IconButton circle class="user-avatar" @click="uiStore.openModal(MODAL_KEYS.USER_OPTIONS)">
				{{ userStore.userInfo?.name?.[0] || '管' }}
			</IconButton>
		</view>
	</view>
</template>

<script setup lang="ts">
	import { computed } from 'vue';
	import { useUiStore } from '@/store/ui';
	import { useDataStore } from '@/store/data';
	import { useUserStore } from '@/store/user';
	import { useSystemStore } from '@/store/system';
	import { MODAL_KEYS } from '@/constants/modalKeys';
	import IconButton from '@/components/IconButton.vue';

	const uiStore = useUiStore();
	const dataStore = useDataStore();
	const userStore = useUserStore();
	const systemStore = useSystemStore();

	// [修改] 计算整个 header 的动态高度
	const headerStyle = computed(() => ({
		height: `${systemStore.headerHeight}px`
	}));

	// [修改] 计算 header 内容区域的动态定位和高度
	const contentStyle = computed(() => ({
		top: `${systemStore.navBarContentTop}px`,
		height: `${systemStore.navBarHeight}px`
	}));
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
</style>