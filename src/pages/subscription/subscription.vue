<template>
	<page-meta page-style="background-color: #fdf8f2;"></page-meta>
	<view class="page-wrapper">
		<DetailHeader title="订阅与续费"><text class="compare-link" @click="openBenefits">权益对比</text></DetailHeader>
		<DetailPageLayout>
			<view class="page-content">
				<view class="status-band">
					<view>
						<view class="status-title">{{ statusTitle }}</view>
						<view class="status-desc">{{ expiryText }}</view>
					</view>
					<view class="status-dot" :class="summary?.state?.toLowerCase()"></view>
				</view>

				<view v-if="summary" class="usage-card">
					<view class="usage-heading">当前权益</view>
					<view class="usage-grid">
						<view class="usage-item"><text class="usage-value">{{ summary.usage.mainRecipes }}</text><text class="usage-label">主配方{{ summary.fullAccess ? '' : ` / ${summary.limits.mainRecipes ?? '不限'}` }}</text></view>
						<view class="usage-item"><text class="usage-value">{{ summary.usage.productionTasksThisMonth }}</text><text class="usage-label">本月任务{{ summary.fullAccess ? '' : ` / ${summary.limits.productionTasksPerMonth ?? '不限'}` }}</text></view>
						<view class="usage-item"><text class="usage-value">{{ summary.usage.members }}</text><text class="usage-label">成员{{ summary.fullAccess ? '' : ` / ${summary.limits.members ?? '不限'}` }}</text></view>
					</view>
				</view>

				<view v-if="summary?.trial.eligible && isOwner" class="trial-card">
					<view class="trial-kicker">一次性体验机会</view>
					<view class="trial-title">免费开启 {{ summary.trial.days }} 天专业版</view>
					<view class="trial-desc">全部功能与额度开放，无需预先绑定支付方式。到期后数据完整保留，并自动回到免费版。</view>
					<AppButton type="secondary" full-width :loading="startingTrial" @click="handleStartTrial">开启专业版试用</AppButton>
				</view>

				<view v-if="summary?.recipeSelection.required" class="selection-card">
					<view class="section-title">选择免费版启用配方</view>
					<view class="selection-desc">最多选择 {{ summary.limits.mainRecipes ?? '不限' }} 个继续编辑和创建任务，其余配方会安全保留为只读。</view>
					<view v-for="recipe in summary.recipeSelection.recipes" :key="recipe.id" class="recipe-choice" @click="toggleRecipe(recipe.id)">
						<view class="choice-check" :class="{ selected: selectedFreeRecipeIds.includes(recipe.id) }"><text v-if="selectedFreeRecipeIds.includes(recipe.id)">✓</text></view>
						<text>{{ recipe.name }}</text>
					</view>
					<AppButton type="secondary" full-width :disabled="summary.limits.mainRecipes !== null && selectedFreeRecipeIds.length > summary.limits.mainRecipes" :loading="savingSelection" @click="saveRecipeSelection">保存选择</AppButton>
				</view>

				<view class="section-title">选择使用期限</view>
				<view class="plan-list">
					<view v-for="plan in plans" :key="plan.id" class="plan-item" :class="{ selected: selectedPlanId === plan.id }" @click="selectedPlanId = plan.id">
						<view class="plan-main">
							<view class="plan-name">{{ plan.name }}</view>
							<view class="plan-days">{{ plan.durationDays }} 天使用期</view>
						</view>
						<view class="price-block">
							<view class="price">¥{{ formatPrice(plan.priceInCents) }}</view>
							<view v-if="plan.originalPriceInCents" class="original-price">¥{{ formatPrice(plan.originalPriceInCents) }}</view>
						</view>
					</view>
				</view>

				<view v-if="!isOwner" class="owner-notice">只有店主可以购买或续订，请联系店主处理。</view>
				<AppButton type="primary" full-width :loading="paying" :disabled="!selectedPlanId || !isOwner" @click="handlePurchase">
					{{ summary?.active ? '续订所选套餐' : '立即开通' }}
				</AppButton>
			</view>
		</DetailPageLayout>
		<Toast />
	</view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppButton from '@/components/AppButton.vue';
import DetailHeader from '@/components/DetailHeader.vue';
import DetailPageLayout from '@/components/DetailPageLayout.vue';
import Toast from '@/components/Toast.vue';
import { bindWechat } from '@/api/auth';
import { createPaymentOrder, getPaymentCapabilities, getSubscriptionPlans, getSubscriptionSummary, selectFreeTierRecipes, startProfessionalTrial, syncPaymentOrder, type SubscriptionPlan, type SubscriptionSummary } from '@/api/billing';
import { useDataStore } from '@/store/data';
import { useToastStore } from '@/store/toast';
import { useUserStore } from '@/store/user';
import { formatChineseDate } from '@/utils/format';
import { useEntitlementsStore } from '@/store/entitlements';

const plans = ref<SubscriptionPlan[]>([]);
const summary = ref<SubscriptionSummary | null>(null);
const selectedPlanId = ref('');
const paying = ref(false);
const startingTrial = ref(false);
const savingSelection = ref(false);
const selectedFreeRecipeIds = ref<string[]>([]);
const paymentMode = ref<'mock' | 'wechat'>('wechat');
const dataStore = useDataStore();
const userStore = useUserStore();
const toastStore = useToastStore();
const entitlementsStore = useEntitlementsStore();

const isOwner = computed(() => userStore.userInfo?.tenants.find((item) => item.tenant.id === dataStore.currentTenantId)?.role === 'OWNER');
const statusTitle = computed(() => ({ PAID: '专业版使用中', TRIAL: '专业版试用中', GRACE: '订阅宽限期', FREE: '免费版' })[summary.value?.state || 'FREE']);
const expiryText = computed(() => {
	if (!summary.value) return '正在读取店铺权益';
	if (summary.value.state === 'FREE') return '小规模永久免费，达到额度后可按需升级';
	if (summary.value.state === 'GRACE') return `完整功能保留至 ${formatChineseDate(summary.value.graceEndsAt!)}`;
	return `当前权益至 ${formatChineseDate(summary.value.entitledUntil!)}`;
});

const formatPrice = (cents: number) => (cents / 100).toFixed(2);
const openBenefits = () => uni.navigateTo({ url: '/pages/subscription/benefits' });

const loadData = async () => {
	const [planData, subscriptionData, capabilities] = await Promise.all([getSubscriptionPlans(), getSubscriptionSummary(), getPaymentCapabilities()]);
	plans.value = planData;
	summary.value = subscriptionData;
	entitlementsStore.setSummary(subscriptionData);
	selectedFreeRecipeIds.value = subscriptionData.recipeSelection.recipes.filter((recipe) => recipe.freeTierEnabled).map((recipe) => recipe.id);
	paymentMode.value = capabilities.paymentMode;
	if (!selectedPlanId.value && planData.length) selectedPlanId.value = planData[0].id;
};

const handleStartTrial = async () => {
	if (startingTrial.value) return;
	startingTrial.value = true;
	try {
		const result = await startProfessionalTrial();
		summary.value = result;
		entitlementsStore.setSummary(result);
		toastStore.show({ message: `${result.trial.days} 天专业版试用已开启`, type: 'success' });
	} finally {
		startingTrial.value = false;
	}
};

const toggleRecipe = (recipeId: string) => {
	if (!summary.value) return;
	const index = selectedFreeRecipeIds.value.indexOf(recipeId);
	if (index >= 0) selectedFreeRecipeIds.value.splice(index, 1);
	else if (summary.value.limits.mainRecipes === null || selectedFreeRecipeIds.value.length < summary.value.limits.mainRecipes) selectedFreeRecipeIds.value.push(recipeId);
};

const saveRecipeSelection = async () => {
	savingSelection.value = true;
	try {
		const result = await selectFreeTierRecipes(selectedFreeRecipeIds.value);
		summary.value = result;
		entitlementsStore.setSummary(result);
		dataStore.markRecipesAsStale();
		dataStore.markProductsForTaskCreationAsStale();
		toastStore.show({ message: '免费版启用配方已更新', type: 'success' });
	} finally {
		savingSelection.value = false;
	}
};

const getWechatCode = () =>
	new Promise<string>((resolve, reject) => {
		uni.login({ provider: 'weixin', success: (result) => (result.code ? resolve(result.code) : reject(new Error('未获取到微信登录凭证'))), fail: reject });
	});

const requestPayment = (options: UniApp.RequestPaymentOptions) =>
	new Promise<void>((resolve, reject) => uni.requestPayment({ ...options, success: () => resolve(), fail: reject }));

onLoad((options) => {
	if (options?.planId) selectedPlanId.value = options.planId;
});

const handlePurchase = async () => {
	if (!selectedPlanId.value || paying.value) return;
	paying.value = true;
	try {
		if (paymentMode.value === 'wechat') await bindWechat(await getWechatCode());
		const order = await createPaymentOrder(selectedPlanId.value);
		if (!order.mockPaid) {
			if (!order.paymentParams) throw new Error('支付参数缺失');
			await requestPayment(order.paymentParams);
			await syncPaymentOrder(order.orderNo);
		}
		await loadData();
		toastStore.show({ message: '订阅已开通', type: 'success' });
		setTimeout(() => uni.reLaunch({ url: '/pages/main/main' }), 500);
	} catch (error: any) {
		if (String(error?.errMsg || '').includes('cancel')) toastStore.show({ message: '支付已取消', type: 'info' });
	} finally {
		paying.value = false;
	}
};

onMounted(loadData);
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
.page-wrapper { min-height: 100vh; background: var(--bg-color); }
.compare-link { color: var(--primary-color); font-size: 13px; font-weight: 600; }
.status-band { display: flex; justify-content: space-between; align-items: center; padding: 18px 0; border-bottom: 1px solid var(--border-color); margin-bottom: 24px; }
.status-title { font-size: 19px; font-weight: 600; color: var(--text-primary); }
.status-desc, .plan-days { margin-top: 5px; color: var(--text-secondary); font-size: 13px; }
.status-dot { width: 11px; height: 11px; border-radius: 50%; background: #c8c8c8; }
.status-dot.paid { background: #3f9b66; }
.status-dot.trial { background: #b8844e; }
.status-dot.grace { background: #d4863e; }
.section-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.plan-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
.plan-item { display: flex; justify-content: space-between; align-items: center; min-height: 72px; padding: 12px 15px; background: #fff; border: 1px solid var(--border-color); border-radius: 8px; box-sizing: border-box; }
.plan-item.selected { border-color: var(--primary-color); box-shadow: inset 3px 0 0 var(--primary-color); }
.plan-name { font-size: 16px; font-weight: 600; }
.price-block { text-align: right; }
.price { color: var(--primary-color); font-size: 18px; font-weight: 600; }
.original-price { color: var(--text-secondary); font-size: 12px; text-decoration: line-through; }
.owner-notice { color: #a06b2c; background: #fff6e8; padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-bottom: 14px; }
.usage-card, .trial-card, .selection-card { padding: 18px; margin-bottom: 24px; border-radius: 14px; background: #fff; border: 1px solid rgba(140, 90, 59, 0.13); box-shadow: 0 8px 24px rgba(89, 61, 42, 0.06); }
.usage-heading, .trial-kicker { color: var(--text-secondary); font-size: 12px; letter-spacing: 0.5px; }
.usage-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
.usage-item { display: flex; flex-direction: column; gap: 4px; padding: 12px 8px; text-align: center; border-radius: 10px; background: #faf5ef; }
.usage-value { color: #5d4032; font-size: 21px; font-weight: 700; }
.usage-label { color: var(--text-secondary); font-size: 11px; }
.trial-card { background: linear-gradient(145deg, #fffaf3, #f8ecdd); border-color: rgba(174, 119, 69, 0.22); }
.trial-title { margin-top: 5px; color: #4f3729; font-size: 18px; font-weight: 700; }
.trial-desc, .selection-desc { margin: 7px 0 16px; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
.recipe-choice { display: flex; align-items: center; gap: 11px; min-height: 44px; border-bottom: 1px solid #f0e8df; font-size: 14px; }
.recipe-choice:last-of-type { margin-bottom: 15px; }
.choice-check { width: 19px; height: 19px; border: 1.5px solid #b8a798; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; }
.choice-check.selected { border-color: #8c5a3b; background: #8c5a3b; }
</style>
