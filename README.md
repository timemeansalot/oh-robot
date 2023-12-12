1. v1.1 basic Github App workflow:

- issue-comment.created with keyword
- workflow trigger by Github App API call
- workflow finish
- update the origin comment to notify the commenter the workflow result

2. v1.2 Github App workflow which will trigger by PR with keyword

- pull_request.opened with keyword
- workflow trigger by Github App API call
- workflow finish
- create a new comment to notify the commenter the workflow result
  [TOC]

# 1 How to use our developed flow

Currently, we have provided both <u>Github Workflow</u> and <u>Github Apps</u>, their usage guides are shown belew:

> All the below keyword pattern can be adjusted to our needs.

## 1.1 Auto-Release Workflow

1. **Purpose**: this flow is used for automatically generated a RELEASE file
2. **Usage**: push with a tag, the tag is in the form of **release-kernel-version**.  
   When you commit to Github with this tag, this Workflow will be triggered automatically, and generate a new RELEASE.

   > In the Action page on Github repository, you can find all the Workflow results.

## 1.2 Github App

1. **Purpose**: trigger Github CI <u>in a more flexible way</u>.
2. **Usage**: there are 2 ways to trigger a pull_request automation:
   - create a pull_request, put keyword **trigger-ci** in the pull_request title
     - create a pull_request with keyword **trigger-ci**
       ![](https://s2.loli.net/2023/12/12/g9RfM6Cku1cbZyP.png)
     - the workflow result will be updated by adding a new comment in the pull_request page
       ![](https://s2.loli.net/2023/12/12/nmf9dLACoZptyMv.png)
   - in the pull_request page, create a comment with keyword **trigger-ci|src-branch**
     - create a new comment under the pull_request page with keyword **trigger-ci_dev**, this will do workflow on `dev` branch
       ![](https://s2.loli.net/2023/12/12/kJG4ZoIi6ROUQmh.png)
     - the workflow result will be updated by updating the origin comment in the pull_request page
       ![](https://s2.loli.net/2023/12/12/6Z5YtAMSEiXFB3a.png)

# 2 Developing Notes

## 2.1 Basic Concept of Github CI(Continuous Integration)

1. Github Workflow:

   - It's like a shell script which will do a series of jobs when triggered by some Github event.
   - All you need to do to create a Workflow is by creating a YAML file by the path of `.github/workflows/`

2. Github App
   ![](https://s2.loli.net/2023/12/11/vO5p9ZexRq2LtCs.png)

   - In my opinion, the Github App is a like an interface which will pass webhooks to our local JS server through SMEE server. When creating a App, we can to grant it with necessary permission so that it can pass corresponding webhooks to us.
     > PS: 🌟When you update the Github <u>App</u> trigger event, you have to update the permission in the Github Repository which uses this <u>App</u>
   - Once the local JS server knows some github event happens, the JS server can use github API to perform actions like trigger a workflow, update a comment, etc.
     As we can decide when and what operation to perform, this way is <u>more flexible</u> than normal Github Workflow.
   - Compared to running a Python script locally and use python script to request github repo status periodically
     - less pressure to local server
     - less probability of miss Github events

## 2.2 How to create a Github Workflow

```yml
name: github CI(Continuous Integration)
on:
  push:
    tags:
      - 'release-\w+-\w+' # Push events to match release-kernel-version
jobs:
  build-project: # first job: create Verilog file and upload to Github Actions Page
    permissions: write-all # git permissions to this job or you can't create a release in the following step
    name: build-project # job name which will show in Github
    runs-on: ubuntu-latest # define the OS which the jobs runs on, must be defined for each job not the whole workflow
    steps: # define a list of steps of this job
      - name: Get Tag Name
        run: |
          tag_name=${GITHUB_REF#refs/tags/}
          mid_part=$(echo "$tag_name" | sed 's/^.*-\(.*\)-.*$/\1/')
```

A normal workflow file like the YAML codes above, it contains two main parts:

- the trigger events defined by the `on` keyword
- a sequence of jobs to do defined by the `jobs` keyword

There are plenty of guide about Github Workflow, you can start by [this tutorial](https://docs.github.com/en/actions/quickstart).

## 2.3 How to create a Github App

1. follow [this guide](https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-github-app-that-responds-to-webhook-events) to Create a github APP, install it to some repo and setup SMEE to pass webhooks.
   `npx smee -u https://smee.io/EBx9uNgHTYVnDIn -t http://localhost:3000/api/webhook`
2. install node packages
   ```bash
    # npm init --yes
    npm install octokit
    npm install dotenv
    npm install smee-client --save-dev
   ```
3. create a JS server which will perform actions according to the webhooks we get, we have developed a server which could do the following jobs:
   `npm start server`

### 2.3.1 how to connect the github workflow result to the origin comemnt?

1. pass the comment ID to the github workflow as inputs
2. use the inputs as workflow run_name
3. use this run_name to match with the origin comemnt

> comment -> workflow inputs -> run_name -> comment
