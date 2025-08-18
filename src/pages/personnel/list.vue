<template>
	<page-meta page-style="overflow: hidden; background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="人员管理" />
		<DetailPageLayout>
			<view class="page-content no-horizontal-padding">
				<template v-if="dataStore.members.length > 0">
					<ListItem v-for="(member, index) in dataStore.members" :key="member.id"
						@click="navigateToDetail(member.id)" :bleed="true"
						:divider="index < dataStore.members.length - 1">
						<view class="main-info">
							<view class="name">{{ member.name || member.phone }}</view>
							<view class="desc">加入于: {{ formatChineseDate(member.joinDate) }}</view>
						</view>
						<view class="side-info">
							<view class="value">{{ getRoleName(member.role) }}</view>
						</view>
					</ListItem>
				</template>
				<view v-else class="empty-state">
					<text>暂无人员信息</text>
				</view>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
	import { onShow } from '@dcloudio/uni-app';
	import { useDataStore } from '@/store/data';
	import DetailHeader from '@/components/DetailHeader.vue';
	import DetailPageLayout from '@/components/DetailPageLayout.vue';
	import ListItem from '@/components/ListItem.vue';
	import type { Role } from '@/types/api';
	import { formatChineseDate } from '@/utils/format';

	const dataStore = useDataStore();

	// [新增] 页面显示时获取最新数据
	onShow(async () => {
		if (!dataStore.dataLoaded.members) {
			await dataStore.fetchMembersData();
		}
	});

	// [新增] 将角色英文标识转换为中文显示
	const getRoleName = (role : Role) => {
		const roleMap = {
			OWNER: '店主',
			ADMIN: '管理员',
			MEMBER: '员工',
			SUPER_ADMIN: '超级管理员'
		};
		return roleMap[role] || role;
	};

	// [新增] 导航到人员详情页
	const navigateToDetail = (memberId : string) => {
		uni.navigateTo({
			url: `/pages/personnel/detail?memberId=${memberId}`,
		});
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	@include list-item-content-style;

	.page-wrapper {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
</style>