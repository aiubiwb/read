import express from 'express'
import mysql from 'mysql2/promise'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { readFile, readdir, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const config = JSON.parse(await readFile(join(__dirname, 'config.json'), 'utf-8'))

const uploadsDir = join(__dirname, 'uploads')
if (!existsSync(uploadsDir)) {
  await mkdir(uploadsDir, { recursive: true })
}

const app = express()
const PORT = 3000
const SECRET_KEY = 'novel-reader-secret-key'

app.use(cors())
app.use(express.json())

const pool = mysql.createPool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
  waitForConnections: true,
  connectionLimit: 10
})

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
})
const upload = multer({ storage })

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: '请先登录' })

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: '登录已过期' })
    req.user = user
    next()
  })
}

function parseTxtFile(content, filename) {
  const allLines = content.split(/\r?\n/)
  const chapters = []
  let currentChapter = null
  let bookName = ''
  let preface = ''
  
  const chapterRegex = /^第[一二三四五六七八九十百千\d]+[部章卷]/
  
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i]
    
    if (chapterRegex.test(line)) {
      if (preface.trim()) {
        chapters.push({
          title: '序言',
          content: preface.trim()
        })
        preface = ''
      }
      if (currentChapter) {
        chapters.push(currentChapter)
      }
      currentChapter = {
        title: line.trim(),
        content: ''
      }
    } else if (currentChapter) {
      currentChapter.content += line + '\n'
    } else {
      preface += line + '\n'
      if (!bookName && line.trim().length > 0 && line.trim().length < 50) {
        if (!line.includes('本书由') && !line.includes('声明：') && !line.includes('敬告：') && !line.includes('书名：') && !line.includes('作者：')) {
          bookName = line.trim()
        } else if (line.startsWith('书名：')) {
          bookName = line.replace('书名：', '').trim()
        }
      }
    }
  }
  
  if (!bookName) {
    bookName = filename.replace(/^\d+-/, '').replace('.txt', '').replace(/【.*】/g, '')
  }
  
  if (currentChapter) {
    chapters.push(currentChapter)
  }
  
  return { bookName, chapters }
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '请填写用户名和密码' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, created_at) VALUES (?, ?, NOW())',
      [username, hashedPassword]
    )

    res.json({ message: '注册成功', userId: result.insertId })
  } catch (error) {
    console.error('注册错误:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: '用户名已存在' })
    } else {
      res.status(500).json({ error: '注册失败' })
    }
  }
})

app.get('/api/register', async (req, res) => {
  try {
    const { username, password } = req.query
    if (!username || !password) {
      return res.status(400).json({ error: '请填写用户名和密码' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, created_at) VALUES (?, ?, NOW())',
      [username, hashedPassword]
    )

    res.json({ message: '注册成功', userId: result.insertId })
  } catch (error) {
    console.error('注册错误:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: '用户名已存在' })
    } else {
      res.status(500).json({ error: '注册失败' })
    }
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )

    if (users.length === 0) {
      return res.status(400).json({ error: '用户名或密码错误' })
    }

    const user = users[0]
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ error: '用户名或密码错误' })
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' })
    res.json({ token, username: user.username, userId: user.id })
  } catch (error) {
    res.status(500).json({ error: '登录失败' })
  }
})

app.get('/api/login', async (req, res) => {
  try {
    const { username, password } = req.query
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )

    if (users.length === 0) {
      return res.status(400).json({ error: '用户名或密码错误' })
    }

    const user = users[0]
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ error: '用户名或密码错误' })
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' })
    res.json({ token, username: user.username, userId: user.id })
  } catch (error) {
    res.status(500).json({ error: '登录失败' })
  }
})

app.get('/api/books', authenticateToken, async (req, res) => {
  try {
    const [books] = await pool.execute(
      `SELECT b.*, COUNT(c.id) as chapter_count 
       FROM books b 
       LEFT JOIN chapters c ON b.id = c.book_id 
       WHERE b.user_id = ? 
       GROUP BY b.id 
       ORDER BY b.created_at DESC`,
      [req.user.id]
    )
    res.json(books)
  } catch (error) {
    res.status(500).json({ error: '获取书籍失败' })
  }
})

app.get('/api/book/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id
    const [books] = await pool.execute(
      'SELECT * FROM books WHERE id = ? AND user_id = ?',
      [bookId, req.user.id]
    )
    
    if (books.length === 0) {
      return res.status(404).json({ error: '书籍不存在' })
    }
    
    const [chapters] = await pool.execute(
      'SELECT id, chapter_index, title FROM chapters WHERE book_id = ? ORDER BY chapter_index',
      [bookId]
    )
    
    res.json({ ...books[0], chapters })
  } catch (error) {
    res.status(500).json({ error: '获取书籍详情失败' })
  }
})

app.get('/api/chapter/:id', authenticateToken, async (req, res) => {
  try {
    const chapterId = req.params.id
    const [chapters] = await pool.execute(
      'SELECT * FROM chapters WHERE id = ?',
      [chapterId]
    )
    
    if (chapters.length === 0) {
      return res.status(404).json({ error: '章节不存在' })
    }
    
    res.json(chapters[0])
  } catch (error) {
    res.status(500).json({ error: '获取章节内容失败' })
  }
})

app.delete('/api/book/:id', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.id
    
    await pool.execute('DELETE FROM chapters WHERE book_id = ?', [bookId])
    await pool.execute('DELETE FROM progress WHERE book_id = ?', [bookId])
    await pool.execute('DELETE FROM books WHERE id = ? AND user_id = ?', [bookId, req.user.id])
    
    res.json({ message: '删除成功' })
  } catch (error) {
    res.status(500).json({ error: '删除失败' })
  }
})

app.get('/api/progress/:bookId', authenticateToken, async (req, res) => {
  try {
    const bookId = req.params.bookId
    const [progress] = await pool.execute(
      'SELECT * FROM progress WHERE user_id = ? AND book_id = ?',
      [req.user.id, bookId]
    )
    res.json(progress.length > 0 ? progress[0] : null)
  } catch (error) {
    res.status(500).json({ error: '获取进度失败' })
  }
})

app.post('/api/progress/:bookId', authenticateToken, async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId)
    const { chapter_index, scroll_top } = req.body
    
    console.log('Saving progress:', { userId: req.user.id, bookId, chapter_index, scroll_top })
    
    await pool.execute(
      `INSERT INTO progress (user_id, book_id, chapter_index, scroll_top, updated_at) 
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE chapter_index = ?, scroll_top = ?, updated_at = NOW()`,
      [req.user.id, bookId, chapter_index, scroll_top, chapter_index, scroll_top]
    )
    
    res.json({ message: '保存成功' })
  } catch (error) {
    console.error('保存进度错误:', error)
    res.status(500).json({ error: '保存进度失败' })
  }
})

app.post('/api/upload', authenticateToken, upload.single('file'), async (req, res) => {
  const connection = await pool.getConnection()
  try {
    const { bookName } = req.body
    const filePath = join(__dirname, 'uploads', req.file.filename)
    const content = await readFile(filePath, 'utf-8')
    
    const { bookName: parsedName, chapters } = parseTxtFile(content, req.file.filename)
    const finalBookName = bookName || parsedName || '未命名'
    
    await connection.beginTransaction()
    
    const [existing] = await connection.execute(
      'SELECT id FROM books WHERE user_id = ? AND name = ?',
      [req.user.id, finalBookName]
    )
    
    if (existing.length > 0) {
      await connection.rollback()
      await unlink(filePath)
      return res.status(400).json({ error: '这本书已经上传过了' })
    }
    
    const [bookResult] = await connection.execute(
      'INSERT INTO books (user_id, name, filename, created_at) VALUES (?, ?, ?, NOW())',
      [req.user.id, finalBookName, req.file.filename]
    )
    
    const bookId = bookResult.insertId
    
    console.log('准备插入章节:', chapters.length, '章')
    
    for (let i = 0; i < chapters.length; i++) {
      console.log(`插入第${i}章:`, chapters[i].title.substring(0, 20))
      await connection.execute(
        'INSERT INTO chapters (book_id, chapter_index, title, content) VALUES (?, ?, ?, ?)',
        [bookId, i, chapters[i].title, chapters[i].content]
      )
    }
    
    console.log('章节插入完成')
    await connection.commit()
    await unlink(filePath)
    
    res.json({ message: '上传成功', bookId, chapterCount: chapters.length })
  } catch (error) {
    await connection.rollback()
    console.error('上传错误:', error)
    res.status(500).json({ error: '上传失败' })
  } finally {
    connection.release()
  }
})

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})
