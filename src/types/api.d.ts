/**
 * 文件路径: src/types/api.d.ts
 * 文件描述: (已更新) 增加了配方版本相关的数据类型。
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

// --- 邀请相关 ---
export interface InvitationResponse {
	invitationCode : string;
	expiresAt : string; // ISO Date String
}

// --- [新增] 配方版本相关 ---
export interface RecipeVersion {
	id : string;
	versionNumber : number;
	name : string;
	isActive : boolean;
	createdAt : string; // ISO Date String
	recipeFamilyId : string;
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

// [更新] 将原 Recipe 类型重命名为 ProductListItem，更准确地描述其用途
export interface ProductListItem {
	id : string;
	name : string;
	type : string; // 这实际上是 RecipeFamily 的 name
	weight : number;
	rating : number; // 模拟数据
	publicCount : number;
	// [新增] 添加 familyId 以便在详情页中获取版本信息
	familyId : string;
	// [更新] 详情数据将在进入详情页时单独获取
	ingredients : any[]; // 列表页暂时为空
}

export interface RecipeIngredient {
	name : string;
	amount : string; // e.g., "100g" or "50%"
	cost : number;
}

export interface Ingredient {
	id : string;
	name : string;
	brand : string;
	price : number; // 元/kg
	stock : number; // kg
}

export interface Member {
	id : string;
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