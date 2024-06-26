const PORT = process.env.PORT ?? 3006;
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
var cors = require('cors');
const app = express();
const pool = require('./db');
const e = require('express');

app.use(cors());
app.use(express.json());

const jwtSecretKey = process.env.JWT_KEY;

app.get('/', (req, res) => {
  res.send('HEYY JESSSSEE!!');
});

app.get('/books', async (req, res) => {
  console.log('get:books');
  try {
    const books = await pool.query('SELECT * from books ORDER BY book_id');
    res.json(books.rows);
    // console.log(books.rows)
  } catch (err) {
    console.error(err);
  }
});

app.get('/books/query/', async (req, res) => {
  console.log('get:books/query');

  let { query, limit, offset } = req.query;
  console.log('params', query, limit, offset);
  if (query.length <= 0) {
    query = '.*';
  }
  // params = new URLSearchParams(decodeURI(req.params.query))
  // let query = params.entries()
  // console.log(query.next().value.query)

  try {
    const querystring = `
    SELECT 
        count(S.instock) as stockcount, 
        B.*, 
        A.* 
    FROM 
        (books B JOIN authors A ON B.author = A.id) 
        JOIN stock S ON B.book_id = S.book_id   
    WHERE 
        B.title ~* $1 OR A.author_name ~* $1 OR B.genre ~* $1
    GROUP BY 
        B.book_id, 
        A.id 
    ORDER BY 
        B.book_id 
    LIMIT 
        $2 
    OFFSET 
        $3
`;
    const books = await pool.query(querystring, [query, limit, offset]);
    res.json(books.rows);
    console.log(books.rows);
  } catch (err) {
    console.error(err);
  }
});

///================================================================================================
app.get('/books/bookbuddy/', async (req, res) => {
  console.log('get:books/bookbuddy');

  let { userid, offset } = req.query;
  console.log('params', userid);
  if (userid === undefined || offset === undefined) {
    console.log('Missing parameters');
    return res.status(400).json({ message: 'Missing parameters' });
  }
  console.log('user', userid);
  if (userid.length <= 0) {
    return res.status(400).json({ message: 'Missing parameters' });
  }
  // params = new URLSearchParams(decodeURI(req.params.query))
  // let query = params.entries()
  // console.log(query.next().value.query)

  try {
    const querystring = `WITH
        USER2 (UCOUNT, U2ID, U1ID) AS (
            SELECT
                COUNT(U1.ID),
                U2.ID,
                U1.ID
            FROM
                users U1
                JOIN reservations R1 ON U1.ID = R1.USER_ID
                JOIN reservations R2 ON R1.BOOK_ID = R2.BOOK_ID
                JOIN users U2 ON R2.USER_ID = U2.ID
            WHERE
                U1.ID = $1
                AND U1.ID <> U2.ID
            GROUP BY
                U2.ID,
                U1.ID
            ORDER BY
                COUNT DESC
            LIMIT
                1
        )
    SELECT DISTINCT
        B.*,
        COUNT(S.INSTOCK) AS STOCKCOUNT,
        A.AUTHOR_NAME
    FROM
        books B
        JOIN authors A ON B.AUTHOR = A.ID
        JOIN stock S ON B.BOOK_ID = S.BOOK_ID
    WHERE
        B.BOOK_ID IN (
            SELECT
                BOOK_ID
            FROM
                reservations R1
                JOIN USER2 ON R1.USER_ID = USER2.U2ID
            EXCEPT
            SELECT
                BOOK_ID
            FROM
                reservations R2
                JOIN USER2 ON R2.USER_ID = USER2.U1ID
        ) 
    GROUP BY
        B.BOOK_ID,
        A.AUTHOR_NAME
    ORDER BY
        CHECKOUT_COUNT DESC
    LIMIT
        5
    OFFSET
        $2`;
    const books = await pool.query(querystring, [userid, offset]);
    res.json(books.rows);
    console.log(books.rows);
  } catch (err) {
    console.error(err);
  }
});
///=====================================================================================================
///================================================================================================
app.get('/books/popgenre/', async (req, res) => {
  console.log('get:books/popgenre');

  let { userid, offset } = req.query;
  console.log('params', userid);
  console.log('user', userid);
  if (userid.length <= 0) {
    return res.status(400).json({ message: 'Missing parameters' });
  }
  // params = new URLSearchParams(decodeURI(req.params.query))
  // let query = params.entries()
  // console.log(query.next().value.query)

  try {
    const querystring = `
        WITH
	TOPGENRES (GCOUNT, TGENRES, U1ID) AS (
		SELECT
			COUNT(U.ID),
			B.GENRE,
			U.ID
		FROM
			users U
			JOIN reservations R ON U.ID = R.USER_ID
			JOIN books B ON B.BOOK_ID = R.BOOK_ID
		WHERE
			U.ID = $1
		GROUP BY
			B.GENRE,
			U.ID
		ORDER BY
			COUNT DESC
		LIMIT
			4
	),
	NOTREAD (BOOKS) AS (
		SELECT
			BOOK_ID
		FROM
			books B
			JOIN TOPGENRES G ON B.GENRE = G.TGENRES
		EXCEPT
		(
			SELECT
				BOOK_ID
			FROM
				reservations R
				JOIN users U ON U.ID = R.USER_ID
			WHERE
				U.ID = $2
		)
	)
SELECT DISTINCT
	B1.*,
	COUNT(S.INSTOCK) AS STOCKCOUNT,
	A.AUTHOR_NAME
FROM
	books B1
	JOIN NOTREAD B2 ON B1.BOOK_ID = B2.BOOKS
	JOIN authors A ON B1.AUTHOR = A.ID
	JOIN stock S ON B1.BOOK_ID = S.BOOK_ID
GROUP BY
	B1.BOOK_ID,
	A.AUTHOR_NAME
ORDER BY
	CHECKOUT_COUNT DESC
LIMIT
	5
OFFSET
	$3
    `;
    const books = await pool.query(querystring, [userid, userid, offset]);
    res.json(books.rows);
    console.log(books.rows);
  } catch (err) {
    console.error(err);
  }
});
///=====================================================================================================

// ==========================

app.get('/books/stock/', async (req, res) => {
  console.log('get:books/stock');

  let { query } = req.query;
  console.log('params', query);
  if (query.length <= 0) {
    query = '.*';
  }
  // params = new URLSearchParams(decodeURI(req.params.query))
  // let query = params.entries()
  // console.log(query.next().value.query)

  try {
    const querystring = `
SELECT *, S.id as ID,
       A.author_name
FROM   books B
JOIN   stock S 
ON     B.book_id = S.book_id
JOIN   authors A 
ON     B.author = A.id
WHERE  S.id = $1
`;
    const books = await pool.query(querystring, [query]);
    res.json(books.rows);
    console.log(books.rows);
  } catch (err) {
    console.error(err);
  }
});

// ==========================

app.get('/books/stocksearch/', async (req, res) => {
  console.log('get:books/stocsearch');

  let { query, offset } = req.query;
  console.log('params', query);
  if (query.length <= 0) {
    query = '.*';
  }

  try {
    const querystring = `
SELECT
	B.book_id, B.title, A.author_name, B.genre, S.id , S.instock, s.book_condition,  U.firstname, U.lastname, s.due_date
FROM
	books B
	JOIN authors A ON B.AUTHOR = A.ID
	JOIN stock S ON S.BOOK_ID = B.BOOK_ID
	Left JOIN users U ON S.USER_ID = U.ID
WHERE
	B.TITLE ~* $1 OR B.GENRE ~* $1 OR A.AUTHOR_NAME ~* $1
ORDER BY
    B.BOOK_ID, S.ID
    offset $2
    limit 10
`;
    const books = await pool.query(querystring, [query, offset]);
    res.json(books.rows);
    console.log(books.rows);
  } catch (err) {
    console.error(err);
  }
});
//============================
app.get('/book/index/', async (req, res) => {
  console.log('get:book/index');

  let { query } = req.query;
  console.log('Received query parameter: ', query);
  if (query.length <= 0) {
    query = '.*';
  }

  try {
    const querystring = `
            SELECT *, 
                   A.author_name
            FROM   books B
            JOIN   authors A 
            ON     B.author = A.id
            WHERE  B.book_ID = $1
        `;
    console.log('Executing query: ', querystring);
    const books = await pool.query(querystring, [query]);
    console.log('Received books: ', books.rows);
    res.json(books.rows);
  } catch (err) {
    console.error('Error occurred: ', err);
  }
});

app.get('/books/index/', async (req, res) => {
  console.log('get:books/index');

  let { query, limit, offset } = req.query;
  console.log('params', query, limit, offset);
  if (query.length <= 0) {
    query = '.*';
  }
  // params = new URLSearchParams(decodeURI(req.params.query))
  // let query = params.entries()
  // console.log(query.next().value.query)

  try {
    const querystring = `
    SELECT 
        count(S.instock) as stockcount, 
        B.*, 
        A.* 
    FROM 
        (books B JOIN authors A ON B.author = A.id) 
        JOIN stock S ON B.book_id = S.book_id   
    WHERE 
        S.id = $1  
    GROUP BY 
        B.book_id, 
        A.id 
    ORDER BY 
        B.book_id 
    LIMIT 
        $2 
    OFFSET 
        $3
`;
    const books = await pool.query(querystring, [query, limit, offset]);
    res.json(books.rows);
    console.log(books.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get('/books/:title', async (req, res) => {
  console.log('get:books/title');

  try {
    const { title } = req.params;
    console.log(title);
    const query = 'SELECT * FROM books WHERE title ~* $1 limit 1';
    const books = await pool.query(query, [title]);
    res.json(books.rows);
    console.log(books.rows);
  } catch (err) {
    console.error(err);
  }
});

// Define a GET route handler for '/user/:id'
app.get('/user/:id', async (req, res) => {
  // Log a message indicating that this route handler has been entered
  console.log('get:user/id');

  try {
    // Extract the 'id' parameter from the request parameters
    const { id } = req.params;
    // Log the 'id' parameter
    console.log(id);

    // Define a SQL query that selects all columns from the 'users' table where the 'id' column matches a parameter
    const query = 'SELECT * FROM users WHERE id = $1';

    // Execute the SQL query, passing the 'id' parameter as the value to match
    // Use the 'await' keyword to wait for the query to complete before moving on to the next line of code
    const user = await pool.query(query, [id]);

    // Send the rows returned by the query as a JSON response
    res.json(user.rows);

    // Log the rows returned by the query
    console.log(user.rows);
  } catch (err) {
    // If any errors occur during the execution of the try block, catch them and log them to the console
    console.error(err);
  }
});

app.get('/stockuser/:id', async (req, res) => {
  console.log('getstockuser/id');

  try {
    const { id } = req.params;
    console.log(id);
    const query =
      'SELECT * FROM users U JOIN stock S on U.id=S.user_id where s.id = $1';
    const users = await pool.query(query, [id]);
    res.json(users.rows);
    console.log(users.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get('/checkedout/:id', async (req, res) => {
  console.log('checkedout/id');

  try {
    const { id } = req.params;
    console.log(id);
    const query = `
  SELECT * 
  FROM users U 
  JOIN stock S ON U.id = S.user_id 
  JOIN books B ON B.book_id = S.book_id
  JOIN authors A ON B.author = A.id
  WHERE S.user_id = $1
`;
    const users = await pool.query(query, [id]);
    res.json(users.rows);
    console.log(users.rows);
  } catch (err) {
    console.error(err);
  }
});

app.patch('/user/payment/', async (req, res) => {
  const { amount, id } = req.body;
  console.log('user/payment:', amount, id);

  try {
    const query = 'SELECT * FROM users WHERE id = $1';

    const user = await pool.query(query, [id]);
    console.log(user.rows);
    if (user.rows.length == 0) {
      res.status(500).json({ message: 'User Not Found' });
      return;
    }

    const newBalance = Math.max(0, user.rows[0].balance - amount);

    const updated =
      'UPDATE users SET balance = $1 WHERE id = $2 RETURNING balance, id';
    const updateduser = await pool.query(updated, [newBalance, id]);

    res.status(200).json({
      user: updateduser.rows,
      message: 'User updated',
    });

    console.log(updateduser.rows[0]);
  } catch (err) {
    // If any errors occur during the execution of the try block, catch them and log them to the console
    console.error(err);
  }
});

//Update Books API endpoint
//
//Patch Body Format:
//Only REQUIRED Field is "title"
//Blank and NonExisitent fields are ignored
//
//  {
// "book_id": 1,
// "title": "Classical Mythology",
// "author_id": 1,
// "publisher": "Oxford University Press",
// "isbn": "195153448",
// "publication_year": 2011,
// "genre": "Science Fiction",
// "img": "http://images.amazon.com/images/P/0195153448.01.LZZZZZZZ.jpg",
// "count": 5
//  }
app.patch('/book', async (req, res) => {
  const { book_id, author_name } = req.body;
  try {
    const query = 'SELECT * FROM books WHERE book_id = $1';
    const books = await pool.query(query, [book_id]);
    if (books.rows.length > 0) {
      for (const [key, value] of Object.entries(req.body)) {
        if (key == 'book_id' || key == 'author_id' || value.length == 0) {
          // Do nothing
        } else {
          books.rows[0][key] = value;
        }
      }
      const merge = books.rows[0];
      const query = `
                UPDATE books 
                SET 
                title=$1,
                publishyear=$2,
                isbn=$3,
                genre=$4,
                img=$5,
                description=$6
                WHERE book_id = $7
            `;
      const values = [
        merge.title,
        merge.publishyear,
        merge.isbn,
        merge.genre,
        merge.img,
        merge.description,
        book_id,
      ];
      const booksupdated = await pool.query(query, values);

      // Update author name in authors table
      const authorQuery = `
                UPDATE authors
                SET author_name = $1
                WHERE id = $2
            `;
      const authorValues = [author_name, merge.author];
      await pool.query(authorQuery, authorValues);

      res.status(200).json({
        books: merge,
        message: 'Book and author updated',
      });
    } else {
      res.status(500).json({
        message: 'Book Not Found',
      });
    }
  } catch (err) {
    console.error(`Error occurred: ${err}`);
  }
});

// app.get('/events', async (req, res) => {
//   try {
//     // Query the database to retrieve events data
//     const queryText = `
//         SELECT 
//             e.event_id, 
//             e.event_name, 
//             e.event_date, 
//             e.book_id, 
//             e.author_id, 
//             b.title, 
//             a.author_name
//         FROM 
//             events e
//         JOIN 
//             books b ON e.book_id = b.book_id
//         JOIN 
//             author a ON e.author_id = a.author_id
//     `;
//     const { rows } = await pool.query(queryText);

//     // Send the events data as a response
//     res.json(rows);
//   } catch (error) {
//     console.error('Error fetching events:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

app.patch('/checkoutbook/', async (req, res) => {
  const { stockid, user_id } = req.body;
  console.log('Checking Out:', stockid, 'User: ', user_id);

  var tmpdate = new Date();
  var duration = 7;
  tmpdate.setTime(tmpdate.getTime() + duration * 86400000);
  const due_date = tmpdate.toISOString().slice(0, 19).replace('T', ' ');

  console.log(due_date);
  try {
    const query = `
            UPDATE stock 
            SET 
            instock=false, user_id = $1, due_date = $3
            WHERE id = $2
            `;

    console.log(stockid);
    const booksupdated = await pool.query(query, [user_id, stockid, due_date]);

    reservationquery = `Insert into reservations (book_id, user_id) values ((select book_id from stock where id = $1), $2)`;
    const reservation = await pool.query(reservationquery, [stockid, user_id]);



    console.log(booksupdated.rows);

    res.status(200).json({
      reservation: reservation.rows,
      books: stockid,
      message: 'Book Checked Out',
    });
  } catch (err) {
    res.status(500).json({
      books: stockid,
      message: 'Book Error:' + err,
    });
    console.error(err);
  }
});

app.patch('/returnbook/', async (req, res) => {
  console.log(req.body);
  const { stockid, balance, user_id } = req.body;
  console.log('Returning Book', stockid);

  try {
    const query1 = `
            UPDATE stock 
            SET 
            instock=true, user_id = NULL, due_date = NULL
            WHERE id = $1;`;

    const query2 = `
            UPDATE users
            SET
            balance = $1
            WHERE id = $2;
            `;
    const values = [stockid];
    console.log(values);
    const booksupdated = await pool.query(query1, values);
    console.log(booksupdated.rows);

    const values2 = [balance, user_id];
    console.log(values2);
    const usersupdated = await pool.query(query2, values2);
    console.log(booksupdated.rows);

    res.status(200).json({
      books: stockid,
      message: 'Book Returned',
    });
  } catch (err) {
    res.status(500).json({
      books: stockid,
      message: 'Book Error:' + err,
    });
    console.error(err);
  }
});

app.post('/signup', async (req, res) => {
  console.log('POST /signup called');
  const { firstName, lastName, email, password, role } = req.body;
  console.log('Received data:', { firstName, lastName, email, role });

  try {
    // Check if user already exists
    const existingUserQuery = 'SELECT * FROM users WHERE email = $1';
    console.log('Executing query:', existingUserQuery);
    const existingUserResult = await pool.query(existingUserQuery, [email]);
    console.log('Query result:', existingUserResult.rows);

    if (existingUserResult.rows.length > 0) {
      console.log('User already exists');
      return res.status(400).json({
        message: 'User already exists',
        userExists: true,
      });
    }

    // Hash the password
    console.log('Hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    const insertUserQuery =
      'INSERT INTO users( firstName, lastName, email, password, role) VALUES($1, $2, $3, $4, $5) RETURNING *';
    console.log('Executing query:', insertUserQuery);
    const insertedUserResult = await pool.query(insertUserQuery, [
      firstName,
      lastName,
      email,
      hashedPassword,
      role,
    ]);
    console.log('Query result:', insertedUserResult.rows);

    const newUser = insertedUserResult.rows[0];

    let loginData = {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      signInTime: Date.now(),
    };
    console.log('Login data:', loginData);

    const token = jwt.sign(loginData, jwtSecretKey);
    console.log('Generated token:', token);
    res.status(200).json({
      message: 'success',
      token,
      role: newUser.role,
      id: newUser.id,
      email: newUser.email,
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});

// Login endpoint (similar changes as in the previous example)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log(`Attempting to log in user with email: ${email}`); // Log the email of the user attempting to log in
  console.log('password:', password);
  try {
    const getUserQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(getUserQuery, [email]);
    const user = userResult.rows[0];

    if (!user) {
      console.log(`User with email: ${email} not found`); // Log when a user is not found
      return res.status(401).json({
        message: 'User not found',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('passwordMatch:', passwordMatch);
    if (!passwordMatch) {
      console.log(`Invalid password for user with email: ${email}`); // Log when an invalid password is entered
      return res.status(401).json({
        message: 'Invalid password',
      });
    }

    let loginData = {
      id: user.id,
      email: user.email,
      role: user.role,
      signInTime: Date.now(),
    };
    const token = jwt.sign(loginData, jwtSecretKey);
    res.status(200).json({
      message: 'success',
      token,
      role: user.role,
      id: user.id,
      loggedIn: true,
    });
    console.log(`User with email: ${email} successfully logged in`); // Log when a user successfully logs in
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      message: 'Internal server error',
    });
  }
});
// The verify endpoint that checks if a given JWT token is valid
app.post('/verify', (req, res) => {
  const tokenHeaderKey = 'jwt-token';
  const authToken = req.headers[tokenHeaderKey];
  try {
    const verified = jwt.verify(authToken, jwtSecretKey);
    if (verified) {
      return res.status(200).json({
        status: 'logged in',
        message: 'success',
      });
    } else {
      // Access Denied
      return res.status(401).json({
        status: 'invalid auth',
        message: 'error',
      });
    }
  } catch (error) {
    // Access Denied
    return res.status(401).json({
      status: 'invalid auth',
      message: 'error',
    });
  }
});

app.post('/check-account', async (req, res) => {
  console.log('POST /check-account called');
  try {
    const { email } = req.body;
    console.log('Received email:', email);

    // Check if user exists in the database
    const getUserQuery = 'SELECT * FROM users WHERE email = $1';
    console.log('Executing query:', getUserQuery);
    const result = await pool.query(getUserQuery, [email]);

    const user = result.rows;
    console.log('Query result:', user);

    res.status(200).json({
      status: user.length > 1 ? 'User exists' : 'User does not exist',
      userExists: user.length >= 1,
    });
  } catch (error) {
    console.error('Error checking account:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

app.post('/book', async (req, res) => {
  // console.log(req)
  const {
    title,
    author_name,
    isbn,
    publishyear,
    genre,
    img,
    description,
    count,
  } = req.body;
  try {
    const authorquery =
      'INSERT INTO authors  (AUTHOR_NAME)  SELECT $1   WHERE  NOT EXISTS (  SELECT *  FROM   authors WHERE AUTHOR_NAME = $2) RETURNING id';
    const insertId = await pool.query(authorquery, [author_name, author_name]);
    let author_id = '';
    console.log('# of Inserted Author Rows:', insertId.rowCount);
    if (insertId.rowCount != 0) {
      console.log('RowID:', insertId.rows[0].id);
      author_id = insertId.rows[0].id;
    } else {
      const aquery = 'SELECT id FROM authors where author_name = $1';

      const authorquery = await pool.query(aquery, [author_name]);
      author_id = authorquery.rows[0].id;
    }
    const bquery = `INSERT INTO books (title, author,  publishyear, isbn, genre, img, checkout_count, description)
                 VALUES ($1, $2, $3, $4, $5, $6, 0, $7)  RETURNING book_id`;
    const bookinsert = await pool.query(bquery, [
      title,
      author_id,
      publishyear,
      isbn,
      genre,
      img,
      description,
    ]);

    console.log(bookinsert.rows);

    const stockquery = `INSERT INTO stock (book_id, instock, book_condition)
    VALUES($1, 'true', 'Good') RETURNING id;`;
    let bid = bookinsert.rows[0].book_id;
    console.log(bid);
    let loopcount = parseInt(count);

    while (loopcount > 0) {
      const stockinsert = await pool.query(stockquery, [bid]);
      console.log(stockinsert);
      loopcount = loopcount - 1;
    }

    // 200 Message
    return res.status(200).json({
      message: 'A new book has been added.',
    });
  } catch (error) {
    console.error('Error adding book:', error);
    return res.status(500).json({
      message: 'An error occurred while adding the book.',
    });
  }
});

app.delete('/deletebook', async (req, res) => {
  console.log('Deleting book...');
  const { stockid } = req.body;
  console.log(`Stock ID: ${stockid}`);
  
  const query = `
    SELECT * , B.author as author_id,
    (
        SELECT COUNT(ID)
        FROM stock
        WHERE S.BOOK_ID = BOOK_ID
    ) AS STOCKCOUNT
    FROM stock S JOIN books B ON S.BOOK_ID = B.BOOK_ID
    WHERE S.ID = $1
  `;
  console.log(`Executing query: ${query}`);
  const stock = await pool.query(query, [stockid]);
  console.log('Query result:', JSON.stringify(stock.rows, null, 2));

  if (!stock.rows[0] || stock.rows[0].stockcount == 0) {
    console.log('Stock:', stock);
    return res.status(404).json({
      message: 'This book is not in the database.',
    });
  }

  const delete_query3 = `
    DELETE FROM reservations 
    WHERE book_id = $1
  `;
  console.log(`Executing query: ${delete_query3}`);
  const result1 = await pool.query(delete_query3, [stock.rows[0].book_id]);
  console.log('Query result:', JSON.stringify(result1.rows, null, 2));

  const delete_query = `
    DELETE FROM stock 
    WHERE id = $1
  `;
  console.log(`Executing query: ${delete_query}`);
  const result2 = await pool.query(delete_query, [stockid]);
  console.log('Query result:', JSON.stringify(result2.rows, null, 2));

  if (stock.rows[0].stockcount == 1) {
    console.log('Stock:', stock.rows[0].stockcount);

    const delete_query2 = `
      DELETE FROM books 
      WHERE book_id = $1
    `;
    console.log(`Executing query: ${delete_query2}`);
    const result3 = await pool.query(delete_query2, [stock.rows[0].book_id]);
    console.log('Query result:', JSON.stringify(result3.rows, null, 2));
    
    const authorcountquery = `
           SELECT count(book_id) as count
      FROM books 
      WHERE author = $1
    `;
    console.log(`Executing query: ${authorcountquery}`);
    const authorcount = await pool.query(authorcountquery, [stock.rows[0].author_id]);
    console.log('Query result:', JSON.stringify(authorcount.rows, null, 2));
    
    if (authorcount.rows.length > 0  && authorcount.rows[0].count == 0) {
      const delete_query5 = `
        DELETE FROM authors 
        WHERE id = $1
      `;
      console.log(`Executing: ${delete_query5}`, stock.rows);
      const result4 = await pool.query(delete_query5, [stock.rows[0].author_id]);
      console.log('Query result:', JSON.stringify(result4.rows, null, 2));
    }
  }

  console.log('Book deleted successfully.');
  return res.status(200).json({
    message: 'The book has been deleted.',
  });
});




// app.post('/event_insert', async (req, res) => {
//   const { event_name, event_date, book_id, author_id } = req.body;
//   try {
//     const id_count = await pool.query('SELECT COUNT(*) FROM events');
//     let rowCount = parseInt(id_count.rows[0].count);
//     rowCount += 1;

//     const insert_query = await pool.query(
//       'INSERT INTO events (event_id, event_name, event_date, book_id, author_id) VALUES ($1, $2, $3, $4, $5)',
//       [rowCount, event_name, event_date, book_id, author_id],
//     );

//     // 200 Message
//     return res.status(200).json({
//       message: 'A new event has been added.',
//     });
//   } catch (error) {
//     console.error('Error adding event:', error);
//     return res.status(500).json({
//       message: 'An error occurred while adding the event.',
//     });
//   }
// });

app.listen(PORT, () => console.log(`Server running on Port ${PORT}`));
