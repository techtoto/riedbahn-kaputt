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
    if (disruptions) {
        document.getElementById("status").textContent = disruptions.length === 0 ? "Nein." : "Ja."

        disruptions.forEach(element => {
            const entry = document.createElement("div")
            entry.classList.add("disruptionText")

            const title = document.createElement("p")
            title.classList.add("bold")
            title.textContent = element.head

            const date = document.createElement("p")
            date.classList.add("italic")
            date.textContent = `${element.zeitraum.beginn} - ${element.zeitraum.ende}`

            const locations = document.createElement("p")
            locations.classList.add("italic")
            let locationsText = ""
            locations.textContent = element.betriebsstellen.map(a => `${a.langname} (${a.ril100})`).join(", ")

            const content = document.createElement("p")
            content.textContent = element.text

            entry.appendChild(title)
            entry.appendChild(date)
            entry.appendChild(locations)
            entry.appendChild(content)

            document.getElementById("disruptions").appendChild(entry)
        })
    }
}

document.addEventListener("DOMContentLoaded", () => {
    reloadStatus()
})
