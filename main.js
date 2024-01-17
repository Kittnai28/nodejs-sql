const express = require('express')
const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())
app.use(cookieParser())

const PORT = 8080
let conn = null
const secret = 'keySecret'

// เชื่อมต่อ phpmyadmin ใช้ xampp
const connectSql = async() => {
    conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        database: 'employee',
        port: 3306
    })
}

// middleware
const authenticateToken = (req, res, next) => {
    const token = req.cookies.authToken

    if(token === null) {
        return res.status(401).json({
            message: 'Incorrect authorize'
        })
    }

    try {
        const user = jwt.verify(token, secret)
        req.user = user
        next()
    }
    catch(error) {
        return res.status(403).json({
            message: 'Incorrect authorize'
        })
    }
}


// api ทั้งหมด
app.get('/', (req, res) => {
    res.json({
        message: 'Hello World'
    })
})

// admin register
app.post('/register', async(req, res) => {
    try {
        const {email, password} = req.body
        // หาอีเมล์ที่ตรงกับ user กรอกเข้ามา
        const [existEmail] = await conn.query('SELECT * FROM admin WHERE email = ?', email)
        if(existEmail.length) {
            return res.status(400).json({ message: "Email is already registered"})
        }
        // เข้ารหัส password
        const hashPass = await bcrypt.hash(password, 10)
        const newUser = {
            email,
            password: hashPass
        }
        await conn.query('INSERT INTO admin SET ?', newUser)
        
        res.status(201).json({
            message: 'Register successfully'
        })    
    } 
    catch (error) {
        res.status(500).json({
            message: 'Internal server error'
        })
    }
})

// admin login
app.post('/login', async(req, res) => {
    try {
        const {email, password} = req.body
        // หาอีเมล์ที่ตรงกับ user กรอกเข้ามา
        const [existEmail] = await conn.query('SELECT * FROM admin WHERE email = ?', email)
        if(!existEmail.length) {
            return res.status(400).json({ message: "Ivalid email" })
        }
        // เช็ค password
        const userPassword = existEmail[0].password
        const match = await bcrypt.compare(password, userPassword)
        if(!match) {
            return res.status(400).json({ message: "Ivalid password" })
        }
        // สร้าง cookie token
        const token = jwt.sign({email}, secret, { expiresIn: "1h" });
        res.cookie('authToken', token, {
            maxAge: 3000000,
            secure: true,
            httpOnly: true,
            sameSite: "none",
        })

        res.status(200).json({
            message: 'Login successfully'
        })
    } 
    catch (error) {
        res.status(500).json({
            message: 'Internal server error'
        })
    }
})

// need login 
// Get all employee
app.get('/employees', authenticateToken, async(req, res) => {
    try {
        const [results] = await conn.query('SELECT * FROM employees')
        res.status(200).json({
            result: results
        })
    }
    catch(error) {
        res.status(500).json({
            message: 'Internal server error'
        })
    }
})

// Create new employee
app.post('/create', authenticateToken, async(req, res) => {
    try {
        const newEmployee = req.body
        await conn.query('INSERT INTO employees SET ?', newEmployee)
        res.status(201).json({
            message: 'Create employee successfully'
        })
    }
    catch(error) {
        res.status(500).json({
            message: 'Internal server error'
        })
    }
})

// Update employee data
app.put('/update/:id', authenticateToken, async(req, res) => {
    try {
        const id = req.params.id
        const [userById] = await conn.query('SELECT * FROM employees WHERE id = ?', id)
        if(!userById.length){
            return res.status(404).json({
                message: 'Not Found'
            })
        }

        const updateEmployee = req.body
        await conn.query('UPDATE employees SET ? WHERE id = ?', [updateEmployee, id])
        res.status(200).json({
            message: 'Update employee successfully'
        })
    }
    catch(error) {
        res.status(500).json({
            message: 'Internal server error'
        })
    }
})

// Delete employee
app.delete('/delete/:id', authenticateToken, async(req, res) => {
    try {
        const id = req.params.id
        const [userById] = await conn.query('SELECT * FROM employees WHERE id = ?', id)
        if(!userById.length){
            return res.status(404).json({
                message: 'Not Found'
            })
        }

        await conn.query('DELETE FROM employees WHERE id = ?', id)
        res.status(200).json({
            message: 'Delete employee successfully'
        })
    }
    catch(error) {
        res.status(500).json({
            message: 'Internal server error'
        })
    }
})  

app.listen(PORT, async() => {
    await connectSql()
    console.log(`http://localhost:${PORT}`)
})