import table from "markdown-table";
import path from "path";

import { getInput } from "@actions/core";
import { issueCommand, issue } from "@actions/core/lib/command";
import { context, getOctokit } from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";

interface GitHubActionsReporterOptions {
    relativeDirectories?: boolean;
}

type File = {
    relative: string;
    fileName: string;
    path: string;
    coverage: jest.CoverageSummary;
};

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
                .filter((x) => x.numFailingTests > 0)
                .forEach(({ testResults }: jest.TestResult) => {
                    for (const testResult of testResults) {
                        this.printTestResult(testResult);
                    }
                });
        }

        issue("endgroup");

        if (result.coverageMap) {
            console.log("Posting code coverage results as comment");

            this.postCodeCoverage(result.coverageMap);
        }
    }

    private printTestResult(testResult: jest.AssertionResult) {
        for (const failureMessage of testResult.failureMessages) {
            const match = this.regex.exec(failureMessage);
            if (match && match.length > 2) {
                const args = {
                    file: match[1],
                    line: match[2],
                    col: match[3],
                };

                if (this.options.relativeDirectories !== false) {
                    args.file = args.file.substr(process.cwd().length + 1);
                }

                issueCommand("error", args, failureMessage);
            }
        }
    }

    private async postCodeCoverage(coverageMap: jest.CoverageMap) {
        const githubToken = getInput("github-token");
        const octokit = getOctokit(githubToken);

        const t = this.generateCoverageTable(coverageMap);

        await octokit.issues.createComment({
            repo: context.repo.repo,
            owner: context.repo.owner,
            body: t,
            issue_number: context.payload.number,
        });
    }

    private generateCoverageTable(coverageMap: jest.CoverageMap) {
        const formatIfPoor = (number: number, threshold = 50): string => {
            return number < threshold ? `${number} :red_circle:` : `${number} :green_circle:`;
        };

        const summaryToRow = (f: jest.CoverageSummary) => [
            formatIfPoor(f.statements.pct!),
            formatIfPoor(f.branches.pct!),
            formatIfPoor(f.functions.pct!),
            formatIfPoor(f.lines.pct!),
        ];

        const parseFile = (absolute: string) => {
            const relative = path.relative(process.cwd(), absolute);
            const fileName = path.basename(relative);
            const p = path.dirname(relative);
            const coverage = coverageMap.fileCoverageFor(absolute).toSummary();
            return { relative, fileName, path: p, coverage };
        };

        const groupByPath = (dirs: { [key: string]: File[] }, file: File) => {
            if (!(file.path in dirs)) {
                dirs[file.path] = [];
            }

            dirs[file.path].push(file);

            return dirs;
        };

        const header = ["File", "% Statements", "% Branch", "% Funcs", "% Lines"];
        const summary = (coverageMap.getCoverageSummary() as unknown) as jest.CoverageSummary;
        const summaryRow = ["**All**", ...summaryToRow(summary)];

        const files = coverageMap.files().map(parseFile).reduce(groupByPath, {});

        const rows = Object.entries(files)
            .map(([dir, files]) => [
                [` **${dir}**`, "", "", "", ""], // Add metrics for directories by summing files
                ...files.map((file) => {
                    const name = `\`${file.fileName}\``;
                    return [`  ${name}`, ...summaryToRow(file.coverage)];
                }),
            ])
            .flat();

        return table([header, summaryRow, ...rows], { align: ["l", "r", "r", "r", "r"] });
    }
}

module.exports = GitHubActionsReporter;
