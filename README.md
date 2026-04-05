# [@oipage/cli](https://github.com/oi-contrib/oipage-cli)
开发快速助手，一个包含常用功能的命令行工具，旨在提升开发效率

<p>
    <a href="https://zxl20070701.github.io/toolbox/#/npm-download?packages=@oipage/cli&interval=7">
        <img src="https://img.shields.io/npm/dm/@oipage/cli.svg" alt="downloads">
    </a>
    <a href="https://www.npmjs.com/package/@oipage/cli">
        <img src="https://img.shields.io/npm/v/@oipage/cli.svg" alt="npm">
    </a>
    <a href="https://github.com/oi-contrib/oipage-cli/issues">
        <img src="https://img.shields.io/github/issues/oi-contrib/oipage-cli" alt="issue">
    </a>
    <a href="https://github.com/oi-contrib/oipage-cli" target='_blank'>
        <img alt="GitHub repo stars" src="https://img.shields.io/github/stars/oi-contrib/oipage-cli?style=social">
    </a>
    <a href="https://github.com/oi-contrib/oipage-cli">
        <img src="https://img.shields.io/github/forks/oi-contrib/oipage-cli" alt="forks">
    </a>
     <a href="https://gitee.com/oi-contrib/oipage-cli" target='_blank'>
        <img alt="Gitee repo stars" src="https://gitee.com/oi-contrib/oipage-cli/badge/star.svg">
    </a>
    <a href="https://gitee.com/oi-contrib/oipage-cli">
        <img src="https://gitee.com/oi-contrib/oipage-cli/badge/fork.svg" alt="forks">
    </a>
</p>

<img src="https://nodei.co/npm/@oipage/cli.png?downloads=true&amp;downloadRank=true&amp;stars=true" alt="NPM">

## 如何使用？

作为一个命令行，你可以全局安装：

```shell
npm install -g @oipage/cli
```

也可以作为项目开发中的一个功能加强，在 package.json 中配置命令使用，那么就在项目中执行安装命令：

```shell
npm install @oipage/cli --save
```

安装后，就可以使用了，先打印帮助信息查看一下：

```shell
oipage-cli
```

比如会出现类似下列内容：

```
@oipage/cli@v0.1.0

可以使用的命令如下：

【1】oipage-cli serve 开发服务器
    --port|-p 端口号
    --baseUrl 服务器根目录
......
```

根据提示我们知道，比如第一个命令，其提供了一个快速访问本地资源服务器的功能，执行：

```shell
oipage-cli serve -p 8080
```

启动成功后，直接访问： http://localhost:8080/ 即可。

### oipage.config.js

通过配置文件 `oipage.config.js` 可以对服务器进行更精细化的配置：

```shell
oipage-cli serve --config ./oipage.config.js
```

其中 `oipage.config.js` 格式如下：

```js
module.exports = {
    devServer: {
        port: 20000,
        baseUrl: "./"
    },
    module: {
        rules: [{ // 配置对文件的自定义处理
            test: /\.html$/, // 匹配文件，如果多个匹配到，只会选用第一个
            use(source) { return source }
        }]
    }
}
```

上述一级配置项（devServer、module等）皆可选，按需配置即可，具体可以查看[ 可配置项 ](./docs/config.md)查看详情。

### 作为API使用

当然，也可以使用API的方式，比如：

```js
const { serve } = require("@oipage/cli");

serve({
    devServer: {
        port: 20000,
        baseUrl: "./"
    }
});
```

### 可用插件

> 0.2.0 新增

```js
const { 
    ZipaperIntercept, // Zipaper框架引入
    VISLiteIntercept,  // VISLite库引入
    ScssLoader, // scss文件解析
    HtmlLoader, // html解析成json对象
} = require("@oipage/cli");
```

已有功能或更多功能我们将根据实际情况逐步完善和维护，当然，你可以通过 [issue](https://github.com/oi-contrib/oipage-cli/issues) 给我们留言，告诉我们你的改进意见。

## 版权

MIT License

Copyright (c) [zxl20070701](https://zxl20070701.github.io/notebook/home.html) 走一步，再走一步
