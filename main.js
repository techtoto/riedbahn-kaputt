import express from 'express'
import fetch from 'node-fetch'
import NodeCache from 'node-cache'

const app = express()
const cache = new NodeCache({ stdTTL: 60 * 10 })


app.get('/api/riedbahn-kaputt', async (req, res) => {
    const revision = req.query.revision
    if (!revision) {
        res.status(400).send("Paramter revision is missing")
        return
    }

    const cachedValue = cache.get(revision)
    if (cachedValue) {
        res.header("Access-Control-Allow-Origin", "*").send(cachedValue)
        return
    }

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
                        beginn: new Date().toISOString(),
                        ende: new Date().toISOString()
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
    const text = await response.text()

    cache.set(revision, text)
    res.header("Access-Control-Allow-Origin", "*").send(text)
})

app.use(express.static('static'))

const LISTEN_HOST = process.env.LISTEN_HOST || '127.0.0.1'
const LISTEN_PORT = parseInt(process.env.LISTEN_PORT || '3000')

app.listen(LISTEN_PORT, LISTEN_HOST, () => {
    console.log(`Listening on http://${LISTEN_HOST}:${LISTEN_PORT}`)
})