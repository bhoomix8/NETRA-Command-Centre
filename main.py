
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import sqlite3
import asyncio
from pathlib import Path

DB_PATH = Path(__file__).with_name("netra.db")

app = FastAPI(title="NETRA Command Centre API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device TEXT,
            location TEXT,
            alert_type TEXT,
            confidence REAL,
            timestamp TEXT,
            status TEXT,
            source TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

robot_status = {
    "robot_id": "NETRA-01",
    "battery": 82,
    "mode": "Autonomous Patrol",
    "location": "Platform 2",
    "temperature": 42.0,
    "online": True,
    "x": 48,
    "y": 62
}

hand_status = {
    "device_id": "HAND-03",
    "battery": 91,
    "online": True,
    "operator": "RPF Operator"
}

class RobotStatus(BaseModel):
    robot_id: str
    battery: int
    mode: str
    location: str
    temperature: float
    online: bool = True
    x: int = 50
    y: int = 50

class HandStatus(BaseModel):
    device_id: str
    battery: int
    online: bool = True
    operator: str = "RPF Operator"

class Alert(BaseModel):
    device: str
    location: str
    alert_type: str
    confidence: float
    source: str = "NETRA-QUAD"

class IncidentUpdate(BaseModel):
    status: str

clients = set()

async def broadcast(payload):
    dead = []
    for ws in clients:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)

@app.get("/status")
def get_status():
    return {"robot": robot_status, "hand": hand_status}

@app.post("/robot-status")
async def update_robot_status(status: RobotStatus):
    robot_status.update(status.model_dump())
    await broadcast({"type": "robot_status", "data": robot_status})
    return {"message": "Robot status updated", "data": robot_status}

@app.post("/hand-status")
async def update_hand_status(status: HandStatus):
    hand_status.update(status.model_dump())
    await broadcast({"type": "hand_status", "data": hand_status})
    return {"message": "Handheld status updated", "data": hand_status}

@app.get("/alerts")
def get_alerts():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM incidents ORDER BY id DESC LIMIT 20"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/alerts")
async def create_alert(alert: Alert):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO incidents
           (device, location, alert_type, confidence, timestamp, status, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (alert.device, alert.location, alert.alert_type, alert.confidence, ts, "Open", alert.source)
    )
    conn.commit()
    incident_id = cur.lastrowid
    conn.close()

    data = {
        "id": incident_id,
        "device": alert.device,
        "location": alert.location,
        "alert_type": alert.alert_type,
        "confidence": alert.confidence,
        "timestamp": ts,
        "status": "Open",
        "source": alert.source
    }
    await broadcast({"type": "alert", "data": data})
    return {"message": "Alert stored", "alert": data}

@app.patch("/incidents/{incident_id}")
async def update_incident(incident_id: int, update: IncidentUpdate):
    conn = get_db()
    conn.execute(
        "UPDATE incidents SET status = ? WHERE id = ?",
        (update.status, incident_id)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    conn.close()
    data = dict(row) if row else None
    await broadcast({"type": "incident_update", "data": data})
    return {"message": "Incident updated", "incident": data}

@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        await websocket.send_json({"type": "hello", "data": "Connected to NETRA"})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.discard(websocket)
    except Exception:
        clients.discard(websocket)
