# backend.py
# Simple Flask server to proxy requests to OpenRouter API securely.
#
# Required libraries: Flask, requests, python-dotenv, Flask-Cors
# Install them using pip:
# pip install Flask requests python-dotenv Flask-Cors
#
# To run the server:
# python backend.py
#
# The server will run on http://127.0.0.1:5001 (or the port specified by the PORT env var)

import os
import requests
import json # Import json for parsing the response content
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS # Import CORS

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing frontend requests

# Configuration
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# Get API key from environment variable
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# Optional: Get site URL/name from environment variables or use placeholders
YOUR_SITE_URL = os.getenv("YOUR_SITE_URL", "http://localhost") # Replace with your actual site URL if deployed
YOUR_SITE_NAME = os.getenv("YOUR_SITE_NAME", "Learning App") # Replace with your actual site name

# Check if API key is loaded
if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "YOUR_API_KEY_HERE":
    print("ERROR: OPENROUTER_API_KEY not found or not set in .env file.")
    print("Please create a .env file and add your OpenRouter API key:")
    print("OPENROUTER_API_KEY=your_actual_key_here")
    # Optionally exit or handle this case as needed
    # exit(1) # Uncomment to exit if key is missing

@app.route('/api/generate-exercise', methods=['POST'])
def generate_exercise():
    """
    Endpoint to receive exercise generation requests from the frontend,
    call the OpenRouter API, and return the response.
    """
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "YOUR_API_KEY_HERE":
        return jsonify({"error": "API key not configured on the server."}), 500

    try:
        data = request.get_json()
        topic = data.get('topic')
        language = data.get('language', 'German') # Default to German if not provided

        if not topic:
            return jsonify({"error": "Missing 'topic' in request body"}), 400

        # The 'topic' variable now holds the user's full request, which could be a topic or a list of words.
        user_request_content = topic
        print(f"Received request: Content='{user_request_content}', Language='{language}'") # Server log

        # --- Construct the Prompt for OpenRouter ---
        # **UPDATED JSON FORMAT (No 'answers' list)**
        output_format_instructions = f"""
        Provide the response strictly in the following JSON format:
        {{
          "sentences": [
            {{ "id": 1, "text": "Sentence 1 with potentially <gap>multiple</gap> correct <gap>words</gap> missing." }},
            {{ "id": 2, "text": "Another sentence with <gap>a gap</gap>." }}
            // ... 8 to 12 sentences
          ],
          "word_bank": ["word1", "word2", "related_word", "distractor", ...] // A list of relevant words (base forms from gaps + other helpful/related words) judged by you to be useful for the user.
        }}
        IMPORTANT:
        - Inside EACH <gap> tag in the 'sentences', put the EXACT CORRECT word or phrase that should fill that specific gap in the sentence.
        - The 'word_bank' should contain words relevant to the exercise, including the BASE FORMS of words used in the gaps, and potentially other related vocabulary or distractors. Make a good judgment call on useful words for the user.
        """

        # **REVISED SYSTEM PROMPT (Multiple Gaps, AI Word Bank, No Answers List)**
        system_prompt = f"""
        You are an AI assistant specialized in creating language learning exercises in {language}.
        The user will provide input that is either a specific topic (e.g., 'past tense verbs', 'food vocabulary') OR a list of specific words/phrases they want to practice.

        Your task:
        1. Analyze the user's request: '{user_request_content}'.
        2. Determine if it's a topic or a list of words/phrases.
        3. Generate between 8 and 12 unique sentences in {language} based on the user's request.
           - If the request is a topic, create sentences relevant to that topic, focusing on common vocabulary or grammar associated with it.
           - If the request is a list of words/phrases, create sentences that naturally incorporate those words/phrases.
        4. For each sentence, identify one OR MORE words or short phrases that the user should fill in to practice the target language concept.
        5. Replace EACH missing word/phrase in the sentence with an XML tag containing the EXACT CORRECT word/phrase for that gap: <gap>correct_word</gap>.
           Example: "Ich <gap>habe</gap> das Buch <gap>gelesen</gap>."
        6. Generate a 'word_bank': Create a list of words relevant to the exercise. This list should include the BASE FORMS (e.g., infinitive, nominative singular) of the words used in the gaps, plus potentially other related vocabulary or common distractors that would be helpful for the learner. Use your judgment to create a useful word bank.

        Output Format:
        Structure your entire response as a single JSON object adhering strictly to the format below. Do not include any text outside this JSON structure. DO NOT include an 'answers' list.
        {output_format_instructions}
        """

        # User message now directly passes the user's input content
        user_message = user_request_content

        # --- Call OpenRouter API ---
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": YOUR_SITE_URL, # Optional
            "X-Title": YOUR_SITE_NAME      # Optional
        }

        payload = {
            "model": "anthropic/claude-3.7-sonnet", # Or choose another model like claude-3-opus for potentially better instruction following
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "response_format": {"type": "json_object"} # Request JSON output
        }

        print("Sending request to OpenRouter...") # Server log
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)

        print("Received response from OpenRouter.") # Server log
        api_response_data = response.json()

        # --- Extract and Validate the Content ---
        if 'choices' in api_response_data and len(api_response_data['choices']) > 0:
            message_content = api_response_data['choices'][0]['message']['content']
            # --- ADDED LOGGING ---
            print(f"--- Raw Content from OpenRouter ---")
            print(message_content)
            print(f"--- End Raw Content ---")
            # ---------------------
            try:
                exercise_data = json.loads(message_content)
                # Basic validation (Removed 'answers' check)
                if not all(k in exercise_data for k in ("sentences", "word_bank")):
                   raise ValueError("Missing required keys ('sentences', 'word_bank') in generated JSON")
                if not isinstance(exercise_data["sentences"], list) or not isinstance(exercise_data["word_bank"], list):
                    raise ValueError("Invalid type for sentences or word_bank")
                # Further validation could check sentence structure if needed
                print("Successfully parsed exercise data from OpenRouter response.") # Server log
                return jsonify(exercise_data)
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Error parsing JSON content from OpenRouter: {e}")
                print(f"Raw content received: {message_content}")
                return jsonify({"error": "Failed to parse exercise data from AI response.", "details": str(e)}), 500
        else:
            print("Unexpected response structure from OpenRouter:", api_response_data)
            return jsonify({"error": "Unexpected response structure from OpenRouter API."}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error calling OpenRouter API: {e}") # Server log
        return jsonify({"error": f"Failed to connect to OpenRouter API: {e}"}), 503 # Service Unavailable
    except Exception as e:
        print(f"An unexpected error occurred: {e}") # Server log
        return jsonify({"error": f"An internal server error occurred: {e}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting Flask server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True) # debug=True for development
