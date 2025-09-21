<template>
	<view class="autocomplete-container" :style="{ zIndex: focused ? 99 : 1 }" @click.stop>
		<view class="input-wrapper">
			<input class="input-field" :class="{ 'with-tag': showTag }" :value="modelValue" :placeholder="placeholder" @input="onInput" @focus="onFocus" @blur="handleInputBlur" />
			<text v-if="showTag" class="recipe-tag-in-input" :style="tagStyle">{{ tagText }}</text>
		</view>
		<view v-if="showSuggestions" class="suggestions-container" :style="suggestionsStyle">
			<scroll-view :scroll-y="true" class="suggestions-scroll-view">
				<view v-for="item in filteredItems" :key="item.id" class="suggestion-item" @click="selectItem(item)">
					<text class="suggestion-name">{{ item.name }}</text>
					<text v-if="item.isRecipe" class="recipe-tag">自制</text>
				</view>
				<view v-if="canCreateNew" class="suggestion-item create-item" @click="createNewItem">
					<text class="create-icon">+</text>
					<text>新建: "{{ modelValue }}"</text>
				</view>
				<view v-if="filteredItems.length === 0 && !canCreateNew" class="no-results">无匹配项</view>
			</scroll-view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { ref, computed, watch, getCurrentInstance, onMounted, onUnmounted, nextTick } from 'vue';

const props = withDefaults(
	defineProps<{
		modelValue: string;
		items: { id: string | null; name: string; isRecipe?: boolean }[];
		placeholder?: string;
		showTag?: boolean;
		tagText?: string; // [核心新增] 自定义标签文本
		tagStyle?: Record<string, string>; // [核心新增] 自定义标签样式
	}>(),
	{
		modelValue: '',
		items: () => [],
		placeholder: '',
		showTag: false,
		tagText: '自制', // [核心新增] 默认标签文本
		tagStyle: () => ({}) // [核心新增] 默认标签样式为空对象
	}
);

const emit = defineEmits(['update:modelValue', 'select', 'blur']);

const instance = getCurrentInstance();
const focused = ref(false);
const inputRect = ref<UniApp.NodeInfo | null>(null);

// 定义一个用于处理全局点击的函数
const handleGlobalClick = () => {
	if (focused.value) {
		focused.value = false;
	}
};

// 在组件挂载时，监听全局事件
onMounted(() => {
	uni.$on('page-clicked', handleGlobalClick);
});

// 在组件卸载时，移除全局事件监听，防止内存泄漏
onUnmounted(() => {
	uni.$off('page-clicked', handleGlobalClick);
});

const filteredItems = computed(() => {
	if (!props.modelValue) {
		return [];
	}
	return props.items.filter((item) => item.name.toLowerCase().includes(props.modelValue.toLowerCase())).slice(0, 50);
});

const canCreateNew = computed(() => {
	if (!props.modelValue) {
		return false;
	}
	return !props.items.some((item) => item.name.toLowerCase() === props.modelValue.toLowerCase());
});

const suggestionsStyle = computed(() => {
	if (!inputRect.value) {
		return { display: 'none' };
	}
	const bottom = uni.getWindowInfo().windowHeight - (inputRect.value.top || 0);
	return {
		bottom: `${bottom}px`,
		left: `${inputRect.value.left || 0}px`,
		width: `${inputRect.value.width || 0}px`
	};
});

const showSuggestions = computed(() => {
	return focused.value && props.modelValue.length > 0;
});

const onInput = (event: any) => {
	emit('update:modelValue', event.detail.value);
};

const onFocus = () => {
	uni.$emit('page-clicked'); // [核心修改] 触发全局点击事件，关闭其他已打开的建议框
	focused.value = true;
	nextTick(() => {
		const query = uni.createSelectorQuery().in(instance);
		query
			.select('.input-field')
			.boundingClientRect((rect) => {
				if (rect) {
					inputRect.value = rect;
				}
			})
			.exec();
	});
};

// handleInputBlur 现在只负责发出 blur 事件，不再控制 focused 状态
const handleInputBlur = () => {
	emit('blur');
};

const selectItem = (item: { id: string | null; name: string }) => {
	emit('update:modelValue', item.name);
	emit('select', item);
	focused.value = false; // 点击选项时主动关闭
};

const createNewItem = () => {
	emit('select', { id: null, name: props.modelValue });
	focused.value = false; // 点击“新建”时主动关闭
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';
@include form-control-styles;

.autocomplete-container {
	position: relative;
}

.input-wrapper {
	position: relative;
	width: 100%;
}

.input-field.with-tag {
	padding-right: 85px; // [核心修改] 增加了标签的宽度以适应更长的文本
}

.recipe-tag-in-input {
	position: absolute;
	right: 12px;
	top: 50%;
	transform: translateY(-50%);
	background-color: #faedcd;
	color: var(--primary-color);
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 12px;
	font-weight: 500;
	pointer-events: none; // 确保标签不会捕获鼠标事件
	white-space: nowrap; // [核心新增] 防止标签文本换行
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
	display: flex;
	justify-content: space-between;
	align-items: center;

	&:last-child {
		border-bottom: none;
	}

	&:active {
		background-color: #f8f9fa;
	}
}

.recipe-tag {
	background-color: #faedcd;
	color: var(--primary-color);
	padding: 2px 8px;
	border-radius: 10px;
	font-size: 12px;
	font-weight: 500;
	flex-shrink: 0; // 防止标签被压缩
}

.create-item {
	display: flex;
	align-items: center;
	color: var(--primary-color);
	font-weight: 500;
	justify-content: flex-start;
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
