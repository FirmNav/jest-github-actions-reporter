"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const markdown_table_1 = __importDefault(require("markdown-table"));
const path_1 = __importDefault(require("path"));
const core_1 = require("@actions/core");
const command_1 = require("@actions/core/lib/command");
const github_1 = require("@actions/github");
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
                .filter((x) => x.numFailingTests > 0)
                .forEach(({ testResults }) => {
                for (const testResult of testResults) {
                    this.printTestResult(testResult);
                }
            });
        }
        command_1.issue("endgroup");
        if (result.coverageMap) {
            console.log("Posting code coverage results as comment");
            this.postCodeCoverage(result.coverageMap);
        }
    }
    printTestResult(testResult) {
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
                command_1.issueCommand("error", args, failureMessage);
            }
        }
    }
    async postCodeCoverage(coverageMap) {
        const githubToken = core_1.getInput("github-token");
        const octokit = github_1.getOctokit(githubToken);
        const t = this.generateCoverageTable(coverageMap);
        await octokit.issues.createComment({
            repo: github_1.context.repo.repo,
            owner: github_1.context.repo.owner,
            body: t,
            issue_number: github_1.context.payload.number,
        });
    }
    generateCoverageTable(coverageMap) {
        const formatIfPoor = (number, threshold = 50) => {
            return number < threshold ? `${number} :red_circle:` : `${number} :green_circle:`;
        };
        const summaryToRow = (f) => [
            formatIfPoor(f.statements.pct),
            formatIfPoor(f.branches.pct),
            formatIfPoor(f.functions.pct),
            formatIfPoor(f.lines.pct),
        ];
        const parseFile = (absolute) => {
            const relative = path_1.default.relative(process.cwd(), absolute);
            const fileName = path_1.default.basename(relative);
            const p = path_1.default.dirname(relative);
            const coverage = coverageMap.fileCoverageFor(absolute).toSummary();
            return { relative, fileName, path: p, coverage };
        };
        const groupByPath = (dirs, file) => {
            if (!(file.path in dirs)) {
                dirs[file.path] = [];
            }
            dirs[file.path].push(file);
            return dirs;
        };
        const header = ["File", "% Statements", "% Branch", "% Funcs", "% Lines"];
        const summary = coverageMap.getCoverageSummary();
        const summaryRow = ["**All**", ...summaryToRow(summary)];
        const files = coverageMap.files().map(parseFile).reduce(groupByPath, {});
        const rows = Object.entries(files)
            .map(([dir, files]) => [
            [` **${dir}**`, "", "", "", ""],
            ...files.map((file) => {
                const name = `\`${file.fileName}\``;
                return [`  ${name}`, ...summaryToRow(file.coverage)];
            }),
        ])
            .flat();
        return markdown_table_1.default([header, summaryRow, ...rows], { align: ["l", "r", "r", "r", "r"] });
    }
}
module.exports = GitHubActionsReporter;
