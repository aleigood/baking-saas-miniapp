<template>
	<page-meta page-style="background-color: #f7f0e8;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="版本权益与价格" />
		<DetailPageLayout>
			<view class="benefits-page">
				<view class="hero-card">
					<view class="hero-kicker">BAKING BUSINESS</view>
					<view class="hero-title">从小规模试用，<br />到稳定经营</view>
					<view class="hero-desc">免费版不设时间限制。需要更大配方库、更多生产任务和团队席位时，再升级专业版。</view>
					<view class="trial-chip">专业版支持一次 {{ catalog?.trialDays || summary?.trial.days || 14 }} 天免费试用</view>
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
					<view><view class="promise-title">数据永远属于你</view><view class="promise-desc">订阅到期不会删除配方、生产记录与成本历史，查看和导出始终开放。</view></view>
				</view>

				<view class="section-heading pricing-heading">
					<view class="section-eyebrow">专业版价格</view>
					<view class="section-title">周期越长，月均越省</view>
				</view>

				<view v-if="loading" class="loading-card">正在读取最新套餐价格…</view>
				<view v-else class="pricing-list">
					<view
						v-for="plan in plans"
						:key="plan.id"
						class="price-card"
						:class="{ recommended: isRecommended(plan), selected: selectedPlanId === plan.id }"
						@click="selectedPlanId = plan.id"
					>
						<view v-if="isRecommended(plan)" class="recommend-badge">推荐 · 最划算</view>
						<view class="price-main">
							<view><view class="duration">{{ plan.name }}</view><view class="monthly">约 ¥{{ monthlyPrice(plan) }}/月</view></view>
							<view class="price-block">
								<view v-if="hasDiscount(plan)" class="original-price">¥{{ money(plan.originalPriceInCents!) }}</view>
								<view class="sale-price"><text class="currency">¥</text>{{ money(plan.priceInCents) }}</view>
							</view>
						</view>
						<view class="price-footer">
							<text>{{ discountText(plan) }}</text>
							<view class="radio" :class="{ checked: selectedPlanId === plan.id }"><view></view></view>
						</view>
					</view>
				</view>

				<view class="purchase-panel">
					<view class="purchase-copy"><text class="purchase-label">已选择</text><text class="purchase-plan">{{ selectedPlan?.name || '请选择套餐' }}</text></view>
					<AppButton v-if="isOwner" type="primary" full-width :disabled="!selectedPlanId" @click="continueToSubscribe">继续开通专业版</AppButton>
					<view v-else class="member-notice">订阅由店主统一购买，你无需单独付费。</view>
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
import { getBillingCatalog, getSubscriptionSummary, type BillingCatalog, type SubscriptionPlan, type SubscriptionSummary } from '@/api/billing';
import { useDataStore } from '@/store/data';
import { useUserStore } from '@/store/user';

const plans = ref<SubscriptionPlan[]>([]);
const summary = ref<SubscriptionSummary | null>(null);
const catalog = ref<BillingCatalog | null>(null);
const selectedPlanId = ref('');
const loading = ref(true);
const dataStore = useDataStore();
const userStore = useUserStore();

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

const isOwner = computed(() => userStore.userInfo?.tenants.find((item) => item.tenant.id === dataStore.currentTenantId)?.role === 'OWNER');
const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selectedPlanId.value));
const money = (cents: number) => (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
const monthsFor = (plan: SubscriptionPlan) => Math.max(1, Math.round(plan.durationDays / 31));
const monthlyPrice = (plan: SubscriptionPlan) => (plan.priceInCents / monthsFor(plan) / 100).toFixed(1);
const hasDiscount = (plan: SubscriptionPlan) => Boolean(plan.originalPriceInCents && plan.originalPriceInCents > plan.priceInCents);
const isRecommended = (plan: SubscriptionPlan) => monthsFor(plan) >= 12;
const discountText = (plan: SubscriptionPlan) => {
	if (!hasDiscount(plan)) return '灵活月付，随时续订';
	const saved = plan.originalPriceInCents! - plan.priceInCents;
	return `立省 ¥${money(saved)} · 相当于 ${Math.round((plan.priceInCents / plan.originalPriceInCents!) * 10)} 折`;
};

const continueToSubscribe = () => {
	if (!selectedPlanId.value) return;
	uni.navigateTo({ url: `/pages/subscription/subscription?planId=${selectedPlanId.value}` });
};

onMounted(async () => {
	try {
		const [catalogData, summaryData] = await Promise.all([getBillingCatalog(), getSubscriptionSummary()]);
		catalog.value = catalogData;
		const planData = catalogData.plans;
		plans.value = planData;
		summary.value = summaryData;
		selectedPlanId.value = planData.find(isRecommended)?.id || planData[0]?.id || '';
	} finally {
		loading.value = false;
	}
});
</script>

<style scoped lang="scss">
.page-wrapper { min-height: 100vh; background: #f7f0e8; }
.benefits-page { padding: 112px 18px 42px; max-width: 680px; margin: 0 auto; box-sizing: border-box; }
.hero-card { position: relative; overflow: hidden; padding: 28px 24px 25px; border-radius: 22px; color: #fffaf4; background: linear-gradient(145deg, #3f2d25 0%, #694836 58%, #8d6244 100%); box-shadow: 0 18px 38px rgba(67, 43, 30, 0.2); }
.hero-card::after { content: ''; position: absolute; width: 180px; height: 180px; right: -70px; top: -70px; border: 1px solid rgba(255,255,255,.14); border-radius: 50%; box-shadow: 0 0 0 28px rgba(255,255,255,.04), 0 0 0 58px rgba(255,255,255,.025); }
.hero-kicker, .section-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.7px; opacity: .72; }
.hero-title { position: relative; z-index: 1; margin-top: 9px; font-size: 29px; font-weight: 760; line-height: 1.22; letter-spacing: .3px; }
.hero-desc { position: relative; z-index: 1; max-width: 420px; margin-top: 13px; color: rgba(255,250,244,.76); font-size: 13px; line-height: 1.7; }
.trial-chip { display: inline-flex; position: relative; z-index: 1; margin-top: 18px; padding: 7px 11px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; background: rgba(255,255,255,.1); font-size: 11px; }
.section-heading { margin: 30px 4px 13px; }
.section-eyebrow { color: #9b7358; opacity: 1; }
.section-title { margin-top: 5px; color: #49362b; font-size: 21px; font-weight: 720; }
.comparison-card { overflow: hidden; border: 1px solid rgba(112,76,52,.13); border-radius: 17px; background: rgba(255,255,255,.88); box-shadow: 0 10px 28px rgba(76,49,32,.07); }
.comparison-row { display: grid; grid-template-columns: 1.35fr .82fr .82fr; min-height: 58px; border-bottom: 1px solid #eee4da; }
.comparison-row:last-child { border-bottom: 0; }
.comparison-head { min-height: 64px; background: #f3e8dc; }
.feature-cell, .plan-cell { display: flex; flex-direction: column; justify-content: center; padding: 11px 10px; box-sizing: border-box; }
.plan-cell { align-items: center; text-align: center; border-left: 1px solid #eee4da; }
.plan-cell.pro { color: #71492f; background: rgba(178,124,76,.055); }
.plan-name { color: #4c382c; font-size: 14px; font-weight: 720; }
.plan-note { margin-top: 3px; color: #9a8677; font-size: 10px; }
.feature-title { color: #584439; font-size: 12px; font-weight: 620; }
.feature-note { margin-top: 3px; color: #a39387; font-size: 9px; line-height: 1.35; }
.value-cell { color: #766459; font-size: 11px; font-weight: 560; }
.check { margin-right: 2px; color: #8c5a3b; font-weight: 800; }
.data-promise { display: flex; gap: 13px; align-items: center; margin-top: 14px; padding: 15px 17px; border: 1px solid rgba(88,119,91,.13); border-radius: 14px; background: #f4f7f1; }
.promise-icon { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 11px; color: #507055; background: #dfe9dc; font-size: 20px; font-weight: 700; }
.promise-title { color: #405645; font-size: 13px; font-weight: 700; }
.promise-desc { margin-top: 3px; color: #768178; font-size: 10px; line-height: 1.5; }
.pricing-heading { margin-top: 34px; }
.pricing-list { display: flex; flex-direction: column; gap: 11px; }
.price-card { position: relative; padding: 17px; border: 1.5px solid rgba(110,75,51,.14); border-radius: 16px; background: #fff; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
.price-card.selected { border-color: #956443; box-shadow: 0 10px 24px rgba(91,58,38,.11); transform: translateY(-1px); }
.price-card.recommended { padding-top: 25px; background: linear-gradient(145deg, #fffdf9, #fbf2e7); }
.recommend-badge { position: absolute; top: -1px; right: 14px; padding: 5px 10px 6px; border-radius: 0 0 9px 9px; color: #fff; background: #8c5a3b; font-size: 10px; font-weight: 700; }
.price-main, .price-footer { display: flex; align-items: center; justify-content: space-between; }
.duration { color: #49372d; font-size: 17px; font-weight: 720; }
.monthly { margin-top: 4px; color: #9b897c; font-size: 11px; }
.price-block { text-align: right; }
.original-price { color: #b1a399; font-size: 11px; text-decoration: line-through; }
.sale-price { color: #7d4d30; font-size: 25px; font-weight: 780; line-height: 1.1; }
.currency { margin-right: 2px; font-size: 13px; font-weight: 650; }
.price-footer { margin-top: 13px; padding-top: 11px; border-top: 1px solid #f0e8df; color: #9a7357; font-size: 10px; }
.radio { width: 19px; height: 19px; display: flex; align-items: center; justify-content: center; border: 1.5px solid #b9a99d; border-radius: 50%; }
.radio.checked { border-color: #8c5a3b; }
.radio.checked view { width: 10px; height: 10px; border-radius: 50%; background: #8c5a3b; }
.purchase-panel { margin-top: 18px; padding: 18px; border-radius: 17px; background: #fff; border: 1px solid rgba(110,75,51,.12); box-shadow: 0 12px 28px rgba(74,47,31,.08); }
.purchase-copy { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 13px; }
.purchase-label { color: #9d8a7d; font-size: 11px; }
.purchase-plan { color: #50392c; font-size: 16px; font-weight: 700; }
.member-notice, .loading-card { padding: 16px; border-radius: 12px; color: #80674f; background: #f8efe4; text-align: center; font-size: 12px; }
</style>
