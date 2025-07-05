# 🎙️ Speech Notes

A modern web application that allows users to record voice notes with automatic speech-to-text transcription. Built with Flask and modern web APIs, it captures both audio recordings and text transcriptions for a complete note-taking experience.

## ✨ Features

- **Voice Recording**: Record audio directly in your browser
- **Speech-to-Text**: Automatic transcription using Web Speech API
- **Dual Storage**: Save both audio and text versions of your notes
- **Real-time Transcription**: See text appear as you speak
- **Modern UI**: Beautiful glassmorphism design with smooth animations
- **Keyboard Shortcuts**: Quick access to recording functions
- **Audio Playback**: Play back original recordings
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Python 3.7 or higher
- Modern web browser with microphone access
- Flask

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd speech-notes
```

2. Install dependencies:
```bash
pip install flask
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to:
```
http://localhost:5000
```

## 📖 Usage

### Recording a Note

1. **Grant Permissions**: Allow microphone access when prompted
2. **Start Recording**: Click "🎤 Start Recording" or press `Ctrl+R`
3. **Speak**: Your speech will be transcribed in real-time
4. **Stop Recording**: Click "🛑 Stop Recording" or press `Escape`
5. **Save**: Click "💾 Save Note" or press `Ctrl+S`

### Keyboard Shortcuts

- `Ctrl+R` (or `Cmd+R` on Mac): Start recording
- `Ctrl+S` (or `Cmd+S` on Mac): Save note
- `Escape`: Stop recording

### Manual Notes

You can also type notes directly in the textarea and save them without recording.

## 🏗️ Project Structure

```
speech-notes/
├── app.py                 # Flask backend server
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── css/
│   │   └── styles.css    # Styling and animations
│   └── js/
│       └── script.js     # Frontend logic and API interactions
└── README.md             # This file
```

## 🛠️ Technical Details

### Backend (Flask)

- **Framework**: Flask web framework
- **Storage**: In-memory storage (notes stored in Python list)
- **API Endpoints**:
  - `GET /`: Serve main page with notes list
  - `POST /save_note`: Save new note with text and audio data

### Frontend

- **Speech Recognition**: Web Speech API for real-time transcription
- **Audio Recording**: MediaRecorder API for capturing audio
- **Audio Format**: WebM format with base64 encoding for storage
- **Styling**: Modern CSS with glassmorphism effects and animations

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Speech Recognition | ✅ | ❌ | ❌ | ✅ |
| Audio Recording | ✅ | ✅ | ✅ | ✅ |
| Basic Functionality | ✅ | ✅ | ✅ | ✅ |

**Note**: Speech recognition works best in Chrome and Edge browsers.

## 🔧 Configuration

### Speech Recognition Settings

You can modify speech recognition settings in `static/js/script.js`:

```javascript
recognition.continuous = true;      // Keep listening
recognition.interimResults = true;  // Show interim results
recognition.lang = 'en-US';        // Language setting
```

### Supported Languages

Change the `recognition.lang` property to support different languages:
- `'en-US'` - English (US)
- `'en-GB'` - English (UK)
- `'es-ES'` - Spanish (Spain)
- `'fr-FR'` - French (France)
- `'de-DE'` - German (Germany)
- And many more...

## 🚨 Limitations

- **Storage**: Notes are stored in memory and will be lost when the server restarts
- **Audio Size**: Large audio files may impact performance
- **Browser Support**: Speech recognition limited to Chromium-based browsers
- **Network**: Requires internet connection for speech recognition to work

## 🔮 Future Enhancements

- [ ] **Database Integration**: Add SQLite/PostgreSQL for persistent storage
- [ ] **File Storage**: Save audio files to disk instead of base64
- [ ] **User Authentication**: Add user accounts and private notes
- [ ] **Search Functionality**: Search through saved notes
- [ ] **Export Options**: Export notes as text or audio files
- [ ] **Note Categories**: Organize notes with tags or categories
- [ ] **Cloud Storage**: Integration with cloud storage services
- [ ] **Mobile App**: Native mobile application
- [ ] **Offline Support**: Work without internet connection

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Troubleshooting

### Common Issues

**Microphone Access Denied**
- Check browser permissions for microphone access
- Ensure you're using HTTPS in production (required for microphone access)

**Speech Recognition Not Working**
- Try using Chrome or Edge browser
- Check your internet connection
- Ensure microphone is working properly

**Audio Not Playing**
- Check if your browser supports WebM audio format
- Verify audio controls are enabled

**Notes Not Saving**
- Check browser console for JavaScript errors
- Ensure Flask server is running
- Verify network connection

### Debug Mode

Run the application in debug mode for detailed error messages:

```bash
python app.py
```

Debug mode is enabled by default in the provided code.

## 💡 Tips

- Speak clearly and at a moderate pace for better transcription accuracy
- Use a quiet environment for better audio quality
- The app works best with a good quality microphone
- You can edit the transcribed text before saving
- Audio recordings are automatically included when available

---

**Built with ❤️ using Flask, Web Speech API, and modern web technologies**
