const { openSync, readSync, closeSync } = require("fs");
const mineTypes = require("../data/mineTypes.json");

// 读取文件头部用于判断的字节数
const CHECK_BYTES = 4096;

// 文本类型白名单（即使 Content-Type 是 application/* 也视为文本）
// 仅在文件内容读取失败时作为回退判断依据
const TEXT_TYPES = new Set([
    "application/javascript",
    "application/json",
    "application/xml",
    "application/xhtml+xml",
    "application/rss+xml",
    "application/atom+xml",
    "image/svg+xml",
    "application/xspf+xml",
    "application/vnd.google-earth.kml+xml"
]);

/**
 * 通过后缀名回退判断（仅在文件内容读取失败时使用）
 * @param {string} filepath 文件路径
 * @returns {boolean} 是否为二进制文件
 */
function isBinaryByExtension(filepath) {
    const dotName = (filepath.match(/\.([^.]+)$/) || [])[1] || "";
    const fileType = mineTypes[dotName];

    if (!fileType) {
        // 未知类型默认视为二进制
        return true;
    }

    if (fileType.startsWith("text/")) {
        return false;
    }

    if (TEXT_TYPES.has(fileType)) {
        return false;
    }

    return true;
}

/**
 * 判断文件是否是二进制文件
 * 通过读取文件前若干字节，检查是否包含 NULL 字节（\0）来判断
 * 文本文件（UTF-8/ASCII）通常不包含 NULL 字节，而二进制文件通常包含
 * 如果文件读取失败，回退到后缀名判断
 * @param {string} filepath 文件路径
 * @returns {boolean} 是否为二进制文件
 */
module.exports = function isBinary(filepath) {
    let fd;
    try {
        fd = openSync(filepath, 'r');
        const buffer = Buffer.alloc(CHECK_BYTES);
        const bytesRead = readSync(fd, buffer, 0, CHECK_BYTES, 0);

        // 检查是否包含 NULL 字节
        // NULL 字节是二进制文件的可靠标志，文本文件（UTF-8/ASCII）不会包含
        for (let i = 0; i < bytesRead; i++) {
            if (buffer[i] === 0) {
                return true;
            }
        }

        return false;
    } catch (e) {
        // 文件读取失败时，回退到后缀名判断
        console.log(e);
        return isBinaryByExtension(filepath);
    } finally {
        if (fd !== undefined) {
            try {
                closeSync(fd);
            } catch (e) {
                // 关闭失败不影响判断结果
            }
        }
    }
};
