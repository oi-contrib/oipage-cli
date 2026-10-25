const { readdirSync, lstatSync, readFileSync, statSync } = require("fs");
const { join } = require("path");
const { formatByte, formatTime } = require("./format");
const mineTypes = require("../data/mineTypes.json");

// HTML 实体转义，防止 XSS
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// URL 路径编码，防止 href 属性注入
function encodePath(str) {
    return encodeURIComponent(str);
}

const img_folder = "data:image/png;base64," + readFileSync(join(__dirname, "../images/folder.png")).toString('base64');
const img_file = "data:image/png;base64," + readFileSync(join(__dirname, "../images/file.png")).toString('base64');

const template_404 = readFileSync(join(__dirname, "../template/404.html"), {
    encoding: "utf8"
})
    .replace("${img_folder}", img_folder)
    .replace("${img_file}", img_file);

module.exports = function (filePath, url, website, name, rawIp) {

    let subItems = [];

    try {
        subItems = readdirSync(filePath);
        console.log("<i> \x1b[1m\x1b[32m[" + name + "-http-server] Read Folder: " + url + '\x1b[0m ' + new Date().toLocaleString() + " " + rawIp);
    } catch (e) {
        console.log("<i> \x1b[1m\x1b[32m[" + name + "-http-server] Read " + (/\/$/.test(url) ? "Folder" : "File") + ": \x1b[35m" + url + ' 404 Not Found\x1b[0m ' + new Date().toLocaleString() + " " + rawIp);
        try {
            if (!/\/$/.test(url) || url === "/") {
                filePath = join(filePath, "../");
                subItems = readdirSync(filePath);
            }
        } catch (e) { }
    }

    let template = "";
    for (let i in subItems) {
        let isDirectory = lstatSync(join(filePath, subItems[i])).isDirectory();
        let statObj = statSync(join(filePath, subItems[i]));

        // 文件夹
        if (isDirectory) {
            template += `<tr class="folder">
            <th class="name">
                <a href='./${encodePath(subItems[i])}/'>${escapeHtml(subItems[i])}</a>
            </th>
            <th>
                ${formatTime(statObj.mtime)}
            </th>
            <th>
                文件夹
            </th>
            <th>
                -
            </th>
            <th>
                <a href='./${encodePath(subItems[i])}/' class="btn">打开</a>
            </th>
        </tr>`;
        }

        // 文件
        else {
            let dotName = (subItems[i].match(/\.([^.]+)$/) || [])[1] || "";

            template += `<tr class="file">
            <th class="name">
                <a href='./${encodePath(subItems[i])}'>${escapeHtml(subItems[i])}</a>
            </th>
            <th>
                ${formatTime(statObj.mtime)}
            </th>
            <th>
                ${mineTypes[dotName] || "text/plain"}
            </th>
            <th>
            ${formatByte(statObj.size)}
        </th>
            <th>
                <a href='./${encodePath(subItems[i])}' class="btn">访问</a>
                <a href='./${encodePath(subItems[i])}?download' class="btn" download='${escapeHtml(subItems[i])}'>下载</a>
            </th>
        </tr>`;
        }
    }

    return template_404.replace("${website}", website ? '<a class="website-link" href="/@website/index.html">打开应用市场</a>' : '').replace("${current}", escapeHtml(filePath)).replace("${template}", template);
};