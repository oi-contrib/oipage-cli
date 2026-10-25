# 可配置项

## name

服务器名称，默认OIPage。

## version

服务器版本，默认使用@oipage/cli版本。

## devServer

### open

是否自动打开浏览器，默认false，true表示打开；也可以是一段地址，比如设置open=“docs/index.html”。

### cache

是否开启304缓存，默认true，表示开启。

### gzip

> 始于 v0.3.0

是否开启 gzip 压缩，默认true，表示开启。

开启后，服务器会对支持 gzip 的客户端请求，自动压缩可压缩类型的文本资源（如 HTML、CSS、JS、JSON、SVG 等），可以有效减少传输体积，加快页面加载速度。

使用 Node.js 内置 `zlib` 模块实现，无需安装额外依赖。可通过命令行参数控制：

```shell
oipage-cli serve --gzip true
```

或在配置文件中开启：

```js
devServer: {
    gzip: true
}
```

### port

端口，默认8080。此外，可以在执行的时候，通过命令参数覆盖（下同）：

```shell
oipage-cli serve --config ./oipage.config.js -p 20000
```

### baseUrl

服务器根目录，默认当前命令行目录。可以是绝对路径，如果为相对路径，则是相对当前命令行目录。

### 404

自定义 404 页面，函数接收两个参数 filePath（文件磁盘路径） 和 url（请求地址）。

```js
404: function (filePath, url) {
    return "<h1>自定义的 404 页面</h1><p>你访问的页面不存在！</p>";
} 
```

### proxy

转发功能

```js
proxy: {
    "/apidemo": {
        target: "https://oi-contrib.github.io/OIPage",
        pathRewrite: { '^/apidemo': '' }, // 地址重写，可选
    }
}
```

### intercept

请求拦截，可以实现针对特殊请求的自定义处理。

```js
intercept: Array<{
    test: /\.do$/,
    handler(request, response) {
        // todo
    }
}>
```

## module

### rules

用于处理特殊文件，其中use的参数source为原始内容，此函数返回处理后的内容。此外，此函数的this包含若干有用属性或方法，具体如下：

- root: 字符串，服务器根路径。

- setFileType: 函数，用于设置文件类型。比如如果希望设置为js文件：

```js
this.setFileType("application/javascript")
```

- path: 字符串，文件相对路径。

- entry: 布尔值，是否是浏览器地址栏直接访问。