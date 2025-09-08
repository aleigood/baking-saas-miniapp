<template <view class="autocomplete-container" :style="{ zIndex: focused ? 99 : 1 }">
	<input class="input-field" :value="modelValue" :placeholder="placeholder" @input="onInput" @focus="onFocus"
		@blur="onBlur" />
	<view v-if="showSuggestions" class="suggestions-container" :style="suggestionsStyle">
		<scroll-view :scroll-y="true" class="suggestions-scroll-view">
			<view v-for="item in filteredItems" :key="item.id" class="suggestion-item" @click="selectItem(item)">
				{{ item.name }}
			</view>
			<view v-if="canCreateNew" class="suggestion-item create-item" @click="createNewItem">
				<text class="create-icon">+</text>
				<text>新建: "{{ modelValue }}"</text>
			</view>
			<view v-if="filteredItems.length === 0 && !canCreateNew" class="no-results">
				无匹配项
			</view>
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, watch, getCurrentInstance, onMounted, nextTick } from 'vue';

	// [核心修复] 使用 withDefaults 宏来正确地为 props 定义类型和默认值
	const props = withDefaults(defineProps<{
		modelValue : string;
		items : { id : string | null; name : string }[];
		placeholder ?: string;
	}>(), {
		modelValue: '', // 为 modelValue 提供默认值
		items: () => [], // 数组和对象的默认值必须使用工厂函数
		placeholder: ''
	});

	const emit = defineEmits(['update:modelValue', 'select']);

	const instance = getCurrentInstance();
	const focused = ref(false);
	const inputRect = ref<UniApp.NodeInfo | null>(null);

	const filteredItems = computed(() => {
		if (!props.modelValue) {
			return [];
		}
		return props.items.filter(item =>
			item.name.toLowerCase().includes(props.modelValue.toLowerCase())
		).slice(0, 50);
	});

	const canCreateNew = computed(() => {
		if (!props.modelValue) {
			return false;
		}
		return !props.items.some(item => item.name.toLowerCase() === props.modelValue.toLowerCase());
	});

	const suggestionsStyle = computed(() => {
		if (!inputRect.value) {
			return { display: 'none' };
		}
		const bottom = uni.getSystemInfoSync().windowHeight - (inputRect.value.top || 0);
		return {
			bottom: `${bottom}px`,
			left: `${inputRect.value.left || 0}px`,
			width: `${inputRect.value.width || 0}px`,
		};
	});

	const showSuggestions = computed(() => {
		return focused.value && props.modelValue.length > 0;
	});

	const onInput = (event : any) => {
		emit('update:modelValue', event.detail.value);
	};

	const onFocus = () => {
		focused.value = true;
		nextTick(() => {
			const query = uni.createSelectorQuery().in(instance);
			query.select('.input-field').boundingClientRect(rect => {
				if (rect) {
					inputRect.value = rect;
				}
			}).exec();
		});
	};

	const onBlur = () => {
		setTimeout(() => {
			focused.value = false;
		}, 200);
	};

	const selectItem = (item : { id : string | null; name : string }) => {
		emit('update:modelValue', item.name);
		emit('select', item);
		focused.value = false;
	};

	const createNewItem = () => {
		emit('select', { id: null, name: props.modelValue });
		focused.value = false;
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	@include form-control-styles;

	/* [核心改造] 移除 flex:1 和 min-width，将布局控制权交还给父组件 */
	.autocomplete-container {
		position: relative;
	}

	.suggestions-container {
		position: fixed;
		background-color: #ffffff;
		border: 1px solid var(--border-color);
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		max-height: 200px;
		overflow: hidden;
		z-index: 100;
	}

	.suggestions-scroll-view {
		max-height: 200px;
	}

	.suggestion-item {
		padding: 12px 15px;
		font-size: 14px;
		color: var(--text-primary);
		border-bottom: 1px solid var(--border-color);

		&:last-child {
			border-bottom: none;
		}

		&:active {
			background-color: #f8f9fa;
		}
	}

	.create-item {
		display: flex;
		align-items: center;
		color: var(--primary-color);
		font-weight: 500;
	}

	.create-icon {
		margin-right: 8px;
		font-weight: bold;
	}

	.no-results {
		padding: 12px 15px;
		font-size: 14px;
		color: #999;
		text-align: center;
	}
</style>