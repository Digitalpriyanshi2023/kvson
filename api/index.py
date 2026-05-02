from flask import Flask, render_template, request, redirect, url_for, jsonify
import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'))

app = Flask(__name__, 
            template_folder=os.path.join(BASE_DIR, 'templates'), 
            static_folder=os.path.join(BASE_DIR, 'static'))

# --- CONFIGURATION ---
print(f"DEBUG: BASE_DIR is {BASE_DIR}")
print(f"DEBUG: .env path is {os.path.join(BASE_DIR, '.env')}")
print(f"DEBUG: .env exists: {os.path.exists(os.path.join(BASE_DIR, '.env'))}")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

print(f"DEBUG: SUPABASE_URL present: {bool(SUPABASE_URL)}")
print(f"DEBUG: SUPABASE_KEY present: {bool(SUPABASE_KEY)}")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("DEBUG: Supabase client initialized successfully.")
    except Exception as e:
        print(f"DEBUG: Supabase client initialization FAILED: {e}")

def get_db():
    if not supabase:
        print("CRITICAL: Supabase client is NONE. Check your Environment Variables.")
        return None
    return supabase

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/preview', methods=['POST'])
def preview():
    data = request.form.to_dict()
    return render_template('preview.html', data=data)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    db = get_db()
    if not db: return jsonify({"error": "Config Error"}), 500
    try:
        response = db.table("members").select("*").eq("email", email).eq("password", password).execute()
        if response.data:
            return jsonify(response.data[0])
        return jsonify({"error": "Invalid Credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/final_submit', methods=['POST'])
def final_submit():
    d = request.form
    db = get_db()
    if not db: return redirect(url_for('index', status='config_error'))
    try:
        data = {
            "full_name": d.get('full_name'),
            "gender": d.get('gender'),
            "marital_status": d.get('marital_status'),
            "contact": d.get('contact'),
            "email": d.get('email'),
            "occupation": d.get('occupation'),
            "district": d.get('district'),
            "bio": d.get('bio'),
            "password": d.get('password'),
            "role": "user"
        }
        print(f"Attempting to insert into Supabase: {data}")
        response = db.table("members").insert(data).execute()
        print(f"Supabase Response: {response}")
        status = 'success'
    except Exception as e:
        print(f"CRITICAL: Supabase Insert Error: {e}")
        status = 'error'
    return redirect(url_for('index', status=status))

@app.route('/api/update_role', methods=['POST'])
def update_role():
    data = request.json
    member_id = data.get('id')
    new_role = data.get('role')
    db = get_db()
    if not db: return jsonify({"status": "error"}), 500
    try:
        db.table("members").update({"role": new_role}).eq("id", member_id).execute()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error"}), 500

@app.route('/api/directory')
def get_directory():
    db = get_db()
    if not db: return jsonify([])
    try:
        response = db.table("members").select("full_name, occupation, district, role, bio").order("full_name").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify([])

@app.route('/api/admin_all')
def get_admin_all():
    db = get_db()
    if not db: return jsonify([])
    try:
        response = db.table("members").select("*").order("id", desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify([])

@app.route('/api/delete/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    db = get_db()
    if not db: return jsonify({"status": "error"})
    try:
        db.table("members").delete().eq("id", member_id).execute()
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"status": "error"})

@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    try:
        data = request.json
        user_message = data.get('message')
        if not GEMINI_API_KEY:
            return jsonify({"reply": "Error: API Key is missing."}), 500
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": user_message}]}]}
        response = requests.post(url, json=payload)
        response_data = response.json()
        if response.status_code == 200:
            ai_text = response_data['candidates'][0]['content']['parts'][0]['text']
            return jsonify({"reply": ai_text})
        else:
            error_msg = response_data.get('error', {}).get('message', 'Unknown API Error')
            return jsonify({"reply": f"Google API Error: {error_msg}"}), response.status_code
    except Exception as e:
        return jsonify({"reply": "System Error"}), 500

if __name__ == '__main__':
    app.run(debug=True)