/**
 * 文件路径: src/utils/format.ts
 * 文件描述: 提供统一的格式化函数。
 */

/**
 * 格式化日期为 "YYYY/M/D" 的格式
 * @param dateInput - 可以是日期字符串或Date对象
 * @returns 格式化后的中文字符串，如果输入无效则返回空字符串
 */
export function formatChineseDate(dateInput : string | Date | null | undefined) : string {
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
export function formatTime(dateInput : string | Date | null | undefined) : string {
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
export function formatEventTime(primaryDateInput : string | Date, eventDateInput : string | Date) : string {
	try {
		const primaryDate = new Date(primaryDateInput);
		const eventDate = new Date(eventDateInput);

		if (isNaN(primaryDate.getTime()) || isNaN(eventDate.getTime())) {
			return '';
		}

		const isSameDay =
			primaryDate.getFullYear() === eventDate.getFullYear() &&
			primaryDate.getMonth() === eventDate.getMonth() &&
			primaryDate.getDate() === eventDate.getDate();

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
 * @description 例如：12.50 -> "12.5", 12.00 -> "12"
 * @param num - 需要格式化的数字
 * @returns 格式化后的字符串
 */
export function formatNumber(num : number | string | null | undefined) : string {
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
 * [核心新增] 智能格式化重量，自动在 g 和 kg 之间切换
 * @param grams - 需要格式化的克数
 * @returns 格式化后的带单位的字符串
 */
export function formatWeight(grams : number | null | undefined) : string {
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

	if (absGrams < 1000) {
		// 小于1kg时，显示g，移除不必要的小数
		return `${formatNumber(number)}g`;
	} else {
		// 大于等于1kg时，显示kg
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
export function formatDateTime(date : string | Date, format = 'YYYY-MM-DD HH:mm') : string {
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

	return format
		.replace('YYYY', String(year))
		.replace('MM', month)
		.replace('DD', day)
		.replace('HH', hours)
		.replace('mm', minutes)
		.replace('ss', seconds);
}