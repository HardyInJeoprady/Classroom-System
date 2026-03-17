import eventlet
eventlet.monkey_patch()

import sqlite3
from flask import Flask, render_template, request, redirect, make_response, session, jsonify, send_from_directory
import uuid
from datetime import datetime, timedelta
import hashlib
from flask_socketio import SocketIO, emit
import os
from werkzeug.utils import secure_filename 

app = Flask(__name__)
app.secret_key = "my_secret_key"
socketio = SocketIO(app)
active_students = {}

UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok = True)

def init_db():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS students (
                   id INTEGER PRIMARY KEY AUTOINCREMENT, 
                   uuid TEXT UNIQUE,
                   name TEXT,
                   last_active TIMESTAMP)
                   """)
    
    cursor.execute("""CREATE TABLE IF NOT EXISTS messages 
                   (id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT, timestamp TEXT)""")
    
    cursor.execute("""CREATE TABLE IF NOT EXISTS teachers (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   username TEXT UNIQUE,
                   password TEXT)""")
    
    cursor.execute("SELECT * FROM teachers WHERE username = ?", ("admin",))
    if not cursor.fetchone():
        hashed_password = hashlib.sha256("admin123".encode()).hexdigest()

        cursor.execute("INSERT INTO teachers (username, password) VALUES (?, ?)", ("admin", hashed_password))
        

    conn.commit()
    conn.close()

@app.route("/")
def home():
    return render_template("index.html")    

@app.route("/join-page")
def join_page():
    student_uuid = request.cookies.get("student_uuid")

    if student_uuid:
        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()

        cursor.execute("SELECT id, name FROM students WHERE uuid = ?", (student_uuid,))
        student = cursor.fetchone()

        if student:
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute("UPDATE students SET last_active = ? WHERE uuid = ?", (current_time, student_uuid))
            conn.commit()
            conn.close()
            return render_template("success.html", name=student[1])
        
        conn.close()  
    
    return render_template("join.html")
@app.route("/join", methods=["POST"])
def join():
    student_name = request.form.get("name")

    if not student_name:
        return redirect("/")

    existing_uuid = request.cookies.get("student_uuid")

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    # If student already exists, don't create another
    if existing_uuid:
        cursor.execute("SELECT id, name FROM students WHERE uuid = ?", (existing_uuid,))
        student = cursor.fetchone()

        if student:
            conn.close()
            return render_template("success.html", name=student[1])

    student_uuid = str(uuid.uuid4())
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute(
        "INSERT INTO students (uuid, name, last_active) VALUES (?, ?, ?)",
        (student_uuid, student_name, current_time)
    )

    conn.commit()

    student_id = cursor.lastrowid
    session['student_id'] = student_id
    session["role"] = "student"
    session["user_id"] = student_id

    conn.close()

    response = make_response(render_template("success.html", name=student_name))
    response.set_cookie("student_uuid", student_uuid)

    return response

@app.route("/ping", methods=["POST"])
def ping():
    student_uuid = request.cookies.get("student_uuid")
    print(f"Ping received - UUID: {student_uuid}")  # add this
    if not student_uuid:
        return jsonify({"error": "No UUID"}), 400

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE students SET last_active = ? WHERE uuid = ?",
        (current_time, student_uuid)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route("/teacher")
def teacher():
    if not session.get("teacher_logged_in"): return redirect("/teacher-login")
    return render_template("teacher.html")

@app.route("/teacher-data")
def teacher_data():
    if not session.get("teacher_logged_in"): return jsonify({"error": "Unauthorized"}), 403

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, last_active FROM students")
    students = cursor.fetchall()

    conn.close()

    now = datetime.now()
    result = []

    for student in students:
        student_id, name, last_active_str = student
        if last_active_str:
            try:
               last_active_time = datetime.strptime(last_active_str, "%Y-%m-%d %H:%M:%S")
               status = "ACTIVE" if (now - last_active_time).total_seconds() <= 10 else "INACTIVE"
            except ValueError:
                status = "INACTIVE"           
        else:
           status = "INACTIVE"

        result.append({
            "id": student_id,
            "name": name,
            "last_active": last_active_str,
            "status": status
        })

    return jsonify(result)
    

@app.route("/broadcast", methods=["POST"])
def broadcast():
    if not session.get("teacher_logged_in"): return redirect("/teacher-login")

    message = request.form.get("message")
    file = request.files.get("file")

    file_url = None
    if file and file.filename != "":
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)

        file_url = "/uploads/" + filename

    socketio.emit("broadcast", {
        "message": message,
        "file": file_url
    })

    if not message and not file:
        return redirect("/teacher")
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO messages (content, timestamp) VALUES (?, ?)", (message, current_time)
    )
    conn.commit()

    socketio.emit("new_message", {"message": message})

    conn.close()

    return redirect("/teacher")

@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/student-data")
def students_data():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute("SELECT content FROM messages ORDER BY id DESC LIMIT 1")
    message = cursor.fetchone()
    conn.close()

    if message:
        return jsonify({"message": message[0]})
    else:
        return jsonify({"message": ""})
    
    
@app.route("/teacher-login", methods =["GET", "POST"])
def teacher_login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        session["teacher_logged_in"] = True
        conn = sqlite3.connect("database.db")
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM teachers WHERE username = ? AND password = ?", (username, hashed_password))
        teacher = cursor.fetchone()

        if teacher:

            cursor.execute("DELETE FROM students")
            cursor.execute("DELETE FROM sqlite_sequence WHERE name = 'students'")
            conn.commit()
            active_students.clear()

            session["teacher_logged_in"] = True
            conn.close()
           
            return redirect("/teacher")
        conn.close()
        return "Invalid Credentials"
    return render_template("teacher_login.html")    

@app.route("/teacher-logout")
def teacher_logout():
    session.pop("teacher_logged_in", None)
    return redirect("/teacher-login")


@socketio.on('connect')
def handle_connect():
    role = session.get("role")
    user_id = session.get("user_id")

    if role == "student":
        active_students[user_id] = request.sid
        print("student connected:", user_id)

        emit("active_students_update", 
             list(active_students.keys()),
             broadcast=True)


@socketio.on("disconnect")
def handle_disconnect():
    for user_id, sid in list(active_students.items()):
        if sid == request.sid:
            del active_students[user_id]
            print("student_disconnected:", user_id)
            break

    emit("active_students_update", list(active_students.keys()), broadcast=True)

if __name__ == "__main__":
    init_db()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)