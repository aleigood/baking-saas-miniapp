<template>
	<view class="autocomplete-wrapper" :style="{ zIndex: focused ? 99 : 1 }">
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
	</view>
</template>

<script setup lang="ts">
	import { ref, computed, watch, getCurrentInstance, onMounted, nextTick } from 'vue';

	// [核心逻辑] 定义组件接收的props
	const props = defineProps<{
		modelValue : string; // 当前输入值，通过v-model绑定
		items : { id : string | null; name : string }[]; // 可供搜索的完整列表
		placeholder ?: string;
	}>();

	// [核心逻辑] 定义组件可触发的事件
	const emit = defineEmits(['update:modelValue', 'select']);

	const instance = getCurrentInstance();
	const focused = ref(false); // 输入框是否获得焦点
	const inputRect = ref<UniApp.NodeInfo | null>(null); // 输入框的位置信息

	// [核心逻辑] 计算过滤后的建议列表
	const filteredItems = computed(() => {
		if (!props.modelValue) {
			return [];
		}
		return props.items.filter(item =>
			item.name.toLowerCase().includes(props.modelValue.toLowerCase())
		).slice(0, 50); // 最多显示50个结果
	});

	// [核心逻辑] 判断是否可以创建新原料
	const canCreateNew = computed(() => {
		if (!props.modelValue) {
			return false;
		}
		// 当输入内容不为空，且在现有列表中找不到完全匹配项时，允许创建
		return !props.items.some(item => item.name.toLowerCase() === props.modelValue.toLowerCase());
	});

	// [核心逻辑] 根据输入框位置动态计算建议列表的样式
	const suggestionsStyle = computed(() => {
		if (!inputRect.value) {
			return { display: 'none' };
		}
		// 关键：将提示框定位在输入框的上方
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

	// [核心逻辑] 处理输入事件，更新v-model
	const onInput = (event : any) => {
		emit('update:modelValue', event.detail.value);
	};

	// [核心逻辑] 获取焦点时，记录输入框位置
	const onFocus = () => {
		focused.value = true;
		// 使用 nextTick 确保获取的是最新的DOM信息
		nextTick(() => {
			const query = uni.createSelectorQuery().in(instance);
			query.select('.input-field').boundingClientRect(rect => {
				if (rect) {
					inputRect.value = rect;
				}
			}).exec();
		});
	};

	// [核心逻辑] 失去焦点时，延迟隐藏建议列表，以便点击事件能被触发
	const onBlur = () => {
		setTimeout(() => {
			focused.value = false;
		}, 200);
	};

	// [核心逻辑] 选择建议项
	const selectItem = (item : { id : string | null; name : string }) => {
		emit('update:modelValue', item.name);
		emit('select', item);
		focused.value = false;
	};

	// [核心逻辑] 创建新项
	const createNewItem = () => {
		emit('select', { id: null, name: props.modelValue }); // id为null表示这是一个新创建的项
		focused.value = false;
	};
</script>

<style scoped lang="scss">
	@import '@/styles/common.scss';
	// 引入form-control-styles以确保输入框样式统一
	@include form-control-styles;

	.autocomplete-wrapper {
		position: relative;
		width: 100%;
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