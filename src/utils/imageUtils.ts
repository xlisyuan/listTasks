// 生成圖片縮圖
export async function generateThumbnail(file: File, maxWidth: number = 300, maxHeight: number = 300): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('無法創建 Canvas context'))
      return
    }

    img.onload = () => {
      // 計算縮圖尺寸
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      canvas.width = width
      canvas.height = height

      // 繪製縮圖
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('無法生成縮圖'))
        }
      }, 'image/jpeg', 0.8)
    }

    img.onerror = () => {
      reject(new Error('圖片載入失敗'))
    }

    img.src = URL.createObjectURL(file)
  })
}

// 從剪貼簿獲取圖片
export async function getImageFromClipboard(): Promise<File | null> {
  try {
    const clipboardItems = await navigator.clipboard.read()
    
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type.startsWith('image/')) {
          const blob = await clipboardItem.getType(type)
          const file = new File([blob], `pasted-image-${Date.now()}.png`, { type })
          return file
        }
      }
    }
  } catch (error) {
    console.error('讀取剪貼簿失敗:', error)
  }
  
  return null
}

// 創建圖片 URL（用於顯示）
export function createImageUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

// 釋放圖片 URL
export function revokeImageUrl(url: string): void {
  URL.revokeObjectURL(url)
}
