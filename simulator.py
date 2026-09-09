
import requests
import random
import time

BASE = "http://127.0.0.1:8000"

locations = ["Platform 1", "Platform 2", "Platform 3", "Yard A", "Coach Bay"]
alert_types = [
    "Suspicious Chemical Trace",
    "Unattended Luggage",
    "Thermal Anomaly"
]

battery = 96

while True:
    battery = max(20, battery - random.choice([0, 0, 1]))
    status = {
        "robot_id": "NETRA-01",
        "battery": battery,
        "mode": "Autonomous Patrol",
        "location": random.choice(locations),
        "temperature": round(random.uniform(38, 46), 1),
        "online": True,
        "x": random.randint(15, 85),
        "y": random.randint(25, 80),
    }

    try:
        requests.post(f"{BASE}/robot-status", json=status, timeout=2)

        if random.random() < 0.22:
            alert = {
                "device": "NETRA-01",
                "location": status["location"],
                "alert_type": random.choice(alert_types),
                "confidence": round(random.uniform(0.62, 0.96), 2),
                "source": "NETRA-QUAD"
            }
            requests.post(f"{BASE}/alerts", json=alert, timeout=2)
            print("ALERT:", alert)

        print("STATUS:", status)
    except Exception as e:
        print("Backend unavailable:", e)

    time.sleep(4)
