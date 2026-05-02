from flask import Flask, render_template, request, redirect, url_for, jsonify
import os
import requests
from supabase import create_client, Client

app = Flask(__name__, template_folder='../templates', static_folder='../static')

# --- CONFIGURATION ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_db():
    if not supabase:
        print("WARNING: Supabase credentials missing.")
        return None
    return supabase

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/preview', methods=['POST'])
def preview():
    data = request.form.to_dict()
    return render_template('preview.html', data=data)

@app.route('/final_submit', methods=['POST'])
def final_submit():
    d = request.form
    db = get_db()
    if not db:
        return redirect(url_for('index', status='config_error'))
    
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
            "qualification": d.get('qualification')
        }
        db.table("members").insert(data).execute()
        status = 'success'
    except Exception as e:
        print(f"Supabase Insert Error: {e}")
        status = 'error'
    
    return redirect(url_for('index', status=status))

@app.route('/api/directory')
def get_directory():
    db = get_db()
    if not db: return jsonify([])
    try:
        response = db.table("members").select("full_name, occupation, district, qualification, bio").order("full_name").execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"Supabase Fetch Error: {e}")
        return jsonify([])

@app.route('/api/admin_all')
def get_admin_all():
    db = get_db()
    if not db: return jsonify([])
    try:
        response = db.table("members").select("*").order("id", desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"Supabase Admin Fetch Error: {e}")
        return jsonify([])

@app.route('/api/delete/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    db = get_db()
    if not db: return jsonify({"status": "error"})
    try:
        db.table("members").delete().eq("id", member_id).execute()
        return jsonify({"status": "deleted"})
    except Exception as e:
        print(f"Supabase Delete Error: {e}")
        return jsonify({"status": "error"})

if __name__ == '__main__':
    app.run(debug=True)

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