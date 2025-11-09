// G-Code-Note: Client (Vue)
// 路径: src/types/api.d.ts
// [核心重构] 完整文件，更新 ComponentIngredient 并修复 doughGroups -> componentGroups

// [核心新增] 定义批量导入结果的类型
export interface BatchImportResult {
	totalCount: number;
	importedCount: number;
	skippedCount: number;
	skippedRecipes: string[];
}

// [核心新增] 定义备料清单接口的响应类型
export interface BillOfMaterialsItem {
	ingredientId: string;
	ingredientName: string;
	brand?: string | null;
	totalRequired: number; // 总需求量 (g)
	currentStock?: number; // 当前库存 (g)，仅标准原料有
	suggestedPurchase: number; // 建议采购量 (g)
}

export interface BillOfMaterialsResponseDto {
	standardItems: BillOfMaterialsItem[];
	nonInventoriedItems: BillOfMaterialsItem[];
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
	targetWeight?: number;
	procedure: string[];
	ingredients: CalculatedRecipeIngredient[];
}

export interface PrepTask {
	id: string;
	title: string;
	details: string;
	items: CalculatedRecipeDetails[];
	status?: 'PREP';
	billOfMaterials?: BillOfMaterialsResponseDto;
}

// [新增] 为任务列表创建的“前置任务摘要”类型，不包含 items 和 billOfMaterials
export type PrepTaskSummary = Omit<PrepTask, 'items' | 'billOfMaterials'>;

// [新增] 为任务列表创建的“普通任务摘要”类型，只包含列表展示所需的最少信息
export interface ProductionTaskSummaryDto {
	id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	startDate: string;
	endDate: string | null;
	updatedAt: string;
	createdBy: {
		name: string | null;
		phone: string;
	};
	items: {
		quantity: number;
		product: {
			id: string; // [核心修复] 加上产品 id，与服务端返回数据保持一致
			name: string;
		};
	}[];
}

export interface ProductionDataPayload {
	stats?: {
		pendingCount: number;
	};
	// [修改] tasks 数组现在是两种“摘要”类型的联合
	tasks: (
		| ProductionTaskSummaryDto
		| (PrepTaskSummary & {
				status: 'PREP';
		  })
	)[];
	prepTask: null;
}

// --- 认证与用户 ---
export interface LoginRes {
	accessToken: string;
	redirectTo?: string;
}

export interface UserInfo {
	id: string;
	phone: string;
	name: string | null;
	avatarUrl: string | null;
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
	status: 'ACTIVE' | 'INACTIVE';
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
	category: RecipeCategory;
	deletedAt: string | null;
	versions: RecipeVersion[];
	productionCount?: number;
	productionTaskCount?: number;
	productCount?: number;
	ingredientCount?: number;
	usageCount?: number;
}

export interface RecipesListResponse {
	mainRecipes: RecipeFamily[];
	preDoughs: RecipeFamily[];
	extras: RecipeFamily[];
}

export interface RecipeFormTemplate {
	name: string;
	type: 'MAIN' | 'PRE_DOUGH' | 'EXTRA';
	category?: RecipeCategory;
	notes: string;
	targetTemp?: number;
	components?: {
		id: string;
		name: string;
		type: 'MAIN_DOUGH' | 'PRE_DOUGH' | 'BASE_COMPONENT';
		lossRatio?: number;
		divisionLoss?: number;
		flourRatioInMainDough?: number;
		ingredients: {
			id: string | null;
			name: string;
			ratio: number | null;
			isRecipe?: boolean;
			isFlour?: boolean;
			waterContent?: number;
		}[];
		procedure: string[];
	}[];
	products?: {
		id?: string; // [核心修改] 增加可选的 id 字段
		name: string;
		baseDoughWeight: number;
		mixIns: {
			id: string | null;
			name: string;
			ratio: number | null;
			weightInGrams?: number | null;
			isRecipe?: boolean;
			waterContent?: number;
		}[];
		fillings: {
			id: string | null;
			name: string;
			ratio: number | null;
			weightInGrams?: number | null;
			isRecipe?: boolean;
			waterContent?: number;
		}[];
		toppings: {
			id: string | null;
			name: string;
			ratio: number | null;
			weightInGrams?: number | null;
			isRecipe?: boolean;
			waterContent?: number;
		}[];
		procedure: string[];
	}[];
	ingredients?: {
		id: string | null;
		name: string;
		ratio: number | null;
		isRecipe?: boolean;
		isFlour?: boolean;
		waterContent?: number;
	}[];
	procedure?: string[];
}

// [G-Code-Note] [核心重构] 定义 DisplayIngredient 类型
// 这与 recipes.service.ts 中的 DisplayIngredient 接口匹配
export type IngredientType = 'STANDARD' | 'UNTRACKED' | 'NON_INVENTORIED';
export type RecipeType = 'MAIN' | 'PRE_DOUGH' | 'EXTRA';

export interface DisplayIngredient {
	id: string;
	name: string;
	tenantId: string;
	type: IngredientType | RecipeType; // 'STANDARD', 'UNTRACKED', 'PRE_DOUGH', 'EXTRA'
	category?: RecipeCategory;
	isFlour: boolean;
	waterContent: number;
	currentStockInGrams: number;
	currentStockValue: number;
	activeSkuId: string | null;
	createdAt: Date;
	updatedAt: Date;
	deletedAt: Date | null;
	extraInfo?: string;
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
		id: string;
		name: string;
		ingredients: ComponentIngredient[]; // [G-Code-Note] ComponentIngredient 类型被修改
		procedure: string[];
		_count: {
			ingredients: number;
		};
	}[];
}

// [G-Code-Note] [核心重构] ComponentIngredient 现在反映 _sanitizeFamily 的输出
export interface ComponentIngredient {
	id: string;
	ratio: number | null;
	flourRatio: number | null;
	ingredientId: string | null;
	preDoughId: string | null; // [G-Code-Note] 增加 preDoughId
	extraId: string | null; // [G-Code-Note] 增加 extraId
	ingredient: DisplayIngredient | null; // [G-Code-Note] 使用新的 DisplayIngredient

	// [G-Code-Note] 这两个字段在 _sanitizeFamily 中被设为 null，但为安全起见保留
	linkedPreDough: null;
	linkedExtra: null;
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

export type ProductsForTaskResponse = Record<RecipeCategory, Record<string, ProductListItem[]>>;

export interface CalculatedIngredientInfo {
	id: string;
	name: string;
	ratio: number;
	weightInGrams: number;
	pricePerKg: number;
	cost: number;
	extraInfo?: string;
	isRecipe: boolean; // [G-Code-Note] [核心新增] 确保成本计算 API 也返回这个
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
	isRecipe: boolean; // [G-Code-Note] [核心新增] 确保成本计算 API 也返回这个
}
export interface RecipeDetails {
	totalCost: number;
	// [G-Code-Note] [核心修复] doughGroups -> componentGroups
	componentGroups: CalculatedDoughGroup[];
	extraIngredients: CalculatedExtraIngredientInfo[];
	groupedExtraIngredients: Record<string, CalculatedExtraIngredientInfo[]>;
	productProcedure: string[];
}

// --- 原料与库存 ---
export interface Ingredient {
	id: string;
	name: string;
	type: 'STANDARD' | 'UNTRACKED' | 'NON_INVENTORIED';
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

// [核心新增] 定义 SKU 更新的数据类型
export interface UpdateSkuDto {
	brand?: string;
	specName?: string;
	specWeightInGGrams?: number;
}

export interface IngredientLedgerEntry {
	date: string;
	type: '采购入库' | '生产消耗' | '库存调整' | '生产损耗';
	change: number; // 单位: 克
	details: string;
	operator: string;
}

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
// [修改] 这是“完整”的任务详情类型，仅用于详情页
export interface ProductionTaskDto {
	id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	startDate: string;
	endDate: string | null;
	completedAt: string | null;
	updatedAt: string;
	notes: string | null;
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
					id: string;
					name: string;
					ingredients: ComponentIngredient[]; // [G-Code-Note] 已更新为新类型
				}[];
			};
		};
	}[];
	stockWarning?: string;
}

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

export interface DashboardStats {
	totalTenants?: number;
	totalUsers: number;

	totalRecipes: number;
	totalTasks: number;
}

export interface TaskIngredientDetail {
	id: string;
	name: string;
	brand: string | null;
	weightInGrams: number;
	weightPerUnit?: number;
	isRecipe: boolean;
	extraInfo?: string | null;
}

export interface ProductComponentSummary {
	id: string;
	name: string;
	quantity: number;
	totalBaseComponentWeight: number;
	divisionWeight: number;
}

export interface ProductDetails {
	id: string;
	name: string;
	mixIns: TaskIngredientDetail[];
	fillings: TaskIngredientDetail[];
	toppings: TaskIngredientDetail[];
	procedure: string[];
}

export interface ComponentGroup {
	familyId: string;
	familyName: string;
	note: string | null;
	category: RecipeCategory;
	productsDescription: string;
	totalComponentWeight: number;
	baseComponentIngredients: TaskIngredientDetail[];
	baseComponentProcedure: string[];
	products: ProductComponentSummary[];
	productDetails: ProductDetails[];
}

export interface TaskCompletionItem {
	id: string;
	name: string;
	plannedQuantity: number;
}

export interface ProductionTaskDetailDto {
	id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
	notes: string | null;
	stockWarning: string | null;
	prepTask: PrepTask | null;
	componentGroups: ComponentGroup[];
	items: TaskCompletionItem[];
}
