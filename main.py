from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import requests
import os
import csv

load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

app = FastAPI(title="RescueAI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def calculate_risk_score(rain: float, humidity: float, hour: int) -> int:
    score = 0
    if rain > 5:
        score += 35
    if rain > 15:
        score += 20
    if humidity > 85:
        score += 15
    if 7 <= hour <= 10 or 17 <= hour <= 21:
        score += 20
    elif 0 <= hour <= 4:
        score += 15
    return min(score, 100)


def get_risk_level(score: int) -> str:
    if score >= 70:
        return "HIGH"
    elif score >= 40:
        return "MEDIUM"
    else:
        return "LOW"


def fetch_weather(city: str) -> dict:
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "q": city,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric"
    }
    response = requests.get(url, params=params)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Weather API error: {response.json().get('message', 'Unknown error')}"
        )

    data = response.json()
    rain = 0.0
    if "rain" in data:
        rain = data["rain"].get("1h", 0.0)

    return {
        "rain": rain,
        "humidity": data["main"]["humidity"],
        "description": data["weather"][0]["description"]
    }


def get_ai_explanation(city: str, score: int, risk_level: str, weather: dict, hour: int) -> str:
    prompt = (
        f"City: {city}, Risk Score: {score}/100, "
        f"Weather: {weather['description']}, "
        f"Rain: {weather['rain']}mm, "
        f"Humidity: {weather['humidity']}%. "
        f"In 2 sentences, explain why this area is {risk_level} risk "
        f"and what emergency teams should do. Be direct and specific."
    )

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openrouter/auto",
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        data = response.json()
        if "choices" in data:
            return data["choices"][0]["message"]["content"].strip()
        else:
            return f"AI explanation unavailable: {data}"
    except Exception as e:
        return f"AI explanation unavailable: {str(e)}"


@app.get("/predict")
def predict(city: str = "Bengaluru", hour: int = 12):
    if not (0 <= hour <= 23):
        raise HTTPException(status_code=400, detail="Hour must be between 0 and 23")

    weather = fetch_weather(city)
    score = calculate_risk_score(weather["rain"], weather["humidity"], hour)
    risk_level = get_risk_level(score)
    explanation = get_ai_explanation(city, score, risk_level, weather, hour)

    return {
        "city": city,
        "risk_score": score,
        "score": score,          # frontend expects this field name
        "risk_level": risk_level,
        "weather": weather,
        "explanation": explanation
    }


@app.get("/zones")
def get_zones():
    zones = []
    with open("bengaluru_zones.csv", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            zones.append({
                "zone": row["zone"],
                "lat": float(row["lat"]),
                "lng": float(row["lng"]),
                "avg_rain_mm": float(row["avg_rain_mm"]),
                "avg_humidity": float(row["avg_humidity"]),
                "risk_level": row["risk_level"],
                "notes": row["notes"]
            })
    return {"zones": zones}


@app.get("/")
def root():
    return {"status": "RescueAI backend is running"}
