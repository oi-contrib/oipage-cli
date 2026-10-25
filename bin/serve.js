const { join, resolve, sep } = require("path");
const { existsSync, lstatSync, statSync, createReadStream } = require("fs");
const { createServer } = require('http');
const { gzipSync, createGzip } = require("zlib");
const packageValue = require("../package.json");
const network = require("./tools/network.js");
const mineTypes = require("./data/mineTypes.json");
const resolveImportFactory = require("./tools/resolveImport.js");
const openBrowser = require("./tools/openBrowser.js");
const { doIntercept } = require("./intercept.js");
const proxy = require("./proxy.js");
const resolve404_default = require("./tools/resolve404.js");
const isBinary = require("./tools/isBinary.js");
const websiteIntercept = require("./website-plugins/intercept/index.js");
const websiteLoader = require("./website-plugins/loader/index.js");

const WebSocketClass = require("./WebSocket/index.js");

// 可压缩的 MIME 类型集合（文本类资源，压缩收益大）
const compressibleTypes = new Set([
    "text/html", "text/css", "text/plain", "text/xml", "text/mathml",
    "text/vnd.sun.j2me.app-descriptor", "text/vnd.wap.wml", "text/x-component",
    "application/javascript", "application/json", "application/xml",
    "application/xhtml+xml", "application/atom+xml", "application/rss+xml",
    "application/xspf+xml", "application/x-tcl", "application/x-perl",
    "image/svg+xml"
]);

// 需要设置 charset 的 MIME 类型前缀/精确匹配集合
// 文本类资源需要 charset 告知浏览器字符编码，二进制资源不需要
const charsetPrefixes = ["text/"];
const charsetTypes = new Set([
    "application/javascript", "application/json", "application/xml",
    "application/xhtml+xml", "application/atom+xml", "application/rss+xml",
    "application/xspf+xml", "application/x-tcl", "application/x-perl",
    "application/rtf", "application/postscript",
    "application/vnd.google-earth.kml+xml", "application/x-javascript",
    "image/svg+xml"
]);

/**
 * 根据 MIME 类型构建 Content-Type 值
 * 文本类型追加 charset=utf-8，二进制类型不追加
 * @param {string} mimeType MIME 类型
 * @returns {string} 完整的 Content-Type 值
 */
function buildContentType(mimeType) {
    if (!mimeType) return "text/plain;charset=utf-8";
    if (charsetPrefixes.some(prefix => mimeType.startsWith(prefix))) {
        return mimeType + ";charset=utf-8";
    }
    if (charsetTypes.has(mimeType)) {
        return mimeType + ";charset=utf-8";
    }
    return mimeType;
}

// 开发服务器
module.exports = function (config) {
    let startTime = new Date().valueOf();

    const resolve404 = config.devServer["404"] || resolve404_default;
    const cache = "cache" in config.devServer ? config.devServer.cache : true;
    const website = "website" in config.devServer ? config.devServer.website : true;
    const gzip = "gzip" in config.devServer ? config.devServer.gzip : false;
    const port = +config.devServer.port; // 端口号
    const basePath = resolve((/^\./.test(config.devServer.baseUrl)) ? join(process.cwd(), config.devServer.baseUrl) : config.devServer.baseUrl); // 服务器根路径

    const name = (config.name || "OIPage") + "-http-server";
    const version = config.version || packageValue.version;

    const wsHandler = WebSocketClass(port + 1, (config.name || "OIPage") + "-ws-server", version, website);

    // 全局错误捕获，防止服务器因任何未捕获的错误而停机
    // 2026年8月8日 于南宁
    process.on('uncaughtException', function (err) {
        console.log("<i> \x1b[1m\x1b[31m[" + name + "] uncaughtException: " + err.message + "\x1b[0m " + new Date().toLocaleString());
        console.log(err.stack);
    });
    process.on('unhandledRejection', function (reason) {
        console.log("<i> \x1b[1m\x1b[31m[" + name + "] unhandledRejection: " + (reason && reason.message || reason) + "\x1b[0m " + new Date().toLocaleString());
    });

    let Server = createServer(function (request, response) {
        let headers = request.headers;

        const rawIp = (request.socket.remoteAddress || '').replace(/^::ffff:/, "").replace(/^::1/, "127.0.0.1");

        let url;
        try {

            // 上游网关二次解码的架构层面风险（%252e 双重编码），导致文件路径被二次解码，导致路径穿越漏洞
            // 后续处理中，对url不要再decodeURIComponent进行解码，防止路径穿越漏洞
            // 2026年8月9日 于南宁
            url = decodeURIComponent(request.url);
        } catch (e) {

            // 如果 URL 包含无效的百分号编码（如 %ZZ），decodeURIComponent 会抛出 URIError
            // 虽然被 uncaughtException 捕获，但会导致当前请求处理中断且无响应返回，客户端会挂起等待
            // 2026年8月9日 于南宁
            response.writeHead(400, {
                'Content-Type': buildContentType('text/plain'),
                'Access-Control-Allow-Origin': '*',
                'Server': 'Powered by ' + name + '@' + version
            });
            response.end('Bad Request');
            return;
        }

        let urlArray = url.split("?");
        url = urlArray[0];

        // 请求的文件路径
        let filePath;

        let isWebsite = website && /^\/@website\//.test(url);
        if (isWebsite) {
            filePath = join(__dirname, "./website-htmls/", url.replace(/^\/@website\//, ""));
        } else {
            filePath = join(basePath, url == "/" ? "index.html" : url.replace(/^\//, ""));
        }

        filePath = resolve(filePath);

        let proxyIntercept = proxy({
            name,
            version
        }, config.devServer.proxy || {});
        delete config.devServer.proxy;
        for (let i = 0; i < proxyIntercept.length; i++) {
            config.devServer.intercept.push(proxyIntercept[i]);
        }

        // 请求拦截
        if (doIntercept(url.replace(/^\/@website/, "").replace(/^\/@modules\//, ""), isWebsite ? websiteIntercept : config.devServer.intercept, request, response, wsHandler)) {
            console.log("<i> \x1b[1m\x1b[32m[" + name + "] intercept: " + url + '\x1b[0m ' + new Date().toLocaleString() + " " + rawIp);
        } else {

            // 对应前置都没有找到的，默认去当前命令行找
            // 2026年4月13日 于南京
            if (/^\/@modules\//.test(url)) {
                filePath = join(process.cwd(), url.replace(/^\/@modules\//, "node_modules/"))
            }

            // 禁止访问沙箱外文件，路径穿越拦截
            // 2026年8月8日 于南宁
            if ((!(filePath.startsWith(basePath + sep) || filePath === basePath) &&
                !(filePath.startsWith(process.cwd() + sep) || filePath === process.cwd())
            ) || filePath.includes('\0')) {
                response.writeHead(403, {
                    'Content-Type': buildContentType("text/plain"),
                    'Access-Control-Allow-Origin': '*',
                    'Server': 'Powered by ' + name + '@' + version
                });
                response.write("Path Traversal attack");
                response.end();
                console.log("<i> \x1b[1m\x1b[31m[" + name + "] Path Traversal attack, path: " + url + "\x1b[0m " + new Date().toLocaleString() + " " + rawIp);
                return;
            }

            // 如果存在且是文件
            if (existsSync(filePath) && !lstatSync(filePath).isDirectory()) {

                // 判断是否是请求而无需进一步解析
                // 2025年12月5日 于南京
                let isXHR = headers["sec-fetch-dest"] === "empty";

                let dotName = (filePath.match(/\.([^.]+)$/) || [])[1] || "";
                let fileType = mineTypes[dotName]; // 文件类型
                let fileInfo = statSync(filePath);

                let fileModifiedTime = new Date(fileInfo.mtime).toGMTString();

                let responseHeader = {
                    'Content-Type': buildContentType(fileType || "text/plain"),
                    'Access-Control-Allow-Origin': '*',
                    'Server': 'Powered by ' + name + '@' + version,
                    'Cache-Control': 'no-cache',
                    // 'Content-Length': fileInfo.size, // 会导致拦截修改的文本内容不对

                    // 与if-modified-since配合使用，做缓存验证
                    'Last-Modified': fileModifiedTime,

                    // 与if-none-match配合使用，做缓存验证
                    // ETag 包含 gzip 标志，确保 gzip 配置变化时缓存正确失效
                    'ETag': '"' + fileInfo.mtime.getTime() + (gzip ? '-gz' : '') + '"',

                    // 告知代理/缓存：响应内容会根据 Accept-Encoding 不同而变化
                    'Vary': 'Accept-Encoding'
                };

                if (cache && headers["if-modified-since"]) {
                    let ifModifiedSince = new Date(headers["if-modified-since"]).valueOf()
                    let lastModified = new Date(fileModifiedTime).valueOf()

                    // 注意这里不能使用<=，否则
                    // 1、会出现时区问题
                    // 2、作为开发服务器，可能同一个url地址对应的文件不同，被误判为未修改
                    // 2025年12月29日 于南京
                    // if (lastModified <= ifModifiedSince) {}

                    // 同时检查 ETag（If-None-Match），确保 gzip 配置变化时不会错误返回 304
                    // 比如：gzip 从关闭改为开启，响应内容从原始变为压缩，ETag 不同，必须重新传输
                    // 2026年08月15日 于南宁
                    let etagMatch = !headers["if-none-match"] || headers["if-none-match"] === responseHeader['ETag'];

                    if (lastModified === ifModifiedSince && etagMatch) {
                        response.writeHead(304, responseHeader);
                        response.end();
                        console.log("<i> \x1b[1m\x1b[32m[" + name + "] Cache File: " + url + "\x1b[0m " + new Date().toLocaleString() + " \x1b[33m\x1b[1m304\x1b[0m" + (isXHR ? " \x1b[33m\x1b[1m" + request.method + "\x1b[0m" : "") + " " + rawIp);
                        return;
                    }
                }

                let sendType = "";
                let entry = headers.accept !== "*/*";

                // 判断是否需要 gzip 压缩：配置开启 && 客户端支持 && 文件类型可压缩
                let acceptEncoding = headers["accept-encoding"] || "";
                let shouldGzip = gzip && /\bgzip\b/.test(acceptEncoding) && compressibleTypes.has(fileType);

                // 如果文件小于1M且不是二进制，认为不大，直接读取
                // 如果是二进制文件，即使小于10M也使用流（避免不必要的加载器处理和import解析）
                if (fileInfo.size < 10 * 1024 * 1024 && !isBinary(filePath)) {
                    let { source, resolveImport } = resolveImportFactory(basePath, filePath, entry, isWebsite ? websiteIntercept : config.devServer.intercept, urlArray[1] === "download", isWebsite)

                    // 只处理非下载文件
                    // 过大的也不进行处理
                    // （对website无效）
                    if (urlArray[1] !== "download") {
                        let loaders = isWebsite ? websiteLoader : config.module;

                        for (let i = 0; i < loaders.rules.length; i++) {
                            if (loaders.rules[i].test.test(filePath)) {
                                source = loaders.rules[i].use.call({
                                    root: basePath, // 服务器根路径
                                    path: filePath.replace(basePath, ""), // 文件相对路径
                                    entry, // 是否是浏览器地址栏直接访问
                                    setFileType(_fileType) { // 设置文件类型
                                        fileType = _fileType;
                                        responseHeader['Content-Type'] = buildContentType(_fileType);
                                    }
                                }, source);
                                break;
                            }
                        }

                    }

                    sendType = "Read";
                    let body = isXHR ? source : resolveImport(source, fileType !== "application/javascript");

                    // gzip 压缩后发送（需要重新判断 fileType，因为 loader 可能修改了它）
                    if (shouldGzip && compressibleTypes.has(fileType)) {
                        responseHeader['Content-Encoding'] = 'gzip';
                        body = gzipSync(Buffer.from(body));
                    }

                    response.writeHead(200, responseHeader);
                    response.write(body);
                    response.end();
                }

                // 对于大文件，使用流读取
                else {
                    sendType = "Stream";

                    if (shouldGzip) {
                        // gzip 流式压缩：文件大小变化，不能设置 Content-Length
                        responseHeader['Content-Encoding'] = 'gzip';
                        response.writeHead(200, responseHeader);
                        createReadStream(filePath).pipe(createGzip()).pipe(response);
                    } else {
                        responseHeader['Content-Length'] = fileInfo.size

                        response.writeHead(200, responseHeader);
                        createReadStream(filePath).pipe(response);
                    }
                }

                console.log("<i> \x1b[1m\x1b[32m[" + name + "] " + sendType + " File: " + url + '\x1b[0m ' + new Date().toLocaleString() + (shouldGzip ? " \x1b[33m\x1b[1mgzip\x1b[0m" : "") + (isXHR ? " \x1b[33m\x1b[1m" + request.method + "\x1b[0m" : "") + " " + rawIp);
            }

            // 否则就是404
            else {
                response.writeHead(404, {
                    'Content-Type': buildContentType("text/html"),
                    'Access-Control-Allow-Origin': '*',
                    'Server': 'Powered by ' + name + '@' + version
                });
                response.write(resolve404(filePath, url, website, config.name || "OIPage", rawIp));
                response.end();
            }
        }

    });

    Server.listen(port);

    // 获取网络信息
    let networkValue = network();

    // 打印成功提示
    console.log('<i> \x1b[1m\x1b[32m[' + name + '] Project is running at:\x1b[0m');
    console.log('<i> \x1b[1m\x1b[32m[' + name + '] Loopback: \x1b[36mhttp://localhost:' + port + '/\x1b[0m');
    for (let ipv4Item of networkValue.IPv4) console.log('<i> \x1b[1m\x1b[32m[' + name + '] On Your Network (IPv4):\x1b[36m http://' + ipv4Item.address + ':' + port + '/\x1b[0m');
    for (let ipv6Item of networkValue.IPv6) console.log('<i> \x1b[1m\x1b[32m[' + name + '] On Your Network (IPv6): \x1b[36mhttp://[' + ipv6Item.address + ']:' + port + '/\x1b[0m');
    console.log('<i> \x1b[1m\x1b[32m[' + name + '] Content not from ' + (config.name || "OIPage") + ' is served from \x1b[36m"' + basePath + '" \x1b[0mdirectory');

    if (typeof config.devServer.open === "string" || config.devServer.open) {
        let url = 'http://localhost:' + port + "/" + (typeof config.devServer.open === "string" ? config.devServer.open : "");
        openBrowser(url);
        console.log('<i> \x1b[1m\x1b[32m[' + name + '] Open: \x1b[36m' + url + '\x1b[0m');
    }

    if (!cache) console.log('<i> \x1b[1m\x1b[32m[' + name + '] Cancel 304 Cache!\x1b[0m');
    if (gzip) console.log('<i> \x1b[1m\x1b[32m[' + name + '] Gzip Compression: \x1b[36menabled\x1b[0m');
    console.log('\n' + (config.name || "OIPage") + ' ' + version + ' compiled \x1b[1m\x1b[32msuccessfully\x1b[0m in ' + (new Date().valueOf() - startTime) + ' ms\n');
};