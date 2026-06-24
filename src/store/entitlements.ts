import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getSubscriptionSummary, type SubscriptionSummary } from '@/api/billing';
import { useDataStore } from './data';

export const useEntitlementsStore = defineStore('entitlements', () => {
	const summary = ref<SubscriptionSummary | null>(null);
	const loading = ref(false);
	const loadedTenantId = ref('');

	async function refresh(force = false) {
		const tenantId = useDataStore().currentTenantId;
		if (!tenantId) {
			summary.value = null;
			loadedTenantId.value = '';
			return;
		}
		if (!force && loadedTenantId.value === tenantId && summary.value) return;
		loading.value = true;
		try {
			summary.value = await getSubscriptionSummary();
			loadedTenantId.value = tenantId;
		} finally {
			loading.value = false;
		}
	}

	function setSummary(value: SubscriptionSummary) {
		summary.value = value;
		loadedTenantId.value = useDataStore().currentTenantId;
	}

	function reset() {
		summary.value = null;
		loadedTenantId.value = '';
	}

	return { summary, loading, refresh, setSummary, reset };
});
