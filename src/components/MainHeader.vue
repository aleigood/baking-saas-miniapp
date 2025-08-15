<template>
	<view class="page-header">
		<view class="store-selector" @click="uiStore.openModal('store')">
			{{ dataStore.currentTenant?.name || '请选择店铺' }} &#9662;
		</view>
		<IconButton circle class="user-avatar" @click="uiStore.openModal('userOptions')">
			{{ userStore.userInfo?.name?.[0] || '管' }}
		</IconButton>
	</view>
</template>

<script setup lang="ts">
	import { useUserStore } from '@/store/user';
	import { useDataStore } from '@/store/data';
	import { useUiStore } from '@/store/ui';
	import IconButton from '@/components/IconButton.vue';

	const userStore = useUserStore();
	const dataStore = useDataStore();
	const uiStore = useUiStore();
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
</style>