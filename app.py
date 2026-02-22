import sqlite3
from flask import Flask, render_template, request, redirect, make_response, session, jsonify
import uuid
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = "my_secret_key"

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
    
    cursor.execute("""CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, timestamp TEXT)""")

    conn.commit()
    conn.close()

@app.route("/")
def home():
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
    
    student_uuid = str(uuid.uuid4())
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO students (uuid, name, last_active) VALUES (?, ?, ?)", (student_uuid, student_name, current_time)
    )
    conn.commit()

    student_id = cursor.lastrowid
    session['student_id'] = student_id
    conn.close()

    response = make_response(render_template("success.html", name = student_name))
    response.set_cookie("student_uuid", student_uuid)

    return response

@app.route("/teacher")
def teacher():
    return render_template("teacher.html")

@app.route("/teacher-data")
def teacher_data():
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
    message = request.form.get("message")
    if not message:
        return redirect("/teacher")
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO messages (content, timestamp) VALUES (?, ?)", (message, current_time)
    )
    conn.commit()
    conn.close()

    return redirect("/teacher")

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

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
