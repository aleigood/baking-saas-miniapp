<template>
  <page-meta
    page-style="overflow: hidden; background-color: #fdf8f2;"
  ></page-meta>
  <view class="page-wrapper">
    <DetailHeader :title="pageTitle" />
    <DetailPageLayout>
      <view class="page-content">
        <view class="card">
          <view class="card-title">生产日期</view>
          <view class="date-picker-row">
            <view class="date-picker-item">
              <label class="date-label">开始日期</label>
              <picker
                mode="date"
                :value="taskForm.startDate"
                @change="onDateChange($event, 'start')"
              >
                <view class="picker">
                  {{ taskForm.startDate }}
                  <view class="arrow-down"></view>
                </view>
              </picker>
            </view>
            <view class="date-picker-item">
              <label class="date-label">结束日期</label>
              <picker
                mode="date"
                :value="taskForm.endDate"
                :start="taskForm.startDate"
                @change="onDateChange($event, 'end')"
              >
                <view class="picker">
                  {{ taskForm.endDate }}
                  <view class="arrow-down"></view>
                </view>
              </picker>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="card-title">原料列表</view>

          <view class="summary-card no-frame">
            <view
              v-if="summaryItems.length > 0"
              :key="'summary-tags'"
              class="summary-tags-container"
            >
              <view
                v-for="item in summaryItems"
                :key="item.name"
                class="summary-tag clickable-tag"
                @click="handleTagClick(item.name)"
              >
                <text class="tag-name">{{ item.name }}</text>
                <view class="tag-value-box">
                  <text class="tag-value">{{ item.weight }}</text>
                  <text class="tag-unit">g</text>
                </view>
                <view
                  class="clear-tag-btn"
                  @click.stop="clearRecipe(item.name)"
                >
                  <image
                    class="clear-icon-img"
                    src="/static/icons/close-x.svg"
                    mode="aspectFit"
                  />
                </view>
              </view>
            </view>
            <view
              v-else
              :key="'summary-placeholder'"
              class="summary-placeholder"
            >
              <view class="summary-group-item is-placeholder">
                <text class="placeholder-text">请选择配方并输入原料重量</text>
              </view>
            </view>
          </view>

          <view
            class="tabs-container"
            v-if="recipeTabs.length > 0"
            :key="'tabs-container'"
          >
            <CssAnimatedTabs v-model="activeTabKey" :tabs="recipeTabs" />
          </view>

          <view
            class="calculator-container"
            v-if="renderedRecipeState"
            :key="'calculator-container-' + renderedTabKey"
            :class="{ 'is-fetching': isFetching, 'is-fading-out': isFadingOut }"
          >
            <view class="ingredient-grid" :key="'details-grid'">
              <view
                v-for="(ing, index) in renderedRecipeState.ingredients"
                :key="ing.id || index"
                class="ingredient-item"
              >
                <view class="ingredient-info">
                  <text class="ingredient-name">{{ ing.name }}</text>
                  <view class="tags">
                    <text v-if="ing.isFlour" class="type-tag flour">面粉</text>
                    <text v-if="ing.isRecipe" class="type-tag recipe"
                      >自制</text
                    >
                  </view>
                </view>
                <view class="input-with-unit">
                  <input
                    class="input-field weight-input"
                    type="number"
                    :value="ing.weightDisplay"
                    @input="onIngredientWeightInput(index, $event)"
                    placeholder="0"
                  />
                  <text class="unit-text">g</text>
                </view>
              </view>

              <view class="ingredient-item target-weight-row">
                <view class="ingredient-info">
                  <text class="ingredient-name total-label">目标产出量</text>
                </view>
                <view class="input-with-unit">
                  <input
                    class="input-field weight-input total-input-small"
                    type="digit"
                    :value="renderedRecipeState.targetDisplay"
                    @input="onTargetWeightInput"
                    placeholder="0"
                  />
                  <text class="unit-text">g</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="bottom-actions-container">
          <AppButton
            type="primary"
            full-width
            :disabled="!canSubmit"
            @click="handleSubmit"
            :loading="isCreating"
          >
            {{ isCreating ? "" : isEditMode ? "确认修改" : "创建任务" }}
          </AppButton>
        </view>
      </view>
    </DetailPageLayout>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useDataStore } from "@/store/data";
import { useToastStore } from "@/store/toast";
import { useUiStore } from "@/store/ui";
import { useUserStore } from "@/store/user";
import { createTask, updateTask } from "@/api/tasks";
import { getRecipeFamily } from "@/api/recipes";
import { getLocalDate } from "@/utils/format";
import AppButton from "@/components/AppButton.vue";
import DetailHeader from "@/components/DetailHeader.vue";
import DetailPageLayout from "@/components/DetailPageLayout.vue";
import CssAnimatedTabs from "@/components/CssAnimatedTabs.vue";
import type { RecipeFamily, ProductionTaskDto } from "@/types/api";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  date?: string;
}>();

const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();
const userStore = useUserStore();

const isCreating = ref(false);
const isLoadingDetails = ref(false);

const isEditMode = ref(false);
const editingTaskId = ref<string | null>(null);

const pageTitle = computed(() => {
  return isEditMode.value ? "修改任务" : "原料制作";
});

const today = getLocalDate();
const taskForm = reactive({
  startDate: today,
  endDate: today,
});

// 标签页状态
const activeTabKey = ref("");

// 单个原料的计算状态接口
interface CalculationItem {
  id: string | null;
  name: string;
  ratio: number;
  weight: number | null;
  weightDisplay: string;
  isFlour: boolean;
  isRecipe: boolean;
}

interface RecipeState {
  productId: string;
  recipeFamilyId: string;
  totalWeight: number | null;
  totalDisplay: string;
  targetWeight: number | null;
  targetDisplay: string;
  ingredients: CalculationItem[];
  detailsLoaded: boolean;
  lossRatio: number;
  baseDoughWeight: number;
}

// 核心状态：存储所有配方的输入数据
const recipeStates = reactive<Record<string, RecipeState>>({});

// 生成标签页配置
const recipeTabs = computed(() => {
  const otherProducts = dataStore.productsForTaskCreation["OTHER"] || {};
  return Object.keys(otherProducts).map((name) => ({
    key: name,
    label: name,
  }));
});

// 初始化配方基础信息
const initRecipeStates = () => {
  const otherProducts = dataStore.productsForTaskCreation["OTHER"] || {};
  const allRecipes = [
    ...dataStore.recipes.preDoughs,
    ...dataStore.recipes.extras,
  ];

  Object.keys(otherProducts).forEach((name) => {
    if (recipeStates[name]) return;

    const products = otherProducts[name];
    if (!products || products.length === 0) return;

    const family = allRecipes.find((f) => f.name === name);

    if (family) {
      // 安全获取产品基础重量，默认为 1
      const baseWeight = (products[0] as any).baseDoughWeight
        ? Number((products[0] as any).baseDoughWeight)
        : 1;

      recipeStates[name] = {
        productId: products[0].id,
        recipeFamilyId: family.id,
        totalWeight: null,
        totalDisplay: "",
        targetWeight: null,
        targetDisplay: "",
        ingredients: [],
        detailsLoaded: false,
        lossRatio: 0,
        baseDoughWeight: baseWeight,
      };
    }
  });

  if (!activeTabKey.value && recipeTabs.value.length > 0) {
    activeTabKey.value = recipeTabs.value[0].key;
  }
};

const activeRecipeState = computed(() => {
  return recipeStates[activeTabKey.value];
});

const renderedTabKey = ref("");
const isFetching = ref(false);
const isFadingOut = ref(false);

const renderedRecipeState = computed(() => {
  return recipeStates[renderedTabKey.value];
});

watch(
  activeTabKey,
  async (newKey) => {
    if (!newKey) return;

    // 首次加载初始化
    if (!renderedTabKey.value) {
      const state = recipeStates[newKey];
      if (state) {
        if (!state.detailsLoaded) {
          isLoadingDetails.value = true;
          await loadRecipeDetails(state);
          isLoadingDetails.value = false;
        }
        renderedTabKey.value = newKey;
      }
      return;
    }

    const state = recipeStates[newKey];
    if (!state) return;

    // 1. 如果配方详情尚未加载，将其设为“加载中/半透明”状态进行请求
    if (!state.detailsLoaded) {
      isFetching.value = true;
      await loadRecipeDetails(state);
    }

    // 2. 检查在此期间用户是否又点击了其他Tab，若已变更则放弃本次切换逻辑
    if (activeTabKey.value !== newKey) {
      isFetching.value = false;
      return;
    }

    // 3. 触发原内容淡出动画
    isFadingOut.value = true;
    setTimeout(() => {
      // 4. 动画淡出完成后，切换渲染的 Tab Key 并重置淡出状态，触发新内容淡入
      renderedTabKey.value = newKey;
      isFetching.value = false;
      isFadingOut.value = false;
    }, 150);
  },
  { immediate: true },
);

const handleTagClick = (tagName: string) => {
  activeTabKey.value = tagName;
};

// 加载配方详细比例
const loadRecipeDetails = async (state: RecipeState) => {
  if (isLoadingDetails.value) return;
  isLoadingDetails.value = true;
  try {
    const fullFamily = await getRecipeFamily(state.recipeFamilyId);
    const version =
      fullFamily.versions.find((v) => (v as any).isActive) ||
      fullFamily.versions[0];

    if (version && version.components && version.components.length > 0) {
      const component = version.components[0];

      // 记录配方的损耗系数，用于反推计算后端需要的 Quantity（成品目标重量）
      state.lossRatio = Number(component.lossRatio || 0);

      state.ingredients = (component.ingredients || []).map((ing) => ({
        id:
          ing.ingredient?.id ||
          ing.linkedPreDough?.id ||
          ing.linkedExtra?.id ||
          null,
        name:
          ing.ingredient?.name ||
          ing.linkedPreDough?.name ||
          ing.linkedExtra?.name ||
          "未知原料",
        ratio: Number(ing.ratio || ing.flourRatio || 0),
        weight: null,
        weightDisplay: "",
        isFlour: ing.ingredient?.isFlour || false,
        isRecipe: !!(ing.linkedPreDough || ing.linkedExtra),
      }));
      state.detailsLoaded = true;
    }
  } catch (error) {
    console.error("Failed to load recipe details:", error);
    toastStore.show({ message: "加载配方详情失败", type: "error" });
  } finally {
    isLoadingDetails.value = false;
  }
};

const clearRecipe = (recipeName: string) => {
  const state = recipeStates[recipeName];
  if (state) {
    state.totalWeight = null;
    state.totalDisplay = "";
    state.targetWeight = null;
    state.targetDisplay = "";
    state.ingredients.forEach((item) => {
      item.weight = null;
      item.weightDisplay = "";
    });
  }
};

const getTotalRatio = (ingredients: CalculationItem[]) => {
  return ingredients.reduce((sum, item) => sum + item.ratio, 0);
};

const formatWeightInputValue = (value: number) => {
  return value > 0 ? parseFloat(value.toFixed(2)).toString() : "";
};

const getOutputDenominator = (state: RecipeState) => {
  const baseWeight = state.baseDoughWeight || 1;
  return baseWeight > 0 ? baseWeight : 1;
};

const calculateTotalFromTarget = (state: RecipeState, targetWeight: number) => {
  const divisor = 1 - (state.lossRatio || 0);
  if (divisor <= 0) return null;
  return (targetWeight * getOutputDenominator(state)) / divisor;
};

const calculateTargetFromTotal = (state: RecipeState, totalWeight: number) => {
  const targetWeight =
    (totalWeight * (1 - (state.lossRatio || 0))) / getOutputDenominator(state);
  return targetWeight >= 0 ? targetWeight : null;
};

const applyTotalWeight = (
  state: RecipeState,
  totalWeight: number | null,
  options: { updateTarget?: boolean } = {},
) => {
  if (totalWeight !== null && totalWeight >= 0) {
    state.totalWeight = totalWeight;
    state.totalDisplay = formatWeightInputValue(totalWeight);
    const totalRatio = getTotalRatio(state.ingredients);
    if (totalRatio > 0) {
      state.ingredients.forEach((item) => {
        const weight = (totalWeight * item.ratio) / totalRatio;
        item.weight = weight;
        item.weightDisplay = formatWeightInputValue(weight);
      });
    }

    if (options.updateTarget) {
      const targetWeight = calculateTargetFromTotal(state, totalWeight);
      state.targetWeight = targetWeight;
      state.targetDisplay =
        targetWeight !== null ? formatWeightInputValue(targetWeight) : "";
    }
  } else {
    state.totalWeight = null;
    state.totalDisplay = "";
    if (options.updateTarget) {
      state.targetWeight = null;
      state.targetDisplay = "";
    }
    state.ingredients.forEach((item) => {
      item.weight = null;
      item.weightDisplay = "";
    });
  }
};

const onTargetWeightInput = (e: any) => {
  if (!activeRecipeState.value) return;
  const state = activeRecipeState.value;
  const val = e.detail.value;

  state.targetDisplay = val;
  const num = parseFloat(val);

  if (!isNaN(num) && num >= 0) {
    state.targetWeight = num;
    applyTotalWeight(state, calculateTotalFromTarget(state, num), {
      updateTarget: false,
    });
  } else {
    state.targetWeight = null;
    applyTotalWeight(state, null, { updateTarget: false });
  }
};

const onIngredientWeightInput = (index: number, e: any) => {
  if (!activeRecipeState.value) return;
  const state = activeRecipeState.value;
  const item = state.ingredients[index];
  const val = e.detail.value;

  item.weightDisplay = val;
  const num = parseFloat(val);

  if (!isNaN(num) && num >= 0 && item.ratio > 0) {
    const totalRatio = getTotalRatio(state.ingredients);
    const newTotal = (num / item.ratio) * totalRatio;

    applyTotalWeight(state, newTotal, { updateTarget: true });

    state.ingredients.forEach((other, idx) => {
      if (idx === index) {
        other.weight = num;
      } else {
        const w = (newTotal * other.ratio) / totalRatio;
        other.weight = w;
        other.weightDisplay = formatWeightInputValue(w);
      }
    });
  }
};

const summaryItems = computed(() => {
  const items: { name: string; weight: number }[] = [];
  Object.keys(recipeStates).forEach((key) => {
    const state = recipeStates[key];
    if (state.targetWeight && state.targetWeight > 0) {
      const formattedWeight = parseFloat(state.targetWeight.toFixed(2));
      items.push({ name: key, weight: formattedWeight });
    }
  });
  return items;
});

const canSubmit = computed(() => {
  return summaryItems.value.length > 0;
});

onLoad(async (options) => {
  const dateStr = props.date || options?.date;
  if (dateStr) {
    taskForm.startDate = dateStr;
    taskForm.endDate = dateStr;
  }

  if (dataStore.dataStale.recipes || !dataStore.dataLoaded.recipes) {
    await dataStore.fetchRecipesData();
  }
  if (
    dataStore.dataStale.productsForTaskCreation ||
    !dataStore.dataLoaded.productsForTaskCreation
  ) {
    await dataStore.fetchProductsForTaskCreation();
  }

  initRecipeStates();

  // 首次进入创建任务模式时，前置预加载第一个 Tab 的详情，防范闪白/Loading闪烁
  if (!isEditMode.value && recipeTabs.value.length > 0) {
    const firstTab = recipeTabs.value[0].key;
    const state = recipeStates[firstTab];
    if (state && !state.detailsLoaded) {
      await loadRecipeDetails(state);
    }
  }

  if (options && options.taskId) {
    isEditMode.value = true;
    editingTaskId.value = options.taskId;

    const taskJson = uni.getStorageSync("task_to_edit");
    if (taskJson) {
      try {
        const taskToEdit: ProductionTaskDto = JSON.parse(taskJson);

        taskForm.startDate = getLocalDate(new Date(taskToEdit.startDate));
        taskForm.endDate = taskToEdit.endDate
          ? getLocalDate(new Date(taskToEdit.endDate))
          : taskForm.startDate;

        let firstTabSet = false;

        for (const item of taskToEdit.items) {
          // 找到对应的配方状态
          const stateKey = Object.keys(recipeStates).find(
            (key) => recipeStates[key].productId === item.product.id,
          );

          if (stateKey) {
            const state = recipeStates[stateKey];

            // 如果详情未加载，先加载详情以获取比例和损耗系数
            if (!state.detailsLoaded) {
              await loadRecipeDetails(state);
            }

            // 逆向反推总投入量： state.totalWeight = (目标产出数量 * 分母) / (1 - 损耗比例)
            const lossRatio = state.lossRatio || 0;
            const baseWeight = state.baseDoughWeight || 1;
            const denominator = baseWeight > 0 ? baseWeight : 1;

            const calculatedTotalWeight =
              (item.quantity * denominator) / (1 - lossRatio);

            state.targetWeight = Number(item.quantity);
            state.targetDisplay = formatWeightInputValue(Number(item.quantity));
            applyTotalWeight(state, calculatedTotalWeight, {
              updateTarget: false,
            });

            // 顺势计算填充该配方下各个原料的具体重量
            const totalRatio = getTotalRatio(state.ingredients);
            if (totalRatio > 0) {
              state.ingredients.forEach((ing) => {
                const weight = (calculatedTotalWeight * ing.ratio) / totalRatio;
                ing.weight = weight;
                ing.weightDisplay =
                  weight > 0 ? parseFloat(weight.toFixed(2)).toString() : "";
              });
            }

            // 将第一个找到的数据设为当前激活的 Tab
            if (!firstTabSet) {
              activeTabKey.value = stateKey;
              firstTabSet = true;
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse task data from storage:", e);
        toastStore.show({ message: "加载任务信息失败", type: "error" });
        uni.navigateBack();
      }
    } else {
      toastStore.show({ message: "找不到要编辑的任务信息", type: "error" });
      uni.navigateBack();
    }
  }
});

onUnload(() => {
  uni.removeStorageSync("task_to_edit");
});

const handleSubmit = async () => {
  if (!canSubmit.value) return;

  // 收集所有有效任务
  const productsToSubmit = Object.values(recipeStates)
    .filter((state) => state.targetWeight && state.targetWeight > 0)
    .map((state) => {
      return {
        productId: state.productId,
        quantity: Number(state.targetWeight!.toFixed(4)),
      };
    });

  if (productsToSubmit.length === 0) return;

  isCreating.value = true;
  try {
    const payload = {
      startDate: new Date(taskForm.startDate).toISOString(),
      endDate: new Date(taskForm.endDate).toISOString(),
      products: productsToSubmit,
    };

    const currentUserRole = userStore.userInfo?.tenants.find(
      (t) => t.tenant.id === dataStore.currentTenantId,
    )?.role;
    const target =
      currentUserRole === "MEMBER" ? "/pages/baker/main" : "/pages/main/main";

    if (isEditMode.value && editingTaskId.value) {
      await updateTask(editingTaskId.value, payload);
      uiStore.setNextPageToast(
        { message: "任务修改成功", type: "success" },
        target,
      );
    } else {
      const res = await createTask(payload);
      if (res.warning) {
        uiStore.setNextPageToast(
          { message: res.warning, type: "error", duration: 3000 },
          target,
        );
      } else {
        uiStore.setNextPageToast(
          {
            message: `成功创建 ${productsToSubmit.length} 个原料制作任务`,
            type: "success",
          },
          target,
        );
      }
    }

    dataStore.markProductionAsStale();
    dataStore.markHistoricalTasksAsStale();
    dataStore.markIngredientsAsStale();
    uni.navigateBack();
  } catch (error) {
    console.error("Failed to create/update ingredient tasks:", error);
    toastStore.show({
      message: isEditMode.value ? "修改失败" : "创建失败",
      type: "error",
    });
  } finally {
    isCreating.value = false;
  }
};

const onDateChange = (e: any, type: "start" | "end") => {
  const newDate = e.detail.value;
  if (type === "start") {
    taskForm.startDate = newDate;
    if (new Date(taskForm.endDate) < new Date(newDate)) {
      taskForm.endDate = newDate;
    }
  } else {
    taskForm.endDate = newDate;
  }
};
</script>

<style scoped lang="scss">
@import "@/styles/common.scss";
@include form-control-styles;

.page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.date-picker-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.date-picker-item {
  flex: 1;
}

.date-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  display: block;
}

.summary-card.no-frame {
  background-color: transparent;
  padding: 0;
  margin-bottom: 15px;
}

.summary-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.summary-tag {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border: 1px solid #f0e6d2;
  border-radius: 6px;
  padding: 6px 8px 6px 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

/* 修改：移除系统高亮并增加组件一致的缩放点击动效 */
.clickable-tag {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  transition:
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-color 0.2s;

  &:active {
    background-color: #f5eedf;
    transform: scale(0.96); /* 因为 tag 较小，缩放比例稍微大一点点反馈更明显 */
  }
}

.tag-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
  margin-right: 8px;
}

.tag-value-box {
  display: flex;
  align-items: baseline;
  background-color: #fdf8f2;
  padding: 2px 6px;
  border-radius: 4px;
}

.tag-value {
  font-size: 13px;
  font-weight: bold;
  color: var(--primary-color);
}

.tag-unit {
  font-size: 10px;
  color: var(--text-secondary);
  margin-left: 2px;
}

.clear-tag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 6px;
  background-color: rgba(140, 90, 59, 0.08);
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s;

  &:active {
    background-color: rgba(140, 90, 59, 0.15);
  }
}

.clear-icon-img {
  width: 8px;
  height: 8px;
}

.summary-placeholder {
  display: block;
}

.summary-group-item.is-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  background-color: transparent;
  border: 1px dashed #f0e6d2;
  border-radius: 8px;
}

.placeholder-text {
  font-size: 13px;
  color: #ced4da;
}

.tabs-container {
  margin-bottom: 20px;
}

.calculator-container {
  animation: fadeInClean 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;

  &.is-fetching {
    opacity: 0.4;
    pointer-events: none;
    animation: none;
    transition: opacity 0.15s ease;
  }

  &.is-fading-out {
    animation: fadeOutClean 0.15s ease forwards;
  }
}

.reset-text {
  font-size: 11px;
  color: var(--primary-color);
  padding: 2px 8px;
  background: rgba(140, 90, 59, 0.1);
  border-radius: 4px;
  cursor: pointer;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 15px;
}

.loading-block {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 13px;
}

.ingredient-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: fadeIn 0.3s ease;
}

.ingredient-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 5px;
}

.ingredient-info {
  width: calc(50% - 6px);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}

.ingredient-name {
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-primary);
  text-align: right;
  width: auto;
  flex-shrink: 1;
}

.total-label {
  color: var(--primary-color);
}

.target-weight-row {
  padding: 0 5px;
  margin-top: 4px;
}

.tags {
  display: flex;
  gap: 4px;
  margin-top: 0;
  margin-left: 4px;
  justify-content: flex-end;
  flex-shrink: 0;
}

.type-tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;

  &.flour {
    background: #ebe2d9;
    color: #8d6e63;
  }
  &.recipe {
    background: #faedcd;
    color: var(--primary-color);
  }
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 6px;
  width: calc(50% - 6px);
  max-width: 120px;
  flex-shrink: 0;
}

.weight-input {
  flex: 1;
  width: 0;
  text-align: center;
}

.unit-text {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
  width: 12px;
  text-align: left;
}

.summary-divider {
  height: 1px;
  border-top: 1px dashed #e6dbcb;
  margin: 16px 5px 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px 4px;
}

.summary-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.summary-value-box {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.summary-value {
  font-size: 20px;
  font-weight: bold;
  color: var(--primary-color);
  line-height: 1;
}

.summary-unit {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}
</style>

<style lang="scss">
@keyframes fadeInClean {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes fadeOutClean {
  to {
    opacity: 0;
    transform: translateY(-5px);
  }
}
</style>
