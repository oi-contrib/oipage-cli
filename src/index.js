const { mergeOption } = require("oipage/nodejs/option/index");

// 开发服务器
exports.serve = function (config) {
    let option = {
        devServer: {
            port: 8080,
            baseUrl: "./",
            open: false,
            cache: true,
            proxy: {},
            intercept: [],
            404: null,
            website: false
        },
        module: {
            rules: []
        }
    };

    mergeOption(option, config);
    require("../bin/serve")(option);
};

exports.ZipaperIntercept = require("../bin/website-plugins/intercept/oipage-zipaper-intercept.js");
exports.VISLiteIntercept = require("../bin/website-plugins/intercept/oipage-vislite-intercept.js");

exports.ScssLoader = require("../bin/website-plugins/loader/oipage-scss-loader.js");
exports.HtmlLoader = require("../bin/website-plugins/loader/oipage-html-loader.js");