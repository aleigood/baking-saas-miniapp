<template>
	<page-meta page-style="background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="查看权益" />
		<DetailPageLayout>
			<view class="benefits-page" :style="{ paddingTop: (systemStore.headerHeight || 88) + 15 + 'px' }">
				<view class="hero-card">
					<view class="hero-kicker">BAKING BUSINESS</view>
					<view class="hero-title">从小规模试用，<br />到稳定经营</view>
					<view class="hero-desc">免费版不设时间限制。需要更大配方库、更多生产任务和团队席位时，再升级专业版。</view>
				</view>

				<view class="section-heading">
					<view class="section-eyebrow">权益对比</view>
					<view class="section-title">适合不同经营阶段</view>
				</view>

				<view class="comparison-card">
					<view class="comparison-head comparison-row">
						<view class="feature-cell">功能与额度</view>
						<view class="plan-cell"><text class="plan-name">免费版</text><text class="plan-note">永久免费</text></view>
						<view class="plan-cell pro"><text class="plan-name">专业版</text><text class="plan-note">完整经营</text></view>
					</view>
					<view v-for="item in benefitRows" :key="item.label" class="comparison-row benefit-row">
						<view class="feature-cell"><text class="feature-title">{{ item.label }}</text><text v-if="item.note" class="feature-note">{{ item.note }}</text></view>
						<view class="plan-cell value-cell">{{ item.free }}</view>
						<view class="plan-cell value-cell pro"><text class="check">✓</text>{{ item.pro }}</view>
					</view>
				</view>

				<view class="data-promise">
					<view class="promise-icon">∞</view>
					<view class="promise-content">
						<view class="promise-title">数据永远属于你</view>
						<view class="promise-desc">订阅到期不会删除配方、生产记录与成本历史，查看和导出始终开放。</view>
					</view>
				</view>

				<!-- 用户当前状态与引导订阅面板 -->
				<view class="status-banner" v-if="summary">
					<template v-if="summary.state === 'FREE'">
						<AppButton type="primary" full-width @click="goToManageSubscription">升级专业尊享版</AppButton>
					</template>
					<template v-else>
						<view class="active-status">
							<view class="status-icon">👑</view>
							<view class="status-info">
								<view class="status-name">已激活：{{ stateName }}</view>
								<view class="status-expiry">{{ expiryText }}</view>
							</view>
							<view class="status-action">
								<AppButton type="secondary" size="small" @click="goToManageSubscription">管理订阅</AppButton>
							</view>
						</view>
					</template>
				</view>
			</view>
		</DetailPageLayout>
	</view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import { getBillingCatalog, getSubscriptionSummary, type BillingCatalog, type SubscriptionSummary } from '@/api/billing';
import { useSystemStore } from '@/store/system';
import { formatChineseDate } from '@/utils/format';

const summary = ref<SubscriptionSummary | null>(null);
const catalog = ref<BillingCatalog | null>(null);
const loading = ref(true);
const systemStore = useSystemStore();

const benefitRows = computed(() => {
	const free = catalog.value?.tiers.find((tier) => tier.tier === 'FREE')?.config;
	const pro = catalog.value?.tiers.find((tier) => tier.tier === 'PRO')?.config;
	if (!free || !pro) return [];
	const limit = (value: number | null, suffix = '') => (value === null ? '不限' : `${value}${suffix}`);
	const enabled = (value: boolean) => (value ? '完整开放' : '不开放');
	return [
		{ label: '主配方', note: '面种与馅料不占额度', free: limit(free.limits.mainRecipes, ' 个'), pro: limit(pro.limits.mainRecipes, ' 个') },
		{ label: '生产任务', note: '按自然月统计', free: limit(free.limits.productionTasksPerMonth, ' 个/月'), pro: limit(pro.limits.productionTasksPerMonth, ' 个/月') },
		{ label: '团队成员', note: '店主也计入成员', free: limit(free.limits.members, ' 人'), pro: limit(pro.limits.members, ' 人') },
		{ label: '成本与售价测算', free: enabled(free.features.costing), pro: enabled(pro.features.costing) },
		{ label: '经营统计', free: enabled(free.features.statistics), pro: enabled(pro.features.statistics) },
		{ label: '批量导入', free: enabled(free.features.batchImport), pro: enabled(pro.features.batchImport) },
		{ label: '数据导出', free: enabled(free.features.export), pro: enabled(pro.features.export) }
	];
});

const stateName = computed(() => {
	if (!summary.value) return '';
	const map: Record<string, string> = {
		TRIAL: '专业版试用',
		PAID: '专业尊享版',
		GRACE: '专业版 (宽限期)'
	};
	return map[summary.value.state] || '';
});

const expiryText = computed(() => {
	if (!summary.value) return '';
	if (summary.value.state === 'GRACE') return `保留至 ${formatChineseDate(summary.value.graceEndsAt!)}`;
	return `有效期至 ${formatChineseDate(summary.value.entitledUntil!)}`;
});

const goToManageSubscription = () => {
	uni.navigateTo({ url: '/pages/subscription/subscription' });
};

onMounted(async () => {
	try {
		const [catalogData, summaryData] = await Promise.all([getBillingCatalog(), getSubscriptionSummary()]);
		catalog.value = catalogData;
		summary.value = summaryData;
	} finally {
		loading.value = false;
	}
});
</script>

<style scoped lang="scss">
.page-wrapper {
	min-height: 100vh;
	background-color: #fdf8f2;
}

.benefits-page {
	padding-left: 18px;
	padding-right: 18px;
	padding-bottom: 42px;
	max-width: 680px;
	margin: 0 auto;
	box-sizing: border-box;
}

.hero-card {
	position: relative;
	overflow: hidden;
	padding: 28px 24px 25px;
	border-radius: 22px;
	color: #fffaf4;
	/* 高端香槟焦糖渐变 */
	background: linear-gradient(135deg, #d4a373 0%, #b07d50 40%, #8c5a3b 100%);
	box-shadow: 0 16px 36px rgba(140, 90, 59, 0.15);
}

.hero-card::after {
	content: '';
	position: absolute;
	width: 180px;
	height: 180px;
	right: -70px;
	top: -70px;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 50%;
	box-shadow: 0 0 0 28px rgba(255, 255, 255, 0.04), 0 0 0 58px rgba(255, 255, 255, 0.025);
}

.hero-kicker {
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 1.7px;
	opacity: 0.75;
}

.hero-title {
	position: relative;
	z-index: 1;
	margin-top: 9px;
	font-size: 28px;
	font-weight: 700;
	line-height: 1.25;
	letter-spacing: 0.3px;
}

.hero-desc {
	position: relative;
	z-index: 1;
	max-width: 420px;
	margin-top: 13px;
	color: rgba(255, 250, 244, 0.8);
	font-size: 13px;
	line-height: 1.7;
}

.section-heading {
	margin: 30px 4px 13px;
}

.section-eyebrow {
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 1.7px;
	color: #a27b5c;
}

.section-title {
	margin-top: 5px;
	color: #432e21;
	font-size: 20px;
	font-weight: 700;
}

.comparison-card {
	overflow: hidden;
	border: 1px solid rgba(212, 163, 115, 0.15);
	border-radius: 17px;
	background: #ffffff;
	box-shadow: 0 8px 24px rgba(140, 90, 59, 0.05);
}

.comparison-row {
	display: grid;
	grid-template-columns: 1.35fr 0.82fr 0.82fr;
	min-height: 58px;
	border-bottom: 1px solid #f7ece1;
}

.comparison-row:last-child {
	border-bottom: 0;
}

.comparison-head {
	min-height: 64px;
	/* 温暖素雅的微乳白背景 */
	background: #fefaf5;
}

.feature-cell,
.plan-cell {
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 11px 10px;
	box-sizing: border-box;
}

.plan-cell {
	align-items: center;
	text-align: center;
	border-left: 1px solid #f7ece1;
}

.plan-cell.pro {
	color: #8c5a3b;
	/* 去除粉红底色 */
}

.plan-name {
	color: #5c4538;
	font-size: 14px;
	font-weight: 700;
}

.plan-note {
	margin-top: 3px;
	color: #a39185;
	font-size: 10px;
}

.feature-title {
	color: #5c4538;
	font-size: 12px;
	font-weight: 600;
}

.feature-note {
	margin-top: 3px;
	color: #a39185;
	font-size: 9px;
	line-height: 1.35;
}

.value-cell {
	color: #766459;
	font-size: 11px;
	font-weight: 500;
}

.check {
	margin-right: 2px;
	color: #8c5a3b;
	font-weight: 700;
}

/* 去除冷绿，改为温馨的焦糖奶茶配色 */
.data-promise {
	display: flex;
	gap: 13px;
	align-items: center;
	margin-top: 14px;
	padding: 15px 17px;
	border: 1px solid rgba(212, 163, 115, 0.16);
	border-radius: 14px;
	background: #fffcf7;
}

.promise-icon {
	width: 34px;
	height: 34px;
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	border-radius: 11px;
	color: #8c5a3b;
	background: #fbf0e4;
	font-size: 20px;
	font-weight: 700;
}

.promise-content {
	flex: 1;
}

.promise-title {
	color: #5c3f2b;
	font-size: 13px;
	font-weight: 700;
}

.promise-desc {
	margin-top: 3px;
	color: #a39185;
	font-size: 10px;
	line-height: 1.5;
}

.status-banner {
	margin-top: 24px;
}

.active-status {
	display: flex;
	align-items: center;
	padding: 16px 20px;
	border-radius: 16px;
	background: linear-gradient(145deg, #fffaf3, #fdf5eb);
	border: 1px solid rgba(212, 163, 115, 0.25);
	box-shadow: 0 4px 16px rgba(140, 90, 59, 0.04);
}

.status-icon {
	font-size: 24px;
	margin-right: 14px;
	transform: translateY(-2px);
}

.status-info {
	flex: 1;
}

.status-name {
	font-size: 15px;
	font-weight: 700;
	color: #5c3f2b;
}

.status-expiry {
	margin-top: 4px;
	font-size: 12px;
	color: #a39185;
}

.status-action {
	margin-left: 10px;
}
</style>
