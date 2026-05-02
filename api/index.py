from flask import Flask, render_template, request, redirect, url_for, jsonify
import sqlite3
import os
import requests


app = Flask(__name__, template_folder='../templates', static_folder='../static')
DATABASE = '/tmp/database.db' if os.environ.get('VERCEL') else 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database and ensures all columns exist."""
    conn = get_db_connection()
    # Create table if it doesn't exist
    conn.execute('''
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            gender TEXT,
            marital_status TEXT,
            contact TEXT,
            email TEXT,
            occupation TEXT,
            qualification TEXT,
            district TEXT,
            bio TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Check for missing columns (Migration safety)
    cursor = conn.execute('PRAGMA table_info(members)')
    existing_columns = [column[1] for column in cursor.fetchall()]
    
    required_columns = ['gender', 'marital_status', 'email', 'qualification', 'district', 'bio']
    for col in required_columns:
        if col not in existing_columns:
            conn.execute(f'ALTER TABLE members ADD COLUMN {col} TEXT')
            print(f"Added missing column: {col}")
            
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/preview', methods=['POST'])
def preview():
    """Displays data before final saving."""
    data = request.form.to_dict()
    # Note: You need a preview.html template that submits to /final_submit
    return render_template('preview.html', data=data)

@app.route('/final_submit', methods=['POST'])
def final_submit():
    """Saves the form data to the database."""
    d = request.form
    conn = get_db_connection()
    try:
        conn.execute('''INSERT INTO members (
            full_name, gender, marital_status, contact, 
            email, occupation, district, bio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (
            d.get('full_name'), d.get('gender'), d.get('marital_status'), 
            d.get('contact'), d.get('email'), d.get('occupation'), 
            d.get('district'), d.get('bio')
        ))
        conn.commit()
        status = 'success'
    except Exception as e:
        print(f"Error during save: {e}")
        status = 'error'
    finally:
        conn.close()
    
    return redirect(url_for('index', status=status))

# --- API FOR DIRECTORY (PUBLIC VIEW) ---
@app.route('/api/directory')
def get_directory():
    conn = get_db_connection()
    # We select specific info to keep contact/email private
    members = conn.execute('''
        SELECT full_name, occupation, district, qualification, bio 
        FROM members 
        ORDER BY full_name ASC
    ''').fetchall()
    conn.close()
    return jsonify([dict(m) for m in members])

# --- API FOR ADMIN (FULL VIEW) ---
@app.route('/api/admin_all')
def get_admin_all():
    conn = get_db_connection()
    members = conn.execute('SELECT * FROM members ORDER BY id DESC').fetchall()
    conn.close()
    return jsonify([dict(m) for m in members])

@app.route('/api/delete/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM members WHERE id = ?', (member_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "deleted"})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)

    # Replace with your actual Gemini API Key
@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    try:
        data = request.json
        user_message = data.get('message')
        
        # Verify the API Key is loaded
        if not GEMINI_API_KEY or GEMINI_API_KEY == "AIzaSyAGoHvkcRL_95UHTD4Wyx3KDqcd36AxxCQ":
            return jsonify({"reply": "Error: API Key is missing on the server."}), 500

        # The correct endpoint for Gemini 1.5 Flash
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        # The payload MUST follow this nested structure
        payload = {
            "contents": [{
                "parts": [{"text": user_message}]
            }]
        }
        
        response = requests.post(url, json=payload)
        response_data = response.json()

        # Debug: Print this to your terminal to see the real error from Google
        print(response_data) 

        if response.status_code == 200:
            ai_text = response_data['candidates'][0]['content']['parts'][0]['text']
            return jsonify({"reply": ai_text})
        else:
            # This captures errors like "API_KEY_INVALID"
            error_msg = response_data.get('error', {}).get('message', 'Unknown API Error')
            return jsonify({"reply": f"Google API Error: {error_msg}"}), response.status_code

    except Exception as e:
        print(f"System Error: {e}")
        return jsonify({"reply": "I couldn't process that. Please check your console."}), 500