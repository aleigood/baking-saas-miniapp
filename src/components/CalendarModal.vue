<template>
	<AppModal :visible="visible" @update:visible="handleClose" title="选择日期" width="90%">
		<view class="calendar-container">
			<view class="calendar-header">
				<view class="header-arrow" @click="changeMonth(-1)">‹</view>
				<view class="header-date">{{ currentYear }}年 {{ currentMonth + 1 }}月</view>
				<view class="header-arrow" @click="changeMonth(1)">›</view>
			</view>

			<view class="calendar-grid">
				<view v-for="day in weekdays" :key="day" class="weekday-item">{{ day }}</view>

				<view v-for="(day, index) in calendarDays" :key="index" class="day-cell-wrapper">
					<view v-if="day.isCurrentMonth" class="day-cell" :class="{ 'is-today': day.isToday, 'is-selected': day.fullDate === selectedDate }" @click="selectDate(day)">
						<view class="day-number">{{ day.day }}</view>
						<view v-if="day.hasTask" class="task-marker"></view>
					</view>
					<view v-else class="day-cell-placeholder">
						<view class="day-number">{{ day.day }}</view>
					</view>
				</view>
			</view>
		</view>
	</AppModal>
</template>

<script setup lang="ts">
// [提示] script 部分与之前完全相同，无需任何修改
import { ref, computed, watch } from 'vue';
import AppModal from '@/components/AppModal.vue';
import AppButton from '@/components/AppButton.vue';

const props = defineProps({
	visible: {
		type: Boolean,
		default: false
	},
	taskDates: {
		type: Array as () => string[],
		default: () => []
	}
});

const emit = defineEmits(['close', 'select']);

const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
const today = new Date();
today.setHours(0, 0, 0, 0);

const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth());
const selectedDate = ref(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);

watch(
	() => props.visible,
	(isVisible) => {
		if (isVisible) {
			const todayDate = new Date();
			currentYear.value = todayDate.getFullYear();
			currentMonth.value = todayDate.getMonth();
		}
	}
);

const calendarDays = computed(() => {
	const date = new Date(currentYear.value, currentMonth.value, 1);
	const firstDayOfWeek = date.getDay();
	const daysInMonth = new Date(currentYear.value, currentMonth.value + 1, 0).getDate();

	const days = [];
	const prevMonthDays = new Date(currentYear.value, currentMonth.value, 0).getDate();
	for (let i = firstDayOfWeek; i > 0; i--) {
		days.push({ day: prevMonthDays - i + 1, isCurrentMonth: false });
	}

	for (let i = 1; i <= daysInMonth; i++) {
		const dayDate = new Date(currentYear.value, currentMonth.value, i);
		const year = dayDate.getFullYear();
		const month = String(dayDate.getMonth() + 1).padStart(2, '0');
		const dayStr = String(dayDate.getDate()).padStart(2, '0');
		const fullDate = `${year}-${month}-${dayStr}`;

		days.push({
			day: i,
			isCurrentMonth: true,
			isToday: dayDate.getTime() === today.getTime(),
			fullDate: fullDate,
			hasTask: props.taskDates.includes(fullDate)
		});
	}

	const nextMonthDaysNeeded = 42 - days.length;
	for (let i = 1; i <= nextMonthDaysNeeded; i++) {
		days.push({ day: i, isCurrentMonth: false });
	}
	return days;
});

const changeMonth = (offset: number) => {
	const newDate = new Date(currentYear.value, currentMonth.value + offset, 1);
	currentYear.value = newDate.getFullYear();
	currentMonth.value = newDate.getMonth();
};

const selectDate = (day: any) => {
	if (!day.isCurrentMonth) return;
	selectedDate.value = day.fullDate;
	emit('select', day.fullDate);
};

const handleClose = () => {
	emit('close');
};
</script>

<style scoped lang="scss">
.calendar-container {
	padding: 10px;
}

.calendar-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0;
	/* [修改] 将上下内边距设置为0 */
	font-size: 16px;
	font-weight: 600;
	color: var(--text-primary);
}

.header-arrow {
	padding: 5px 15px;
	cursor: pointer;
}

/* [核心修改] 统一的网格布局 */
.calendar-grid {
	display: grid;
	grid-template-columns: repeat(7, 1fr);
	/* 让所有列等宽 */
	gap: 5px;
	/* 统一的间距 */
	align-items: center;
	/* 垂直居中对齐 */
}

/* [核心修改] 星期标题的样式 */
.weekday-item {
	text-align: center;
	font-size: 13px;
	color: var(--text-secondary);
	padding: 10px 0;
	/* 确保有足够的垂直空间 */
}

/* [核心修改] 日期单元格的容器，用于创建正方形 */
.day-cell-wrapper {
	width: 100%;
	position: relative;
	/* 创建一个正方形，padding-bottom基于宽度 */
	padding-bottom: 100%;
}

/* [核心修改] 日期单元格的通用样式 */
.day-cell,
.day-cell-placeholder {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	border-radius: 50%;
}

.day-cell {
	cursor: pointer;
	transition: background-color 0.2s ease;
	-webkit-tap-highlight-color: transparent; /* [核心新增] 去除小程序中点击时产生的蓝色背景框 */
}

/* [新增] 非当前月份的日期样式 */
.day-cell-placeholder .day-number {
	color: #ccc;
}

/* 当天日期样式 */
.day-cell.is-today .day-number {
	color: var(--primary-color);
	font-weight: bold;
}

/* 选中日期样式 */
.day-cell.is-selected {
	background-color: var(--primary-color);
}

.day-cell.is-selected .day-number,
.day-cell.is-selected .task-marker {
	color: #fff;
}

.day-number {
	font-size: 15px;
	line-height: 1;
}

.task-marker {
	width: 4px;
	height: 4px;
	border-radius: 50%;
	background-color: var(--primary-color);
	margin-top: 3px;
	/* 与数字的间距 */
}

.day-cell.is-selected .task-marker {
	background-color: #fff;
}
</style>
