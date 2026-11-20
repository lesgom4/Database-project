import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using the POST method
app.use(express.urlencoded({extended:true}));

//setting up database connection pool, replace values in red
const pool = mysql.createPool({
    host: "d13xat1hwxt21t45.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "lru868rp8ryaeke3",
    password: "mf9p2q7r3opq7lwg",
    database: "vnujnm2vqpohwi0e",
    connectionLimit: 10,
    waitForConnections: true
});

//initialize this server app to use sessions
app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'keyboard-cat',
    resave: false,
    saveUninitialized: true,
}));

//routes
app.get('/', isUserAuthenticated, (req, res) => {
  res.render('home.ejs');
  
});

app.get('/login', (req, res) => {
  res.render('login.ejs');
  
});

app.post('/login', async (req, res) => {

    //retrieving the entered (guessed)
    //username and password from the form
    let username = req.body.username;
    let password = req.body.password;

    //select the user that matches the username 
    //typed in the form
    let checkUserQuery = 
    `SELECT * FROM admin 
    WHERE username = ?`;

    let params = [username];
    let [ rows ] = await pool.query(checkUserQuery, params);

    //if no user is found, we know they
    //typed in the wrong username
    if (rows.length == 1
         && await bcrypt.compare(password, rows[0].password)) {    
        
        req.session.authenticated = true;
        req.session.role = 'admin';
        req.session.username = username;
        
        res.render('home.ejs');
    } else {
        res.render('login.ejs', {error : 'Bad.'});
    }



    //if they have the right username and password
    //then i'll let them see the home page
    //which is the only page that has a link 
    //to the quotes list
})

app.get('/newUser', (req, res) => {
    res.render('newUser.ejs');
})

app.post('/createUser', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    let createUserSql = `INSERT INTO admin (username, password) 
               VALUES (?, ?)`;

    let hashedPassword = await bcrypt.hash(password, 10);
    let params = [username, hashedPassword];

    const [rows] = await pool.query(createUserSql, params);

    res.redirect('/');

});

app.get('/quotesList', isUserAuthenticated, async (req, res) => {

    let query = 'SELECT * FROM quotes';
    const [rows] = await pool.query(query);
    console.log(rows);
    
    res.render('quotes.ejs', {quotes: rows});
    
});

app.get('/logout', isUserAuthenticated, async (req, res) => {
    //destroys the lockbox in locker thats assigned
    //to this user
    req.session.destroy(callback => {
        //callback is what happens after
        //redirect to the base route
        res.redirect('/');
    })
})

app.get("/dbTest", async(req, res) => {
  try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});//dbTest

app.listen(3000, ()=>{
    console.log("Express server running")
});


//middleware function
//that checks if you're authenticated
function isUserAuthenticated(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}