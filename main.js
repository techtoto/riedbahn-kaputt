import express from 'express'
import fetch from 'node-fetch'
import NodeCache from 'node-cache'
import { DateTime } from 'luxon'
import testData from './testData.js'

const app = express()
const cache = new NodeCache({ stdTTL: 60 * 10 })

/**
 * @param {string} isoString 
 */
function formatDateTime(isoString) {
    return DateTime.fromISO(isoString).toLocaleString(DateTime.DATETIME_SHORT)
}

app.get('/api/riedbahn-kaputt', async (req, res) => {
    const revision = req.query.revision
    if (!revision) {
        res.status(400).send("Paramter revision is missing")
        return
    }

    if (process.argv[2] === "test") {
        res
            .header("Access-Control-Allow-Origin", "*")
            .json(testData)
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

    const time = DateTime.now().setZone("Europe/Berlin").toISO({ includeOffset: false })

    const response = await fetch("https://strecken-info-beta.de/api/stoerungen", {
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
                zeitraeume: [
                    {
                        beginn: time,
                        ende: time
                    }
                ],
                regionalbereiche: [],
                streckennummern: [
                    {
                        von: 4010,
                        bis: 4011
                    }
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
    const json = (await response.json())
        .filter(d => !d.abgelaufen)
        .map(d => ({
            head: d.head,
            text: d.text,
            period: {
                start: formatDateTime(d.zeitraum.beginn),
                end: formatDateTime(d.zeitraum.ende)
            },
            betriebsstellen: d.betriebsstellen
                .filter((b, i, a) => i === a.map(c => c.langname).indexOf(b.langname))
        }))

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