'use strict'

const core = require('@actions/core')
const github = require('@actions/github')
const minimatch = require('minimatch')

const rulesetGlob = new minimatch.Minimatch('/src/chrome/content/rules/*.xml')

const labelNames = {
  add: 'new-ruleset',
  modify: 'ruleset-enhancement'
}

async function run () {
  try {
    const client = new github.GitHub(
      core.getInput('repo-token', { required: true })
    )

    const context = github.context

    const defaults = {
      owner: context.repo.owner,
      repo: context.repo.repo
    }

    if (context.payload.action !== 'opened' || !context.payload.pull_request) {
      return
    }

    const prNumber = context.payload.pull_request.number

    const response = await client.pulls.listFiles({
      ...defaults,
      pull_number: prNumber
    })

    const fileList = response.data

    if (!fileList.every(file => rulesetGlob.match(file.name))) {
      // Don't touch PRs that modify anything except rulesets for now
      return
    }

    const labels = []

    if (fileList.every(file => file.status === 'added')) {
      labels.push(labelNames.add)
    } else {
      labels.push(labelNames.modify)
    }

    if (labels.length !== 0) {
      await client.issues.addLabels({
        ...defaults,
        issue_number: prNumber,
        labels: labels
      })
    }
  } catch (err) {
    core.error(err.stack)
    core.setFailed(err.message)
  }
}

run()
