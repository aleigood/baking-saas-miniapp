/**
 * 文件路径: src/utils/format.ts
 * 文件描述: 提供统一的格式化函数。
 */

/**
 * [核心修复] 高精度乘法函数，增加对科学计数法的支持
 * @param a - 第一个乘数
 * @param b - 第二个乘数
 * @returns 准确的乘法结果
 */
export const multiply = (a: number, b: number): number => {
	// [修复] 处理科学计数法 (例如 1e-7)
	const getDecimalLength = (n: number) => {
		const str = String(n);
		if (str.includes('e-')) {
			return parseInt(str.split('e-')[1], 10);
		}
		const parts = str.split('.');
		return parts.length > 1 ? parts[1].length : 0;
	};

	const lenA = getDecimalLength(a);
	const lenB = getDecimalLength(b);

	// 计算放大倍数
	const multiplier = Math.pow(10, lenA + lenB);

	// 将浮点数转换为整数进行计算
	// Math.round 处理类似 0.7 * 10 = 7.000000000000001 的情况
	const intA = Math.round(a * Math.pow(10, lenA));
	const intB = Math.round(b * Math.pow(10, lenB));

	return (intA * intB) / multiplier;
};

/**
 * [核心新增] 获取 YYYY-MM-DD 格式的本地日期字符串
 * @param date - 可选的Date对象，默认为当前日期
 * @returns 格式化后的日期字符串
 */
export const getLocalDate = (date = new Date()): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

/**
 * 格式化日期为 "YYYY/M/D" 的格式
 * @param dateInput - 可以是日期字符串或Date对象
 * @returns 格式化后的中文字符串，如果输入无效则返回空字符串
 */
export function formatChineseDate(dateInput: string | Date | null | undefined): string {
	if (!dateInput) {
		return '';
	}
	try {
		const date = new Date(dateInput);
		// 验证日期是否有效
		if (isNaN(date.getTime())) {
			return '';
		}
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		return `${year}/${month}/${day}`;
	} catch (error) {
		console.error('Invalid date input for formatChineseDate:', dateInput);
		return '';
	}
}

/**
 * 格式化日期时间，只返回 "HH:mm" 格式的时间部分
 * @param dateInput - 可以是日期字符串或Date对象
 * @returns 格式化后的时间字符串，如果输入无效则返回空字符串
 */
export function formatTime(dateInput: string | Date | null | undefined): string {
	if (!dateInput) {
		return '';
	}
	try {
		const date = new Date(dateInput);
		if (isNaN(date.getTime())) {
			return '';
		}
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	} catch (error) {
		console.error('Invalid date input for formatTime:', dateInput);
		return '';
	}
}

/**
 * [新增] 智能格式化事件时间
 * @description 比较两个日期，如果它们是同一天，则只返回事件时间的时和分；否则，返回事件时间的月、日、时和分。
 * @param primaryDateInput - 主要参考日期 (如 plannedDate)
 * @param eventDateInput - 要格式化的事件日期 (如 updatedAt)
 * @returns 格式化后的时间或日期时间字符串
 */
export function formatEventTime(primaryDateInput: string | Date, eventDateInput: string | Date): string {
	try {
		const primaryDate = new Date(primaryDateInput);
		const eventDate = new Date(eventDateInput);

		if (isNaN(primaryDate.getTime()) || isNaN(eventDate.getTime())) {
			return '';
		}

		const isSameDay = primaryDate.getFullYear() === eventDate.getFullYear() && primaryDate.getMonth() === eventDate.getMonth() && primaryDate.getDate() === eventDate.getDate();

		const hours = String(eventDate.getHours()).padStart(2, '0');
		const minutes = String(eventDate.getMinutes()).padStart(2, '0');

		if (isSameDay) {
			return `${hours}:${minutes}`;
		} else {
			const month = eventDate.getMonth() + 1;
			const day = eventDate.getDate();
			return `${month}/${day} ${hours}:${minutes}`;
		}
	} catch (error) {
		console.error('Error in formatEventTime:', error);
		return '';
	}
}

/**
 * [核心修改] 优化数字格式化，移除末尾多余的零和小数点
 * @description 用于数量、重量等非金额数值。例如：12.50 -> "12.5", 12.00 -> "12"
 * @param num - 需要格式化的数字
 * @returns 格式化后的字符串
 */
export function formatNumber(num: number | string | null | undefined): string {
	if (num === null || num === undefined) {
		return '0';
	}
	const number = Number(num);
	if (isNaN(number)) {
		return '0';
	}
	// 使用 parseFloat 和 toFixed 来处理浮点数精度并移除末尾的零
	return String(parseFloat(number.toFixed(2)));
}

/**
 * [核心新增] 专门用于金额显示的格式化，强制保留两位小数
 * @description 用于价格、成本等金额数值。例如：12 -> "12.00", 12.5 -> "12.50"
 * @param num - 需要格式化的数字
 * @returns 格式化后的字符串
 */
export function formatMoney(num: number | string | null | undefined): string {
	if (num === null || num === undefined) {
		return '0.00';
	}
	const number = Number(num);
	if (isNaN(number)) {
		return '0.00';
	}
	return number.toFixed(2);
}

/**
 * [核心新增] 智能格式化重量，自动在 g 和 kg 之间切换
 * @param grams - 需要格式化的克数
 * @returns 格式化后的带单位的字符串
 */
export function formatWeight(grams: number | null | undefined): string {
	if (grams === null || grams === undefined) {
		return '0g';
	}
	const number = Number(grams);
	if (isNaN(number)) {
		return '0g';
	}

	const absGrams = Math.abs(number);

	if (absGrams === 0) {
		return '0g';
	}

	// [核心修改] 将单位切换的阈值从 1000g 改为 10000g
	if (absGrams < 10000) {
		// 小于10kg时，显示g，移除不必要的小数
		return `${formatNumber(number)}g`;
	} else {
		// 大于等于10kg时，显示kg
		const kg = number / 1000;
		// 同样移除不必要的小数
		return `${formatNumber(kg)}kg`;
	}
}

/**
 * 新增：格式化日期时间函数，用于采购记录列表
 * @param date - 日期对象或字符串
 * @param format - 格式，默认为 'YYYY-MM-DD HH:mm'
 * @returns 格式化后的日期字符串
 */
export function formatDateTime(date: string | Date, format = 'YYYY-MM-DD HH:mm'): string {
	if (!date) return '';
	const d = new Date(date);
	if (isNaN(d.getTime())) {
		return '';
	}

	const year = d.getFullYear();
	const month = (d.getMonth() + 1).toString().padStart(2, '0');
	const day = d.getDate().toString().padStart(2, '0');
	const hours = d.getHours().toString().padStart(2, '0');
	const minutes = d.getMinutes().toString().padStart(2, '0');
	const seconds = d.getSeconds().toString().padStart(2, '0');

	return format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day).replace('HH', hours).replace('mm', minutes).replace('ss', seconds);
}

/**
 * [核心新增] 智能地将小数转换为百分比，以避免浮点数精度问题
 * @param decimalValue - 从后端获取的小数值 (例如 0.2576)
 * @returns 格式化后的百分比数值 (例如 25.76)
 */
export const toPercentage = (decimalValue: number | null | undefined) => {
	if (decimalValue === null || decimalValue === undefined || isNaN(decimalValue)) {
		return 0;
	}
	// 直接使用高精度乘法
	return multiply(decimalValue, 100);
};

/**
 * [核心新增] 安全地将百分比转换为小数
 * @param percentageValue - 用户输入的百分比数值 (例如 25.76)
 * @returns 转换后的小数值 (例如 0.2576)
 */
export const toDecimal = (percentageValue: number | null | undefined) => {
	if (percentageValue === null || percentageValue === undefined) {
		return 0;
	}
	// [核心修改] 使用高精度乘法代替除法，彻底避免浮点数精度问题，无需四舍五入
	return multiply(percentageValue, 0.01);
};
