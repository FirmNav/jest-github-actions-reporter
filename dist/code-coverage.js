"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCodeCoverage = void 0;
const markdown_table_1 = __importDefault(require("markdown-table"));
const path_1 = __importDefault(require("path"));
const comment_1 = __importDefault(require("./comment"));
async function postCodeCoverage(coverageMap) {
    const header = "## Code Coverage\n";
    const coverageTable = generateCoverageTable(coverageMap);
    const content = header + coverageTable;
    return await comment_1.default(content);
}
exports.postCodeCoverage = postCodeCoverage;
function generateCoverageTable(coverageMap) {
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
function formatIfPoor(number) {
    if (number > 90) {
        return `${number} :green_circle:`;
    }
    if (number > 75) {
        return `${number} :yellow_circle:`;
    }
    if (number > 50) {
        return `${number} :orange_circle:`;
    }
    return `${number} :red_circle:`;
}
