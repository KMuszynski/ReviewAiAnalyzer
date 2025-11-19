# **ReviewAiAnalyzer – Setup Guide**

## **1. Install system dependencies (Linux / WSL2)**

```bash
sudo apt update
sudo apt install ffmpeg
```

---

## **2. Create environment files**

Create a `.env` file in:

- `review-ai-analyzer/.env`
- `server/.env`

Add your configuration keys inside each.

---

## **3. Backend setup (Python server)**

```bash
cd server

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

The backend will start on `http://localhost:5000`.

---

## **4. Frontend setup (Next.js app)**

Open a new terminal:

```bash
cd review-ai-analyzer

npm install
npm run dev
```

The frontend will start on `http://localhost:3000`.
