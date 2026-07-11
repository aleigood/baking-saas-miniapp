<template>
  <page-meta :page-style="pageStyle"></page-meta>
  <view class="page-wrapper" @click="hidePopover">
    <DetailHeader title="任务详情" />
    <DetailPageLayout @scroll="handleScroll">
      <view
        class="page-content page-content-with-fab animated-content"
        :class="{ 'is-revealed': !isLoading }"
        v-if="task"
        :key="'task-detail-content'"
      >
        <view class="detail-page">
          <view :class="{ 'disabled-list': !isStarted && !isReadOnly }">
            <view class="card-full-bleed-list">
              <view class="card-title-wrapper">
                <span class="card-title">配方列表</span>
              </view>
              <template
                v-for="(component, index) in task.componentGroups"
                :key="component.familyId"
              >
                <ListItem
                  class="product-list-item"
                  :selected="selectedComponentFamilyId === component.familyId"
                  @click="selectComponent(component.familyId)"
                  :bleed="true"
                  :divider="index < task.componentGroups.length - 1"
                >
                  <view class="main-info">
                    <view class="name">
                      <text class="name-text">{{ component.familyName }}</text>
                      <text class="version-tag"
                        >版本 V{{ component.version }}</text
                      >
                    </view>
                    <view
                      class="product-badges-row"
                      v-if="
                        component.productDetails &&
                        component.productDetails.length > 0
                      "
                    >
                      <view
                        v-for="prod in component.productDetails"
                        :key="prod.id"
                        class="product-badge"
                      >
                        <text class="prod-name">{{ prod.name }}</text>
                        <text class="prod-qty" v-if="prod.baseComponent">
                          {{
                            component.category === "OTHER"
                              ? formatWeight(prod.baseComponent.quantity)
                              : `×${prod.baseComponent.quantity}`
                          }}
                        </text>
                      </view>
                    </view>
                    <view class="desc" v-else>{{
                      component.productsDescription
                    }}</view>
                  </view>
                </ListItem>
              </template>
            </view>
          </view>

          <view
            v-if="
              !isStarted && !isReadOnly && outdatedRecipeVersions.length > 0
            "
            class="recipe-version-notice"
          >
            <view class="version-notice-mark">!</view>
            <view class="version-notice-copy">
              <text class="version-notice-title">配方已有新版本</text>
              <text class="version-notice-desc"
                >开始制作时可选择保持当前版本或应用最新版本</text
              >
            </view>
          </view>

          <view
            v-if="!isStarted && !isReadOnly"
            class="bottom-actions-container"
            :key="'start-task-container'"
          >
            <AppButton type="primary" full-width @click="handleStartTask"
              >开始制作</AppButton
            >
          </view>

          <template v-if="isStarted && renderedComponentDetails">
            <view
              class="card"
              :key="'started-task-card-' + renderedComponentFamilyId"
              :class="{ 'is-fading-out': isFadingOutComponent }"
            >
              <view
                class="group-title"
                @click="toggleCollapse(renderedComponentDetails.familyId)"
              >
                <span>{{ renderedComponentDetails.familyName }}</span>
                <span
                  class="arrow"
                  :class="{
                    collapsed: collapsedSections.has(
                      renderedComponentDetails.familyId,
                    ),
                  }"
                  >&#10095;</span
                >
              </view>
              <view
                class="collapsible-content"
                :class="{
                  'is-collapsed': collapsedSections.has(
                    renderedComponentDetails.familyId,
                  ),
                }"
              >
                <view class="smart-table">
                  <view class="table-header">
                    <text class="col-ingredient">原料</text>
                    <text class="col-brand">品牌</text>
                    <text class="col-usage">用量</text>
                  </view>
                  <view
                    v-for="(
                      ing, ingIndex
                    ) in renderedComponentDetails.baseComponentIngredients"
                    :key="ing.id + '-' + ingIndex"
                    class="table-row"
                    :class="{
                      'is-added': addedIngredientsMap.has(
                        `${renderedComponentDetails.familyId}-${ing.id}`,
                      ),
                    }"
                    @click.stop="
                      showExtraInfo(
                        ing.extraInfo,
                        `info-icon-${renderedComponentDetails.familyId}-${ing.id}`,
                      )
                    "
                    @longpress.prevent="
                      !isReadOnly &&
                      toggleIngredientAdded(
                        renderedComponentDetails.familyId,
                        ing.id,
                      )
                    "
                  >
                    <view class="col-ingredient ingredient-name-cell">
                      <view
                        v-if="ing.extraInfo"
                        class="ingredient-with-icon"
                        :id="`info-icon-${renderedComponentDetails.familyId}-${ing.id}`"
                        :key="'ing-icon-' + ing.id"
                      >
                        <text>{{ ing.name }}</text>
                        <image
                          class="info-icon"
                          src="/static/icons/info.svg"
                          mode="aspectFit"
                        ></image>
                      </view>
                      <text v-else :key="'ing-text-' + ing.id">{{
                        ing.name
                      }}</text>
                    </view>
                    <text class="col-brand">{{ ing.brand || "-" }}</text>
                    <text class="col-usage">{{
                      formatWeight(ing.weightInGrams)
                    }}</text>
                  </view>
                </view>

                <view class="total-weight-summary">
                  <view
                    class="summary-left-alert"
                    :class="{ 'pulse-highlight': showPulseAnimation }"
                    v-if="componentMixInSummary.length > 0"
                    :key="'component-mixin-summary'"
                  >
                    <image
                      class="summary-alert-icon"
                      src="/static/icons/warning.svg"
                      mode="aspectFit"
                    ></image>
                    <text>含后加辅料，请勿遗漏！</text>
                  </view>
                  <view v-else :key="'component-mixin-summary-empty'"></view>

                  <view class="summary-right-info">
                    <text>
                      {{
                        renderedComponentDetails.category === "BREAD"
                          ? "面团总重"
                          : "原料总重"
                      }}:
                      {{
                        formatWeight(
                          renderedComponentDetails.totalComponentWeight,
                        )
                      }}
                    </text>
                    <text
                      v-if="isSelfMadeComponent && renderedProductDetails"
                      class="highlight-output"
                      :key="'target-output-label'"
                    >
                      (目标产出:
                      {{
                        formatWeight(
                          renderedProductDetails.baseComponent.quantity,
                        )
                      }})
                    </text>
                  </view>
                </view>
                <view
                  v-if="
                    renderedComponentDetails.baseComponentProcedure.length > 0
                  "
                  class="procedure-notes"
                  :key="'procedure-notes'"
                >
                  <text class="notes-title">制作要点:</text>
                  <text
                    v-for="(
                      step, stepIndex
                    ) in renderedComponentDetails.baseComponentProcedure"
                    :key="stepIndex"
                    class="note-item"
                  >
                    {{ stepIndex + 1 }}. {{ step }}
                  </text>
                </view>
              </view>

              <template v-if="!isSelfMadeComponent">
                <view
                  class="group-title"
                  @click="toggleCollapse('productSummary')"
                >
                  <span>产品信息</span>
                  <span
                    class="arrow"
                    :class="{
                      collapsed: collapsedSections.has('productSummary'),
                    }"
                    >&#10095;</span
                  >
                </view>
                <view
                  class="collapsible-content"
                  :class="{
                    'is-collapsed': collapsedSections.has('productSummary'),
                  }"
                >
                  <view
                    class="product-tabs-container"
                    v-if="productTabs.length > 0"
                    :key="'product-tabs'"
                  >
                    <FilterTabs
                      :model-value="selectedProductId"
                      @update:model-value="handleTabChange"
                      :tabs="productTabs"
                      size="sm"
                      align="center"
                    />
                  </view>

                  <view
                    class="product-details-animated-container"
                    v-if="renderedProductDetails"
                    :key="'product-details-container-' + renderedProductId"
                    :class="{ 'is-fading-out': isFadingOutProduct }"
                  >
                    <view class="smart-table">
                      <view class="table-header">
                        <text class="col-product-name">{{
                          isSelfMadeComponent ? "产品名称" : "基础原料"
                        }}</text>
                        <text class="col-dough-weight">总重</text>
                        <text v-if="!isSelfMadeComponent" class="col-quantity"
                          >产品数量</text
                        >
                        <text
                          v-if="!isSelfMadeComponent"
                          class="col-division-weight"
                          >分割重量</text
                        >
                        <text
                          v-if="isSelfMadeComponent"
                          class="col-division-weight"
                          >目标产出</text
                        >
                      </view>
                      <view class="info-row">
                        <text class="col-product-name">{{
                          renderedProductDetails.baseComponent.name
                        }}</text>
                        <text class="col-dough-weight">{{
                          formatWeight(
                            renderedProductDetails.baseComponent
                              .totalBaseComponentWeight,
                          )
                        }}</text>
                        <text
                          v-if="!isSelfMadeComponent"
                          class="col-quantity"
                          >{{
                            renderedProductDetails.baseComponent.quantity
                          }}</text
                        >
                        <text
                          v-if="!isSelfMadeComponent"
                          class="col-division-weight"
                        >
                          {{
                            formatWeight(
                              renderedProductDetails.baseComponent
                                .divisionWeight,
                            )
                          }}
                        </text>
                        <text
                          v-if="isSelfMadeComponent"
                          class="col-division-weight"
                        >
                          {{
                            formatWeight(
                              renderedProductDetails.baseComponent.quantity,
                            )
                          }}
                        </text>
                      </view>
                    </view>

                    <template
                      v-if="
                        renderedProductDetails.mixIns.length > 0 ||
                        renderedProductDetails.fillings.length > 0 ||
                        (renderedProductDetails.toppings &&
                          renderedProductDetails.toppings.length > 0)
                      "
                    >
                      <template v-if="renderedProductDetails.mixIns.length > 0">
                        <view class="smart-table detail-table">
                          <view class="table-header summary-header">
                            <text class="col-ingredient">辅料</text>
                            <text class="col-brand">品牌</text>
                            <text class="col-usage">总用量</text>
                          </view>
                          <view
                            v-for="ing in renderedProductDetails.mixIns"
                            :key="ing.id"
                            class="table-row"
                            @click.stop="
                              showExtraInfo(
                                ing.extraInfo,
                                `info-icon-${renderedProductDetails.id}-mixin-${ing.id}`,
                              )
                            "
                          >
                            <view class="col-ingredient ingredient-name-cell">
                              <view
                                v-if="ing.extraInfo"
                                class="ingredient-with-icon"
                                :id="`info-icon-${renderedProductDetails.id}-mixin-${ing.id}`"
                              >
                                <text>{{ ing.name }}</text>
                                <image
                                  class="info-icon"
                                  src="/static/icons/info.svg"
                                  mode="aspectFit"
                                ></image>
                              </view>
                              <text v-else>{{ ing.name }}</text>
                            </view>
                            <text class="col-brand">{{
                              ing.brand || "-"
                            }}</text>
                            <text class="col-usage">{{
                              formatWeight(ing.weightInGrams)
                            }}</text>
                          </view>
                        </view>
                      </template>

                      <template
                        v-if="renderedProductDetails.fillings.length > 0"
                      >
                        <view class="smart-table detail-table">
                          <view class="table-header summary-header">
                            <text class="col-ingredient">馅料</text>
                            <text class="col-brand">品牌</text>
                            <text class="col-per-unit">单个用量</text>
                            <text class="col-usage">总用量</text>
                          </view>
                          <view
                            v-for="ing in renderedProductDetails.fillings"
                            :key="ing.id"
                            class="table-row"
                            @click.stop="
                              showExtraInfo(
                                ing.extraInfo,
                                `info-icon-${renderedProductDetails.id}-filling-${ing.id}`,
                              )
                            "
                          >
                            <view class="col-ingredient ingredient-name-cell">
                              <view
                                v-if="ing.extraInfo"
                                class="ingredient-with-icon"
                                :id="`info-icon-${renderedProductDetails.id}-filling-${ing.id}`"
                              >
                                <text>{{ ing.name }}</text>
                                <image
                                  class="info-icon"
                                  src="/static/icons/info.svg"
                                  mode="aspectFit"
                                ></image>
                              </view>
                              <text v-else>{{ ing.name }}</text>
                            </view>
                            <text class="col-brand">{{
                              ing.brand || "-"
                            }}</text>
                            <text class="col-per-unit">{{
                              formatWeight(ing.weightPerUnit)
                            }}</text>
                            <text class="col-usage">{{
                              formatWeight(ing.weightInGrams)
                            }}</text>
                          </view>
                        </view>
                      </template>

                      <template
                        v-if="
                          renderedProductDetails.toppings &&
                          renderedProductDetails.toppings.length > 0
                        "
                      >
                        <view class="smart-table detail-table">
                          <view class="table-header summary-header">
                            <text class="col-ingredient">表面装饰</text>
                            <text class="col-brand">品牌</text>
                            <text class="col-per-unit">单个用量</text>
                            <text class="col-usage">总用量</text>
                          </view>
                          <view
                            v-for="ing in renderedProductDetails.toppings"
                            :key="ing.id"
                            class="table-row"
                            @click.stop="
                              showExtraInfo(
                                ing.extraInfo,
                                `info-icon-${renderedProductDetails.id}-topping-${ing.id}`,
                              )
                            "
                          >
                            <view class="col-ingredient ingredient-name-cell">
                              <view
                                v-if="ing.extraInfo"
                                class="ingredient-with-icon"
                                :id="`info-icon-${renderedProductDetails.id}-topping-${ing.id}`"
                              >
                                <text>{{ ing.name }}</text>
                                <image
                                  class="info-icon"
                                  src="/static/icons/info.svg"
                                  mode="aspectFit"
                                ></image>
                              </view>
                              <text v-else>{{ ing.name }}</text>
                            </view>
                            <text class="col-brand">{{
                              ing.brand || "-"
                            }}</text>
                            <text class="col-per-unit">{{
                              formatWeight(ing.weightPerUnit)
                            }}</text>
                            <text class="col-usage">{{
                              formatWeight(ing.weightInGrams)
                            }}</text>
                          </view>
                        </view>
                      </template>
                    </template>

                    <view
                      v-if="renderedProductDetails.procedure.length > 0"
                      class="procedure-notes"
                    >
                      <text class="notes-title">制作要点:</text>
                      <text
                        v-for="(
                          step, stepIndex
                        ) in renderedProductDetails.procedure"
                        :key="stepIndex"
                        class="note-item"
                      >
                        {{ stepIndex + 1 }}. {{ step }}
                      </text>
                    </view>
                  </view>
                </view>
              </template>
            </view>
          </template>

          <view
            v-if="isStarted && !isReadOnly"
            class="bottom-actions-container"
          >
            <AppButton
              type="primary"
              full-width
              @click="() => openCompleteTaskModal()"
              >完成任务</AppButton
            >
          </view>
        </view>
      </view>

      <view
        v-if="isLoading"
        class="page-content page-content-with-fab skeleton-overlay"
        :key="'task-detail-skeleton'"
      >
        <SkeletonDetail
          :meta-count="0"
          :show-chart="false"
          :list-count="2"
          :table-groups="1"
          :show-notes="true"
        />
      </view>

      <EmptyState
        v-if="!isLoading && !task"
        :key="'task-detail-empty'"
        :full-page="true"
        icon="/static/icons/network-error.svg"
        title="加载失败"
        subtitle="请检查网络连接后重试"
        :showAction="true"
        actionText="重新加载"
        @action="loadTaskData(taskId)"
      />
    </DetailPageLayout>

    <ExpandingFab
      v-if="isStarted"
      :key="'task-detail-fab'"
      icon="/static/icons/print.svg"
      @click="handlePrintTask"
      :no-tab-bar="true"
      :visible="isFabVisible"
    />

    <AppModal
      :visible="showCompleteTaskModal === true"
      :key="'complete-task-modal'"
      @update:visible="
        (v) => {
          if (typeof v === 'boolean') showCompleteTaskModal = v;
        }
      "
      :title="
        completionStep === 1
          ? isSelfMadeTask
            ? '提报完成重量'
            : '提报完成数量'
          : '提报产品损耗'
      "
    >
      <template v-if="Object.keys(completionForm).length > 0">
        <view
          class="modal-slider-container"
          :style="{
            height: modalContentHeight ? `${modalContentHeight}px` : 'auto',
          }"
        >
          <view
            class="modal-slider-track"
            :class="{ 'go-to-step2': completionStep === 2 }"
          >
            <view class="modal-step-content" id="step1-content">
              <view class="loss-product-list">
                <view
                  v-for="product in allProductsInTask"
                  :key="product.id"
                  class="loss-product-item"
                >
                  <text class="loss-product-name"
                    >{{ product.name }} (计划
                    {{ formatProductQuantity(product) }})</text
                  >
                  <view
                    v-if="completionForm[product.id]"
                    class="quantity-input-wrapper"
                  >
                    <input
                      class="loss-quantity-input"
                      type="digit"
                      :placeholder="isSelfMadeTask ? '实际产出' : '实际数量'"
                      :value="getCompletedQuantityInputValue(product.id)"
                      @input="onCompletedQuantityInput(product.id, $event)"
                    />
                    <text class="quantity-unit">{{
                      getCompletionQuantityUnit(product.plannedQuantity)
                    }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view class="modal-step-content" id="step2-content">
              <view
                class="spoilagestages-tabs-container"
                v-if="spoilageStages.length > 0"
              >
                <AnimatedTabs v-model="activeLossTab" :tabs="spoilageStages" />
              </view>
              <view class="loss-product-list">
                <view
                  v-for="product in productsWithSpoilage"
                  :key="product.id"
                  class="loss-product-item spoilage-item"
                >
                  <text class="loss-product-name"
                    >{{ product.name }} (剩余
                    {{ remainingSpoilageQuantity(product.id) }})</text
                  >
                  <input
                    v-if="completionForm[product.id]"
                    class="loss-quantity-input"
                    type="digit"
                    :placeholder="isSelfMadeTask ? '重量(g)' : '数量'"
                    :value="
                      completionForm[product.id].spoilageDetails[activeLossTab]
                    "
                    @input="
                      onSpoilageQuantityInput(product.id, activeLossTab, $event)
                    "
                  />
                </view>
              </view>
              <textarea
                class="spoilage-notes-input"
                v-model="completionNotes"
                placeholder="关于损耗情况的附加说明（可选）"
              ></textarea>
            </view>
          </view>
        </view>
        <view class="modal-actions">
          <AppButton type="secondary" @click="handleCompletionModalBack">
            {{ completionStep === 1 ? "取消" : "上一步" }}
          </AppButton>
          <AppButton
            type="primary"
            @click="() => handleCompletionModalNext()"
            :loading="isSubmitting"
            :disabled="!isStep1Valid"
          >
            {{
              completionStep === 1
                ? hasSpoilage
                  ? "下一步"
                  : "确认完成"
                : "确认完成"
            }}
          </AppButton>
        </view>
      </template>
    </AppModal>

    <AppModal
      v-model:visible="showRecipeVersionModal"
      :key="'recipe-version-modal'"
      title="确认执行配方"
    >
      <view class="version-dialog-copy"
        >任务创建后配方有更新，请确认本次制作采用的版本。</view
      >
      <view class="version-change-list">
        <view
          v-for="version in outdatedRecipeVersions"
          :key="version.familyId"
          class="version-change-row"
        >
          <text class="version-family-name">{{ version.familyName }}</text>
          <view class="version-route">
            <text class="version-chip is-current"
              >V{{ version.selectedVersion }}</text
            >
            <text class="version-arrow">→</text>
            <text class="version-chip is-latest"
              >V{{ version.currentVersion }}</text
            >
          </view>
        </view>
      </view>
      <view class="modal-actions">
        <AppButton
          type="secondary"
          @click="handleKeepCurrentVersions"
          :disabled="isSubmitting"
          >保持当前版本</AppButton
        >
        <AppButton
          type="primary"
          @click="handleApplyLatestVersions"
          :loading="isSubmitting"
          >应用最新版本</AppButton
        >
      </view>
    </AppModal>

    <AppPopover
      :visible="popover.visible"
      :key="'task-detail-popover'"
      :content="popover.content"
      :targetRect="popover.targetRect"
      placement="right"
      :offsetY="0"
    />
  </view>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  reactive,
  watch,
  nextTick,
  getCurrentInstance,
  shallowRef,
} from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useDataStore } from "@/store/data";
import { useToastStore } from "@/store/toast";
import { useUiStore } from "@/store/ui";
import { useTemperatureStore } from "@/store/temperature";
import { useUserStore } from "@/store/user";
import type { ProductionTaskDetailDto } from "@/types/api";
import {
  applyCurrentRecipeVersions,
  getTaskDetail,
  updateTaskStatus,
  completeTask,
  getSpoilageStages,
  getTaskPdfUrl,
} from "@/api/tasks";
import AppModal from "@/components/AppModal.vue";
import AppButton from "@/components/AppButton.vue";
import DetailHeader from "@/components/DetailHeader.vue";
import DetailPageLayout from "@/components/DetailPageLayout.vue";
import ListItem from "@/components/ListItem.vue";
import AnimatedTabs from "@/components/CssAnimatedTabs.vue";
import FilterTabs from "@/components/FilterTabs.vue";
import AppPopover from "@/components/AppPopover.vue";
import ExpandingFab from "@/components/ExpandingFab.vue";
import { formatWeight } from "@/utils/format";
import SkeletonDetail from "@/components/SkeletonDetail.vue";
import EmptyState from "@/components/EmptyState.vue";

defineOptions({
  inheritAttrs: false,
});

const dataStore = useDataStore();
const toastStore = useToastStore();
const uiStore = useUiStore();
const temperatureStore = useTemperatureStore();
const userStore = useUserStore();
const instance = getCurrentInstance();

const isLoading = ref(true);
const isSubmitting = ref(false);
const isPrinting = ref(false);
const task = shallowRef<ProductionTaskDetailDto | null>(null);
const taskId = ref<string | null>(null);
const showCompleteTaskModal = ref(false);
const showRecipeVersionModal = ref(false);
const isStarted = ref(false);
const isReadOnly = ref(false);
const selectedComponentFamilyId = ref<string | null>(null);
const renderedComponentFamilyId = ref<string | null>(null);
const isFadingOutComponent = ref(false);

const selectedProductId = ref<string>("");
const renderedProductId = ref<string>("");
const isFadingOutProduct = ref(false);

const addedIngredientsMap = reactive(new Set<string>());
const collapsedSections = ref(new Set<string>());
const lastTabChangeTime = ref(0);
const modalOpenTime = ref(0);

watch(selectedComponentFamilyId, (newId) => {
  if (!newId) return;
  if (newId === renderedComponentFamilyId.value) {
    return;
  }
  if (!renderedComponentFamilyId.value) {
    renderedComponentFamilyId.value = newId;
    return;
  }
  isFadingOutComponent.value = true;
  setTimeout(() => {
    renderedComponentFamilyId.value = newId;
    renderedProductId.value = selectedProductId.value;
    isFadingOutComponent.value = false;
  }, 150);
});

watch(selectedProductId, (newId) => {
  if (!newId) return;
  if (newId === renderedProductId.value) {
    return;
  }
  if (!renderedProductId.value) {
    renderedProductId.value = newId;
    return;
  }
  if (isFadingOutComponent.value) {
    return;
  }
  isFadingOutProduct.value = true;
  setTimeout(() => {
    renderedProductId.value = newId;
    isFadingOutProduct.value = false;
  }, 150);
});

const handleTabChange = (val: string) => {
  console.log(
    `[TaskDetail] handleTabChange triggered: ${val} at timestamp ${Date.now()}`,
  );
  selectedProductId.value = val;
  lastTabChangeTime.value = Date.now();
};

watch(selectedProductId, () => {
  console.log(
    `[TaskDetail] selectedProductId watch triggered: ${selectedProductId.value} at timestamp ${Date.now()}`,
  );
  lastTabChangeTime.value = Date.now();
});

const completionStep = ref(1);
const completionForm = ref<
  Record<
    string,
    {
      plannedQuantity: number;
      completedQuantity: number | null;
      spoilageDetails: Record<string, number | null>;
    }
  >
>({});
const completionNotes = ref("");
const spoilageStages = ref<
  {
    key: string;
    label: string;
  }[]
>([]);
const activeLossTab = ref("");
const modalContentHeight = ref<number | string>("auto");

const fromPage = ref("");

const isFabVisible = ref(true);
const lastScrollTop = ref(0);
const scrollThreshold = 5;

const showPulseAnimation = ref(false);

const popover = reactive<{
  visible: boolean;
  content: string;
  targetRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
}>({
  visible: false,
  content: "",
  targetRect: null,
});

const pageStyle = computed(() => {
  let style = "background-color: #fdf8f2;";
  if (popover.visible) {
    style += "overflow: hidden;";
  }
  return style;
});

const updateModalContentHeight = () => {
  nextTick(() => {
    const stepId = `#step${completionStep.value}-content`;
    const query = uni.createSelectorQuery().in(instance);
    query
      .select(stepId)
      .boundingClientRect((rect) => {
        if (rect && rect.height) {
          modalContentHeight.value = rect.height;
        }
      })
      .exec();
  });
};

watch(showCompleteTaskModal, (visible) => {
  console.log(
    `[TaskDetail] showCompleteTaskModal watch: visible = ${visible} at timestamp ${Date.now()}`,
  );
  if (visible) {
    modalOpenTime.value = Date.now();
    completionStep.value = 1;
    setTimeout(() => {
      updateModalContentHeight();
    }, 50);
  } else {
    setTimeout(() => {
      modalContentHeight.value = "auto";
    }, 300);
  }
});

watch(completionStep, () => {
  if (showCompleteTaskModal.value) {
    updateModalContentHeight();
  }
});

const resetCompletionForm = () => {
  completionStep.value = 1;
  completionNotes.value = "";
  completionForm.value = {};
  if (task.value) {
    task.value.items.forEach((item) => {
      completionForm.value[item.id] = {
        plannedQuantity: item.plannedQuantity,
        completedQuantity: item.plannedQuantity,
        spoilageDetails: {},
      };
      spoilageStages.value.forEach((stage) => {
        completionForm.value[item.id].spoilageDetails[stage.key] = null;
      });
    });
  }
};

const isCompletionFormReady = () => {
  if (!task.value || !task.value.items.length) return false;
  return task.value.items.every(
    (item) =>
      completionForm.value[item.id] &&
      completionForm.value[item.id].completedQuantity !== null,
  );
};

const openCompleteTaskModal = async () => {
  const now = Date.now();
  console.log(
    `[TaskDetail] openCompleteTaskModal triggered. lastTabChangeTime: ${lastTabChangeTime.value}, diff: ${now - lastTabChangeTime.value}ms`,
  );
  if (now - lastTabChangeTime.value < 400) {
    console.warn(
      `[TaskDetail] Prevented potential click penetration. diff: ${now - lastTabChangeTime.value}ms`,
    );
    return;
  }
  if (!task.value || !task.value.items) {
    return;
  }
  resetCompletionForm();
  if (spoilageStages.value.length === 0) {
    spoilageStages.value = await getSpoilageStages();
    if (spoilageStages.value.length > 0) {
      activeLossTab.value = spoilageStages.value[0].key;
    }
  }
  if (!isCompletionFormReady()) {
    resetCompletionForm();
  }
  if (!isCompletionFormReady()) {
    toastStore.show({
      message: "完成数量初始化失败，请稍后重试",
      type: "error",
    });
    return;
  }
  showCompleteTaskModal.value = true;
};

const allProductsInTask = computed(() => {
  return task.value?.items || [];
});

const outdatedRecipeVersions = computed(
  () =>
    task.value?.recipeVersions?.filter((version) => version.hasUpdate) ?? [],
);

onLoad(async (options) => {
  taskId.value = options?.taskId || null;
  fromPage.value = options?.from || "";
  if (fromPage.value === "history") {
    isReadOnly.value = true;
  }

  if (!taskId.value) {
    return;
  }

  await loadTaskData(taskId.value);
});

const handleScroll = (event?: any) => {
  if (popover.visible) {
    popover.visible = false;
  }

  if (!event || !event.detail) {
    return;
  }
  const scrollTop = event.detail.scrollTop;

  if (Math.abs(scrollTop - lastScrollTop.value) <= scrollThreshold) {
    return;
  }

  if (scrollTop > lastScrollTop.value && scrollTop > 50) {
    isFabVisible.value = false;
  } else {
    isFabVisible.value = true;
  }

  lastScrollTop.value = scrollTop < 0 ? 0 : scrollTop;
};

const loadTaskData = async (id: string) => {
  isLoading.value = true;
  try {
    temperatureStore.initTemperatureSettings();
    const response = await getTaskDetail(id, temperatureStore.settings);
    // 立刻赋值触发DOM预渲染
    task.value = response;

    isReadOnly.value =
      task.value.status === "COMPLETED" || task.value.status === "CANCELLED";

    addedIngredientsMap.clear();
    if (task.value.status === "IN_PROGRESS") {
      const savedProgress = dataStore.loadTaskProgress(id);
      savedProgress.forEach((key) => addedIngredientsMap.add(key));
    }

    if (
      task.value.status === "IN_PROGRESS" ||
      task.value.status === "COMPLETED" ||
      task.value.status === "CANCELLED"
    ) {
      isStarted.value = true;
      if (task.value.componentGroups.length > 0) {
        const firstComponent = task.value.componentGroups[0];
        selectedComponentFamilyId.value = firstComponent.familyId;
        renderedComponentFamilyId.value = firstComponent.familyId;
        if (firstComponent.productDetails.length > 0) {
          selectedProductId.value = firstComponent.productDetails[0].id;
          renderedProductId.value = firstComponent.productDetails[0].id;
        }
      }
    }
  } catch (error) {
    console.error("Failed to load task details:", error);
    // 接口报错时确保数据置空，触发 EmptyState
    task.value = null;
  } finally {
    setTimeout(() => {
      isLoading.value = false;
    }, 200);
  }
};

const handlePrintTask = async () => {
  if (!taskId.value) return;

  isPrinting.value = true;
  try {
    const pdfUrl = await getTaskPdfUrl(taskId.value);

    if (!pdfUrl) {
      toastStore.show({
        message: "无法获取打印文件",
        type: "error",
      });
      return;
    }

    const token = userStore.token;

    uni.downloadFile({
      url: pdfUrl,
      header: {
        Authorization: `Bearer ${token}`,
      },
      success: function (res) {
        if (res.statusCode === 200) {
          const filePath = res.tempFilePath;
          uni.openDocument({
            filePath: filePath,
            fileType: "pdf",
            showMenu: true,
            success: function () {},
            fail: function (err) {
              console.error("打开文档失败", err);
              toastStore.show({
                message: "无法打开打印预览",
                type: "error",
              });
            },
          });
        } else {
          toastStore.show({
            message: "文件下载失败",
            type: "error",
          });
        }
      },
      fail: function (err) {
        console.error("下载失败", err);
        toastStore.show({
          message: "网络请求失败，请重试",
          type: "error",
        });
      },
      complete: () => {
        isPrinting.value = false;
      },
    });
  } catch (error) {
    console.error("Print error:", error);
    toastStore.show({
      message: "打印请求出错",
      type: "error",
    });
    isPrinting.value = false;
  }
};

const productsWithSpoilage = computed(() => {
  return allProductsInTask.value
    .map((p) => ({
      ...p,
      spoilageQuantity:
        p.plannedQuantity -
        (completionForm.value[p.id]?.completedQuantity ?? p.plannedQuantity),
    }))
    .filter((p) => p.spoilageQuantity > 0);
});

const hasSpoilage = computed(() => {
  // [解释决策和约束] 自制原料任务产出的差值通常是因为水分蒸发等正常的物理损耗。
  // 这部分损耗不属于车间生产工艺异常，因此不需要进入第二步让工人填报具体环节的报损。
  if (isSelfMadeTask.value) {
    return false;
  }
  return Object.values(completionForm.value).some(
    (item) =>
      item.completedQuantity !== null &&
      item.completedQuantity < item.plannedQuantity,
  );
});

const isStep1Valid = computed(() => {
  return Object.values(completionForm.value).every(
    (item) => item.completedQuantity !== null,
  );
});

const remainingSpoilageQuantity = (productId: string) => {
  const productData = completionForm.value[productId];
  if (!productData) return 0;

  const totalSpoilage =
    productData.plannedQuantity - (productData.completedQuantity || 0);
  const reportedSpoilage = Object.values(productData.spoilageDetails).reduce(
    (sum, current) => sum + (current || 0),
    0,
  );

  return totalSpoilage - reportedSpoilage;
};

const onCompletedQuantityInput = (productId: string, event: any) => {
  const value = event.target?.value ?? event.detail.value;
  const rawValue = value === "" ? null : Number(value);
  const product = completionForm.value[productId];
  const numValue =
    rawValue === null || !isSelfMadeTask.value || !product
      ? rawValue
      : convertSelfMadeInputToGrams(rawValue, product.plannedQuantity);
  if (numValue !== null && numValue < 0) {
    completionForm.value[productId].completedQuantity = 0;
  } else {
    completionForm.value[productId].completedQuantity = numValue;
  }
};

const onSpoilageQuantityInput = (
  productId: string,
  stage: string,
  event: any,
) => {
  const value = event.target?.value ?? event.detail.value;
  const currentSpoilage = value === "" ? null : Number(value);

  const product = completionForm.value[productId];
  if (!product) return;

  let otherStagesSpoilage = 0;
  for (const key in product.spoilageDetails) {
    if (key !== stage) {
      otherStagesSpoilage += product.spoilageDetails[key] || 0;
    }
  }

  const totalSpoilage = otherStagesSpoilage + (currentSpoilage || 0);
  const maxSpoilage =
    product.plannedQuantity - (product.completedQuantity || 0);

  if (totalSpoilage > maxSpoilage) {
    toastStore.show({
      message: `总损耗不能超过 ${maxSpoilage}`,
      type: "error",
    });
    nextTick(() => {
      product.spoilageDetails[stage] =
        maxSpoilage - otherStagesSpoilage > 0
          ? maxSpoilage - otherStagesSpoilage
          : null;
    });
  } else {
    product.spoilageDetails[stage] = currentSpoilage;
  }
};

const handleCompletionModalBack = () => {
  if (completionStep.value === 1) {
    showCompleteTaskModal.value = false;
  } else {
    completionStep.value = 1;
  }
};

const handleCompletionModalNext = () => {
  console.trace(`[TaskDetail] handleCompletionModalNext triggered. trace:`);
  const now = Date.now();
  console.log(
    `[TaskDetail] handleCompletionModalNext clicked. modalOpenTime: ${modalOpenTime.value}, diff: ${now - modalOpenTime.value}ms`,
  );
  if (now - modalOpenTime.value < 400) {
    console.warn(
      `[TaskDetail] Blocked premature submit click (possible ghost click). diff: ${now - modalOpenTime.value}ms`,
    );
    return;
  }
  if (completionStep.value === 1) {
    if (hasSpoilage.value) {
      completionStep.value = 2;
    } else {
      handleConfirmComplete();
    }
  } else {
    handleConfirmComplete();
  }
};

const handleConfirmComplete = async () => {
  console.trace(`[TaskDetail] handleConfirmComplete triggered. trace:`);
  if (!showCompleteTaskModal.value) {
    console.error(
      `[TaskDetail] CRITICAL: handleConfirmComplete called but modal is CLOSED! Blocked execution.`,
    );
    return;
  }
  if (!task.value) return;

  const completedItems = Object.entries(completionForm.value).map(
    ([productId, data]) => {
      const item: {
        productId: string;
        completedQuantity: number;
        // [解释决策和约束] 补充 actualYieldInGrams 类型定义，以支持将物理称重数据传递给后端修正蒸发损耗
        actualYieldInGrams?: number;
        spoilageDetails?: {
          stage: string;
          quantity: number;
          notes?: string;
        }[];
      } = {
        productId,
        completedQuantity: data.completedQuantity!,
      };

      // [解释决策和约束] 自制原料任务的 UI 输入原本就是“实际产出(g)”，
      // 直接将 completedQuantity 赋值给 actualYieldInGrams，避免前端重复造轮子添加多余输入框。
      if (isSelfMadeTask.value) {
        item.actualYieldInGrams = data.completedQuantity!;
      }

      if (
        !isSelfMadeTask.value &&
        data.completedQuantity! < data.plannedQuantity
      ) {
        item.spoilageDetails = Object.entries(data.spoilageDetails)
          .filter(([, quantity]) => quantity !== null && quantity > 0)
          .map(([stage, quantity]) => ({
            stage,
            quantity: quantity!,
            notes: completionNotes.value || undefined,
          }));

        const totalReportedSpoilage = item.spoilageDetails.reduce(
          (sum, s) => sum + s.quantity,
          0,
        );
        const calculatedSpoilage =
          data.plannedQuantity - data.completedQuantity!;
        if (Math.abs(totalReportedSpoilage - calculatedSpoilage) > 0.01) {
          toastStore.show({
            message: `产品损耗总数 ${totalReportedSpoilage} 与计算损耗 ${calculatedSpoilage} 不符`,
            type: "error",
          });
          throw new Error("损耗数量不一致");
        }
      }
      return item;
    },
  );

  isSubmitting.value = true;
  try {
    console.log(
      `[TaskDetail] handleConfirmComplete executing. taskId: ${task.value.id}, completedItems:`,
      JSON.stringify(completedItems),
    );
    await completeTask(task.value.id, {
      notes: completionNotes.value,
      completedItems,
    });

    dataStore.clearTaskProgress(task.value.id);
    dataStore.completeProductionTaskLocally(task.value.id);

    const target =
      fromPage.value === "history"
        ? "/pages/production/history"
        : "/pages/main/main";
    uiStore.setNextPageToast(
      {
        message: "任务已完成",
        type: "success",
      },
      target,
    );

    dataStore.markProductionAsStale();
    dataStore.markHistoricalTasksAsStale();
    dataStore.markIngredientsAsStale();

    uni.navigateBack();
  } catch (error) {
    console.error("Failed to complete task:", error);
  } finally {
    isSubmitting.value = false;
    showCompleteTaskModal.value = false;
  }
};

const toggleCollapse = (sectionName: string) => {
  console.log(
    `[TaskDetail] toggleCollapse clicked: ${sectionName} at timestamp ${Date.now()}`,
  );
  lastTabChangeTime.value = Date.now();
  const newSet = new Set(collapsedSections.value);
  if (newSet.has(sectionName)) {
    newSet.delete(sectionName);
  } else {
    newSet.add(sectionName);
  }
  collapsedSections.value = newSet;
};

const checkAndTriggerAnimation = (familyId: string) => {
  if (
    !selectedComponentDetails.value ||
    selectedComponentDetails.value.familyId !== familyId
  )
    return;

  const ingredients = selectedComponentDetails.value.baseComponentIngredients;
  if (!ingredients || ingredients.length === 0) return;

  const allAdded = ingredients.every((ing) =>
    addedIngredientsMap.has(`${familyId}-${ing.id}`),
  );

  if (allAdded && componentMixInSummary.value.length > 0) {
    showPulseAnimation.value = true;

    setTimeout(() => {
      showPulseAnimation.value = false;
    }, 2500);
  }
};

const toggleIngredientAdded = (
  componentFamilyId: string,
  ingredientId: string,
) => {
  if (isReadOnly.value || !taskId.value) return;
  uni.vibrateShort({});

  const compositeKey = `${componentFamilyId}-${ingredientId}`;

  if (addedIngredientsMap.has(compositeKey)) {
    addedIngredientsMap.delete(compositeKey);
  } else {
    addedIngredientsMap.add(compositeKey);
    checkAndTriggerAnimation(componentFamilyId);
  }

  dataStore.saveTaskProgress(taskId.value, addedIngredientsMap);
};

const startTaskWithSelectedVersions = async () => {
  console.log(
    `[TaskDetail] handleStartTask clicked at timestamp ${Date.now()}`,
  );
  lastTabChangeTime.value = Date.now();
  if (!task.value || !taskId.value) return;
  isSubmitting.value = true;
  try {
    await updateTaskStatus(task.value.id, "IN_PROGRESS");
    isStarted.value = true;
    await loadTaskData(taskId.value);
    toastStore.show({
      message: "任务已开始",
      type: "success",
    });
    dataStore.markProductionAsStale();
  } catch (error) {
    console.error("Failed to start task:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const handleStartTask = () => {
  if (outdatedRecipeVersions.value.length > 0) {
    showRecipeVersionModal.value = true;
    return;
  }
  void startTaskWithSelectedVersions();
};

const handleKeepCurrentVersions = async () => {
  showRecipeVersionModal.value = false;
  await startTaskWithSelectedVersions();
};

const handleApplyLatestVersions = async () => {
  if (!task.value || !taskId.value) return;
  isSubmitting.value = true;
  try {
    await applyCurrentRecipeVersions(task.value.id);
    await loadTaskData(taskId.value);
    showRecipeVersionModal.value = false;
    await startTaskWithSelectedVersions();
  } catch (error) {
    console.error("Failed to apply latest recipe versions:", error);
  } finally {
    isSubmitting.value = false;
  }
};

const selectComponent = (familyId: string) => {
  console.log(
    `[TaskDetail] selectComponent clicked: ${familyId} at timestamp ${Date.now()}`,
  );
  lastTabChangeTime.value = Date.now();
  if (!isStarted.value && !isReadOnly.value) return;
  selectedComponentFamilyId.value = familyId;
  const componentDetails = selectedComponentDetails.value;
  if (componentDetails && componentDetails.productDetails.length > 0) {
    selectedProductId.value = componentDetails.productDetails[0].id;
  } else {
    selectedProductId.value = "";
  }
};

const showExtraInfo = (info: string | null | undefined, elementId: string) => {
  if (!info) {
    hidePopover();
    return;
  }

  if (popover.visible && popover.content === info) {
    hidePopover();
    return;
  }

  const query = uni.createSelectorQuery().in(instance);
  query
    .select("#" + elementId)
    .boundingClientRect((rect: UniApp.NodeInfo) => {
      if (rect) {
        popover.content = info;
        popover.targetRect = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
        popover.visible = true;
      } else {
        hidePopover();
      }
    })
    .exec();
};

const hidePopover = () => {
  popover.visible = false;
};

const selectedComponentDetails = computed(() => {
  if (!task.value || !selectedComponentFamilyId.value) return null;
  return (
    task.value.componentGroups.find(
      (d) => d.familyId === selectedComponentFamilyId.value,
    ) || null
  );
});

const renderedComponentDetails = computed(() => {
  if (!task.value || !renderedComponentFamilyId.value) return null;
  return (
    task.value.componentGroups.find(
      (d) => d.familyId === renderedComponentFamilyId.value,
    ) || null
  );
});

const selectedProductDetails = computed(() => {
  if (!selectedComponentDetails.value || !selectedProductId.value) return null;
  return selectedComponentDetails.value.productDetails.find(
    (p) => p.id === selectedProductId.value,
  );
});

const renderedProductDetails = computed(() => {
  if (!renderedComponentDetails.value || !renderedProductId.value) return null;
  return renderedComponentDetails.value.productDetails.find(
    (p) => p.id === renderedProductId.value,
  );
});

const productTabs = computed(() => {
  if (!selectedComponentDetails.value) return [];
  return selectedComponentDetails.value.productDetails.map((p) => ({
    key: p.id,
    label: p.name,
  }));
});

const isSelfMadeComponent = computed(() => {
  if (!selectedComponentDetails.value) return false;
  return selectedComponentDetails.value.category === "OTHER";
});

const isSelfMadeTask = computed(() => {
  return isSelfMadeComponent.value;
});

const formatProductQuantity = (product: {
  name: string;
  plannedQuantity: number;
}) => {
  if (isSelfMadeTask.value) {
    return formatWeight(product.plannedQuantity);
  }
  return `${product.plannedQuantity}个`;
};

const getSelfMadeQuantityUnit = (plannedQuantity: number) => {
  return Math.abs(Number(plannedQuantity)) >= 10000 ? "kg" : "g";
};

const getCompletionQuantityUnit = (plannedQuantity: number) => {
  return isSelfMadeTask.value ? getSelfMadeQuantityUnit(plannedQuantity) : "个";
};

const getCompletedQuantityInputValue = (productId: string) => {
  const product = completionForm.value[productId];
  if (!product || product.completedQuantity === null) return "";
  if (!isSelfMadeTask.value) return product.completedQuantity;

  const displayValue =
    getSelfMadeQuantityUnit(product.plannedQuantity) === "kg"
      ? product.completedQuantity / 1000
      : product.completedQuantity;
  return displayValue.toFixed(2);
};

const convertSelfMadeInputToGrams = (
  value: number,
  plannedQuantity: number,
) => {
  return getSelfMadeQuantityUnit(plannedQuantity) === "kg"
    ? value * 1000
    : value;
};

const componentMixInSummary = computed(() => {
  if (!selectedComponentDetails.value) return [];

  const summaryMap = new Map<string, { name: string; products: string[] }>();

  selectedComponentDetails.value.productDetails.forEach((product) => {
    if (product.mixIns && product.mixIns.length > 0) {
      product.mixIns.forEach((ing) => {
        if (!summaryMap.has(ing.name)) {
          summaryMap.set(ing.name, { name: ing.name, products: [] });
        }
        summaryMap.get(ing.name)!.products.push(product.name);
      });
    }
  });

  return Array.from(summaryMap.values()).map((item) => ({
    name: item.name,
    productNames: item.products.join(", "),
  }));
});
</script>

<style scoped lang="scss">
@import "@/styles/common.scss";
@include list-item-content-style;
@include table-layout;

.version-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #f2ebe1; /* 暖灰燕麦底色 */
  color: #8d6e63; /* 暖焦糖字色 */
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 8px;
  line-height: 1.2;
  vertical-align: middle;
  /* 没有 border */
}

.collapsible-content {
  max-height: 1000px;
  overflow: hidden;
  transition: max-height 0.3s ease;
  box-sizing: border-box;

  &:last-child {
    padding-bottom: 10px;
  }
}

.collapsible-content.is-collapsed {
  max-height: 0;
}

.font-size-14 {
  font-size: 14px;
}

.modal-slider-container {
  overflow: hidden;
  transition: height 0.3s ease-in-out;
}

.modal-slider-track {
  display: flex;
  width: 200%;
  transition: transform 0.3s ease-in-out;
  align-items: flex-start;
}

.modal-slider-track.go-to-step2 {
  transform: translateX(-50%);
}

.modal-step-content {
  width: 50%;
  flex-shrink: 0;
  box-sizing: border-box;
}

.loss-product-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
  padding: 5px;
}

.loss-product-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.spoilagestages-tabs-container {
  margin-top: 0px;
}

.spoilage-item {
  flex-wrap: wrap;
}

.loss-product-name {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.loss-quantity-input {
  background-color: var(--bg-color);
  border-radius: 8px;
  padding: 0 10px;
  text-align: center;
  font-size: 15px;
  width: 115px;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  height: 36px;
  flex-shrink: 0;
}

.quantity-input-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.quantity-input-wrapper .loss-quantity-input {
  width: 94px;
}

.quantity-unit {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 18px;
}

.spoilage-notes-input {
  width: 100%;
  height: 80px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  margin-top: 20px;
  box-sizing: border-box;
  background-color: var(--bg-color);
}

.page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.detail-page .tag-group {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  white-space: normal;
}

.warning-card {
  background-color: #faedcd;
  border: none;
  padding: 15px;
  margin-bottom: 20px;
  color: var(--primary-color);
  border-radius: 20px;
}

.warning-content {
  display: flex;
  align-items: center;
}

.warning-text {
  font-size: 14px;
  line-height: 1.6;
}

.recipe-version-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin: -4px 2px 18px;
  padding: 12px 14px;
  border-left: 3px solid #c97a2b;
  background: #fff8ed;
}

.version-notice-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #c97a2b;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.version-notice-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.version-notice-title {
  font-size: 14px;
  font-weight: 600;
  color: #744216;
}

.version-notice-desc,
.version-dialog-copy {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.version-change-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0 4px;
}

.version-change-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: #faf8f5;
}

.version-family-name {
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-route {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.version-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 6px;
}

.version-chip.is-current {
  background: #ece8e3;
  color: #6f6860;
}

.version-chip.is-latest {
  background: #e5f2e8;
  color: #2f6b43;
}

.version-arrow {
  font-size: 13px;
  color: var(--text-secondary);
}

.card-full-bleed-list {
  background: var(--card-bg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  margin-bottom: 20px;
  padding: 20px 0px;
}

.disabled-list {
  pointer-events: none;
}

.card-full-bleed-list .card-title-wrapper {
  padding-left: 20px;
  padding-right: 20px;
  margin-bottom: 10px;
}

.product-list-item .main-info .name {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.product-list-item .main-info .desc {
  margin-top: 4px;
}

.group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  color: var(--text-primary);
  border: none;
  margin-top: 30px;
  position: relative;
  background-color: #faf8f5;
  padding: 10px 15px;
  border-radius: 12px;
}

.card > .group-title:first-child {
  margin-top: 10px;
}

.arrow {
  font-size: 14px;
  color: var(--text-secondary);
  transform: rotate(90deg);
  transition: transform 0.3s ease;
}

.arrow.collapsed {
  transform: rotate(0deg);
}

.sub-group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
  margin-top: 20px;
  padding: 0 5px;
}

.smart-table {
  font-size: 14px;
  color: var(--text-primary);

  .table-header {
    color: var(--text-secondary);
    font-weight: 500;
    border-bottom: 1px solid var(--border-color);
  }

  .table-row {
    color: var(--text-primary);
    transition: background-color 0.3s ease;

    border-bottom: 1px solid var(--border-color);

    &:last-child {
      border-bottom: none;
    }
  }

  .table-row.is-added {
    background-color: #f0ebe5;
  }

  .ingredient-with-icon {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .info-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}

.total-weight-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 4px;
  font-size: 13px;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-color);
  margin-top: 10px;
}

.summary-right-info {
  display: flex;
  align-items: center;
  text-align: right;
}

.highlight-output {
  margin-left: 10px;
  font-weight: bold;
  color: var(--primary-color);
}

/* 左侧轻量级警示样式 */
.summary-left-alert {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  margin-left: -4px;
  border-radius: 6px;
}

.summary-left-alert text {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.summary-alert-icon {
  width: 16px;
  height: 16px;
  display: block;
}

/* 辅料提示呼吸高亮动画 */
@keyframes pulse-bg-highlight {
  0% {
    background-color: transparent;
    box-shadow: none;
  }
  50% {
    background-color: #faedcd;
    box-shadow: 0 0 8px rgba(250, 237, 205, 0.8);
  }
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}

.pulse-highlight {
  animation: pulse-bg-highlight 0.8s ease-in-out 3;
}

.procedure-notes {
  @include procedure-notes-style;
  margin-top: 25px;
}

.detail-table .table-header,
.detail-table .table-row {
  .col-ingredient {
    flex: 2.5;
  }
  .col-brand {
    flex: 2;
  }
  .col-per-unit,
  .col-usage {
    flex: 1.5;
  }
}

.detail-table {
  margin-top: 25px;
}

.product-tabs-container {
  margin-top: 30px;
  margin-bottom: 30px;
  --tabs-container-bg-rgb: 255, 255, 255;
}

.card {
  animation: fadeInClean 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;

  &.is-fading-out {
    animation: fadeOutClean 0.15s ease forwards;
  }
}

.product-details-animated-container {
  animation: fadeInClean 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;

  &.is-fading-out {
    animation: fadeOutClean 0.15s ease forwards;
  }
}

.product-badges-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.product-badge {
  display: inline-flex;
  align-items: center;
  background-color: #faf5f0;
  border: 1px solid rgba(140, 90, 59, 0.08);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  color: #7d6e63;
  line-height: 1.2;
}

.prod-name {
  font-weight: 500;
}

.prod-qty {
  font-weight: 700;
  color: var(--primary-color);
  margin-left: 6px;
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
    transform: translateY(0);
  }
}

@keyframes fadeOutClean {
  to {
    opacity: 0;
    transform: translateY(-5px);
  }
}
</style>
