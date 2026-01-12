<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ElButton, ElColorPicker } from 'element-plus'
import type { Zone, AppState, TaskType, Card, Divider } from '../types'
import CardComponent from './Card.vue'
import DividerComponent from './Divider.vue'

const props = defineProps<{
  zone: Zone
  taskTypes: TaskType[]
  appState: AppState
}>()

const emit = defineEmits<{
  'update:zone': [zone: Zone]
  'toggle-max': [zoneId: string]
  'delete': [zoneId: string]
  'select': [zoneId: string]
  'update-card': [zoneId: string, card: Card]
  'delete-card': [zoneId: string, cardId: string]
  'add-card': [zoneId: string]
  'add-divider': [zoneId: string]
  'update-divider': [zoneId: string, divider: Divider]
  'delete-divider': [zoneId: string, dividerId: string]
  'reorder-items': [zoneId: string, itemIds: string[]]
}>()

// 區域更新
const updateZone = (updates: Partial<Zone>) => {
  emit('update:zone', { ...props.zone, ...updates })
}

// 排序後的項目
const sortedItems = computed(() => {
  return [...props.zone.items].sort((a, b) => a.order - b.order)
})

// 標題編輯
const editingName = ref(false)
const nameInput = ref('')

const startEditName = () => {
  editingName.value = true
  nameInput.value = props.zone.name
  nextTick(() => {
    const input = document.querySelector(`.zone-name-input-${props.zone.id}`) as HTMLInputElement
    input?.focus()
    input?.select()
  })
}

const finishEditName = () => {
  if (nameInput.value.trim()) {
    updateZone({ name: nameInput.value.trim() })
  }
  editingName.value = false
}

// 最大狀態切換
const handleToggleMax = () => {
  emit('toggle-max', props.zone.id)
}

// 顏色選擇
const handleColorChange = (color: string | null) => {
  if (color) {
    updateZone({ color })
  }
}

// 刪除
const handleDelete = () => {
  emit('delete', props.zone.id)
}

// 選取區域
const handleSelect = () => {
  emit('select', props.zone.id)
}

// 更新卡片
const handleCardUpdate = (card: Card) => {
  emit('update-card', props.zone.id, card)
}

// 刪除卡片
const handleCardDelete = (cardId: string) => {
  emit('delete-card', props.zone.id, cardId)
}

// 新增卡片
const handleAddCard = () => {
  emit('add-card', props.zone.id)
}

// 新增分隔線
const handleAddDivider = () => {
  emit('add-divider', props.zone.id)
}

// 更新分隔線
const handleDividerUpdate = (divider: Divider) => {
  emit('update-divider', props.zone.id, divider)
}

// 刪除分隔線
const handleDividerDelete = (dividerId: string) => {
  emit('delete-divider', props.zone.id, dividerId)
}

// 拖動相關
const draggedItemId = ref<string | null>(null)
const dragOverIndex = ref<number | null>(null)

const handleDragStart = (event: DragEvent, itemId: string) => {
  draggedItemId.value = itemId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', itemId)
  }
}

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverIndex.value = index
}

const handleDragLeave = () => {
  dragOverIndex.value = null
}

const handleDrop = (event: DragEvent, targetIndex: number) => {
  event.preventDefault()
  if (!draggedItemId.value) return
  
  const currentItems = [...sortedItems.value]
  const draggedIndex = currentItems.findIndex(item => item.id === draggedItemId.value)
  
  if (draggedIndex === -1 || draggedIndex === targetIndex) {
    draggedItemId.value = null
    dragOverIndex.value = null
    return
  }
  
  // 移動項目
  const removed = currentItems[draggedIndex]
  if (!removed) {
    draggedItemId.value = null
    dragOverIndex.value = null
    return
  }
  currentItems.splice(draggedIndex, 1)
  currentItems.splice(targetIndex, 0, removed)
  
  // 發送重新排序的事件
  const itemIds = currentItems.map(item => item.id)
  emit('reorder-items', props.zone.id, itemIds)
  
  draggedItemId.value = null
  dragOverIndex.value = null
}

const handleDragEnd = () => {
  draggedItemId.value = null
  dragOverIndex.value = null
}
</script>

<template>
  <div
    :style="{ 
      borderColor: zone.color,
      backgroundColor: appState.selectedZoneId === zone.id ? zone.color + '20' : zone.color + '10'
    }"
    :class="['zone', { 
      'zone-max': zone.collapseState === 'max', 
      'zone-normal': zone.collapseState === 'normal', 
      'zone-min': zone.collapseState === 'min'
    }]"
    @click.stop="handleSelect"
  >
    <!-- 區域標題列 -->
    <div class="zone-header">
      <div class="zone-header-left">
        <div v-if="!editingName" @click.stop="startEditName" class="zone-name">
          {{ zone.name }}
        </div>
        <input
          v-else
          :class="`zone-name-input-${zone.id}`"
          v-model="nameInput"
          @blur="finishEditName"
          @keyup.enter="finishEditName"
          @keyup.esc="editingName = false"
          @click.stop
          class="zone-name-input"
        />
      </div>
      
      <div class="zone-header-right" @click.stop>
        <!-- 最大狀態切換 -->
        <el-button
          :type="zone.collapseState === 'max' ? 'primary' : ''"
          @click="handleToggleMax"
          size="small"
        >
          {{ zone.collapseState === 'max' ? '復原' : '最大' }}
        </el-button>
        
        <!-- 顏色選擇器 -->
        <el-color-picker
          :model-value="zone.color"
          @change="handleColorChange"
          show-alpha
          size="small"
        />
        
        <!-- 刪除按鈕 -->
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

    <!-- 區域內容 -->
    <div class="zone-content" v-if="zone.collapseState !== 'min'">
      <!-- 狀態提示（暫時，等卡片功能完成後可以移除） -->
      <div v-if="zone.items.length === 0" class="state-indicator">
        <span v-if="zone.collapseState === 'max'" class="state-badge state-badge-max">最大顯示</span>
        <span v-else-if="zone.collapseState === 'normal'" class="state-badge state-badge-normal">一般顯示</span>
      </div>
      <div v-if="zone.items.length === 0" class="empty-zone">
        點擊「新增卡片」開始添加任務
      </div>
      <div v-else class="zone-items">
        <template v-for="(item, index) in sortedItems" :key="item.id">
          <div
            :class="['zone-item-wrapper', {
              'drag-over': dragOverIndex === index,
              'dragging': draggedItemId === item.id,
              'divider-wrapper': item.type === 'divider'
            }]"
            :draggable="true"
            @dragstart="(e: DragEvent) => handleDragStart(e, item.id)"
            @dragover="(e: DragEvent) => handleDragOver(e, index)"
            @dragleave="handleDragLeave"
            @drop="(e: DragEvent) => handleDrop(e, index)"
            @dragend="handleDragEnd"
          >
            <CardComponent
              v-if="item.type === 'card'"
              :card="item as Card"
              :task-types="taskTypes"
              :collapse-state="zone.collapseState"
              @update:card="handleCardUpdate"
              @delete="handleCardDelete"
            />
            <DividerComponent
              v-else-if="item.type === 'divider'"
              :divider="item as Divider"
              @update:divider="handleDividerUpdate"
              @delete="handleDividerDelete"
            />
          </div>
        </template>
      </div>
      
      <!-- 新增按鈕 -->
      <div class="zone-actions">
        <el-button size="small" type="primary" plain @click.stop="handleAddCard">新增卡片</el-button>
        <el-button size="small" plain @click.stop="handleAddDivider">新增分隔線</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.zone {
  min-width: 300px;
  max-width: 350px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 2px solid var(--border-color);
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px var(--shadow-md);
  cursor: pointer;
  transition: all 0.3s ease;
}

.zone-max {
  min-width: 900px;
  border-width: 3px;
  box-shadow: 0 4px 12px var(--shadow-md);
}

.zone-normal {
  min-width: 300px;
  max-width: 350px;
}

.zone-min {
  min-width: 200px;
  max-width: 250px;
}

.zone-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: rgba(var(--bg-secondary-rgb, 255, 255, 255), 0.8);
  border-radius: 8px 8px 0 0;
  transition: border-color 0.3s, background-color 0.3s;
}

.zone-header-left {
  flex: 1;
  min-width: 0;
}

.zone-name {
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  word-break: break-word;
}

.zone-name:hover {
  background-color: var(--hover-bg);
}

.zone-name-input {
  font-weight: 600;
  font-size: 16px;
  border: 2px solid #409EFF;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.zone-header-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.zone-content {
  padding: 12px;
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.state-indicator {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.state-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.state-badge-max {
  background-color: #409EFF;
  color: white;
}

.state-badge-normal {
  background-color: #e6f7ff;
  color: #409EFF;
  border: 1px solid #409EFF;
}

.empty-zone {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 14px;
  text-align: center;
  padding: 20px;
  transition: color 0.3s;
}

.zone-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.zone-max .zone-items {
  flex-flow: row wrap;
  gap: 12px;
}

.zone-item-wrapper {
  cursor: move;
  transition: transform 0.2s, opacity 0.2s;
  position: relative;
}

.zone-item-wrapper.dragging {
  opacity: 0.5;
}

.zone-normal .zone-item-wrapper.drag-over,
.zone-min .zone-item-wrapper.drag-over {
  transform: translateY(4px);
}

.zone-max .zone-item-wrapper {
  flex: 0 0 auto;
  min-width: 200px;
  max-width: calc(50% - 6px);
}

.zone-max .zone-item-wrapper.drag-over {
  outline: 2px dashed #409EFF;
  outline-offset: 4px;
}

/* 分隔線應該佔滿整個寬度 */
.zone-item-wrapper.divider-wrapper {
  width: 100% !important;
  max-width: 100% !important;
  flex: 1 1 100% !important;
}

.zone-item-placeholder {
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: background-color 0.3s, color 0.3s;
}

.zone-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
  transition: border-color 0.3s;
}
</style>
