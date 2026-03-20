<template>
  <div class="bookshelf" :class="{ 'night-mode': isNightMode }">
    <header class="header">
      <h1>📚 我的书架</h1>
      <div class="header-right">
        <nav>
          <RouterLink to="/" class="nav-link">首页</RouterLink>
          <RouterLink to="/bookshelf" class="nav-link">书架</RouterLink>
        </nav>
        <button class="night-mode-btn" @click="toggleNightMode">
          {{ isNightMode ? '☀️' : '🌙' }}
        </button>
      </div>
    </header>

    <main class="main-content">
      <div v-if="books.length === 0" class="empty">
        <p>书架空空如也~</p>
        <RouterLink to="/" class="upload-link">去上传小说</RouterLink>
      </div>
      
      <div v-else class="book-list">
        <div v-for="book in books" :key="book.id" class="book-item">
          <div class="book-info" @click="goToReader(book.id)">
            <div class="book-icon">📖</div>
            <div class="book-detail">
              <h3>{{ book.name }}</h3>
              <p>{{ book.chapters.length }}章</p>
            </div>
          </div>
          <button class="delete-btn" @click.stop="deleteBook(book.id)">🗑️</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAllBooks, deleteBook as dbDeleteBook } from '../utils/db'
import type { Book } from '../types'

const router = useRouter()
const books = ref<Book[]>([])
const isNightMode = ref(false)

onMounted(async () => {
  const saved = localStorage.getItem('nightMode')
  if (saved === 'true') {
    isNightMode.value = true
  }
  await loadBooks()
})

async function loadBooks() {
  books.value = await getAllBooks()
}

function toggleNightMode() {
  isNightMode.value = !isNightMode.value
  localStorage.setItem('nightMode', isNightMode.value ? 'true' : 'false')
}

function goToReader(bookId: string) {
  router.push(`/reader/${bookId}`)
}

async function deleteBook(bookId: string) {
  if (confirm('确定要删除这本书吗？')) {
    await dbDeleteBook(bookId)
    await loadBooks()
  }
}
</script>

<style scoped>
.bookshelf {
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

.empty {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  color: #666;
}

.upload-link {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 6px;
}

.book-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.book-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.book-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex: 1;
}

.book-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.book-detail h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.book-detail p {
  margin: 0.3rem 0 0;
  color: #999;
  font-size: 0.9rem;
}

.delete-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.delete-btn:hover {
  opacity: 1;
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

.bookshelf.night-mode {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.bookshelf.night-mode .header {
  background: rgba(30, 30, 30, 0.95);
}

.bookshelf.night-mode .header h1,
.bookshelf.night-mode .nav-link {
  color: #ddd;
}

.bookshelf.night-mode .nav-link:hover,
.bookshelf.night-mode .nav-link.router-link-active {
  background: #4a5568;
}

.bookshelf.night-mode .empty,
.bookshelf.night-mode .book-item {
  background: #2d2d2d;
}

.bookshelf.night-mode .book-detail h3 {
  color: #ddd;
}

.bookshelf.night-mode .book-detail p {
  color: #999;
}

.bookshelf.night-mode .empty {
  color: #aaa;
}
</style>
