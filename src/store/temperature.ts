/**
 * 文件路径: src/store/temperature.ts
 * 文件描述: [新增] 用于管理和持久化温度设置的 Pinia store
 */
import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';

// 定义温度设置的数据结构
export interface TemperatureSettings {
	mixerType: number;
	envTemp: number;
	flourTemp: number;
	waterTemp: number;
}

export const useTemperatureStore = defineStore('temperature', () => {
	// 定义和面机类型选项
	const mixerTypes = ref([
		{ text: '手揉', value: 4 },
		{ text: '双臂搅拌器', value: 5 },
		{ text: '家用（星型）和面机', value: 6 },
		{ text: '低速螺旋和面机', value: 7 },
		{ text: '卧式和面机', value: 8 },
		{ text: '高速螺旋和面机', value: 9 }
	]);

	// 使用 reactive 来管理设置对象
	const settings = reactive<TemperatureSettings>({
		mixerType: 9, // 高速螺旋和面机
		envTemp: 25,
		flourTemp: 25,
		waterTemp: 25
	});

	/**
	 * 从本地存储加载设置
	 */
	const initTemperatureSettings = () => {
		try {
			const storedSettings = uni.getStorageSync('temperature_settings');
			if (storedSettings) {
				const parsedSettings = JSON.parse(storedSettings);
				settings.mixerType = parsedSettings.mixerType ?? 9;
				settings.envTemp = parsedSettings.envTemp ?? 25;
				settings.flourTemp = parsedSettings.flourTemp ?? 25;
				settings.waterTemp = parsedSettings.waterTemp ?? 25;
			}
		} catch (e) {
			console.error('加载温度设置失败', e);
		}
	};

	/**
	 * 保存设置到本地存储
	 * @param newSettings 新的温度设置
	 */
	const saveTemperatureSettings = (newSettings: Partial<TemperatureSettings>) => {
		Object.assign(settings, newSettings);
		try {
			uni.setStorageSync('temperature_settings', JSON.stringify(settings));
		} catch (e) {
			console.error('保存温度设置失败', e);
		}
	};

	return {
		settings,
		mixerTypes,
		initTemperatureSettings,
		saveTemperatureSettings
	};
});
