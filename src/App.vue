<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElSwitch } from 'element-plus'
import type { AppState, Zone, Card, Divider, ZoneItem } from './types'
import { loadAppState, saveAppState, createDefaultAppState, saveImage } from './utils/db'
import { exportData, importData } from './utils/exportImport'
import ZoneComponent from './components/Zone.vue'

const state = ref<AppState>(createDefaultAppState())
const editingTitle = ref(false)
const titleInput = ref('')
const importInputRef = ref<HTMLInputElement>()

// Dark mode 切換
const updateDarkModeClass = () => {
  if (state.value.darkMode) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// 監聽 dark mode 變化並保存
watch(() => state.value.darkMode, () => {
  updateDarkModeClass()
})

// 載入資料
onMounted(async () => {
  try {
    const loaded = await loadAppState()
    if (loaded) {
      state.value = loaded
    }
  } catch (error) {
    console.error('載入資料失敗:', error)
  }
  
  // 應用 dark mode
  updateDarkModeClass()
  
  // 監聽 Ctrl+V 貼上事件
  document.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})

// 儲存資料
const save = async () => {
  try {
    await saveAppState(state.value)
  } catch (error) {
    console.error('儲存資料失敗:', error)
  }
}

// 監聽狀態變化自動儲存
watch(state, save, { deep: true })

// 標題編輯
const startEditTitle = () => {
  editingTitle.value = true
  titleInput.value = state.value.title
  nextTick(() => {
    const input = document.querySelector('.title-input') as HTMLInputElement
    input?.focus()
    input?.select()
  })
}

const finishEditTitle = () => {
  if (titleInput.value.trim()) {
    state.value.title = titleInput.value.trim()
  }
  editingTitle.value = false
}

// 全域最小/一般 toggle
const toggleGlobalMin = () => {
  state.value.globalMinToggle = !state.value.globalMinToggle
  if (state.value.globalMinToggle) {
    // 將所有非最大區域設為最小
    state.value.zones.forEach(zone => {
      if (zone.collapseState !== 'max') {
        zone.collapseState = 'min'
      }
    })
    state.value.globalNormalToggle = false
  } else {
    // 關閉時，將所有非最大區域設為一般
    state.value.zones.forEach(zone => {
      if (zone.collapseState !== 'max') {
        zone.collapseState = 'normal'
      }
    })
  }
}

const toggleGlobalNormal = () => {
  state.value.globalNormalToggle = !state.value.globalNormalToggle
  if (state.value.globalNormalToggle) {
    // 將所有非最大區域設為一般
    state.value.zones.forEach(zone => {
      if (zone.collapseState !== 'max') {
        zone.collapseState = 'normal'
      }
    })
    state.value.globalMinToggle = false
  } else {
    // 關閉時，將所有非最大區域設為一般（預設）
    state.value.zones.forEach(zone => {
      if (zone.collapseState !== 'max') {
        zone.collapseState = 'normal'
      }
    })
  }
}

// 區域最大狀態切換
const toggleZoneMax = (zoneId: string) => {
  const zone = state.value.zones.find(z => z.id === zoneId)
  if (!zone) return

  if (zone.collapseState === 'max') {
    // 如果是最大狀態，復原
    zone.collapseState = state.value.globalMinToggle ? 'min' : 'normal'
    state.value.currentMaxZoneId = null
  } else {
    // 設為最大
    // 如果之前有最大區域，先復原它（根據全域 toggle 設定）
    if (state.value.currentMaxZoneId) {
      const prevMaxZone = state.value.zones.find(z => z.id === state.value.currentMaxZoneId)
      if (prevMaxZone) {
        prevMaxZone.collapseState = state.value.globalMinToggle ? 'min' : 'normal'
      }
    }
    // 設定當前區域為最大
    zone.collapseState = 'max'
    state.value.currentMaxZoneId = zoneId
    // 注意：其他區域的狀態應該已經由全域 toggle 控制，不需要在這裡修改
  }
}

// 選取區域
const selectZone = (zoneId: string) => {
  state.value.selectedZoneId = zoneId
}

// 新增區域
const addZone = () => {
  const newZone: Zone = {
    id: Date.now().toString(),
    name: '新區域',
    color: '#909399',
    collapseState: state.value.globalMinToggle ? 'min' : (state.value.globalNormalToggle ? 'normal' : 'normal'),
    items: [],
    order: state.value.zones.length,
  }
  state.value.zones.push(newZone)
}

// 刪除區域
const deleteZone = async (zoneId: string) => {
  try {
    await ElMessageBox.confirm('確定要刪除這個區域嗎？', '確認刪除', {
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    const index = state.value.zones.findIndex(z => z.id === zoneId)
    if (index !== -1) {
      state.value.zones.splice(index, 1)
      // 重新排序
      state.value.zones.forEach((zone, i) => {
        zone.order = i
      })
      
      if (state.value.currentMaxZoneId === zoneId) {
        state.value.currentMaxZoneId = null
      }
    }
  } catch {
    // 用戶取消
  }
}

// 更新卡片
const handleCardUpdate = (zoneId: string, card: Card) => {
  const zone = state.value.zones.find(z => z.id === zoneId)
  if (!zone) return
  
  const index = zone.items.findIndex(item => item.id === card.id)
  if (index !== -1) {
    zone.items[index] = card
  }
}

// 刪除卡片
const handleCardDelete = (zoneId: string, cardId: string) => {
  const zone = state.value.zones.find(z => z.id === zoneId)
  if (!zone) return
  
  const index = zone.items.findIndex(item => item.id === cardId)
  if (index !== -1) {
    zone.items.splice(index, 1)
    // 重新排序
    zone.items.forEach((item, i) => {
      item.order = i
    })
  }
}

// 新增卡片到區域
const handleAddCard = (zoneId: string) => {
  const zone = state.value.zones.find(z => z.id === zoneId)
  if (!zone) return
  
  const newCard: Card = {
    id: Date.now().toString(),
    type: 'card',
    taskTypeId: state.value.taskTypes[0]?.id || '1',
    text: '',
    order: zone.items.length,
  }
  zone.items.push(newCard)
}

// 新增分隔線到區域
const handleAddDivider = (zoneId: string) => {
  const zone = state.value.zones.find(z => z.id === zoneId)
  if (!zone) return
  
  const newDivider: Divider = {
    id: Date.now().toString(),
    type: 'divider',
    text: '分隔線',
    order: zone.items.length,
  }
  zone.items.push(newDivider)
}

// 更新分隔線
const handleDividerUpdate = (zoneId: string, divider: Divider) => {
  const zone = state.value.zones.find(z => z.id === zoneId)
  if (!zone) return
  
  const index = zone.items.findIndex(item => item.id === divider.id)
  if (index !== -1) {
    zone.items[index] = divider
  }
}

// 刪除分隔線
const handleDividerDelete = (zoneId: string, dividerId: string) => {
  const zone = state.value.zones.find(z => z.id === zoneId)
  if (!zone) return
  
  const index = zone.items.findIndex(item => item.id === dividerId)
  if (index !== -1) {
    zone.items.splice(index, 1)
    // 重新排序
    zone.items.forEach((item, i) => {
      item.order = i
    })
  }
}

// 重新排序項目
const handleReorderItems = (zoneId: string, itemIds: string[]) => {
  const zone = state.value.zones.find(z => z.id === zoneId)
  if (!zone) return
  
  // 創建新的順序映射
  const itemMap = new Map(zone.items.map(item => [item.id, item]))
  const reorderedItems = itemIds.map(id => itemMap.get(id)).filter(Boolean) as ZoneItem[]
  
  // 確保所有項目都在新順序中（處理邊緣情況）
  const missingItems = zone.items.filter(item => !itemIds.includes(item.id))
  reorderedItems.push(...missingItems)
  
  // 更新順序
  reorderedItems.forEach((item, index) => {
    item.order = index
  })
  
  zone.items = reorderedItems
}

// 處理 Ctrl+V 貼上
const handlePaste = async (event: ClipboardEvent) => {
  // 如果沒有選取的區域，不處理
  if (!state.value.selectedZoneId) return
  
  const zone = state.value.zones.find(z => z.id === state.value.selectedZoneId)
  if (!zone) return
  
  // 檢查是否有輸入框正在編輯（避免干擾正常的貼上操作）
  const activeElement = document.activeElement
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    return
  }
  
  event.preventDefault()
  
  const clipboardData = event.clipboardData
  if (!clipboardData) return
  
  // 檢查是否有圖片
  const items = Array.from(clipboardData.items)
  const imageItem = items.find(item => item.type.startsWith('image/'))
  
  if (imageItem) {
    // 貼上圖片
    const blob = imageItem.getAsFile()
    if (blob) {
      const imageBlobId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await saveImage(imageBlobId, blob)
      
      const newCard: Card = {
        id: Date.now().toString(),
        type: 'card',
        taskTypeId: state.value.taskTypes[0]?.id || '1',
        text: '',
        imageBlobId,
        order: zone.items.length,
      }
      zone.items.push(newCard)
    }
  } else {
    // 貼上文字
    const text = clipboardData.getData('text/plain')
    if (text.trim()) {
      const newCard: Card = {
        id: Date.now().toString(),
        type: 'card',
        taskTypeId: state.value.taskTypes[0]?.id || '1',
        text: text.trim(),
        order: zone.items.length,
      }
      zone.items.push(newCard)
    }
  }
}

// 匯出
const handleExport = async () => {
  try {
    const blob = await exportData(state.value)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const now = new Date()
    const dateStr = now.toISOString().replace(/[-:]/g, '').slice(0, 15).replace('T', '_')
    a.href = url
    a.download = `${state.value.title}_${dateStr}.zip`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('匯出成功')
  } catch (error) {
    ElMessage.error('匯出失敗')
    console.error(error)
  }
}

// 匯入
const handleImport = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const importedState = await importData(file)
    state.value = importedState
    ElMessage.success('匯入成功')
  } catch (error) {
    ElMessage.error('匯入失敗')
    console.error(error)
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 頂部工具列 -->
    <div class="toolbar">
      <div class="title-section">
        <h1 v-if="!editingTitle" @click="startEditTitle" class="title-editable">
          {{ state.title }}
        </h1>
        <input
          v-else
          v-model="titleInput"
          @blur="finishEditTitle"
          @keyup.enter="finishEditTitle"
          @keyup.esc="editingTitle = false"
          class="title-input"
        />
      </div>
      
      <div class="toolbar-actions">
        <el-button-group>
          <el-button
            :type="state.globalMinToggle ? 'primary' : ''"
            @click="toggleGlobalMin"
            size="small"
          >
            全部最小
          </el-button>
          <el-button
            :type="state.globalNormalToggle ? 'primary' : ''"
            @click="toggleGlobalNormal"
            size="small"
          >
            全部一般
          </el-button>
        </el-button-group>
        
        <el-switch
          v-model="state.darkMode"
          @change="updateDarkModeClass"
          size="small"
          active-text="🌙"
          inactive-text="☀️"
          inline-prompt
          style="--el-switch-on-color: #409EFF;"
        />
        
        <el-button @click="handleExport" size="small">匯出</el-button>
        <el-button @click="importInputRef?.click()" size="small">匯入</el-button>
        <input
          ref="importInputRef"
          type="file"
          accept=".zip"
          @change="handleImport"
          style="display: none"
        />
        <el-button @click="addZone" type="primary" size="small">新增區域</el-button>
      </div>
    </div>

    <!-- 區域容器 -->
    <div class="zones-container">
      <ZoneComponent
        v-for="zone in state.zones"
        :key="zone.id"
        :zone="zone"
        :task-types="state.taskTypes"
        :app-state="state"
        @update:zone="(updatedZone: Zone) => {
          const index = state.zones.findIndex(z => z.id === updatedZone.id)
          if (index !== -1) {
            state.zones[index] = updatedZone
          }
        }"
        @toggle-max="toggleZoneMax"
        @delete="deleteZone"
        @select="selectZone"
        @update-card="handleCardUpdate"
        @delete-card="handleCardDelete"
        @add-card="handleAddCard"
        @add-divider="handleAddDivider"
        @update-divider="handleDividerUpdate"
        @delete-divider="handleDividerDelete"
        @reorder-items="handleReorderItems"
      />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding: 20px;
  transition: background-color 0.3s;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow-md);
  transition: background-color 0.3s, box-shadow 0.3s;
}

.title-section {
  flex: 1;
}

.title-editable {
  margin: 0;
  cursor: pointer;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.3s;
}

.title-editable:hover {
  background-color: var(--hover-bg);
}

.title-input {
  font-size: 24px;
  font-weight: 600;
  border: 2px solid #409EFF;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  width: 300px;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.zones-container {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
  align-items: flex-start;
}
</style>
