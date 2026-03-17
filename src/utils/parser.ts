import type { Book, ChapterMeta } from '../types'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function parseTxtFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      resolve(content)
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'utf-8')
  })
}

function detectChapters(text: string): string[] {
  const lines = text.split('\n')
  const chapters: string[] = []
  let currentChapter = ''
  
  const chapterPatterns = [
    /^第[一二三四五六七八九十百千\d]+[章卷].*/,
    /^第[一二三四五六七八九十百千\d]+[部篇].*/,
    /^chapter\s+\d+/i,
    /^第[\d]+章/,
    /^卷\s*\d+/
  ]
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    
    const isChapter = chapterPatterns.some(pattern => pattern.test(trimmed))
    
    if (isChapter && trimmed.length < 100) {
      if (currentChapter) {
        chapters.push(currentChapter)
      }
      currentChapter = trimmed
    } else if (currentChapter) {
      currentChapter += '\n' + line
    }
  }
  
  if (currentChapter) {
    chapters.push(currentChapter)
  }
  
  return chapters
}

function splitIntoChapters(text: string): string[] {
  const chapters = detectChapters(text)
  
  if (chapters.length > 1) {
    return chapters
  }
  
  const lines = text.split('\n').filter(line => line.trim())
  const chunkSize = 50
  const chunks: string[] = []
  
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n')
    chunks.push(chunk)
  }
  
  if (chunks.length === 0) {
    return [text]
  }
  
  return chunks
}

export interface ProcessResult {
  book: Book
  chapters: { id: number; title: string; content: string }[]
}

export async function processTxtFile(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessResult> {
  const text = await parseTxtFile(file)
  const rawChapters = splitIntoChapters(text)
  
  const total = rawChapters.length
  const chapters: { id: number; title: string; content: string }[] = []
  
  for (let i = 0; i < rawChapters.length; i++) {
    const content = rawChapters[i]
    const firstLine = content.split('\n')[0].trim()
    const title = firstLine.length < 50 ? firstLine : `第${i + 1}章`
    
    chapters.push({
      id: i,
      title,
      content
    })
    
    if (onProgress) {
      onProgress(i + 1, total)
    }
  }
  
  const bookName = file.name.replace(/\.txt$/i, '')
  
  const book: Book = {
    id: generateId(),
    name: bookName,
    chapters: chapters.map(c => ({ id: c.id, title: c.title })),
    addedAt: Date.now()
  }
  
  return { book, chapters }
}
