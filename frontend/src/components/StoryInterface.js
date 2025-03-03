import React, { useState } from 'react';
import './StoryInterface.css';

function StoryInterface() {
  const [story, setStory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [gameState, setGameState] = useState('category');
  const [showQuestion, setShowQuestion] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [canProceed, setCanProceed] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const categories = ['Horror', 'Adventurous', 'Funny', 'Romantic', 'Dramatic', 'Other'];

  const progressStory = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/show-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();
      setCurrentQuestion(data);
      setShowQuestion(true);
      setUserAnswer('');
      setCanProceed(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startStory = async () => {
    setIsLoading(true);
    setIsGenerating(true);
    try {

      const finalCategory = selectedCategory === 'Other' 
        ? customCategory 
        : selectedCategory;
      const response = await fetch('http://localhost:5000/api/start-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: finalCategory, is_custom: selectedCategory === 'Other'  }),
      });
      const data = await response.json();
      const sid = data.session_id;

      const checkStatus = setInterval(async () => {
        const statusResponse = await fetch(`http://localhost:5000/api/generation-status/${sid}`);
        const statusData = await statusResponse.json();
        setGenerationProgress(statusData.progress);

        if (['complete', 'error'].includes(statusData.status)) {
          clearInterval(checkStatus);
          if (statusData.status === 'complete') {
            setSessionId(sid);
            setStory(data.story_segment);
            setGameState('story');
          }
          setIsGenerating(false);
          setIsLoading(false);
        }
      }, 1000);
    } catch (error) {
      console.error('Error:', error);
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const handleProceed = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/next-segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await response.json();

      if (data.story_complete) {
        setStory(data.final_story || '');
        setIsComplete(true);
      } else {
        setStory(prev => prev + '\n\n' + (data.story_segment || ''));
        setAttemptsLeft(3);
        setShowQuestion(false);
      }
      setCanProceed(false);
      setUserAnswer('');
      setAnswerFeedback(null);
    } catch (error) {
      console.error('Error:', error);
    }
    setIsGenerating(false);
  };

  const submitAnswer = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/answer-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          answer: userAnswer,
        }),
      });
      const data = await response.json();

      setAnswerFeedback({
        correct: data.correct,
        message: data.message,
      });

      setAttemptsLeft(data.attempts_left);
      setCanProceed(data.can_proceed);
      
      if (!data.can_proceed) setUserAnswer('');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.question_type) {
      case 'mcq':
        return (
          <div className="question-container">
            <h4>{currentQuestion.question}</h4>
            <div className="options-container">
              {currentQuestion.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setUserAnswer(option)}
                  className={`option-button ${userAnswer === option ? 'selected' : ''}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        );

      case 'fill_blank':
      case 'one_word':
        return (
          <div className="question-container">
            <h4>{currentQuestion.question}</h4>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Your answer..."
              className="answer-input"
              disabled={canProceed}
            />
          </div>
        );

        case 'true_false':
          return (
            <div className="question-container">
              <h4>{currentQuestion.question}</h4>
              <div className="true-false-buttons">
                <button
                  onClick={() => setUserAnswer('true')}
                  className={`tf-button ${userAnswer === 'true' ? 'selected' : ''}`}
                >
                  True
                </button>
                <button
                  onClick={() => setUserAnswer('false')}
                  className={`tf-button ${userAnswer === 'false' ? 'selected' : ''}`}
                >
                  False
                </button>
              </div>
            </div>
          );

      default:
        return null;
    }
  };

  return (
    <div className="story-interface">
      <h1>Interactive Storytelling Game</h1>
      <h2>You choose the category, We generate the interactive story :)</h2>
      
      {gameState === 'category' && (
        <div className="category-selection">
          <h3>Select a Story Category:</h3>
          <div className="category-buttons">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-button ${selectedCategory === category ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          {selectedCategory === 'Other' && (
            <div className="custom-category-input">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter your custom category (e.g. Sci-Fi, Mystery)"
              />
            </div>
          )}
          <button
            onClick={startStory}
            disabled={isLoading || !selectedCategory || (selectedCategory === 'Other' && !customCategory.trim())}
            className="start-button"
          >
            {isLoading ? 'Starting Story...' : 'Start Story'}
          </button>
        </div>
      )}

      {gameState === 'story' && (
        <div className="story-container">
          {isGenerating ? (
            <div className="loading-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <p>Generating your story... {generationProgress}%</p>
            </div>
          ) : (
            <>
              <div className="story-text">
                <h3>{selectedCategory} Story</h3>
                <p>{story}</p>
              </div>

              {isComplete ? (
                <div className="completion-message">
                  <h3>Well Done! You have Completed the Story!</h3>
                  <div className="full-story-content">
                    {(story || '')  // Add fallback for empty story
                      .split('\n\n')
                      .map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setGameState('category');
                      setSelectedCategory('');
                      setStory('');
                      setIsComplete(false);
                    }}
                    className="restart-button"
                  >
                    Start New Story
                  </button>
                </div>
              ) : showQuestion ? (
                <div className="interaction-section">
                  {renderQuestion()}
                  {answerFeedback && (
                    <div className={`feedback ${answerFeedback.correct ? 'correct' : 'incorrect'}`}>
                      {answerFeedback.message}
                    </div>
                  )}
                  <div className="controls">
                    <p>Attempts remaining: {attemptsLeft}</p>
                    <div className="button-group">
                      {canProceed ? (
                        <button
                          onClick={handleProceed}
                          className="proceed-button"
                        >
                          Proceed Now
                        </button>
                      ) : (
                        <button
                          onClick={submitAnswer}
                          disabled={!userAnswer || attemptsLeft <= 0}
                          className="submit-button"
                        >
                          {attemptsLeft > 0 ? 'Submit Answer' : 'Out of Attempts'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={progressStory}
                  className="progress-button"
                >
                  Continue Story
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default StoryInterface;