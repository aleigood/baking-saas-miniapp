/**
 * 文件路径: src/types/api.d.ts
 * 文件描述: (已更新) 统一并修正了所有与后端API交互的TypeScript类型定义。
 */

// --- 认证相关 ---
export interface LoginRes {
	access_token : string;
}
export interface UserInfo {
	id : string;
	name : string;
	email : string | null;
}

// --- 核心业务对象 ---
export interface Tenant {
	id : string;
	name : string;
}

export interface ProductionTaskDto {
	id : string;
	recipeName : string;
	time : string; // ISO Date String
	creator : string;
	status : 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
}

export interface Recipe {
	id : string; // [修正] ID类型从 number 改为 string
	name : string;
	type : string;
	weight : number;
	rating : number; // 模拟数据
	publicCount : number;
	ingredients : RecipeIngredient[]; // 详情页数据
}

export interface RecipeIngredient {
	name : string;
	amount : string; // e.g., "100g" or "50%"
	cost : number;
}

export interface Ingredient {
	id : string; // [修正] ID类型从 number 改为 string
	name : string;
	brand : string;
	price : number; // 元/kg
	stock : number; // kg
}

export interface Member {
	id : string; // [修正] ID类型从 number 改为 string
	name : string;
	role : 'OWNER' | 'MANAGER' | 'BAKER';
	joinDate : string; // YYYY-MM-DD
}

// --- 统计相关 ---
export interface RecipeStatDto {
	name : string;
	count : number;
}

export interface IngredientStatDto {
	name : string;
	consumed : number; // kg
}