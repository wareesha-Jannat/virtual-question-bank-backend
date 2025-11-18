# ⚙️ Virtual Question Bank – Backend (API)

<div align="center">

🧠 RESTful API for the Virtual Question Bank platform.
Handles user authentication, question management, exams, notifications, support requests, and analytics for admins and students.

**Built with:**

![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)

</div>
## ✨ Features
### 👤 Authentication & Authorization

- Secure user authentication using JWT tokens.

- Separate roles: Admin, Student, and Guest.

- Protected routes accessible only to authorized users.

### 📚 Question Management

- Admins can add, update, or delete questions.

- Questions categorized by Subjects and Topics.

- Students can fetch and attempt questions during practice and exams.

### 🧾 Exams & Practice

- Endpoints for exam generation, question fetching, and result submission.

- Stores scores, accuracy, and analytics for each student.

### 📈 Analytics & Reports

- Admin-only analytics routes to view system usage, student performance, and activity logs.

- Supports report generation and data export (used with frontend PDF tools like jsPDF).

### 🆘 Support Requests

- Students can submit support tickets.

- Admins can view and respond to requests.

### 🔔 Notifications

- API endpoints for both system-generated and admin-generated notifications.

- Tracks notification delivery to each user.

### 🗂️ Project Structure

```bash
virtual-question-bank-backend/
│
│── config/          # Database and environment setup
│── controllers/     # Route controllers (business logic)
│── models/          # Mongoose models
│── routes/          # API routes
│── middlewares/     # Auth, error handling, etc.
│── utils/           # Utility/helper functions
│── server.js        # Main server entry point
│
├── .env.example         # Environment variables
├── package.json
└── README.md

```

## 🛠️ Tech Stack

- Runtime: Node.js

- Framework: Express.js

- Database: MongoDB

- ODM: Mongoose

- Authentication: JWT

- Environment Config: dotenv

## 🚀 Getting Started

1.  Clone the repo

```bash
git clone https://github.com/wareesha-Jannat/virtual-question-bank-backend.git
cd virtualquestionbank-backend

```

2.  Install dependencies

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

## 🔗 Frontend Repository

The frontend for this project is available at:  
➡️ [Virtual Question Bank – Frontend](https://github.com/wareesha-Jannat/virtual-question-bank-frontend)
