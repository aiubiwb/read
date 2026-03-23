<template>
  <div class="reader" :class="{ 'night-mode': isNightMode }">
    <header class="header">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h1>{{ book?.name || '' }}</h1>
      <div class="header-right">
        <button class="menu-btn" @click="showMenu = !showMenu">☰</button>
        <button class="night-mode-btn" @click="toggleNightMode">
          {{ isNightMode ? '☀️' : '🌙' }}
        </button>
      </div>
    </header>

    <main class="content" ref="contentRef" @scroll="onScroll">
      <h2 class="chapter-title">{{ currentChapter?.title || '' }}</h2>
      <div class="chapter-content">
        {{ currentChapter?.content || '' }}
      </div>
    </main>

    <footer class="footer">
      <button @click="prevChapter" :disabled="currentChapterIndex === 0">◀ 上一章</button>
      <span class="chapter-info">{{ currentChapterIndex + 1 }} / {{ (book?.chapters || []).length }}</span>
      <button @click="nextChapter" :disabled="currentChapterIndex >= ((book?.chapters || []).length - 1)">下一章 ▶</button>
    </footer>

    <div v-if="showMenu" class="menu-overlay" @click="showMenu = false">
      <div class="menu-panel" @click.stop>
        <h3>章节目录</h3>
        <div class="chapter-list">
          <div 
            v-for="(chapter, index) in (book?.chapters || [])" 
            :key="chapter.id"
            class="chapter-item"
            :class="{ active: index === currentChapterIndex }"
            @click="goToChapter(Number(index))"
          >
            {{ chapter.title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBook as dbGetBook, getChapterContent, saveProgress, getProgress } from '../utils/db'
import { getBookFromServer, getChapterFromServer, isLoggedIn, getProgressFromServer, saveProgressToServer } from '../utils/api'

const route = useRoute()
const router = useRouter()

const book = ref<any>(null)
const currentChapterIndex = ref(0)
const contentRef = ref<HTMLElement | null>(null)
const showMenu = ref(false)
const isNightMode = ref(false)
const isLoading = ref(true)

const currentChapter = computed(() => {
  const chapter = book.value?.chapters[currentChapterIndex.value]
  if (!chapter) return undefined
  return chapter
})

async function loadChapterContent() {
  if (!book.value) return
  const chapter = book.value.chapters[currentChapterIndex.value]
  if (!chapter) return
  
  if (isLoggedIn()) {
    const cloudChapter = await getChapterFromServer(chapter.id)
    book.value.chapters[currentChapterIndex.value] = {
      ...chapter,
      content: cloudChapter.content || ''
    }
  } else {
    const content = await getChapterContent(book.value.id, chapter.id)
    book.value.chapters[currentChapterIndex.value] = {
      ...chapter,
      content: content || ''
    }
  }
}

onMounted(async () => {
  const savedNightMode = localStorage.getItem('nightMode')
  if (savedNightMode === 'true') {
    isNightMode.value = true
  }
  
  const bookId = route.params.id as string
  
  if (isLoggedIn()) {
    book.value = await getBookFromServer(bookId)
    const cloudProgress = await getProgressFromServer(bookId)
    if (cloudProgress) {
      currentChapterIndex.value = cloudProgress.chapter_index
      setTimeout(() => {
        if (contentRef.value) {
          contentRef.value.scrollTop = cloudProgress.scroll_top
        }
      }, 100)
    }
  } else {
    book.value = await dbGetBook(bookId)
    const progress = await getProgress(book.value.id)
    if (progress) {
      currentChapterIndex.value = progress.chapterId
      setTimeout(() => {
        if (contentRef.value) {
          contentRef.value.scrollTop = progress.scrollTop
        }
      }, 100)
    }
  }
  
  if (!book.value) {
    router.push('/')
    return
  }
  
  await loadChapterContent()
  isLoading.value = false
})

function toggleNightMode() {
  isNightMode.value = !isNightMode.value
  localStorage.setItem('nightMode', isNightMode.value ? 'true' : 'false')
}

function goBack() {
  router.push('/bookshelf')
}

function prevChapter() {
  if (currentChapterIndex.value > 0) {
    currentChapterIndex.value--
    scrollToTop()
    saveCurrentProgress()
    loadChapterContent()
  }
}

function nextChapter() {
  if (book.value && currentChapterIndex.value < book.value.chapters.length - 1) {
    currentChapterIndex.value++
    scrollToTop()
    saveCurrentProgress()
    loadChapterContent()
  }
}

function goToChapter(index: number) {
  currentChapterIndex.value = index
  showMenu.value = false
  scrollToTop()
  saveCurrentProgress()
  loadChapterContent()
}

function scrollToTop() {
  if (contentRef.value) {
    contentRef.value.scrollTop = 0
  }
}

function onScroll() {
  saveCurrentProgress()
}

async function saveCurrentProgress() {
  if (book.value) {
    const scrollTop = contentRef.value?.scrollTop || 0
    if (isLoggedIn()) {
      await saveProgressToServer(book.value.id, currentChapterIndex.value, scrollTop)
    } else {
      await saveProgress(book.value.id, currentChapterIndex.value, scrollTop)
    }
  }
}
</script>

<style scoped>
.reader {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.header {
  background: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  margin: 0;
  font-size: 1rem;
  color: #333;
  flex: 1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.back-btn, .menu-btn, .night-mode-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem;
}

.content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.chapter-title {
  text-align: center;
  color: #333;
  margin-bottom: 1.5rem;
  font-size: 1.3rem;
}

.chapter-content {
  line-height: 1.8;
  color: #333;
  font-size: 1.1rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.footer {
  background: white;
  padding: 0.8rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  bottom: 0;
}

.footer button {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.footer button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.chapter-info {
  color: #666;
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

.menu-panel {
  width: 80%;
  max-width: 300px;
  background: white;
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
  box-sizing: border-box;
}

.menu-panel h3 {
  margin: 0 0 1rem;
  color: #333;
}

.chapter-item {
  padding: 0.8rem;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  color: #666;
}

.chapter-item:hover {
  background: #f5f5f5;
}

.chapter-item.active {
  color: #667eea;
  font-weight: bold;
}

.reader.night-mode {
  background: #1a1a2e;
}

.reader.night-mode .header,
.reader.night-mode .footer,
.reader.night-mode .menu-panel {
  background: #2d2d2d;
}

.reader.night-mode .header h1,
.reader.night-mode .chapter-title,
.reader.night-mode .chapter-content,
.reader.night-mode .chapter-info,
.reader.night-mode .menu-panel h3,
.reader.night-mode .chapter-item {
  color: #ddd;
}

.reader.night-mode .back-btn,
.reader.night-mode .menu-btn,
.reader.night-mode .night-mode-btn {
  color: #ddd;
}

.reader.night-mode .chapter-item {
  border-bottom-color: #444;
}

.reader.night-mode .chapter-item:hover {
  background: #3d3d3d;
}

.reader.night-mode .back-btn,
.reader.night-mode .menu-btn,
.reader.night-mode .night-mode-btn {
  filter: invert(1);
}
</style>
