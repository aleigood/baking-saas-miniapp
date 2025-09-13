import { defineStore } from 'pinia';
import { ref } from 'vue';

type ToastType = 'success' | 'error' | 'info';

export const useToastStore = defineStore('toast', () => {
	const isVisible = ref(false);
	const message = ref('');
	const type = ref<ToastType>('info');
	let timer: ReturnType<typeof setTimeout> | null = null;

	// [核心新增] 用于记录上一条消息的内容和隐藏时间，以实现“冷却”效果
	let lastMessage = '';
	let hideTimestamp = 0;
	const COOLDOWN_PERIOD = 500; // ms, 定义一个500毫秒的冷却时间

	function show(options: { message: string; type?: ToastType; duration?: number }) {
		const now = Date.now();

		// [核心改造] 增加冷却判断：如果在冷却期内收到了与上一条完全相同的消息，则忽略
		if (options.message === lastMessage && now - hideTimestamp < COOLDOWN_PERIOD) {
			return;
		}

		// 如果有新的消息进来（无论是否相同），都清除旧的定时器，让新消息重置显示时间
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}

		message.value = options.message;
		type.value = options.type || 'info';
		isVisible.value = true;

		// 设置新的定时器以隐藏Toast
		timer = setTimeout(() => {
			hide();
		}, options.duration || 2000);
	}

	function hide() {
		// [核心改造] 在隐藏时，记录消息内容和当前时间戳
		lastMessage = message.value;
		hideTimestamp = Date.now();
		isVisible.value = false;
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	return {
		isVisible,
		message,
		type,
		show,
		hide
	};
});
