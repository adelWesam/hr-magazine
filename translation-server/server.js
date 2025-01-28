require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
const path = require('path');

// Serve static files from the 'frontend' folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the HTML files when navigating to the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});
app.get('/add-news', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'add-news.html'));
});
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be provided in the environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Add news and replace existing news in the same category
app.post('/add-news', async (req, res) => {
  const { title, content, category } = req.body;

  try {
    // Normalize the category for consistency
    const normalizedCategory = category.trim().toLowerCase();

    // Delete previous news for the category
    const { error: deleteError } = await supabase
      .from('news')
      .delete()
      .eq('category', normalizedCategory);

    if (deleteError) {
      console.error('Error deleting news:', deleteError);
      return res.status(500).send('Error deleting news');
    }

    // Insert new news for the category
    const { data, error: insertError } = await supabase
      .from('news')
      .insert([{ title, content, category: normalizedCategory }]);

    if (insertError) {
      console.error('Error inserting news:', insertError);
      return res.status(500).send('Error inserting news');
    }

    res.send('News added and replaced existing news...');
  } catch (err) {
    console.error('Error adding news:', err);
    res.status(500).send('Error adding news');
  }
});

// Fetch news by category and return only the latest news
app.get('/news/:category', async (req, res) => {
  const { category } = req.params;
  console.log('Requested category:', category);

  // Normalize the category for consistency
  const normalizedCategory = category.trim().toLowerCase();

  try {
    // Fetch the latest news for the given category
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('category', normalizedCategory)
      .order('created_at', { ascending: false }) // Sort by created_at in descending order
      .limit(1); // Fetch only the latest news

    console.log('Fetched data:', data);

    if (error) {
      console.error('Query error:', error);
      return res.status(500).send('Error fetching news');
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).send('Error fetching news');
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
