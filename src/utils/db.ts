import { openDB } from 'idb'
import type { AppState, TaskType } from '../types'

let dbInstance: Awaited<ReturnType<typeof openDB>> | null = null

export async function getDB() {
  if (dbInstance) {
    return dbInstance
  }

  try {
    dbInstance = await openDB('task-manager', 1, {
      upgrade(db) {
        // 創建應用程式狀態儲存
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState')
        }
        // 創建圖片儲存（blob）
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images')
        }
      },
    })
  } catch (error) {
    console.error('IndexedDB 初始化失敗:', error)
    throw error
  }

  return dbInstance
}

// 儲存應用程式狀態
export async function saveAppState(state: AppState): Promise<void> {
  const db = await getDB()
  // 深拷貝以移除 Vue 響應式代理
  const serializedState = JSON.parse(JSON.stringify(state))
  await db.put('appState', serializedState, 'main')
}

// 讀取應用程式狀態
export async function loadAppState(): Promise<AppState | null> {
  const db = await getDB()
  return await db.get('appState', 'main') || null
}

// 儲存圖片
export async function saveImage(blobId: string, blob: Blob): Promise<void> {
  const db = await getDB()
  await db.put('images', blob, blobId)
}

// 讀取圖片
export async function loadImage(blobId: string): Promise<Blob | undefined> {
  const db = await getDB()
  return await db.get('images', blobId)
}

// 刪除圖片
export async function deleteImage(blobId: string): Promise<void> {
  const db = await getDB()
  await db.delete('images', blobId)
}

// 初始化預設狀態
export function createDefaultAppState(): AppState {
  const defaultTaskTypes: TaskType[] = [
    { id: '1', name: '採集製作', icon: '🔨', iconType: 'emoji' },
    { id: '2', name: '主線', icon: '⭐', iconType: 'emoji' },
    { id: '3', name: '職業', icon: '💼', iconType: 'emoji' },
    { id: '4', name: '其他', icon: '📋', iconType: 'emoji' },
  ]

  return {
    title: 'TODO LIST',
    taskTypes: defaultTaskTypes,
    zones: [],
    globalMinToggle: false,
    globalNormalToggle: false,
    currentMaxZoneId: null,
    selectedZoneId: null,
    darkMode: false,
  }
}
