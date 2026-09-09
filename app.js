
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
