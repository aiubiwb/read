export interface Chapter {
  id: number
  title: string
  content: string
}

export interface ChapterMeta {
  id: number
  title: string
}

export interface Book {
  id: string
  name: string
  chapters: ChapterMeta[]
  cover?: string
  addedAt: number
}

export interface ReadingProgress {
  bookId: string
  chapterId: number
  scrollTop: number
  lastReadAt: number
}

export interface ChapterCache {
  [chapterId: number]: string
}
