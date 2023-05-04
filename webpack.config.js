const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");
const path = require("path");

const package = require("./package");
const widgetName = package.name;
const widgetVersion = package.version;

module.exports = {
    entry: {
        [widgetName]: [ `./src/${widgetName}/widget/${widgetName}.js` ]
    },
    output: {
        path: path.resolve(__dirname, "dist/tmp/src"),
        filename: `${widgetName}/widget/[name].js`,
        chunkFilename: `${widgetName}/widget/${widgetName}[id].js`,
        libraryTarget: "amd",
        publicPath: "/widgets/",
        jsonpFunction: "label_selector_jsonp"
    },
    devtool: false,
    mode: "production",
    externals: [ /^mxui\/|^mendix\/|^dojo\/|^dijit\// ],
    plugins: [
        new webpack.LoaderOptionsPlugin({ debug: true }),
        new CleanWebpackPlugin({ cleanOnceBeforeBuildPatterns: "dist/tmp" }),
        new CopyWebpackPlugin([ {context: "src", from: "**/*.{xml,css,html,png,gif}", debug: true} ], { copyUnmodified: true }),
        new ZipPlugin({ path: `../../${widgetVersion}`, filename: widgetName, extension: "mpk" }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        })
    ]
};
