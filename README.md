# Jest Reporter for GitHub Actions

A custom Jest reporter to create annotations when run via GitHub Actions. 

![](https://github.com/cschleiden/jest-github-actions-reporter/blob/master/img/annotations.png)


## Usage

All you have to do to get annotations in your GitHub Actions runs is to add the reporter your Jest configuration.

1. Install `npm install -D jest-github-actions-reporter`
2. Add to your `jest.config.js`:
```js
module.exports = {
  reporters: [
    "default",
    "jest-github-actions-reporter"
  ],
  testLocationInResults: true
};
```
alternatively you can only add it during your CI build, for example in `package.json`:
```json
{
    ...
    "scripts": {
        "citest": "CI=true jest --reporters=default --reporters=jest-github-actions-reporter"
    }
}
```

## Options
| Option Name               | Type    | Default | Description                                                                                            |
| :------------------------ | :------ | :------ | :----------------------------------------------------------------------------------------------------- |
| `relativeDirectories`     | Boolean | false   | Print file paths relative to the project directory, instead of printing the absolute path of the file. |
| `postCodeCoverageComment` | Boolean | false   | Post code coverage table as a comment on PR's. **NOTE: Requires supplying a Github Access token**       |

The options can be defined in your `jest.config.js` like so:
```js
module.exports = {
  reporters: [
    "default",
    ["jest-github-actions-reporter", {
      relativeDirectories: true,
    }]
  ],
  testLocationInResults: true
};
```

## Example

`.github/workflows/CI.yaml`

```yaml
name: CI

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [10.x, 12.x]

    steps:
    - uses: actions/checkout@v1
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v1
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm ci
    - run: npm run build --if-present
    - run: npm citest
      env:
        CI: true
```

### Setting a github access token
When using github actions, the GITHUB_TOKEN secret is automatically available, so simply supply it as an input.
```yaml
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
``` 

## How does this work?

GitHub Actions supports a number of commands that allow you to provide rich experiences. See the [docs](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/development-tools-for-github-actions#set-an-error-message-error) for more information.
