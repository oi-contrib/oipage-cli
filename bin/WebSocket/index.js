const net = require('net');
const crypto = require('crypto');

const headersToJSON = require('./headersToJSON');
const decodeWsFrame = require('./decodeWsFrame');
const encodeWsFrame = require('./encodeWsFrame');

module.exports = function (port, name, version, isRun) {
    let sockets = [];

    // 连接速率限制：每IP每分钟最多允许的连接数
    const RATE_LIMIT = 20;
    const RATE_WINDOW = 60000; // 1分钟
    const connectionCount = {};

    // 定期清理连接计数器
    setInterval(() => {
        for (let ip in connectionCount) {
            delete connectionCount[ip];
        }
    }, RATE_WINDOW);

    let handler = {
        notifyBrowser: (msg) => {
            for (let socket of sockets) {
                socket.write(encodeWsFrame(msg));
            }
        }
    };

    const server = net.createServer(socket => {

        // 连接速率限制
        const ip = socket.remoteAddress;
        connectionCount[ip] = (connectionCount[ip] || 0) + 1;
        if (connectionCount[ip] > RATE_LIMIT) {
            socket.destroy();
            return;
        }

        // 错误
        socket.on('error', (error) => {
            console.log('Connection error:', error.message);
        });

        // 连接
        socket.once('data', buffer => {

            // 协议过滤：只接受以 HTTP 方法开头的连接，拒绝扫描器探测
            // 2026年8月9日 于南宁
            const head = buffer.toString('ascii', 0, 20);
            if (!/^(GET|POST|OPTIONS|HEAD|PUT|DELETE|PATCH) /i.test(head)) {
                socket.destroy();
                return;
            }

            // 把请求头变成容易操作的json
            const headers = headersToJSON(buffer.toString());

            // 如果是ws请求
            // 就需要建立连接
            if (headers.Upgrade == 'websocket') {

                if (headers['Sec-WebSocket-Version'] !== '13') {
                    console.log('\r\n警告：当前WebSocket版本为' + headers['Sec-WebSocket-Version'] + "，可能存在兼容问题~\r\n");
                }

                // 开始连接
                /*
                    协议中规定的校验用GUID，可参考如下链接：
                    https://tools.ietf.org/html/rfc6455#section-5.5.2
                    https://stackoverflow.com/questions/13456017/what-does-258eafa5-e914-47da-95ca-c5ab0dc85b11-means-in-websocket-protocol
                */
                const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
                const key = headers['Sec-WebSocket-Key'];
                const hash = crypto.createHash('sha1');  // 创建一个签名算法为sha1的哈希对象

                hash.update(`${key}${GUID}`);  // 将key和GUID连接后，更新到hash
                const result = hash.digest('base64'); // 生成base64字符串
                const header = `HTTP/1.1 101 Switching Protocols\r\nServer: Powered by ${name}@${version}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-Websocket-Accept: ${result}\r\n\r\n`; // 生成供前端校验用的请求头

                socket.write(header);  // 返回HTTP头，告知客户端校验结果，HTTP状态码101表示切换协议：https://httpstatuses.com/101。
                // 若客户端校验结果正确，在控制台的Network模块可以看到HTTP请求的状态码变为101 Switching Protocols，同时客户端的ws.onopen事件被触发。

                sockets.push(socket);
            }

            // 否则就普通的，
            // 普通的由http服务器提供支持
            else {
                socket.destroy();

            }
        });
    });

    if (isRun) {

        // 启动
        server.listen(port);

        console.log('<i> \x1b[1m\x1b[32m[' + name + '] Loopback: \x1b[36mws://localhost:' + port + '/\x1b[0m\n');
    }

    return handler;
};
