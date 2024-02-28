const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const dateFns = require('date-fns')
const {isValid, format} = require('date-fns')
const {parse} = require('date-fns')

const app = express()
app.use(express.json())

const dbpath = path.join(__dirname, 'todoApplication.db')
let db = null

const initilazieDbAndServer = async () => {
  try {
    db = await open({filename: dbpath, driver: sqlite3.Database})
    console.log('Database connected')

    app.listen(3000, () => {
      console.log('Server is running at port 3000')
    })
  } catch (err) {
    console.error(`Error in database connection: ${err.message}`)
    process.exit(1)
  }
}

initilazieDbAndServer()

const checkrequestQueries = async (req, res, next) => {
  const {status, priority, search_q = '', category, date} = req.query

  const {todoId} = req.params

  const status_array = ['IN PROGRESS', 'TO DO', 'DONE']
  const priority_array = ['HIGH', 'MEDIUM', 'LOW']
  const category_array = ['WORK', 'HOME', 'LEARNING']

  try {
    if (status !== undefined) {
      if (status_array.includes(status)) {
        req.status = status
      } else {
        return res.status(400).send(`Invalid Todo Status`)
      }
    }
    if (priority !== undefined) {
      if (priority_array.includes(priority)) {
        req.priority = priority
      } else {
        return res.status(400).send(`Invalid Todo Priority`)
      }
    }
    if (category !== undefined) {
      if (category_array.includes(category)) {
        req.category = category
      } else {
        return res.status(400).send(`Invalid Todo Category`)
      }
    }
    if (date !== undefined) {
      const newdate = new Date(date)
      const format_date = format(newdate, 'yyyy-MM-dd')
      console.log(format_date)
      if (isValid(newdate)) {
        req.date = format_date
      } else {
        return res.status(400).send(`Invalid Due Date`)
      }
    }
  } catch (err) {
    console.log(`Error in querybodies: ${err.message}`)
  }
  req.todoId = todoId
  req.search_q = search_q
  next()
}

const check = async (req, res, next) => {
  const {todo, status, priority, category, search_q, dueDate} = req.body
  const status_array = ['IN PROGRESS', 'TO DO', 'DONE']
  const priority_array = ['HIGH', 'MEDIUM', 'LOW']
  const category_array = ['WORK', 'HOME', 'LEARNING']

  try {
    if (status !== undefined) {
      if (status_array.includes(status)) {
        req.status = status
      } else {
        return res.status(400).send(`Invalid Todo Status`)
      }
    }
    if (priority !== undefined) {
      if (priority_array.includes(priority)) {
        req.priority = priority
      } else {
        return res.status(400).send(`Invalid Todo Priority`)
      }
    }
    if (category !== undefined) {
      if (category_array.includes(category)) {
        req.category = category
      } else {
        return res.status(400).send(`Invalid Todo Category`)
      }
    }
    if (dueDate !== undefined) {
      const newdate = new Date(dueDate)
      const format_date = format(newdate, 'yyyy-MM-dd')
      console.log(format_date)
      if (isValid(newdate)) {
        req.date = format_date
      } else {
        return res.status(400).send(`Invalid Due Date`)
      }
    }
  } catch (err) {
    console.log(`Error in querybodies: ${err.message}`)
  }
  req.search_q = search_q
  req.todo = todo
  next()
}

app.get('/todos/', checkrequestQueries, async (req, res) => {
  try {
    const {status = '', search_q = '', priority = '', category = ''} = req
    console.log(status, search_q, priority, category)
    const getTodosQuery = `
        SELECT 
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate 
        FROM 
            todo
        WHERE 
        todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%' 
        AND status LIKE '%${status}%' AND category LIKE '%${category}%';`

    const todosArray = await db.all(getTodosQuery)
    res.send(todosArray)
  } catch (error) {
    console.error('Error fetching todos:', error.message)
    res.status(500).send('Internal Server Error')
  }
})

app.get('/todos/:todoId/', checkrequestQueries, async (req, res) => {
  const {todoId} = req
  const query = `select id,todo,priority,status,category,due_date as dueDate from todo where id=?`
  try {
    const dbResponse = await db.get(query, [todoId])
    res.send(dbResponse)
  } catch (err) {
    console.log(`Error in fetching: ${err.message}`)
  }
})

// API 3
app.get('/agenda/', checkrequestQueries, async (req, res) => {
  try {
    const {date} = req
    const query = `SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo WHERE due_date = ?`

    const dbResponse = await db.all(query, [date])

    res.send(dbResponse)
  } catch (err) {
    console.log(`Error in fetching: ${err.message}`)
    res.status(500).send('Internal Server Error')
  }
})

//API 4
app.post('/todos/', checkrequestQueries, async (req, res) => {
  const {todo, priority, status, category, date} = req
  const query = `
    INSERT INTO todo (todo, priority, status, category, due_date)
    VALUES (?, ?, ?, ?, ?)
  `
  try {
    await db.run(query, [todo, priority, status, category, date])
    res.send('Todo Successfully Added')
  } catch (err) {
    console.error(`Error in posting: ${err.message}`)
    res.status(500).send('Internal Server Error')
  }
})

// API 5

app.put('/todos/:todoId/', check, async (req, res) => {
  const {todoId, status, priority, category, date, todo} = req
  let query = `UPDATE todo SET`

  if (status) {
    query += ` status=? WHERE id=?`
    await db.run(query, [status, todoId])
    res.send('Status Updated')
  } else if (priority) {
    query += ` priority=? WHERE id=?`
    await db.run(query, [priority, todoId])
    res.send('Priority Updated')
  } else if (category) {
    query += ` category=? WHERE id=?`
    await db.run(query, [category, todoId])
    res.send('Category Updated')
  } else if (date) {
    query += ` due_date=? WHERE id=?`
    await db.run(query, [date, todoId])
    res.send('Due Date Updated')
  } else if (todo) {
    query += ` todo=? WHERE id=?`
    await db.run(query, [todo, todoId])
    res.send('Todo Updated')
  }
})

app.delete('/todos/:todoId/', checkrequestQueries, async (req, res) => {
  const {todoId} = req
  const query = `DELETE FROM todo where id=?`
  try {
    await db.run(query, [todoId])
    res.send('Todo Deleted')
  } catch (err) {
    console.log(`Error in deleting: ${err.message}`)
    res.status(500).send('Internal Server Error')
  }
})

module.exports = app
