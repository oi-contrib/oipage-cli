const { readFileSync, existsSync, statSync } = require("fs");
const { join } = require("path");
const { testIntercept } = require("../intercept.js");

module.exports = function (basePath, filePath, entry, intercept, isDownload, isWebsite) {
    basePath = join(basePath, "./");

    if (statSync(filePath).isDirectory()) { return { source: "", resolveImport: content => content }; }
    let source = readFileSync(filePath);
    let resolveImport = content => content;

    let __resolveImport = function (content) {
        return content.replace(/import [^'"]* from (['"])([^'"]*)['"]/sg, function (_importCode, _, _importUrl) {
            if (/^[./]/.test(_importUrl)) {
                return _importCode;
            } else {
                return _importCode.replace(_importUrl, _importUrl.replace(/((@[^/]+\/){0,1}[^/])+/s, function (npmName) {

                    if (testIntercept(npmName, intercept)) {
                        return (isWebsite ? "/@website/@modules/" : "/@modules/") + npmName;
                    } else {

                        let node_modulesRootPath = join(filePath, "../");
                        let prePath = "";
                        while (true) {
                            let npmBundlePath = join(node_modulesRootPath, "./node_modules/", npmName);

                            // 如果存在
                            if (existsSync(npmBundlePath) && statSync(npmBundlePath).isDirectory()) {
                                let npmNameValue = npmName;

                                // 对于类似 import VISLite from "vislite"
                                // 需要把包名解析成具体的文件
                                if (!/\//.test(_importUrl

                                    // 兼容 "@oipage/browser.js" 类似的包
                                    // 2026年09月11日 于南宁
                                    .replace(/@[^/]+\//, ""))) {
                                    let bundlePackage = require(join(npmBundlePath, "./package.json"));
                                    npmNameValue = npmName + "/" + bundlePackage.main;
                                }

                                return (prePath ? prePath : "./") + "node_modules/" + npmNameValue;
                            }

                            if (node_modulesRootPath === basePath) {

                                // 如果命令行根目录是一个项目
                                let packagePath = join(basePath, "./package.json");

                                // statSync代替lstatSync，修复符号链接指向文件夹时无法正确判断文件
                                // 2026年09月10日 于南宁
                                if (existsSync(packagePath) && !statSync(packagePath).isDirectory()) {
                                    let bundlePackage = require(packagePath);
                                    if (!/\//.test(_importUrl)) {
                                        return "/" + bundlePackage.main;
                                    } else {
                                        return "/"
                                    }
                                }

                                return "/@modules/" + npmName;
                            } else {
                                node_modulesRootPath = join(node_modulesRootPath, "../");
                                prePath = "../" + prePath;
                            }
                        }

                    }
                }));
            }
        });
    };

    // 如果是下载
    if (isDownload) {
        // todo
    }

    // 如果不是直接访问的
    else if (!entry) {
        source += "";
        resolveImport = (content, notResolve) => notResolve ? content : __resolveImport(content);
    }

    // 如果是.html或.htm结尾
    else if (/\.html{0,1}$/.test(filePath)) {
        source = (source + "").replace(/<script type="module">(.*)<\/script>/sg, function (_, _matchCode) {
            return `<script type="module">${__resolveImport(_matchCode)}</script>`;
        });
    }

    return {
        source,
        resolveImport
    };
};