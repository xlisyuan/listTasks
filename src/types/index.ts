// 任務類型
export interface TaskType {
  id: string
  name: string
  icon: string  // 目前是 emoji，未來可能是 base64 圖片
  iconType: 'emoji' | 'image'
}

// 區域項目（卡片或分隔線）
export interface Card {
  id: string
  type: 'card'
  taskTypeId: string
  text: string
  imageBlobId?: string  // IndexedDB 的 key
  deadline?: {
    date: string  // YYYY-MM-DD
    hour: number  // 0-23
  }
  order: number
}

export interface Divider {
  id: string
  type: 'divider'
  text: string
  order: number
}

export type ZoneItem = Card | Divider

// 區域（地圖）
export interface Zone {
  id: string
  name: string
  color: string  // hex 顏色
  collapseState: 'min' | 'normal' | 'max'
  items: ZoneItem[]
  order: number
}

// 應用程式狀態
export interface AppState {
  title: string
  taskTypes: TaskType[]
  zones: Zone[]
  globalMinToggle: boolean
  globalNormalToggle: boolean
  currentMaxZoneId: string | null
  selectedZoneId: string | null
  darkMode: boolean
}
