let disruptions = undefined
const socket = new WebSocket("wss://strecken-info-beta.de/api/notifications")

socket.addEventListener("open", _ => {
    socket.send(JSON.stringify({
        revision: null,
        type: "HANDSHAKE"
    }))
})

socket.addEventListener("message", async event => {
    const wsJson = JSON.parse(event.data)
    const revision = typeof wsJson.revision === "number" ? wsJson.revision : wsJson.revision.nummer

    const response = await fetch(`/api/riedbahn-kaputt?revision=${revision}`)
    const json = await response.json()
    disruptions = json.filter(d => !d.abgelaufen)
    if (document.readyState === "complete") {
        reloadStatus()
    }
})

function reloadStatus() {
    if (disruptions)
        document.getElementById("status").textContent = disruptions.length === 0 ? "Nein." : "Ja."
}

document.addEventListener("DOMContentLoaded", () => {
    reloadStatus()
})
