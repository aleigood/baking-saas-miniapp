<template>
	<view class="advanced-filter-bar-container">
		<scroll-view class="pills-scroll-view" :scroll-x="true" :show-scrollbar="false">
			<view class="pills-wrapper">
				<view v-for="filter in filters" :key="filter.key" class="dropdown-pill-wrapper">
					<view
						class="dropdown-pill ripple-container"
						:id="'pill-' + filter.key"
						@touchstart="handleTouchStart($event, filter.key)"
						@click="$emit('pill-click', filter.key)"
					>
						<span v-for="ripple in ripples[filter.key]" :key="ripple.id" class="ripple" :style="ripple.style"></span>
						<view class="pill-content">
							<text class="pill-text">{{ getPillText(filter) }}</text>
							<view class="arrow-down"></view>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>

		<view v-if="showSearch" class="search-btn-wrapper ripple-container" id="search-btn-ripple" @click="onSearchClick" @touchstart="handleTouchStart($event, 'search')">
			<span v-for="ripple in ripples['search']" :key="ripple.id" class="ripple" :style="ripple.style"></span>
			<view class="search-icon"></view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { reactive, getCurrentInstance, type PropType } from 'vue';

// --- 类型定义 ---
interface FilterOption {
	text: string;
	value: string | number;
}
interface Filter {
	key: string;
	label: string; // 用作默认文本
	options: FilterOption[];
}
interface ModelValue {
	keyword: string;
	[key: string]: any; // 其他筛选条件
}

// --- Props and Emits ---
const props = defineProps({
	modelValue: {
		type: Object as PropType<ModelValue>,
		required: true
	},
	filters: {
		type: Array as PropType<Filter[]>,
		default: () => []
	},
	showSearch: {
		type: Boolean,
		default: false
	}
});

const emit = defineEmits(['pill-click', 'search-click']);

const instance = getCurrentInstance();
const ripples = reactive<Record<string, any[]>>({});

// --- Methods ---
const getPillText = (filter: Filter) => {
	const selectedValue = props.modelValue[filter.key];
	if (selectedValue === null || selectedValue === undefined) {
		return filter.label;
	}
	const selectedOption = filter.options.find((opt) => opt.value === selectedValue);
	return selectedOption ? selectedOption.text : filter.label;
};

const onSearchClick = () => {
	emit('search-click');
};

// --- Ripple Effect Logic ---
// [核心修复] 恢复使用 uni.createSelectorQuery() 以兼容小程序环境
const handleTouchStart = (event: any, key: string) => {
	if (!ripples[key]) ripples[key] = [];
	const touch = event.touches[0];
	const targetId = event.currentTarget.id; // 从事件对象中获取当前元素的ID

	if (!targetId) return; // 如果没有ID则不执行后续操作

	const query = uni.createSelectorQuery().in(instance);
	query
		.select('#' + targetId) // 使用 ID 选择器精确定位元素
		.boundingClientRect((rect) => {
			if (rect) {
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				const size = Math.max(rect.width, rect.height) * 2;
				ripples[key].push({
					id: Date.now(),
					style: {
						width: `${size}px`,
						height: `${size}px`,
						top: `${y - size / 2}px`,
						left: `${x - size / 2}px`
					}
				});
				setTimeout(() => {
					if (ripples[key] && ripples[key].length > 0) ripples[key].shift();
				}, 600);
			}
		})
		.exec();
};
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.advanced-filter-bar-container {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 15px;
}

.pills-scroll-view {
	flex: 1;
	min-width: 0;
	white-space: nowrap;
	&::-webkit-scrollbar {
		display: none;
	}
}

.pills-wrapper {
	display: flex;
	gap: 10px;
}

.dropdown-pill {
	display: inline-flex;
	position: relative;
	overflow: hidden;
	transform: translateZ(0);
	border-radius: 20px;
	background-color: #f3e9e3;
	transition: transform 0.15s ease-out;
	padding: 6px 12px;
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
}

.pill-content {
	display: flex;
	align-items: center;
	gap: 6px;
	z-index: 1;
	position: relative;
}

.pill-text {
	font-size: 14px;
	font-weight: 500;
	color: var(--text-secondary);
}

.arrow-down {
	width: 0;
	height: 0;
	border-left: 5px solid transparent;
	border-right: 5px solid transparent;
	border-top: 6px solid var(--text-secondary);
}

.ripple {
	background-color: rgba(0, 0, 0, 0.1);
}

/* 搜索按钮样式 */
.search-btn-wrapper {
	flex-shrink: 0;
	width: 34px;
	height: 34px;
	border-radius: 50%;
	background-color: #f3e9e3;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-left: 10px;
	position: relative;
	overflow: hidden;
	transform: translateZ(0);
	cursor: pointer;
	-webkit-tap-highlight-color: transparent;
}

.search-icon {
	width: 16px;
	height: 16px;
	position: relative;
	z-index: 1;

	// 使用伪元素绘制搜索图标
	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 10px;
		height: 10px;
		border: 2px solid var(--text-secondary);
		border-radius: 50%;
	}
	&::after {
		content: '';
		position: absolute;
		bottom: 1px;
		right: 1px;
		width: 6px;
		height: 2px;
		background-color: var(--text-secondary);
		transform: rotate(45deg);
	}
}
</style>
