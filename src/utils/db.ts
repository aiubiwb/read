import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface NovelReaderDB extends DBSchema {
  books: {
    key: string
    value: {
      id: string
      name: string
      chapters: { id: number; title: string }[]
      addedAt: number
    }
  }
  chapters: {
    key: string
    value: {
      id: string
      chapterId: number
      content: string
    }
    indexes: { 'by-book': string }
  }
  progress: {
    key: string
    value: {
      bookId: string
      chapterId: number
      scrollTop: number
      lastReadAt: number
    }
  }
}

let db: IDBPDatabase<NovelReaderDB> | null = null

async function getDB(): Promise<IDBPDatabase<NovelReaderDB>> {
  if (db) return db
  
  db = await openDB<NovelReaderDB>('novel-reader-db', 1, {
    upgrade(db) {
      db.createObjectStore('books', { keyPath: 'id' })
      
      const chapterStore = db.createObjectStore('chapters', { keyPath: 'id' })
      chapterStore.createIndex('by-book', 'id')
      
      db.createObjectStore('progress', { keyPath: 'bookId' })
    }
  })
  
  return db
}

export async function getAllBooks() {
  const database = await getDB()
  return database.getAll('books')
}

export async function getBook(id: string) {
  const database = await getDB()
  return database.get('books', id)
}

export async function addBook(book: { id: string; name: string; chapters: { id: number; title: string }[]; addedAt: number }) {
  const database = await getDB()
  await database.put('books', book)
}

export async function deleteBook(id: string) {
  const database = await getDB()
  await database.delete('books', id)
  
  const tx = database.transaction('chapters', 'readwrite')
  const index = tx.store.index('by-book')
  let cursor = await index.openCursor(IDBKeyRange.only(id))
  
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  
  await tx.done
  await database.delete('progress', id)
}

export async function saveChapterContent(bookId: string, chapterId: number, content: string) {
  const database = await getDB()
  await database.put('chapters', {
    id: `${bookId}-${chapterId}`,
    chapterId,
    content
  })
}

export async function getChapterContent(bookId: string, chapterId: number): Promise<string | undefined> {
  const database = await getDB()
  const result = await database.get('chapters', `${bookId}-${chapterId}`)
  return result?.content
}

export async function getProgress(bookId: string) {
  const database = await getDB()
  return database.get('progress', bookId)
}

export async function saveProgress(bookId: string, chapterId: number, scrollTop: number) {
  const database = await getDB()
  await database.put('progress', {
    bookId,
    chapterId,
    scrollTop,
    lastReadAt: Date.now()
  })
}

export async function getAllProgress() {
  const database = await getDB()
  const all = await database.getAll('progress')
  const result: Record<string, { bookId: string; chapterId: number; scrollTop: number; lastReadAt: number }> = {}
  for (const item of all) {
    result[item.bookId] = item
  }
  return result
}
