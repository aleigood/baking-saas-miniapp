<template>
	<view v-if="summary && summary.state !== 'PAID' && visible" class="entitlement-banner" :style="{ top: systemStore.headerHeight + 10 + 'px' }" @click="openSubscription">
		<view class="status-mark" :class="summary.state.toLowerCase()"></view>
		<view class="banner-copy">
			<view class="banner-title">{{ title }}</view>
			<view class="banner-desc">{{ description }}</view>
		</view>
		<view class="banner-action">{{ isOwner ? '查看权益' : '查看' }}</view>
		<view class="banner-close" @click.stop="visible = false">×</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDataStore } from '@/store/data';
import { useEntitlementsStore } from '@/store/entitlements';
import { useSystemStore } from '@/store/system';
import { useUserStore } from '@/store/user';

const visible = ref(true);
const dataStore = useDataStore();
const entitlementsStore = useEntitlementsStore();
const systemStore = useSystemStore();
const userStore = useUserStore();
const summary = computed(() => entitlementsStore.summary);
const isOwner = computed(() => userStore.userInfo?.tenants.find((item) => item.tenant.id === dataStore.currentTenantId)?.role === 'OWNER');

const title = computed(() => {
	if (summary.value?.state === 'TRIAL') return '专业版试用中';
	if (summary.value?.state === 'GRACE') return '订阅已到期 · 宽限期内';
	return '当前使用免费版';
});

const description = computed(() => {
	if (!summary.value) return '';
	if (summary.value.state === 'TRIAL') return `完整功能已开放，试用至 ${formatDate(summary.value.entitledUntil)}`;
	if (summary.value.state === 'GRACE') return `功能暂时保留至 ${formatDate(summary.value.graceEndsAt)}，续订后不中断经营`;
	return `${summary.value.usage.mainRecipes}/${summary.value.limits.mainRecipes ?? '∞'} 个主配方 · ${summary.value.usage.productionTasksThisMonth}/${summary.value.limits.productionTasksPerMonth ?? '∞'} 个本月任务`;
});

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('zh-CN') : '');
const openSubscription = () => uni.navigateTo({ url: '/pages/subscription/benefits' });
</script>

<style scoped lang="scss">
.entitlement-banner {
	position: fixed;
	left: 14px;
	right: 14px;
	z-index: 89;
	min-height: 62px;
	display: flex;
	align-items: center;
	gap: 11px;
	padding: 11px 42px 11px 14px;
	box-sizing: border-box;
	border: 1px solid rgba(140, 90, 59, 0.18);
	border-radius: 15px;
	background: rgba(255, 252, 247, 0.96);
	box-shadow: 0 12px 30px rgba(86, 55, 35, 0.14);
	-webkit-backdrop-filter: blur(18px);
	backdrop-filter: blur(18px);
}
.status-mark { width: 9px; height: 34px; flex: 0 0 auto; border-radius: 9px; background: #b9854f; }
.status-mark.trial { background: linear-gradient(180deg, #9c704d, #d5a164); }
.status-mark.grace { background: linear-gradient(180deg, #c77b3c, #e1ad66); }
.banner-copy { flex: 1; min-width: 0; }
.banner-title { color: #49372d; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; }
.banner-desc { margin-top: 3px; color: #8a7668; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.banner-action { color: #8c5a3b; font-size: 12px; font-weight: 650; white-space: nowrap; }
.banner-close { position: absolute; top: 4px; right: 9px; color: #b5a79d; font-size: 20px; line-height: 24px; }
</style>
