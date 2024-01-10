'use strict'

async function main() {
  try {
    await fetch('http://localhost:3000/-/healthz')
  } catch (error) {
    process.exitCode = 1
  }
}

main()
