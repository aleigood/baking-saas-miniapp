<template>
	<AppModal :visible="visible" @update:visible="handleClose" title="选择日期" width="80%">
		<view class="calendar-container">
			<view class="calendar-header">
				<view class="header-arrow" @click="changeMonth(-1)">‹</view>
				<view class="header-date">{{ currentYear }}年 {{ currentMonth + 1 }}月</view>
				<view class="header-arrow" @click="changeMonth(1)">›</view>
			</view>
			<view class="calendar-weekdays">
				<view v-for="day in weekdays" :key="day" class="weekday-item">{{ day }}</view>
			</view>
			<view class="calendar-grid">
				<view v-for="(day, index) in calendarDays" :key="index" class="day-cell"
					:class="{ 'not-current-month': !day.isCurrentMonth, 'is-today': day.isToday, 'is-selected': day.fullDate === selectedDate }"
					@click="selectDate(day)">
					<view class="day-number">{{ day.day }}</view>
					<view v-if="day.hasTask" class="task-marker"></view>
				</view>
			</view>
		</view>
	</AppModal>
</template>

<script setup lang="ts">
	import { ref, computed, watch } from 'vue';
	import AppModal from '@/components/AppModal.vue';
	import AppButton from '@/components/AppButton.vue';

	const props = defineProps({
		visible: {
			type: Boolean,
			default: false,
		},
		taskDates: {
			type: Array as () => string[],
			default: () => [],
		},
	});

	const emit = defineEmits(['close', 'select']);

	const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const currentYear = ref(today.getFullYear());
	const currentMonth = ref(today.getMonth());
	const selectedDate = ref(today.toISOString().split('T')[0]);

	watch(() => props.visible, (isVisible) => {
		if (isVisible) {
			const todayDate = new Date();
			currentYear.value = todayDate.getFullYear();
			currentMonth.value = todayDate.getMonth();
		}
	});

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
			const fullDate = dayDate.toISOString().split('T')[0];
			days.push({
				day: i,
				isCurrentMonth: true,
				isToday: dayDate.getTime() === today.getTime(),
				fullDate: fullDate,
				hasTask: props.taskDates.includes(fullDate),
			});
		}

		const nextMonthDaysNeeded = 42 - days.length;
		for (let i = 1; i <= nextMonthDaysNeeded; i++) {
			days.push({ day: i, isCurrentMonth: false });
		}
		return days;
	});

	const changeMonth = (offset : number) => {
		const newDate = new Date(currentYear.value, currentMonth.value + offset, 1);
		currentYear.value = newDate.getFullYear();
		currentMonth.value = newDate.getMonth();
	};

	const selectDate = (day : any) => {
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
		padding: 10px 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.header-arrow {
		padding: 5px 15px;
		cursor: pointer;
	}

	.calendar-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-size: 13px;
		color: var(--text-secondary);
		padding: 10px 0;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 5px;
	}

	.day-cell {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		/* [核心修改] 增加宽度确保单元格为正方形 */
		width: 40px;
		height: 40px;
		border-radius: 50%;
		position: relative;
	}

	.day-cell.not-current-month .day-number {
		color: #ccc;
	}

	/* [新增] 今日日期的文本加粗显示 */
	.day-cell.is-today .day-number {
		color: var(--primary-color);
		font-weight: bold;
	}

	.day-cell.is-selected {
		background-color: var(--primary-color);
	}

	.day-cell.is-selected .day-number {
		color: #fff;
	}

	.day-number {
		font-size: 15px;
	}

	.task-marker {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background-color: var(--primary-color);
		position: absolute;
		bottom: 5px;
	}

	.day-cell.is-selected .task-marker {
		background-color: #fff;
	}
</style>