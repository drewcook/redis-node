const express = require('express')
const fetch = require('node-fetch')
const redis = require('redis')

const PORT = process.env.PORT || 5000
const REDIS_PORT = process.env.REDIS_PORT || 6379

const client = redis.createClient(REDIS_PORT)
const app = express()

// Set response helper
function setResponse(username, repos) {
	return `<h2>Username ${username} has ${repos} Github repositories.</h2>`
}

// Make request to Github for data
async function getRepos(req, res, next) {
	try {
		console.log('Fetching data...')
		const { username } = req.params
		const resp = await fetch(`https://api.github.com/users/${username}`)
		const data = await resp.json()
		// Store data in redis cache
		const repos = data.public_repos
		client.setex(username, 3600, repos) // 1hr

		res.send(setResponse(username, repos))
	} catch (err) {
		console.error(err)
		res.status(500)
	}
}

// Cache middleware
function cache(req, res, next) {
	const { username } = req.params

	// Get username from cache, return it if exists
	client.get(username, (err, data) => {
		if (err) throw err

		if (data !== null) {
			res.send(setResponse(username, data))
		} else {
			next()
		}
	})
}

// Route
app.get('/repos/:username', cache, getRepos)

// Open port
app.listen(5000, () => {
	console.log(`App listening on port ${PORT}`)
})
