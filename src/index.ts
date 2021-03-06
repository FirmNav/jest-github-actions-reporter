import { issueCommand, issue } from "@actions/core/lib/command";

interface GitHubActionsReporterOptions {
    relativeDirectories?: boolean;
}

class GitHubActionsReporter implements jest.Reporter {
    private regex = /\((.+?):(\d+):(\d+)\)/;

    private options: GitHubActionsReporterOptions = {
        relativeDirectories: false,
    };

    constructor(public globalConfig: jest.GlobalConfig, options: GitHubActionsReporterOptions) {
        Object.assign(this.options, options);
    }

    public onTestStart(test: jest.Test) {}

    public onTestResult(test: jest.Test, testResult: jest.TestResult, result: jest.AggregatedResult) {}

    public onRunComplete(contexts: Set<jest.Context>, result: jest.AggregatedResult) {
        issue("group", "Jest Annotations");

        if (result.numFailedTests > 0) {
            result.testResults
                .filter(x => x.numFailingTests > 0)
                .forEach(({ testResults }: jest.TestResult) => {
                    for (const testResult of testResults) {
                        this.printTestResult(testResult);
                    }
                });
        }

        issue("endgroup");
    }

    private printTestResult(testResult: jest.AssertionResult) {
        for (const failureMessage of testResult.failureMessages) {
            const match = this.regex.exec(failureMessage);
            if (match && match.length > 2) {
                const args = {
                    file: match[1],
                    line: match[2],
                    col: match[3]
                };

                if(this.options.relativeDirectories !== false) {
                    args.file = args.file.substr(process.cwd().length + 1);
                }

                issueCommand("error", args, failureMessage);
            }
        }
    }
}

module.exports = GitHubActionsReporter;
