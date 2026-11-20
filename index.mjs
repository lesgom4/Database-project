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
    host: "e11wl4mksauxgu1w.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "zi149p4frap6nx7f",
    password: "un1jpam7csvxvn70",
    database: "vkestfncqsoesm0v",
    connectionLimit: 10,
    waitForConnections: true
});

//initialize this server app to use sessions
app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'baking-is-my-passion',
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
    `SELECT * FROM Login 
    WHERE username = ?`;

    let params = [username];
    let [ rows ] = await pool.query(checkUserQuery, params);

    //if no user is found, we know they
    //typed in the wrong username
    if (rows.length == 1
         && await bcrypt.compare(password, rows[0].password)) {    
        
        req.session.authenticated = true;
        req.session.role = rows[0].type;
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

app.get('/signup', (req, res) => {
    res.render('signup.ejs');
})

app.post('/createUser', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    let createUserSql = `INSERT INTO Login (username, password) 
               VALUES (?, ?)`;

    let hashedPassword = await bcrypt.hash(password, 10);
    let params = [username, hashedPassword];

    const [rows] = await pool.query(createUserSql, params);

    res.redirect('/');

});

app.get('/menu', isUserAuthenticated, async (req, res) => {

    let query = 'SELECT * FROM menu';
    const [rows] = await pool.query(query);
    console.log(rows);
    
    res.render('menu.ejs', {menu: rows});
    
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