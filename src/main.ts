import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'

console.log('開始初始化應用...')

try {
  const app = createApp(App)
  
  // 註冊 Element Plus
  console.log('註冊 Element Plus...')
  app.use(ElementPlus)
  console.log('Element Plus 註冊成功')
  
  app.mount('#app')
  console.log('應用掛載成功')
} catch (error) {
  console.error('應用初始化失敗:', error)
  if (error instanceof Error) {
    console.error('錯誤堆疊:', error.stack)
  }
  const appElement = document.getElementById('app')
  if (appElement) {
    appElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h1>應用初始化失敗</h1>
        <p><strong>錯誤信息:</strong> ${error instanceof Error ? error.message : String(error)}</p>
        <details>
          <summary>查看詳細錯誤</summary>
          <pre style="background: #f5f5f5; padding: 10px; overflow: auto; white-space: pre-wrap;">${error instanceof Error ? error.stack : String(error)}</pre>
        </details>
        <p>請檢查瀏覽器控制台以獲取更多信息</p>
      </div>
    `
  }
}
