const express = require('express');
const bodyparser = require('body-parser');
const dns = require('node:dns');
const dnsPromises = dns.promises;
const fs = require('fs')
const router = express.Router()
router.use(bodyparser.urlencoded({ extended: true }))
router.use(bodyparser.json())

router.post('/shorturl', async (req, res) => {
    // validate url
    let url
    try {
        url = new URL(req.body.url) 
    } catch (error) {
        return res.json({ error: 'invalid url' })
    }
    // check if url exist in storage
    let storage
    try {
        storage = JSON.parse(fs.readFileSync(process.cwd() + '/storage.json'))
    } catch(error) {
        if (error instanceof Error && error.code === 'ENOENT') {
            storage = []
        } else {
            return res.json({ error: 'server error' })
        }
    }
    if (!storage.includes(url.origin)) {
        try {
            const result = await dnsPromises.lookup(url.hostname)
            if (result) storage.push(req.body.url)
        } catch(error) {
            return res.json({ error: 'invalid url' })
        }
    }
    // save changes
    fs.writeFileSync(process.cwd() + '/storage.json', JSON.stringify(storage, null, 2))
    res.json({
        original_url: req.body.url,
        short_url: storage.indexOf(req.body.url)
    })
})

router.get('/shorturl/:short_url', async (req, res) => {
    // validate parmas - must be a number
    const index = isNaN(req.params.short_url) 
        ? null 
        : parseInt(req.params.short_url)
    if (index === null) return res.json({ error: 'invalid short url' })
    let storage
    try {
        storage = JSON.parse(fs.readFileSync(process.cwd() + '/storage.json'))
    } catch(error) {
        if (error instanceof Error && error.code === 'ENOENT') {
            return res.json({ error: 'url storage is empty!'})
        } else {
            return res.json({ error: 'server error' })
        }
    }
    try {
        res.redirect(storage[index])
    } catch(error) {
        res.json({ error: 'invalid short url' })
    }
})

module.exports = router