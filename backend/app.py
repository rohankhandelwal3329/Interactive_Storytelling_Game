from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
import os
from dotenv import load_dotenv
import random
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
client = genai.Client(api_key=os.getenv('GOOGLE_API_KEY'))

# Story session storage
story_sessions = {}

def split_into_segments(story):
    sentences = story.split('. ')
    segments = []
    segment_size = max(1, len(sentences) // 5)
    
    for i in range(0, len(sentences), segment_size):
        segment = '. '.join(sentences[i:i+segment_size]) + '.'
        segments.append(segment)
        if len(segments) == 5:
            break
            
    while len(segments) < 5:
        segments.append(segments[-1])
        
    return segments[:5]

def generate_question(text):
    try:
        question_types = ['mcq', 'fill_blank', 'one_word', 'true_false']
        selected_type = random.choice(question_types)

        prompts = {
            'mcq': f"""Analyze this story segment: '{text}'
            Generate a multiple choice question about SPECIFIC DETAILS from this segment.
            Question must be answerable ONLY using this text.
            Provide 4 options with ONE CLEAR CORRECT ANSWER.
            JSON format: {{"question": "...", "options": ["...", ...], "correct_answer": "..."}}""",
            
            'fill_blank': f"""Using EXACTLY this text: '{text}'
            Create fill-in-the-blank using a DIRECT QUOTE from the text.
            Replace one KEY WORD with blank.
            JSON format: {{"question": "... ___ ...", "correct_answer": "..."}}""",
            
            'one_word': f"""From this text: '{text}'
            Create question answerable with ONE WORD from the text.
            Focus on CONCRETE DETAILS.
            JSON format: {{"question": "...", "correct_answer": "..."}}""",
            
            'true_false': f"""Based on this text: '{text}'
            Create true/false statement about SPECIFIC EVENT.
            Must be DIRECTLY VERIFIABLE.
            JSON format: {{"question": "...", "correct_answer": "true/false"}}"""
        }

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompts[selected_type]
        )

        raw_text = response.text.replace('```json', '').replace('```', '').strip()
        question_data = json.loads(raw_text)
        question_data['type'] = selected_type

        # Validate response
        if selected_type == 'mcq':
            if len(question_data.get('options', [])) != 4:
                raise ValueError("Invalid options count")
            if question_data['correct_answer'] not in question_data['options']:
                raise ValueError("Correct answer not in options")
        else:
            if not isinstance(question_data.get('correct_answer'), str):
                raise ValueError("Invalid answer format")

        return {
            'type': selected_type,
            'question': question_data['question'],
            'options': question_data.get('options', []),
            'correct_answer': str(question_data['correct_answer']).lower()
        }

    except Exception as e:
        print(f"Question error: {str(e)}")
        return {
            'type': 'mcq',
            'question': f"What key detail was mentioned in this segment?",
            'options': ["Character action", "Location detail", 
                       "Specific object", "Important event"],
            'correct_answer': random.choice(["Character action", "Location detail",
                                           "Specific object", "Important event"])
        }

@app.route('/api/generation-status/<session_id>', methods=['GET'])
def check_generation_status(session_id):
    if session_id in story_sessions:
        return jsonify(story_sessions[session_id].get('generation_status', {}))
    return jsonify({'status': 'not_found'}), 404

@app.route('/api/start-story', methods=['POST'])
def start_story():
    try:
        data = request.json
        category = data.get('category', '')
        is_custom = data.get('is_custom', False)
        
        category_prompts = {
            'Horror': 'Write a scary horror story, Ensure it has clear narrative structure, with no subheadings.',
            'Adventurous': 'Write an adventure story, Ensure it has clear narrative structure, with no subheadings',
            'Funny': 'Write a funny story, Ensure it has clear narrative structure, with no subheadings.',
            'Romantic': 'Write a romantic story, Ensure it has clear narrative structure, with no subheadings',
            'Dramatic': 'Write a dramatic story, Ensure it has clear narrative structure, with no subheadings'
        }

        if is_custom:
            prompt = f"Write a compelling {category} story. Ensure it has clear narrative structure, with no subheadings."
        else:
            prompt = category_prompts.get(category, 'Write a story.')
        
        session_id = str(random.randint(1000, 9999))
        story_sessions[session_id] = {
            'generation_status': {'status': 'generating', 'progress': 0}
        }

        # Generate story
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        full_story = response.text
        story_segments = split_into_segments(full_story)

        story_sessions[session_id] = {
            'category': category,
            'current_segment': 0,
            'story_segments': story_segments,
            'attempts_left': 3,
            'questions_asked': 0,
            'current_question': None,
            'show_question': False,
            'generation_status': {'status': 'complete', 'progress': 100}
        }

        return jsonify({
            'session_id': session_id,
            'story_segment': story_segments[0],
            'show_question': False,
            'attempts_left': 3
        })

    except Exception as e:
        print(f"Start error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/show-question', methods=['POST'])
def show_question():
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if session_id not in story_sessions:
            return jsonify({'error': 'Invalid session'}), 400
            
        session = story_sessions[session_id]
        current_text = session['story_segments'][session['current_segment']]
        
        question_data = generate_question(current_text)
        session['current_question'] = question_data
        session['show_question'] = True
        session['questions_asked'] += 1
        
        return jsonify({
            'question': question_data['question'],
            'question_type': question_data['type'],
            'options': question_data.get('options', []),
            'attempts_left': session['attempts_left']
        })

    except Exception as e:
        print(f"Question show error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/answer-question', methods=['POST'])
def check_answer():
    try:
        data = request.json
        session_id = data.get('session_id')
        user_answer = data.get('answer', '').lower()
        
        session = story_sessions[session_id]
        correct = session['current_question']['correct_answer'].lower()
        
        is_correct = user_answer == correct
        session['attempts_left'] = max(0, session['attempts_left'] - 1)

        response_data = {
            'correct': is_correct,
            'attempts_left': session['attempts_left'],
            'can_proceed': False,
            'message': ''
        }

        if is_correct:
            response_data['message'] = 'Correct answer!'
            response_data['can_proceed'] = True
        elif session['attempts_left'] <= 0:
            response_data['message'] = f'Out of attempts. The correct answer was: {correct}'
            response_data['can_proceed'] = True
        else:
            response_data['message'] = f'Incorrect. You have {session["attempts_left"]} attempts left.'
        
        return jsonify(response_data)

    except Exception as e:
        print(f"Answer error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/next-segment', methods=['POST'])
def next_segment():
    try:
        data = request.json
        session_id = data.get('session_id')
        
        session = story_sessions[session_id]
        session['current_segment'] += 1
        
        if session['current_segment'] >= len(session['story_segments']):
            return jsonify({'story_complete': True})
        
        next_seg = session['story_segments'][session['current_segment']]
        session['attempts_left'] = 3
        session['show_question'] = False
        
        return jsonify({
            'story_segment': next_seg,
            'attempts_left': 3,
            'questions_remaining': 5 - session['current_segment']
        })

    except Exception as e:
        print(f"Next segment error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/')
def home():
    return jsonify({"message": "Story Generator API"})

if __name__ == '__main__':
    app.run(debug=True)