<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElButton, ElSelect, ElOption, ElDatePicker } from 'element-plus'
import type { Card, TaskType } from '../types'
import { getDeadlineDisplay } from '../utils/deadlineUtils'
import { loadImage } from '../utils/db'

const props = defineProps<{
  card: Card
  taskTypes: TaskType[]
  collapseState: 'normal' | 'max'
}>()

const emit = defineEmits<{
  'update:card': [card: Card]
  'delete': [cardId: string]
}>()

// 圖片相關
const imageUrl = ref<string | null>(null)

// 載入圖片
const loadCardImage = async () => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
  if (props.card.imageBlobId) {
    try {
      const blob = await loadImage(props.card.imageBlobId)
      if (blob) {
        imageUrl.value = URL.createObjectURL(blob)
      }
    } catch (error) {
      console.error('載入圖片失敗:', error)
    }
  } else {
    imageUrl.value = null
  }
}

onMounted(() => {
  loadCardImage()
})

watch(() => props.card.imageBlobId, loadCardImage)

onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})

// 任務類型
const taskType = computed(() => {
  return props.taskTypes.find(t => t.id === props.card.taskTypeId) || props.taskTypes[0] || { id: '', name: '', icon: '', iconType: 'emoji' as const }
})

// 時限顯示
const deadlineDisplay = computed(() => {
  if (!props.card.deadline) return null
  return getDeadlineDisplay(props.card.deadline)
})

// 更新卡片
const updateCard = (updates: Partial<Card>) => {
  emit('update:card', { ...props.card, ...updates })
}

// 文字編輯
const editingText = ref(false)
const textInput = ref('')

const startEditText = () => {
  editingText.value = true
  textInput.value = props.card.text
}

const finishEditText = () => {
  if (textInput.value.trim()) {
    updateCard({ text: textInput.value.trim() })
  }
  editingText.value = false
}

// 刪除卡片
const handleDelete = () => {
  emit('delete', props.card.id)
}

// 任務類型選擇
const selectingTaskType = ref(false)
const handleTaskTypeChange = (taskTypeId: string) => {
  updateCard({ taskTypeId })
  selectingTaskType.value = false
}

// 期限編輯
const editingDeadline = ref(false)
const deadlineDate = ref<Date | null>(null)
const deadlineHour = ref<number>(0)

const startEditDeadline = () => {
  editingDeadline.value = true
  if (props.card.deadline) {
    // 將字符串日期轉換為 Date 對象
    const parts = props.card.deadline.date.split('-').map(Number)
    const year = parts[0] || new Date().getFullYear()
    const month = parts[1] || new Date().getMonth() + 1
    const day = parts[2] || new Date().getDate()
    deadlineDate.value = new Date(year, month - 1, day)
    deadlineHour.value = props.card.deadline.hour
  } else {
    // 預設為今天
    deadlineDate.value = new Date()
    deadlineHour.value = new Date().getHours()
  }
}

const finishEditDeadline = () => {
  if (deadlineDate.value) {
    const year = deadlineDate.value.getFullYear()
    const month = (deadlineDate.value.getMonth() + 1).toString().padStart(2, '0')
    const day = deadlineDate.value.getDate().toString().padStart(2, '0')
    updateCard({
      deadline: {
        date: `${year}-${month}-${day}`,
        hour: deadlineHour.value
      }
    })
  }
  editingDeadline.value = false
}

const clearDeadline = () => {
  updateCard({ deadline: undefined })
  editingDeadline.value = false
}
</script>

<template>
  <div 
    :class="['card', {
      'card-expired': deadlineDisplay?.isExpired,
      'card-active': deadlineDisplay && !deadlineDisplay.isExpired
    }]"
  >
    <!-- 卡片頭部 -->
    <div class="card-header">
      <div class="card-type-icon-wrapper" @click.stop>
        <div 
          v-if="!selectingTaskType" 
          class="card-type-icon"
          @click="selectingTaskType = true"
        >
          <span v-if="taskType.iconType === 'emoji'">{{ taskType.icon }}</span>
          <img v-else :src="taskType.icon" :alt="taskType.name" />
        </div>
        <el-select
          v-else
          :model-value="card.taskTypeId"
          @change="handleTaskTypeChange"
          @blur="selectingTaskType = false"
          size="small"
          class="card-type-select"
          @click.stop
        >
          <el-option
            v-for="type in taskTypes"
            :key="type.id"
            :label="type.name"
            :value="type.id"
          >
            <span v-if="type.iconType === 'emoji'">{{ type.icon }}</span>
            <img v-else :src="type.icon" :alt="type.name" style="width: 16px; height: 16px; margin-right: 4px;" />
            {{ type.name }}
          </el-option>
        </el-select>
      </div>
      <div class="card-actions">
        <el-button
          type="danger"
          size="small"
          circle
          @click="handleDelete"
        >
          ×
        </el-button>
      </div>
    </div>

    <!-- 卡片文字 -->
    <div class="card-text" @click="startEditText">
      <div v-if="!editingText" class="card-text-display">
        {{ card.text || '點擊編輯' }}
      </div>
      <textarea
        v-else
        v-model="textInput"
        @blur="finishEditText"
        @keyup.ctrl.enter="finishEditText"
        @keyup.esc="editingText = false"
        class="card-text-input"
        rows="3"
      ></textarea>
    </div>

    <!-- 卡片圖片 -->
    <div v-if="imageUrl" class="card-image">
      <img 
        v-if="collapseState === 'max'"
        :src="imageUrl" 
        :alt="card.text"
        class="card-image-full"
      />
      <img 
        v-else
        :src="imageUrl" 
        :alt="card.text"
        class="card-image-thumbnail"
      />
    </div>

    <!-- 時限顯示 -->
    <div class="card-deadline" @click.stop>
      <div v-if="!editingDeadline">
        <div v-if="deadlineDisplay" class="deadline-display" @click="startEditDeadline">
          <span :class="deadlineDisplay.isExpired ? 'deadline-expired' : 'deadline-active'">
            {{ deadlineDisplay.display }}
          </span>
        </div>
        <div v-else class="deadline-placeholder" @click="startEditDeadline">
          點擊設定期限
        </div>
      </div>
      <div v-else class="deadline-editor">
        <div class="deadline-editor-row">
          <el-date-picker
            v-model="deadlineDate"
            type="date"
            placeholder="選擇日期"
            size="small"
            style="width: 140px;"
            @click.stop
          />
          <el-select
            :model-value="deadlineHour"
            @change="(val: number) => deadlineHour = val"
            size="small"
            style="width: 80px; margin-left: 8px;"
            @click.stop
          >
            <el-option
              v-for="h in 24"
              :key="h - 1"
              :label="String(h - 1).padStart(2, '0')"
              :value="h - 1"
            />
          </el-select>
        </div>
        <div class="deadline-editor-actions">
          <el-button size="small" type="danger" @click="clearDeadline">清除</el-button>
          <el-button size="small" @click="editingDeadline = false">取消</el-button>
          <el-button size="small" @click="finishEditDeadline">確定</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 2px solid var(--border-color);
  box-shadow: 0 1px 2px var(--shadow-sm);
  transition: all 0.2s;
}

.card:hover {
  box-shadow: 0 2px 4px var(--shadow-md);
}

.card-expired {
  border-color: var(--text-tertiary);
  opacity: 0.7;
}

.card-active {
  border-color: #f56c6c; /* 保持紅色作為活躍狀態的視覺提示 */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-type-icon-wrapper {
  display: flex;
  align-items: center;
}

.card-type-icon {
  font-size: 20px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.card-type-icon:hover {
  background-color: var(--hover-bg);
}

.card-type-select {
  width: 120px;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-text {
  margin-bottom: 8px;
  min-height: 24px;
}

.card-text-display {
  word-break: break-word;
  white-space: pre-wrap;
  color: var(--text-primary);
  transition: color 0.3s;
}

.card-text-input {
  width: 100%;
  border: 2px solid #409EFF;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  font-size: 14px;
  box-sizing: border-box;
}

.card-image {
  margin-bottom: 8px;
}

.card-image-full {
  width: 100%;
  height: auto;
  border-radius: 4px;
  max-height: 400px;
  object-fit: contain;
}

.card-image-thumbnail {
  width: 100%;
  height: auto;
  border-radius: 4px;
  max-height: 150px;
  object-fit: cover;
}

.card-deadline {
  font-size: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
  transition: border-color 0.3s;
}

.deadline-display {
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.deadline-display:hover {
  background-color: var(--hover-bg);
}

.deadline-placeholder {
  cursor: pointer;
  color: var(--text-tertiary);
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.3s;
  font-size: 12px;
}

.deadline-placeholder:hover {
  background-color: var(--hover-bg);
  color: var(--text-secondary);
}

.deadline-expired {
  color: var(--text-tertiary);
  transition: color 0.3s;
}

.deadline-active {
  color: #f56c6c; /* 保持紅色作為活躍狀態的視覺提示 */
  font-weight: 600;
}

.deadline-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deadline-editor-row {
  display: flex;
  align-items: center;
}

.deadline-editor-actions {
  display: flex;
  gap: 4px;
}
</style>
