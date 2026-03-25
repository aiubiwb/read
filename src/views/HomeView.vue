<template>
  <div class="home" :class="{ 'night-mode': isNightMode }">
    <header class="header">
      <h1>📚 TXT小说阅读器</h1>
      <div class="header-right">
        <nav>
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <RouterLink to="/bookshelf" class="nav-link">书架</RouterLink>
        </nav>
        <button class="night-mode-btn" @click="toggleNightMode">
          {{ isNightMode ? '☀️' : '🌙' }}
        </button>
        <button v-if="!isLoggedIn()" class="login-btn" @click="showLogin = true">登录</button>
        <span v-else class="username">{{ username }} <button @click="handleLogout" class="logout-btn">退出</button></span>
      </div>
    </header>

    <div v-if="showLogin" class="modal-overlay" @click="showLogin = false">
      <div class="modal" @click.stop>
        <h3>{{ isRegister ? '注册' : '登录' }}</h3>
        <input v-model="loginForm.username" placeholder="用户名" />
        <input v-model="loginForm.password" type="password" placeholder="密码" />
        <div class="modal-btns">
          <button @click="handleLogin">{{ isRegister ? '注册' : '登录' }}</button>
          <button @click="isRegister = !isRegister">{{ isRegister ? '已有账号？登录' : '没有账号？注册' }}</button>
        </div>
      </div>
    </div>

    <main class="main-content">
      <div class="upload-section">
        <h2>上传小说</h2>
        <div 
          class="upload-area"
          :class="{ 'drag-over': isDragOver }"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @drop.prevent="handleDrop"
        >
          <input 
            type="file" 
            accept=".txt" 
            @change="handleFileSelect" 
            id="file-input"
            class="file-input"
          />
          <label for="file-input" class="upload-label">
            <span class="upload-icon">📁</span>
            <span>点击选择TXT文件</span>
            <span class="upload-hint">或将文件拖拽到此处</span>
          </label>
        </div>
        
        <div v-if="isLoading" class="loading">
          {{ progressMessage || '正在解析小说...' }}
        </div>
        
        <div v-if="error" class="error">
          {{ error }}
        </div>
        
        <div v-if="successMessage" class="success">
          {{ successMessage }}
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { processTxtFile } from '../utils/parser'
import { getAllBooks, addBook as dbAddBook, saveChapterContent, clearAllData } from '../utils/db'
import { login as apiLogin, register as apiRegister, logout as apiLogout, isLoggedIn, getUsername, uploadBookToServer } from '../utils/api'

const router = useRouter()
const isDragOver = ref(false)
const isLoading = ref(false)
const error = ref('')
const successMessage = ref('')
const isNightMode = ref(false)
const progressMessage = ref('')
const showLogin = ref(false)
const isRegister = ref(false)
const loginForm = ref({ username: '', password: '' })
const username = ref('')

onMounted(() => {
  const saved = localStorage.getItem('nightMode')
  if (saved === 'true') {
    isNightMode.value = true
  }
  if (isLoggedIn()) {
    username.value = getUsername() || ''
  }
})

function toggleNightMode() {
  isNightMode.value = !isNightMode.value
  localStorage.setItem('nightMode', isNightMode.value ? 'true' : 'false')
}

async function handleLogin() {
  try {
    if (isRegister.value) {
      await apiRegister(loginForm.value.username, loginForm.value.password)
      isRegister.value = false
      alert('注册成功！请登录')
    } else {
      await apiLogin(loginForm.value.username, loginForm.value.password)
      username.value = loginForm.value.username
      showLogin.value = false
      loginForm.value = { username: '', password: '' }
      await clearAllData()
    }
  } catch (err: any) {
    console.error('登录错误:', err)
    alert(err.response?.data?.error || err.message || '操作失败')
  }
}

function handleLogout() {
  apiLogout()
  username.value = ''
  clearAllData()
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await processFile(file)
    input.value = ''
  }
}

async function handleDrop(event: DragEvent) {
  isDragOver.value = false
  const file = event.dataTransfer?.files[0]
  const fileName = file?.name.toLowerCase() || ''
  if (file && fileName.endsWith('.txt')) {
    await processFile(file)
  } else {
    error.value = '请上传TXT格式的文件'
    setTimeout(() => error.value = '', 3000)
  }
}

async function processFile(file: File) {
  isLoading.value = true
  error.value = ''
  successMessage.value = ''
  
  try {
    if (isLoggedIn()) {
      progressMessage.value = '正在上传到云端...'
      const result = await uploadBookToServer('', file)
      
      progressMessage.value = ''
      successMessage.value = `《${file.name.replace('.txt', '')}》上传成功！共${result.chapterCount}章`
      setTimeout(() => successMessage.value = '', 3000)
      router.push(`/reader/${result.bookId}`)
    } else {
      const { book, chapters } = await processTxtFile(file, (current, total) => {
        progressMessage.value = `正在解析章节 ${current}/${total}...`
      })
      
      if (chapters.length === 0) {
        throw new Error('未能解析出任何章节，请检查文件格式')
      }
      
      progressMessage.value = '正在保存到本地数据库...'
      for (const chapter of chapters) {
        await saveChapterContent(book.id, chapter.id, chapter.content)
      }
      await dbAddBook(book)
      
      progressMessage.value = ''
      successMessage.value = `《${book.name}》上传成功！共${chapters.length}章`
      setTimeout(() => successMessage.value = '', 3000)
      router.push(`/reader/${book.id}`)
    }
  } catch (e: any) {
    console.error('上传错误:', e)
    progressMessage.value = ''
    if (e.message && e.message.includes('quota')) {
      error.value = '文件太大啦！浏览器存储空间不足'
    } else if (e.response?.status === 401) {
      error.value = '请先登录后再上传'
    } else if (e.response?.status === 400 && e.response?.data?.error) {
      error.value = e.response.data.error
    } else {
      error.value = '文件解析失败：' + (e.message || '未知错误')
    }
    setTimeout(() => error.value = '', 5000)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  background: rgba(255, 255, 255, 0.95);
  padding: 0.8rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
}

.header h1 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-link {
  margin-left: 0.5rem;
  text-decoration: none;
  color: #666;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.nav-link:hover, .nav-link.router-link-active {
  background: #667eea;
  color: white;
}

.main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.upload-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

h2 {
  margin: 0 0 1.5rem;
  color: #333;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 12px;
  padding: 2rem 1rem;
  text-align: center;
  transition: all 0.3s;
  cursor: pointer;
}

.upload-area.drag-over {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.file-input {
  display: none;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.upload-hint {
  color: #999;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.loading {
  text-align: center;
  padding: 1rem;
  color: #667eea;
  font-weight: 500;
  margin-top: 1rem;
}

.error {
  text-align: center;
  padding: 1rem;
  color: #e74c3c;
  background: #ffeaea;
  border-radius: 8px;
  margin-top: 1rem;
}

.success {
  text-align: center;
  padding: 1rem;
  color: #27ae60;
  background: #e8f8f0;
  border-radius: 8px;
  margin-top: 1rem;
}

.night-mode-btn {
  padding: 0.5rem 1rem;
  background: #4a5568;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
  margin-left: 1rem;
}

.home.night-mode {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.home.night-mode .header {
  background: rgba(30, 30, 30, 0.95);
}

.home.night-mode .header h1,
.home.night-mode .nav-link {
  color: #ddd;
}

.home.night-mode .nav-link:hover,
.home.night-mode .nav-link.router-link-active {
  background: #4a5568;
}

.home.night-mode .upload-section {
  background: #2d2d2d;
}

.home.night-mode h2 {
  color: #ddd;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  width: 80%;
  max-width: 300px;
}

.modal h3 {
  margin-top: 0;
  text-align: center;
}

.modal input {
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-sizing: border-box;
}

.modal-btns {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.modal-btns button {
  padding: 0.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.modal-btns button:last-child {
  background: #999;
}

.login-btn {
  padding: 0.4rem 0.8rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-left: 0.5rem;
}

.username {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.5rem;
}

.logout-btn {
  padding: 0.2rem 0.5rem;
  background: #999;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.home.night-mode .modal {
  background: #2d2d2d;
}

.home.night-mode .modal h3 {
  color: #ddd;
}

.home.night-mode .modal input {
  background: #3d3d3d;
  border-color: #555;
  color: #ddd;
}
</style>
