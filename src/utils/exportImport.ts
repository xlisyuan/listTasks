import JSZip from 'jszip'
import type { AppState } from '../types'
import { getDB } from './db'

// 匯出資料
export async function exportData(state: AppState): Promise<Blob> {
  const zip = new JSZip()
  
  // 將狀態轉換為 JSON
  const stateJson = JSON.stringify(state, null, 2)
  zip.file('state.json', stateJson)
  
  // 收集所有圖片 ID
  const imageIds: string[] = []
  for (const zone of state.zones) {
    for (const item of zone.items) {
      if (item.type === 'card' && item.imageBlobId) {
        imageIds.push(item.imageBlobId)
      }
    }
  }
  
  // 讀取並添加所有圖片
  const db = await getDB()
  for (const imageId of imageIds) {
    const blob = await db.get('images', imageId)
    if (blob) {
      zip.file(`images/${imageId}`, blob)
    }
  }
  
  // 生成 ZIP 檔案
  return await zip.generateAsync({ type: 'blob' })
}

// 匯入資料
export async function importData(file: File): Promise<AppState> {
  const zip = await JSZip.loadAsync(file)
  
  // 讀取狀態 JSON
  const stateJson = await zip.file('state.json')?.async('string')
  if (!stateJson) {
    throw new Error('無法找到 state.json')
  }
  
  const state: AppState = JSON.parse(stateJson)
  
  // 讀取所有圖片
  const db = await getDB()
  const imageFiles = zip.folder('images')?.file(/.*/)
  if (imageFiles) {
    for (const imageFile of imageFiles) {
      const blob = await imageFile.async('blob')
      await db.put('images', blob, imageFile.name)
    }
  }
  
  return state
}
