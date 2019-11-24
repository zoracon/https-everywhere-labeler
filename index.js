'use strict'

const core = require('@actions/core')
const github = require('@actions/github')
const minimatch = require('minimatch')

const rulesetGlob = '/src/chrome/content/rules/*.xml'

const labelNames = {
  add: 'new-ruleset',
  modify: 'ruleset-enhancement'
}

function isRuleset () {
  return file => minimatch(file.name, rulesetGlob)
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

    const fileList = await client.pulls.listFiles({
      ...defaults,
      pull_number: prNumber
    })

    if (!fileList.each(isRuleset)) {
      // Don't touch PRs that modify anything except rulesets for now
      return
    }

    const labels = []

    if (fileList.each(file => file.status === 'added')) {
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
