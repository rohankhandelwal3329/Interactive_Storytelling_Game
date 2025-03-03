# Interactive Storytelling Game 📚

An engaging web-based interactive storytelling experience where users can participate in story development through questions and answers.

## 🌟 Features

- Multiple story categories (Horror, Adventure, Funny, Romantic, Dramatic)
- AI-generated unique stories
- Interactive Q&A segments
- Different question types (Multiple Choice, Fill in the Blank, One Word, True/False)
- Progress tracking
- Real-time feedback
- Story completion rewards

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js and npm
- Google API key for Gemini

### Installation

1. Clone the repository:
```bash
git clone [https://github.com/rohankhandelwal3329/Interactive_Storytelling_Game]
cd Interactive-Storytelling-Game
```

2. Set up the backend:
```bash
cd backend
pip install -r requirements.txt
```

3. Create a `.env` file in the backend directory and add your Google API key:
```
GOOGLE_API_KEY=your_api_key_here
```

4. Set up the frontend:
```bash
cd ../frontend
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd backend
python app.py
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## 🎮 How to Play

1. Select a story category from the available options
2. Read each segment of the story as it unfolds
3. Answer questions about the story:
   - You have 3 attempts for each question
   - Different question types will test your comprehension
   - Correct answers progress the story
   - Skip option available after two failed attempts

## 🛠️ Technologies Used

### Backend
- Flask (Python web framework)
- Google Gemini AI (Story and question generation)
- Flask-CORS (Cross-origin resource sharing)

### Frontend
- React.js
- CSS3 for styling
- Fetch API for backend communication

## 📝 Contributing

Feel free to fork this repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.

## 🔑 API Key Setup

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add the key to your `.env` file

## ⚠️ Important Notes

- Keep your API key private
- The application requires an active internet connection
- Story generation might take a few seconds
- Questions are generated based on story context

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Acknowledgments

- Google Gemini AI for story generation
- React.js community
- Flask framework contributors
