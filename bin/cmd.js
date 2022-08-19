#!/usr/bin/env node

const got = require('got')
const minimist = require('minimist')
const commist = require('commist')
const enquirer = require('enquirer') const chalk = require('chalk') const ansiEsc = require('ansi-escapes')

// Declare variables
const API = 'http://localhost:3000'
const categories = ['confectionery', 'electronics']

/**
* Remove empty elements from the args._ array
* Code from https://bobbyhadz.com/blog/javascript-remove-empty-elements-from-array
* @param {Array} args. The array to filter
* @returns {Array} The filtered array.
*/
function getFilteredArgs(args) {
  return args.filter(element => (
    element !== null &&
    element !== undefined &&
    element !== '' &&
    !Number.isNaN(element)
  ))
}

// CLI usage
const usage = (msg = 'Back office for My App') => {
  console.log(`\n${msg}\n\n`,
     'add:\n',
     '  order: my-cli add order <id> --amount=<int> --api=<string>\n',
     '         my-cli add order <id> -n=<int> --api=<string>\n\n',
     'list:\n',
     '  cats:  my-cli list cats\n',
     '  ids:   my-cli list ids --cat=<string> --api=<string>\n',
     '  ids:   my-cli list ids -c=<string> --api=<string>\n'
  )
  console.log('\n-=interactive mode=-\n')
  console.log('run: my-cli')
  console.log('run: my-cli --api {API_URL}')
  console.log('\n-=help=-\n')
  console.log('run: my-cli --help')
  console.log('run: my-cli -h\n')
}

// Get the args
const noMatches = commist()
  .register('add order', addOrder)
  .register('list cats', listCats)
  .register('list ids', listIds)
  .parse(process.argv.slice(2))
 

/**
* Terminal user interface
* @async
* @param {string} api. API url
*/
async function tui (api) {
  const { category } = await enquirer.prompt({
   type: 'autocomplete',
    name: 'category',
    message: 'Category',
    choices: categories
  })
  
  let products = await got(`${api}/${category}`).json()
  let quit = false
  
  while (true) {
    for (const { name, rrp, info } of products) {
      console.log(chalk `
        {bold ${name}} - {italic ${rrp}}
        ${info}
      `)
    }
    
    const form = new enquirer.Form({
      message: 'Add',
      hint: `Press Ctrl+Q to change category`,
      validate (values) {
        const { name, rrp, info } = values
        if (!name || !rrp || !info) return 'All fields are required'
        if (Number.isFinite(Number(rrp)) === false) return 'RRP should be a number'
        return true
      },
      choices: [
        {name: 'name', message: 'Name'},
        {name: 'rrp', message: 'RRP'},
        {name: 'info', message: 'Info'}
      ]
    })
    form.on('keypress', (_, {ctrl, name}) => {
      if (ctrl && name === 'q') {
        form.cancel()
        quit = true
      }
    })
    let add = null
    try {
      add = await form.run()
    } catch (err) {
      if (quit) {
        console.log(ansiEsc.clearTerminal)
        return tui(api)
      }
      throw err
    }
    products = await got.post(`${api}/${category}`, {json: add}).json()
    console.log(ansiEsc.clearTerminal)
    
    console.log(chalk `{green ✔} {bold Category} {dim ·} {cyan ${category}}`)
  }
}


if (noMatches) {
  const args = minimist(process.argv.slice(2), {
    boolean: ['help'],
    alias: {help: 'h'},
    string: ['api'],
    default: { api: API }
  })
  const { api, help } = args
  
  if (help) {
    usage()
    process.exit()
  }
  
  try {
  (async () => {
    await tui(api)
    })()
  } catch (err) {
    const cancelled = err === ''
    if (cancelled === false) {
      console.log(err.message)
      process.exit(1)
    }
  }
}



/**
* Add an order to a given category
* @async
* @param {string[]} argv. Command line arguments
*/
async function addOrder (argv) {
  const args = minimist(argv, {
    alias: { amount: 'n' },
    string: ['api'],
    default: { api: API }
  })

  if (args._.length < 1) {
    usage()
    process.exit(1)
  }

  args._ = getFilteredArgs(args._)

  const [ id ] = args._
  const { amount, api } = args

  if (Number.isInteger(amount) === false) {
    usage('Error: --amount flag is required and must be an integer')
    process.exit(1)
  }

  try {
      await got.post(`${api}/orders/${id}`, {
      json: { amount }
    })
    console.log(`${amount} has been added to ${id}`)
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
}

/**
* List categories
*/
function listCats () {
  console.log('\nCategories:\n')
  for (const cat of categories) console.log(cat)
  console.log()
}

/**
* Lists ids for a given category
* @async
* @param {string[]} argv. Command line arguments
*/
async function listIds (argv) {
  const args = minimist(argv, {
    alias: { cat: 'c' },
    string: ['cat', 'api'],
    default: { api: API }
  })

  const { cat, api } = args
  if (!cat) {
    usage('Error: --cat flag is required')
    process.exit(1)
  }

  try {
    console.log(`\nCategory: ${cat}\n`, ' IDs:\n')
    const products = await got(`${api}/${cat}`).json()
    for (const { id } of products) {
      console.log(`     ${id}`)
    }
    console.log()
  } catch (err) {
    console.log(err.message)
    process.exit(1)
  }

}
