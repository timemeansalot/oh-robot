// These are the dependencies for this file.
//
// You installed the `dotenv` and `octokit` modules earlier. The `@octokit/webhooks` is a dependency of the `octokit` module, so you don't need to install it separately. The `fs` and `http` dependencies are built-in Node.js modules.
import dotenv from 'dotenv'
import { App } from 'octokit'
import { createNodeMiddleware } from '@octokit/webhooks'
import fs from 'fs'
import http from 'http'

// This reads your `.env` file and adds the variables from that file to the `process.env` object in Node.js.
dotenv.config()

// This assigns the values of your environment variables to local variables.
const appId = process.env.APP_ID
const webhookSecret = process.env.WEBHOOK_SECRET
const privateKeyPath = process.env.PRIVATE_KEY_PATH

// This reads the contents of your private key file.
const privateKey = fs.readFileSync(privateKeyPath, 'utf8')

// This creates a new instance of the Octokit App class.
const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret,
  },
})

// This defines the message that your app will post to pull requests.
const messageForNewPRs =
  'Thanks for opening a new PR! Please follow our contributing guidelines to make your PR easier to review.'

// This adds an event handler that your code will call later. When this event handler is called, it will log the event to the console. Then, it will use GitHub's REST API to add a comment to the pull request that triggered the event.
async function handlePullRequestOpened({ octokit, payload }) {

  try {

    console.log('GitHub event triggered')

    // workflow finish actions
    if (payload.action == 'completed') {
      console.log('workflow finish')
      console.log('workflow result: ')
      console.log(payload.workflow_run.conclusion)
      
      const names=payload.workflow_run.name.split('|') 
      console.log(names)

      // get the origin  comment
      const origin_comment = await octokit.request(
        'GET /repos/{owner}/{repo}/issues/comments/{comment_id}',
        {
          owner: names[0],
          repo: names[1],
          comment_id: parseInt(names[2]),
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )
      console.log(origin_comment.data)

      // update the origin comment
      await octokit.request(
        'PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}',
        {
          owner: names[0],
          repo: names[1],
          comment_id: parseInt(names[2]),
          body: 'origin_comment: '.concat( origin_comment.data.body, '\n CI-result: ',payload.workflow_run.conclusion, ' @',origin_comment.data.user.login),
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )
    }

    // issue_comment actions
    else if (payload.comment.body == 'trigger-ci') {
      console.log('comment detected and keywords detected ==> triggered ci')
      const result = await octokit.request(
        'POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches',
        {
          owner: payload.repository.owner.login,
          repo: payload.repository.name,
          workflow_id: 'test.yml',
          ref: 'main',
          inputs: {
            // owner: payload.comment.user.login, // wrong owner
            owner: payload.issue.user.login,
            repo: payload.repository.name,
            comment_id: payload.comment.id.toString(), // invalid input type
            // tags: '1849268462',
          },
          // inputs: {
          //   name: 'Mona the Octocat',
          //   home: 'San Francisco, CA',
          // },
          headers: {
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      )
      console.log(result)
    } else {
      console.log('comment detected keywords not detected ==> not triggered ci')
    }
  } catch (error) {
    if (error.response) {
      console.error(
        `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`,
      )
    }
    console.error(error)
  }
}

// This sets up a webhook event listener. When your app receives a webhook event from GitHub with a `X-GitHub-Event` header value of `pull_request` and an `action` payload value of `opened`, it calls the `handlePullRequestOpened` event handler that is defined above.
app.webhooks.on(
  ['issue_comment.created', 'workflow_run.completed'],
  // ['pull_request.opened', 'issues.opened', 'issue_comment.created'],
  handlePullRequestOpened,
)

// This logs any errors that occur.
app.webhooks.onError((error) => {
  if (error.name === 'AggregateError') {
    console.error(`Error processing request: ${error.event}`)
  } else {
    console.error(error)
  }
})

// This determines where your server will listen.
//
// For local development, your server will listen to port 3000 on `localhost`. When you deploy your app, you will change these values. For more information, see "[Deploy your app](#deploy-your-app)."
const port = 3000
const host = 'localhost'
const path = '/api/webhook'
const localWebhookUrl = `http://${host}:${port}${path}`

// This sets up a middleware function to handle incoming webhook events.
//
// Octokit's `createNodeMiddleware` function takes care of generating this middleware function for you. The resulting middleware function will:
//
//    - Check the signature of the incoming webhook event to make sure that it matches your webhook secret. This verifies that the incoming webhook event is a valid GitHub event.
//    - Parse the webhook event payload and identify the type of event.
//    - Trigger the corresponding webhook event handler.
const middleware = createNodeMiddleware(app.webhooks, { path })

// This creates a Node.js server that listens for incoming HTTP requests (including webhook payloads from GitHub) on the specified port. When the server receives a request, it executes the `middleware` function that you defined earlier. Once the server is running, it logs messages to the console to indicate that it is listening.
http.createServer(middleware).listen(port, () => {
  console.log(`Server is listening for events at: ${localWebhookUrl}`)
  console.log('Press Ctrl + C to quit.')
})
