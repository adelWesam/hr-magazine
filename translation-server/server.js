const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const API_KEY = 'AIzaSyB_P241hzUD1d4Mu4n8EmENzjBOzUr1Es8'; // Replace with your API key

app.post('/translate', async (req, res) => {
  const { text, targetLanguage } = req.body;

  try {
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
      {
        q: text,
        target: targetLanguage,
      }
    );
    res.json({ translatedText: response.data.data.translations[0].translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});