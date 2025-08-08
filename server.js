const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const KATRINA_VOICE_ID = 'BZgkqPqms7Kj9ulSkVzn'; // Eve

app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${KATRINA_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    const audioBuffer = await response.buffer();
    const base64Audio = audioBuffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
    res.json({ audioUrl });

  } catch (err) {
    console.error('TTS Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch audio from ElevenLabs' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Katrina voice server running on port ${PORT}`);
});
