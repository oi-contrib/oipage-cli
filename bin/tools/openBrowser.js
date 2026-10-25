const { exec } = require('child_process');
const os = require('os');

module.exports = function (url) {

    // 防止命令注入
    // 对 URL 进行严格校验（仅允许 http:// 或 https:// 开头，拒绝特殊字符）
    // 2026年8月9日 于南宁
    if (/^http:\/\//.test(url) || /^https:\/\//.test(url)) {

        const platform = os.platform();
        let command;

        switch (platform) {
            case 'win32': // Windows
                command = `start ${url}`;
                break;
            case 'darwin': // macOS
                command = `open ${url}`;
                break;
            default: // Linux及其他
                command = `xdg-open ${url}`;
        }

        exec(command, (error) => {
            if (error) {
                console.error(`无法打开浏览器: ${error}`);
            } else {
                // todo
            }
        });
    } else {
        console.error('请输入正确的url');
    }
}