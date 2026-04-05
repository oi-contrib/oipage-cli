const headFactory = require("./head.js");
const getPackage = require("./getPackage.js");

const head = headFactory();

// VISLite库
module.exports = {
    test: /^vislite$/,
    handler(request, response) {
        head["Content-Type"] = "application/javascript;charset=utf-8";
        head["ETag"] = "VISLite@v" + require("vislite/package.json").version;

        if (request.headers["if-none-match"] === head["ETag"]) {
            response.writeHead('304', head);
            response.end();
            console.log("<i> \x1b[1m\x1b[32m[OIPage-http-server] Cache File: VISLite\x1b[0m " + new Date().toLocaleString() + "\x1b[33m\x1b[1m 304\x1b[0m");;
            return;
        }

        response.writeHead(200, head);

        let source =getPackage("vislite/lib/index.umd.min.js");

        response.write(`let module = { exports: {} };
let exports = module.exports;
${source}
export let Cardinal = module.exports.Cardinal;
export let Hermite = module.exports.Hermite;
export let Matrix4 = module.exports.Matrix4;
export let rotate = module.exports.rotate;
export let move = module.exports.move;
export let scale = module.exports.scale;
export let getLoopColors = module.exports.getLoopColors;
export let animation = module.exports.animation;
export let ruler = module.exports.ruler;
export let SVG = module.exports.SVG;
export let Canvas = module.exports.Canvas;
export let RawCanvas = module.exports.RawCanvas;
export let getWebGLContext = module.exports.getWebGLContext;
export let Shader = module.exports.Shader;
export let Texture = module.exports.Texture;
export let Buffer = module.exports.Buffer;
export let Eoap = module.exports.Eoap;
export let Mercator = module.exports.Mercator;
export let throttle = module.exports.throttle;
export let assemble = module.exports.assemble;
export let MapCoordinate = module.exports.MapCoordinate;
export let TreeLayout = module.exports.TreeLayout;
export let PieLayout = module.exports.PieLayout;
export let BarLayout = module.exports.BarLayout;
export let initOption = module.exports.initOption;
export let mergeOption = module.exports.mergeOption;
`);
        response.end();
    }
};