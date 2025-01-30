require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the HTML files
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
const upload = multer({ storage: multer.memoryStorage() });

// Ensure the 'image_url' column exists
async function ensureImageUrlColumn() {
  try {
    // Check if the column exists manually by querying the table
    const { data, error } = await supabase
      .from('news')
      .select('image_url')  // Check image_url column directly
      .limit(1); // Just fetch the first row for validation

    if (error) {
      console.error('Error checking for image_url:', error);
      return;
    }

    // Debug the fetched data
    console.log('Fetched data:', data);
    
    // Proceed with inserting the news as before...
  } catch (err) {
    console.error('Error checking schema or adding column:', err);
  }
}

// Add news and replace existing news in the same category
app.post('/add-news', upload.single('image'), async (req, res) => {
  const { title, content, category } = req.body;
  const file = req.file;

  let imageUrl = null;  // Set imageUrl to null by default

  if (file) {
    console.log('Received file:', file.originalname, file.mimetype, file.size);

    try {
      const normalizedCategory = category.trim().toLowerCase();
      await supabase.from('news').delete().eq('category', normalizedCategory);

      // Upload news image and generate the public URL
      const { data, error } = await supabase.storage
        .from('news-images')
        .upload(`news-${Date.now()}-${file.originalname}`, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) {
        console.error('Error uploading image:', error);
        return res.status(500).send('Error uploading image');
      }

      // Debug the uploaded file path
      console.log('Uploaded file path:', data.path);

      // Check if the file was uploaded successfully
      if (data?.path) {
        // Manually construct the public URL
        const baseUrl = 'https://rwxyfnphagsxoeafvwvm.supabase.co/storage/v1/object/public/';
        imageUrl = `${baseUrl}news-images/${data.path}`;

        // Debug the generated image URL
        console.log('Generated image URL:', imageUrl);
      } else {
        console.error('No file path returned for uploaded image.');
        return res.status(500).send('Error generating image URL');
      }
    } catch (err) {
      console.error('Error adding news:', err);
      res.status(500).send('Error adding news');
      return;
    }
  }

  // Proceed with inserting the news, including the image URL (null if no image)
  try {
    const normalizedCategory = category.trim().toLowerCase();
    const { error: insertError } = await supabase
      .from('news')
      .insert([{ title, content, category: normalizedCategory, image_url: imageUrl }]);

    if (insertError) {
      console.error('Error inserting news:', insertError);
      return res.status(500).send('Error inserting news');
    }

    res.send('News added successfully');
  } catch (err) {
    console.error('Error adding news:', err);
    res.status(500).send('Error adding news');
  }
});



// Fetch latest news by category
app.get('/news/:category', async (req, res) => {
  const { category } = req.params;
  console.log('Requested category:', category);

  const normalizedCategory = category.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('category', normalizedCategory)
      .order('created_at', { ascending: false })
      .limit(1);

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
