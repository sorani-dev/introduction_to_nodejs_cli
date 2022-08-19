#!/usr/bin/env node

const got = require('got')

const API = 'http://localhost:3000'

const usage = (msg = 'Back office for My App') => {   console.log(`\n${msg}\n`)   console.log(' usage: my-cli <id> <amount>') }

const argv = process.argv.slice(2)
if (argv.length < 2) {
  usage()
  process.exit(1)
}
const [ id, amt ] = argv
const amount = Number(amt)
if (Number.isInteger(amount) === false) {
  usage('Error: amount must be an integer')
  process.exit(1)
}

(async() => {

  try {
    await got.post(`${API}/orders/${id}`, {
      json: { amount }
    })
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
})()