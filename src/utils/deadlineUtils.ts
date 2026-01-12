// 計算時限顯示文字
export function getDeadlineDisplay(deadline: { date: string; hour: number }): {
  display: string
  tooltip: string
  isExpired: boolean
} {
  const now = new Date()
  // 創建本地時間的日期物件
  const parts = deadline.date.split('-').map(Number)
  const year = parts[0] || now.getFullYear()
  const monthNum = parts[1] || now.getMonth() + 1
  const dayNum = parts[2] || now.getDate()
  const hour = deadline.hour ?? 0
  const deadlineDate = new Date(year, monthNum - 1, dayNum, hour, 0, 0)
  const diff = deadlineDate.getTime() - now.getTime()
  const diffHours = diff / (1000 * 60 * 60)
  const diffDays = Math.floor(diffHours / 24)

  const isExpired = diff < 0

  // Hover 提示文字（月日時）
  const month = deadlineDate.getMonth() + 1
  const day = deadlineDate.getDate()
  const hourNum = deadlineDate.getHours()
  const tooltip = `${month}月${day}日 ${hourNum}時`

  if (isExpired) {
    return {
      display: '已過期',
      tooltip,
      isExpired: true,
    }
  }

  // 24小時內顯示倒數時間（hh:mm）
  if (diffHours < 24) {
    const hours = Math.floor(diffHours)
    const minutes = Math.floor((diffHours - hours) * 60)
    return {
      display: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      tooltip,
      isExpired: false,
    }
  }

  // 24小時以上顯示天數
  return {
    display: `${diffDays}天後`,
    tooltip,
    isExpired: false,
  }
}
