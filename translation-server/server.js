require('dotenv').config();

const express = require('express');
const sql = require('mssql');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

sql.connect(config, (err) => {
  if (err) {
    console.error('Error connecting to SQL Server:', err);
    return;
  }
  console.log('SQL Server Connected...');
});

// Your routes and other code...
// Route to add news
app.post('/add-news', async (req, res) => {
  const { title, content, category } = req.body;
  try {
    const request = new sql.Request();

    // Log the category value
    console.log('Category:', category);

    // Step 1: Delete existing news for the category
    const deleteQuery = 'DELETE FROM news WHERE category = @category';
    request.input('category', sql.VarChar, category);
    console.log('Executing delete query:', deleteQuery);
    const deleteResult = await request.query(deleteQuery);

    // Log the delete result
    console.log('Delete Result:', deleteResult);

    // Step 2: Insert the new news
    const insertQuery = `
      INSERT INTO news (title, content, category)
      VALUES (@title, @content, @category)
    `;
    request.input('title', sql.VarChar, title);
    request.input('content', sql.VarChar, content);
    console.log('Executing insert query:', insertQuery);
    const insertResult = await request.query(insertQuery);

    // Log the insert result
    console.log('Insert Result:', insertResult);

    res.send('News added and replaced existing news...');
  } catch (err) {
    console.error('Error adding news:', err);
    res.status(500).send('Error adding news');
  }
});

// Route to get news by category
app.get('/news/:category', async (req, res) => {
  const { category } = req.params;
  try {
    const request = new sql.Request();
    const query = 'SELECT * FROM news WHERE category = @category';
    request.input('category', sql.VarChar, category);
    const result = await request.query(query);
    res.send(result.recordset);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).send('Error fetching news');
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});