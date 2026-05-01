# ClassControl - Smart Classroom System

A modern, real-time classroom management system built with Flask and SocketIO that enables seamless communication between teachers and students.

## Features

### For Students
- **Easy Join**: Students can join the classroom by simply entering their name
- **Real-time Attendance**: Automatic tracking of student presence with UUID-based identification
- **Live Updates**: Receive real-time messages and file broadcasts from teachers
- **Persistent Sessions**: Students remain logged in across browser sessions

### For Teachers
- **Secure Login**: Teacher authentication system with hashed passwords
- **Live Monitoring**: Real-time view of all active students in the classroom
- **Broadcast System**: Send messages and files to all students instantly
- **File Management**: Upload and share files with the entire class
- **Classroom Control**: Reset student data when starting new sessions

### Technical Features
- **Real-time Communication**: WebSocket-based instant messaging using Flask-SocketIO
- **File Uploads**: Secure file handling with automatic naming conflict resolution
- **Database Persistence**: SQLite database for storing students, messages, and teacher accounts
- **Responsive Design**: Modern, mobile-friendly interface with animations
- **Session Management**: Secure cookie-based student identification

## Technology Stack

- **Backend**: Python Flask
- **Real-time Communication**: Flask-SocketIO with Eventlet
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript
- **UI Framework**: Custom responsive design with BoxIcons

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HardyInJeoprady/Classroom-System.git
   cd Classroom-System
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Linux/Mac:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. **Start the application**
   ```bash
   python app.py
   ```

2. **Access the application**
   - Open your browser and navigate to `http://localhost:5000`
   - Choose your role: Student or Teacher

### Default Teacher Credentials
- **Username**: admin
- **Password**: admin123

## Project Structure

```
Classroom-System/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── database.db           # SQLite database (created automatically)
├── static/               # Static assets
│   ├── style.css         # Main stylesheet
│   ├── script.js         # Client-side JavaScript
│   ├── css/              # CSS libraries
│   └── js/               # JavaScript libraries
├── templates/            # HTML templates
│   ├── index.html        # Landing page
│   ├── join.html         # Student join page
│   ├── success.html      # Student success page
│   ├── teacher_login.html # Teacher login page
│   └── teacher.html      # Teacher dashboard
└── uploads/              # Uploaded files directory
```

## API Endpoints

### Student Routes
- `GET /` - Landing page
- `GET /join-page` - Student join page
- `POST /join` - Join classroom with name
- `POST /ping` - Update student activity status
- `GET /student-data` - Get latest messages

### Teacher Routes
- `GET /teacher-login` - Teacher login page
- `POST /teacher-login` - Authenticate teacher
- `GET /teacher` - Teacher dashboard
- `GET /teacher-data` - Get student data
- `POST /broadcast` - Send message/file to students
- `GET /teacher-logout` - Logout teacher

### File Routes
- `GET /uploads/<filename>` - Serve uploaded files

## Database Schema

### Students Table
```sql
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE,
    name TEXT,
    last_active TIMESTAMP
);
```

### Messages Table
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    timestamp TEXT
);
```

### Teachers Table
```sql
CREATE TABLE teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
);
```

## Security Features

- Password hashing using SHA-256
- Secure file uploads with filename sanitization
- Session-based authentication for teachers
- UUID-based student identification
- Automatic cleanup of student data on teacher login

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

**ClassControl** - Making classroom management smarter and more efficient.</content>
<parameter name="filePath">c:\Users\Farhan\OneDrive\Desktop\Classroom-System\README.md
