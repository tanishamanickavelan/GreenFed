from flask import Flask, request, jsonify
from google import genai
import os

app = Flask(__name__)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json["message"]

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=user_input
    )

    return jsonify({"reply": response.text})

if __name__ == "__main__":
    app.run(port=5000)