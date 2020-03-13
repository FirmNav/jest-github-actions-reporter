"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@actions/core/lib/command");
class GitHubActionsReporter {
    constructor(globalConfig, options) {
        this.globalConfig = globalConfig;
        this.regex = /\((.+?):(\d+):(\d+)\)/;
        this.options = {
            relativeDirectories: false,
        };
        Object.assign(this.options, options);
    }
    onTestStart(test) { }
    onTestResult(test, testResult, result) { }
    onRunComplete(contexts, result) {
        command_1.issue("group", "Jest Annotations");
        if (result.numFailedTests > 0) {
            result.testResults
                .filter(x => x.numFailingTests > 0)
                .forEach(({ testResults }) => {
                for (const testResult of testResults) {
                    this.printTestResult(testResult);
                }
            });
        }
        command_1.issue("endgroup");
    }
    printTestResult(testResult) {
        for (const failureMessage of testResult.failureMessages) {
            const match = this.regex.exec(failureMessage);
            if (match && match.length > 2) {
                const args = {
                    file: match[1],
                    line: match[2],
                    col: match[3]
                };
                if (this.options.relativeDirectories !== false) {
                    args.file = args.file.substr(process.cwd().length + 1);
                }
                command_1.issueCommand("error", args, failureMessage);
            }
        }
    }
}
module.exports = GitHubActionsReporter;
