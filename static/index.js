let disruptions = undefined
const socket = new WebSocket("wss://strecken-info-beta.de/api/notifications")
const disruptionDiv = document.getElementById("disruptions")
const pattern = /<br\s*\/?>/g

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
    disruptions = json
    if (document.readyState === "complete") {
        reloadStatus()
    }
})

function reloadStatus() {
    if (disruptions) {
        document.getElementById("status").textContent = disruptions.length === 0 ? "Nein." : "Ja."

        disruptionDiv.innerHTML = ""

        disruptions.forEach(element => {
            const entry = document.createElement("div")
            entry.classList.add("disruptionText")

            const title = document.createElement("p")
            title.classList.add("bold")
            title.textContent = element.head
            entry.appendChild(title)

            const date = document.createElement("p")
            date.classList.add("italic")
            date.textContent = `${element.period.start} - ${element.period.end}`
            entry.appendChild(date)

            const locations = document.createElement("p")
            locations.classList.add("italic")
            locations.textContent = element.betriebsstellen.map(a => `${a.langname} (${a.ril100})`).join(", ")
            entry.appendChild(locations)

            if (element.text !== "") {
                const content = document.createElement("p")
                content.textContent = element.text.replaceAll(pattern, '\n')
                entry.appendChild(content)
            }

            disruptionDiv.appendChild(entry)
        })
    }
}

document.addEventListener("DOMContentLoaded", () => {
    reloadStatus()
})
