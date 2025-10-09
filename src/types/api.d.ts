/**
 * 文件路径: src/types/api.d.ts
 * 文件描述: (已更新) 生产任务详情 DTO 全面升级为通用“组件”模型
 */

// ... (文件顶部其他类型保持不变) ...

// [核心新增] 定义批量导入结果的类型
export interface BatchImportResult {
	totalCount: number;
	importedCount: number;
	skippedCount: number;
	skippedRecipes: string[];
}

export type RecipeCategory = 'BREAD' | 'PASTRY' | 'DESSERT' | 'DRINK' | 'OTHER';

export interface CalculatedRecipeIngredient {
	name: string;
	weightInGrams: number;
	brand?: string | null;
	isRecipe: boolean;
	extraInfo?: string;
}
export interface CalculatedRecipeDetails {
	id: string;
	name: string;
	type: 'MAIN' | 'PRE_DOUGH' | 'EXTRA';
	totalWeight: number;
	procedure: string[];
	ingredients: CalculatedRecipeIngredient[];
}
export interface PrepTask {
	id: string;
	title: string;
	details: string;
	items: CalculatedRecipeDetails[];
	status?: 'PREP';
}
export interface ProductionDataPayload {
	stats?: {
		pendingCount: number;
	};
	tasks: (
		| ProductionTaskDto
		| (PrepTask & {
				status: 'PREP';
		  })
	)[];
	prepTask: null;
}

// --- 认证与用户 ---
export interface LoginRes {
	accessToken: string;
	redirectTo?: string; // [核心新增] 新增可选的重定向路径
}

export interface UserInfo {
	id: string;
	phone: string;
	name: string | null;
	avatarUrl: string | null; // [核心新增] 新增用户头像URL
	role: Role;
	status: string;
	createdAt: string;
	tenants: {
		tenant: Tenant;
		role: Role;
	}[];
}

// --- 租户/店铺 ---
export interface Tenant {
	id: string;
	name: string;
	status: 'ACTIVE' | 'INACTIVE'; // [核心新增] 店铺状态
}

// --- 邀请 ---
export interface InvitationResponse {
	message: string;
	invitationId: string;
}

// --- 配方、产品与版本 ---
export interface RecipeFamily {
	id: string;
	name: string;
	type: 'MAIN' | 'PRE_DOUGH' | 'EXTRA';
	category: RecipeCategory; // [核心新增] 增加品类字段
	deletedAt: string | null; // [修复] 使用 deletedAt 判断状态
	versions: RecipeVersion[];
	productionCount?: number; // [修复] 恢复误删除的字段
	productionTaskCount?: number;
	// [核心新增] 新增由后端计算好的聚合字段
	productCount?: number;
	ingredientCount?: number;
	usageCount?: number; // 新增: 配方被引用的次数
}

// [核心新增] 定义配方列表接口的返回类型
export interface RecipesListResponse {
	mainRecipes: RecipeFamily[];
	preDoughs: RecipeFamily[]; // 修改: otherRecipes -> preDoughs
	extras: RecipeFamily[]; // 新增: extras
}

// [核心修改] 更新表单模板类型以匹配后端
export interface RecipeFormTemplate {
	name: string;
	type: 'MAIN' | 'PRE_DOUGH' | 'EXTRA';
	category?: RecipeCategory; // [核心新增] 增加可选的品类字段
	notes: string;
	targetTemp?: number;
	doughs?: {
		// 主配方使用
		id: string;
		name: string;
		type: 'MAIN_DOUGH' | 'PRE_DOUGH';
		lossRatio?: number;
		flourRatioInMainDough?: number;
		ingredients: {
			id: string | null;
			name: string;
			ratio: number | null;
			isRecipe?: boolean;
			isFlour?: boolean; // [核心新增] 增加 isFlour 字段
			waterContent?: number; // [核心新增] 增加 waterContent 字段
		}[];
		procedure: string[];
	}[];
	products?: {
		// 主配方使用
		name: string;
		baseDoughWeight: number;
		mixIns: {
			id: string | null;
			name: string;
			ratio: number | null;
			weightInGrams?: number | null;
			isRecipe?: boolean;
			waterContent?: number; // [核心新增] 增加 waterContent 字段
		}[];
		fillings: {
			id: string | null;
			name: string;
			ratio: number | null;
			weightInGrams?: number | null;
			isRecipe?: boolean;
			waterContent?: number; // [核心新增] 增加 waterContent 字段
		}[];
		toppings: {
			id: string | null;
			name: string;
			ratio: number | null;
			weightInGrams?: number | null;
			isRecipe?: boolean;
			waterContent?: number; // [核心新增] 增加 waterContent 字段
		}[];
		procedure: string[];
	}[];
	ingredients?: {
		// 其他配方使用
		id: string | null;
		name: string;
		ratio: number | null;
		isRecipe?: boolean;
		isFlour?: boolean; // [核心新增] 增加 isFlour 字段
		waterContent?: number; // [核心新增] 增加 waterContent 字段
	}[];
	procedure?: string[]; // 其他配方使用
}

export interface RecipeVersion {
	id: string;
	familyId: string;
	version: number;
	notes: string | null;
	isActive: boolean;
	createdAt: string;
	products: Product[];
	components: {
		// [核心重命名] doughs -> components
		id: string;
		name: string;
		ingredients: ComponentIngredient[]; // [核心重命名]
		procedure: string[];
		_count: {
			ingredients: number;
		};
	}[];
}

// [核心重命名] DoughIngredient -> ComponentIngredient
export interface ComponentIngredient {
	id: string;
	ratio: number | null;
	flourRatio: number | null;
	ingredientId: string | null;
	ingredient: {
		id: string;
		name: string;
		isFlour: boolean;
	} | null;
	linkedPreDough: {
		id: string;
		name: string;
		versions: {
			components: {
				// [核心重命名] doughs -> components
				ingredients: {
					ratio: number;
					ingredient: {
						name: string;
						isFlour: boolean;
					};
				}[];
			}[];
		}[];
	} | null;
}

export interface Product {
	id: string;
	recipeVersionId: string;
	name: string;
	baseDoughWeight: number;
	procedure: string[];
}

export interface ProductListItem {
	id: string;
	name: string;
}

// [核心改造] 为 getProductsForTasks 接口定义新的、按品类分组的返回类型
export type ProductsForTaskResponse = Record<RecipeCategory, Record<string, ProductListItem[]>>;

export interface CalculatedIngredientInfo {
	id: string; // [核心新增] 为原料信息增加ID，用于DOM-key
	name: string;
	ratio: number;
	weightInGrams: number;
	pricePerKg: number;
	cost: number;
	// [核心新增] 增加一个可选的 extraInfo 字段
	extraInfo?: string;
}
export interface CalculatedDoughGroup {
	name: string;
	ingredients: CalculatedIngredientInfo[];
	procedure?: string[];
	totalCost: number;
}
export interface CalculatedExtraIngredientInfo {
	id: string;
	name: string;
	type: string;
	cost: number;
	weightInGrams: number;
	ratio?: number;
}
export interface RecipeDetails {
	totalCost: number;
	doughGroups: CalculatedDoughGroup[];
	extraIngredients: CalculatedExtraIngredientInfo[];
	groupedExtraIngredients: Record<string, CalculatedExtraIngredientInfo[]>;
	productProcedure: string[]; // [核心新增] 增加产品制作要点字段
}

// --- 原料与库存 ---
export interface Ingredient {
	id: string;
	name: string;
	type: 'STANDARD' | 'UNTRACKED';
	isFlour: boolean;
	waterContent: number;
	activeSku: IngredientSKU | null;
	skus: IngredientSKU[];
	currentStockInGrams: number;
	currentPricePerPackage: number;
	avgConsumptionPerTask: number;
	daysOfSupply: number;
	avgDailyConsumption: number;
	totalConsumptionInGrams: number;
}

// [核心新增] 定义原料列表接口的返回类型
export interface IngredientsListResponse {
	allIngredients: Ingredient[];
	lowStockIngredients: Ingredient[];
}

export interface IngredientSKU {
	id: string;
	brand: string | null;
	specName: string;
	specWeightInGrams: number;
	status: 'ACTIVE' | 'INACTIVE';
	procurementRecords?: ProcurementRecord[];
	createdAt: string;
}

export interface ProcurementRecord {
	id: string;
	packagesPurchased: number;
	pricePerPackage: number;
	purchaseDate: string;
}

// [修改] 更新库存流水条目类型以包含损耗
export interface IngredientLedgerEntry {
	date: string;
	type: '采购入库' | '生产消耗' | '库存调整' | '生产损耗';
	change: number; // 单位: 克
	details: string;
	operator: string;
}

// [核心新增] 定义库存流水接口的完整响应类型
export interface IngredientLedgerResponse {
	data: IngredientLedgerEntry[];
	meta: {
		total: number;
		page: number;
		limit: number;
		hasMore: boolean;
	};
}

// --- 生产任务 ---
export interface ProductionTaskDto {
	id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	// [修改] plannedDate -> startDate, 新增 endDate
	startDate: string;
	endDate: string | null;
	// [新增] 任务的实际完成时间
	completedAt: string | null;
	updatedAt: string; // [新增] 任务最后更新时间
	notes: string | null;
	// [核心新增] 创建任务的用户信息
	createdBy: {
		name: string | null;
		phone: string;
	};
	items: {
		id: string;
		quantity: number;
		product: {
			id: string;
			name: string;
			baseDoughWeight: number;
			recipeVersion: {
				family: {
					id: string;
					name: string;
				};
				components: {
					// [核心重命名] doughs -> components
					id: string;
					name: string;
					ingredients: ComponentIngredient[];
				}[];
			};
		};
	}[];
	// [新增] 库存警告信息
	stockWarning?: string;
}

// [新增] 创建生产任务的响应类型
export interface CreateTaskResponse {
	task: ProductionTaskDto;
	warning?: string;
}

// --- 团队成员 ---
export interface Member {
	id: string;
	name: string;
	phone: string;
	role: Role;
	status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
	joinDate: string;
}

// [核心新增] 定义所有者获取全部成员列表的接口响应类型
export interface TenantWithMembers {
	tenantId: string;
	tenantName: string;
	members: Member[];
}

// --- 角色枚举 (与后端保持一致) ---
export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'SUPER_ADMIN';

// --- 统计数据 ---
export interface RecipeStatDto {
	name: string;
	count: number;
}

export interface IngredientStatDto {
	name: string;
	consumedGrams: number;
}

export interface ProductionStatsResponse {
	totalTasks: number;
	productStats: RecipeStatDto[];
	ingredientConsumption: IngredientStatDto[];
}

// [核心新增] 定义客户端看板数据类型
export interface DashboardStats {
	totalTenants?: number;
	totalUsers: number;

	totalRecipes: number;
	totalTasks: number;
}

// [核心重构] 为任务详情页增加一个类型，与后端的 TaskDetailResponseDto 对应
// 定义原料详情的数据结构
export interface TaskIngredientDetail {
	id: string;
	name: string;
	brand: string | null;
	weightInGrams: number;
	isRecipe: boolean;
	extraInfo?: string | null;
}

// [核心重命名] DoughProductSummary -> ProductComponentSummary
// 定义组件汇总中每个产品的数据结构
export interface ProductComponentSummary {
	id: string;
	name: string;
	quantity: number;
	totalBaseComponentWeight: number; // [核心重命名]
	divisionWeight: number;
}

// 定义单个产品的详细信息（如辅料、馅料等）
export interface ProductDetails {
	id: string;
	name: string;
	mixIns: TaskIngredientDetail[];
	fillings: TaskIngredientDetail[];
	toppings: TaskIngredientDetail[];
	procedure: string[];
}

// [核心重命名] DoughGroup -> ComponentGroup
// 定义按组件类型分组的数据结构
export interface ComponentGroup {
	familyId: string;
	familyName: string;
	note: string | null;
	category: RecipeCategory; // [核心新增]
	productsDescription: string;
	totalComponentWeight: number; // [核心重命名]
	baseComponentIngredients: TaskIngredientDetail[]; // [核心重命名]
	baseComponentProcedure: string[]; // [核心重命名]
	products: ProductComponentSummary[];
	productDetails: ProductDetails[];
}

// 定义用于完成任务模态框的产品列表项
export interface TaskCompletionItem {
	id: string;
	name: string;
	plannedQuantity: number;
}

// [核心重构] 彻底重写 ProductionTaskDetailDto 以匹配后端 TaskDetailResponseDto
export interface ProductionTaskDetailDto {
	id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	notes: string | null;
	stockWarning: string | null;
	prepTask: PrepTask | null;
	componentGroups: ComponentGroup[]; // [核心重命名]
	items: TaskCompletionItem[];
}
