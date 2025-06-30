# Secure Web-Based Electronic Voting System

This repository contains the source code for a prototype web-based electronic voting system developed with a React frontend and a Django/Python backend. The system incorporates several cryptographic features to ensure the integrity and secrecy of the voting process.

<p align="center">
  </p>

---

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation and Setup Guide](#installation-and-setup-guide)
  - [English Guide](#english-guide)
  - [Türkçe Rehber](#türkçe-rehber)

---

## Features
- **Secure User Management:** Email verification, JWT authentication, hashed passwords, profile management with picture uploads, and tokenized password reset.
- **Comprehensive Admin Panel:** Full CRUD for elections and candidates, including photo uploads.
- **Commit-Reveal Voting:** A two-step process to enhance vote integrity.
- **Vote Secrecy:** Hybrid encryption (RSA + AES-GCM) ensures ballots are unreadable at rest.
- **Secure Tallying & Integrity:** Admin-triggered decryption process with results digitally signed (Ed25519) for authenticity.
- **Results Visualization:** Admins can view results with pie charts and download CSV reports.

---

## Technology Stack
- **Frontend:** React, React Router, Axios, Chart.js, React Datepicker
- **Backend:** Python, Django, Django REST Framework, SimpleJWT
- **Database:** SQLite (for Development)
- **Cryptography:** Python `cryptography` library

---

## Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later) & npm
- [Python](https://www.python.org/downloads/) (v3.11 or later) & pip
- [Git](https://git-scm.com/downloads/)

---

## Installation and Setup Guide

Follow these steps to set up and run the project on your local machine. Instructions are provided for both Windows and and Linux/macOS.

### English Guide

**1. Backend Setup (Django)**

The backend is located in the `backend/` directory.

* **A. Clone the Repository and Navigate to Backend**
    ```bash
    git clone [https://github.com/emrecanngencerr/grad.git](https://github.com/emrecanngencerr/grad.git)
    cd grad/backend
    ```

* **B. Create Virtual Environment & Install Dependencies**
    For Windows:
    ```bash
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    ```
    For Linux / macOS:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip3 install -r requirements.txt
    ```

* **C. Set up Environment Variables**
    Create a file named `.env` in the `backend/` directory and populate it. Generate your own keys in the next step.
    ```env
    # backend/.env
    EMAIL_HOST_USER_ENV=your-email@gmail.com
    EMAIL_HOST_PASSWORD_ENV=your-16-character-app-password
    DEFAULT_FROM_EMAIL_ENV="Your App Name <your-email@gmail.com>"

    # These will be generated in the next step
    SYSTEM_ED25519_PRIVATE_KEY_B64=
    SYSTEM_ED25519_PUBLIC_KEY_B64=
    ```

* **D. Prepare Database & Generate Keys**
    Apply Database Migrations:
    ```bash
    # Use python or python3 depending on your system
    python manage.py makemigrations
    python manage.py migrate
    ```
    Create a Superuser (Admin Account):
    ```bash
    python manage.py createsuperuser
    ```
    Follow the prompts to create your admin account.

    Generate System Keys for Signing:
    ```bash
    python manage.py generate_system_keys
    ```
    Copy the `Private Key (Base64)` and `Public Key (Base64)` output from the console and paste them into your `.env` file.

**2. Frontend Setup (React)**

The frontend is located in the `frontend/` directory.

1.  **Open a new terminal window.**
2.  **Navigate to the frontend directory:**
    ```bash
    # From the project root (grad/)
    cd ../frontend
    ```
3.  **Install JavaScript dependencies:**
    ```bash
    npm install
    ```

**3. Running the Application**

You need to have both the backend and frontend servers running simultaneously in separate terminals.

* **Run the Backend Server:**
    ```bash
    # Inside backend/ directory (with venv activated)
    python manage.py runserver
    ```
    *(The backend will be running at `http://127.0.0.1:8000`)*

* **Run the Frontend Server:**
    ```bash
    # Inside frontend/ directory
    npm start
    ```
    *(Your browser should automatically open to `http://localhost:3000`)*

You can now use the application! Remember to verify your email after registration (check the Django console for the verification email).

---

### Türkçe Rehber

Projeyi yerel makinenizde kurmak ve çalıştırmak için bu adımları izleyin.

**1. Backend Kurulumu (Django)**

Backend, `backend/` dizininde yer almaktadır.

* **A. Repoyu Klonlama ve Backend Dizinine Geçiş**
    ```bash
    git clone [https://github.com/emrecanngencerr/grad.git](https://github.com/emrecanngencerr/grad.git)
    cd grad/backend
    ```

* **B. Sanal Ortam Oluşturma ve Bağımlılıkları Kurma**
    Windows için:
    ```bash
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    ```
    Linux / macOS için:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip3 install -r requirements.txt
    ```

* **C. Ortam Değişkenlerini Ayarlama**
    `backend/` dizininde `.env` adında bir dosya oluşturun ve içeriğini doldurun. Kendi anahtarlarınızı bir sonraki adımda oluşturacaksınız.
    ```env
    # backend/.env
    EMAIL_HOST_USER_ENV=sizin-emailiniz@gmail.com
    EMAIL_HOST_PASSWORD_ENV=sizin-16-haneli-uygulama-sifreniz
    DEFAULT_FROM_EMAIL_ENV="Uygulama Adınız <sizin-emailiniz@gmail.com>"

    # Bu anahtarlar bir sonraki adımda üretilecek
    SYSTEM_ED25519_PRIVATE_KEY_B64=
    SYSTEM_ED25519_PUBLIC_KEY_B64=
    ```

* **D. Veritabanını Hazırlama ve Anahtarları Oluşturma**
    Veritabanı Göçlerini (Migrations) Uygulayın:
    ```bash
    # Sisteminize göre python veya python3 kullanın
    python manage.py makemigrations
    python manage.py migrate
    ```
    Süper Kullanıcı (Admin Hesabı) Oluşturun:
    ```bash
    python manage.py createsuperuser
    ```
    Komut istemlerini takip ederek yönetici hesabınızı oluşturun.

    Sistem Anahtarlarını Oluşturun:
    ```bash
    python manage.py generate_system_keys
    ```
    Konsolda yazdırılan `Private Key (Base64)` ve `Public Key (Base64)` çıktılarını kopyalayıp `.env` dosyanıza yapıştırın.

**2. Frontend Kurulumu (React)**

Frontend, `frontend/` dizininde yer almaktadır.

1.  **Yeni bir terminal penceresi açın.**
2.  **Frontend dizinine gidin:**
    ```bash
    # Proje kök dizininden (grad/)
    cd ../frontend
    ```
3.  **JavaScript bağımlılıklarını kurun:**
    ```bash
    npm install
    ```

**3. Uygulamayı Çalıştırma**

Aynı anda hem backend hem de frontend sunucularının ayrı terminallerde çalışıyor olması gerekir.

* **Backend Sunucusunu Çalıştırın:**
    ```bash
    # backend/ dizini içindeyken (sanal ortam aktifken)
    python manage.py runserver
    ```
    *(Backend sunucusu `http://127.0.0.1:8000` adresinde çalışacaktır.)*

* **Frontend Sunucusunu Çalıştırın:**
    ```bash
    # frontend/ dizini içindeyken
    npm start
    ```
    *(Tarayıcınız otomatik olarak `http://localhost:3000` adresini açmalıdır.)*

Artık uygulamayı kullanabilirsiniz! Kayıt olduktan sonra e-postanızı doğrulamayı unutmayın (doğrulama e-postası için Django konsolunu kontrol edin).
