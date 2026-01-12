<script setup lang="ts">
import { ref } from 'vue'
import { ElButton } from 'element-plus'
import type { Divider } from '../types'

const props = defineProps<{
  divider: Divider
}>()

const emit = defineEmits<{
  'update:divider': [divider: Divider]
  'delete': [dividerId: string]
}>()

// 文字編輯
const editingText = ref(false)
const textInput = ref('')

const startEditText = () => {
  editingText.value = true
  textInput.value = props.divider.text
}

const finishEditText = () => {
  if (textInput.value.trim()) {
    emit('update:divider', { ...props.divider, text: textInput.value.trim() })
  }
  editingText.value = false
}

// 刪除分隔線
const handleDelete = () => {
  emit('delete', props.divider.id)
}
</script>

<template>
  <div class="divider">
    <div class="divider-content" @click="startEditText">
      <div v-if="!editingText" class="divider-text-display">
        {{ divider.text || '點擊編輯' }}
      </div>
      <input
        v-else
        v-model="textInput"
        @blur="finishEditText"
        @keyup.enter="finishEditText"
        @keyup.esc="editingText = false"
        class="divider-text-input"
        @click.stop
      />
    </div>
    <div class="divider-actions">
      <el-button
        type="danger"
        size="small"
        circle
        @click.stop="handleDelete"
      >
        ×
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.divider {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--hover-bg);
  border-radius: 4px;
  border: 1px dashed var(--border-color);
  transition: background-color 0.3s, border-color 0.3s;
}

.divider-content {
  flex: 1;
  min-height: 24px;
  display: flex;
  align-items: center;
  cursor: text;
}

.divider-text-display {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
  word-break: break-word;
  transition: color 0.3s;
}

.divider-text-input {
  flex: 1;
  border: 2px solid #409EFF;
  border-radius: 4px;
  padding: 4px 8px;
  outline: none;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
}

.divider-actions {
  flex-shrink: 0;
}
</style>
