const pkg = require("../../../package.json");

module.exports = function () {
    return {
        'Access-Control-Allow-Origin': '*',
        'Server': 'Powered by @oipage/cli:website@' + pkg.version,
        'Content-Type': 'text/plain;charset=utf-8'
    };
};