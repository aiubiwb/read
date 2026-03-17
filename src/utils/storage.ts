import type { Book, ChapterMeta, ReadingProgress, ChapterCache } from '../types'

const BOOKS_KEY = 'novel_reader_books'
const PROGRESS_KEY = 'novel_reader_progress'
const CHAPTER_CACHE_KEY = 'novel_reader_chapters'

export function getBooks(): Book[] {
  const data = localStorage.getItem(BOOKS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveBooks(books: Book[]): void {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books))
}

export function addBook(book: Book): void {
  const books = getBooks()
  books.push(book)
  saveBooks(books)
}

export function removeBook(bookId: string): void {
  const books = getBooks().filter(b => b.id !== bookId)
  saveBooks(books)
  
  const progress = getReadingProgress()
  delete progress[bookId]
  saveProgress(progress)
  
  const cache = getChapterCache()
  delete cache[bookId]
  saveChapterCache(cache)
}

export function getBookById(bookId: string): Book | undefined {
  return getBooks().find(b => b.id === bookId)
}

export function saveProgress(progress: Record<string, ReadingProgress>): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function getReadingProgress(): Record<string, ReadingProgress> {
  const data = localStorage.getItem(PROGRESS_KEY)
  return data ? JSON.parse(data) : {}
}

export function updateReadingProgress(bookId: string, chapterId: number, scrollTop: number): void {
  const progress = getReadingProgress()
  progress[bookId] = {
    bookId,
    chapterId,
    scrollTop,
    lastReadAt: Date.now()
  }
  saveProgress(progress)
}

export function getBookProgress(bookId: string): ReadingProgress | undefined {
  return getReadingProgress()[bookId]
}

function getChapterCache(): Record<string, ChapterCache> {
  const data = localStorage.getItem(CHAPTER_CACHE_KEY)
  return data ? JSON.parse(data) : {}
}

function saveChapterCache(cache: Record<string, ChapterCache>): void {
  try {
    localStorage.setItem(CHAPTER_CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.error('章节缓存保存失败:', e)
  }
}

export function saveChapterContent(bookId: string, chapterId: number, content: string): void {
  const cache = getChapterCache()
  if (!cache[bookId]) {
    cache[bookId] = {}
  }
  cache[bookId][chapterId] = content
  saveChapterCache(cache)
}

export function getChapterContent(bookId: string, chapterId: number): string | undefined {
  const cache = getChapterCache()
  return cache[bookId]?.[chapterId]
}

export function hasChapterContent(bookId: string, chapterId: number): boolean {
  const content = getChapterContent(bookId, chapterId)
  return content !== undefined && content !== ''
}
