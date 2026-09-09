
const API = "http://127.0.0.1:8000";
let ws;

function updateClock(){
  document.getElementById("clock").innerText = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000); updateClock();

async function loadStatus(){
  try{
    const r = await fetch(API + "/status");
    const data = await r.json();
    const robot = data.robot;
    const hand = data.hand;

    document.getElementById("robot-id").innerText = robot.robot_id;
    document.getElementById("battery").innerText = robot.battery + "%";
    document.getElementById("battery2").innerText = robot.battery + "%";
    document.getElementById("mode").innerText = robot.mode;
    document.getElementById("online").innerText = robot.online ? "Online" : "Offline";
    document.getElementById("location").innerText = robot.location;
    document.getElementById("temperature").innerText = robot.temperature + " °C";
    document.getElementById("hand-status").innerText = hand.online ? "Online" : "Offline";

    moveRobot(robot.x, robot.y);
  }catch(e){
    document.getElementById("online").innerText = "Offline";
  }
}

function moveRobot(x,y){
  const marker = document.getElementById("robot-marker");
  marker.style.left = x + "%";
  marker.style.top = y + "%";
}

function alertCard(a){
  return `
    <div class="alert-card">
      <b>${a.alert_type}</b>
      <div>${a.location}</div>
      <div class="meta">${a.device} • ${(a.confidence*100).toFixed(0)}% • ${a.timestamp}</div>
    </div>
  `;
}

async function loadAlerts(){
  const r = await fetch(API + "/alerts");
  const data = await r.json();

  document.getElementById("alerts").innerHTML =
    data.slice(0,5).map(alertCard).join("") || "<div class='meta'>No alerts</div>";

  document.getElementById("incident-body").innerHTML = data.slice(0,8).map(a => `
    <tr>
      <td>${a.timestamp.split(" ")[1] || a.timestamp}</td>
      <td>${a.alert_type}</td>
      <td>${a.location}</td>
      <td class="${a.status === 'Open' ? 'status-open' : 'status-resolved'}">${a.status}</td>
    </tr>
  `).join("");
}

function connectWS(){
  ws = new WebSocket("ws://127.0.0.1:8000/ws");

  ws.onopen = () => ws.send("hello");

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if(msg.type === "alert" || msg.type === "incident_update") loadAlerts();
    if(msg.type === "robot_status") loadStatus();
  };

  ws.onclose = () => setTimeout(connectWS, 1500);
}

loadStatus();
loadAlerts();
setInterval(loadStatus, 3000);
setInterval(loadAlerts, 5000);
connectWS();
function netlifyDemo(scenario) {
    const now = new Date();

    let data;

    if (scenario === "normal") {
        data = {
            alert_type: "No Threat",
            confidence: 0.08,
            location: "Platform 2",
            ims: "Normal",
            voc: "Stable"
        };
    }

    if (scenario === "narcotics") {
        data = {
            alert_type: "Narcotics Suspect - Cocaine",
            confidence: 0.91,
            location: "Platform 2",
            ims: "Positive",
            voc: "Anomaly"
        };
    }

    if (scenario === "explosive") {
        data = {
            alert_type: "Explosive Suspect - RDX",
            confidence: 0.88,
            location: "Platform 3",
            ims: "Positive",
            voc: "High Risk"
        };
    }

    if (!data) return;

    updateNetlifySensorPanel(data);

    if (scenario !== "normal") {
        addNetlifyAlert(data, now);
        showNetlifyPopup(data);
    }
}

function updateNetlifySensorPanel(data) {
    const threat = document.getElementById("threat-class");
    const confidence = document.getElementById("threat-confidence");
    const ims = document.getElementById("ims-response");
    const voc = document.getElementById("voc-response");

    if (threat) threat.innerText = data.alert_type;
    if (confidence) confidence.innerText =
        Math.round(data.confidence * 100) + "%";
    if (ims) ims.innerText = data.ims;
    if (voc) voc.innerText = data.voc;
}

function showNetlifyPopup(data) {
    const popup = document.getElementById("threat-popup");

    if (!popup) return;

    document.getElementById("popup-class").innerText =
        data.alert_type;

    document.getElementById("popup-location").innerText =
        "Location: " + data.location;

    document.getElementById("popup-confidence").innerText =
        "Confidence: " + Math.round(data.confidence * 100) + "%";

    popup.classList.remove("hidden");
}

function closePopup() {
    const popup = document.getElementById("threat-popup");
    if (popup) popup.classList.add("hidden");
}

function addNetlifyAlert(data, now) {
    const alertsList =
        document.querySelector(".alerts-list");

    if (alertsList) {
        const card = document.createElement("div");
        card.className = "alert-card";

        card.innerHTML = `
            <b>${data.alert_type}</b>
            <div>${data.location}</div>
            <div class="meta">
                NETRA-01 • ${Math.round(data.confidence * 100)}%
                • ${now.toLocaleTimeString()}
            </div>
        `;

        alertsList.prepend(card);
    }

    const incidentBody =
        document.getElementById("incident-body");

    if (incidentBody) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${now.toLocaleTimeString()}</td>
            <td>${data.alert_type}</td>
            <td>${data.location}</td>
            <td class="status-open">Open</td>
        `;

        incidentBody.prepend(row);
    }
}
