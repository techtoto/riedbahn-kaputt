import express from 'express'
import fetch from 'node-fetch'
import NodeCache from 'node-cache'
import { DateTime } from 'luxon'
import { readFileSync } from 'fs'

const app = express()
const cache = new NodeCache({ stdTTL: 60 * 10 })

/**
 * @param {string} isoString 
 */
function formatDateTime(isoString) {
    return DateTime.fromISO(isoString).toFormat("dd.LL.yyyy HH:mm")
}

function createResponseJSON(inJSON) {
    return inJSON.filter(d => !d.abgelaufen
        && (d.betriebsstellen.length > 0 || d.abschnitte.length > 0)
    )
    .map(d => ({
        head: d.subcause !== '' ? `${d.cause} - ${d.subcause}` : d.cause,
        text: d.text,
        period: {
            start: formatDateTime(d.zeitraum.beginn),
            end: formatDateTime(d.zeitraum.ende)
        },
        betriebsstellen: d.betriebsstellen
            // Filter for duplicate entries
            .filter((b, i, a) => i === a.map(c => c.langname).indexOf(b.langname))
    }))
}

app.get('/api/riedbahn-kaputt', async (req, res) => {
    const revision = req.query.revision
    if (!revision) {
        res.status(400).send("Paramter revision is missing")
        return
    }

    if (process.argv[2] === "test") {
        const testData = JSON.parse(readFileSync("testData.json"))
        res
            .header("Access-Control-Allow-Origin", "*")
            .json(createResponseJSON(testData))
        return
    }

    const cachedValue = cache.get(revision)
    if (cachedValue) {
        res
            .header("Access-Control-Allow-Origin", "*")
            .header("Content-Type", "application/json")
            .send(cachedValue)
        return
    }

    const response = await fetch("https://strecken-info.de/api/stoerungen", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        mode: 'no-cors',
        body: JSON.stringify({
            revision,
            filter: {
                baustellenAktiv: false,
                baustellenNurTotalsperrung: false,
                streckenruhenAktiv: false,
                stoerungenAktiv: true,
                wirkungsdauer: 0,
                zeitraum: {
                    type: "ROLLIEREND",
                    stunden: 2
                },
                regionalbereiche: ["MITTE", "NORD", "OST", "SUED", "SUEDOST", "SUEDWEST", "WEST"],
                streckennummern: [
                    4010,
                    4011
                ],
                betriebsstellen: []
            }
        })
    })
    if (response.status != 200) {
        console.error("Error while doing request to strecken info:")
        console.error(response.status)
        console.error(await response.text())
        res.status(500).send("Internal server error")
        return
    }
    const json = createResponseJSON(await response.json())

    cache.set(revision, JSON.stringify(json))
    res
        .header("Access-Control-Allow-Origin", "*")
        .json(json)
})

app.use(express.static('static'))

const LISTEN_HOST = process.env.LISTEN_HOST || '127.0.0.1'
const LISTEN_PORT = parseInt(process.env.LISTEN_PORT || '3000')

app.listen(LISTEN_PORT, LISTEN_HOST, () => {
    console.log(`Listening on http://${LISTEN_HOST}:${LISTEN_PORT}`)
})