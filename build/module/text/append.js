/// <reference path="../../build.js" />
/*
* append.js 文本模块:追加文本
* author:devin87@qq.com
* update:2015/07/06 17:16
*/
var isObject = Q.isObject,

    getPathRegex = Qbuild.getPathRegex,
    parseText = Qbuild.parseText;

module.exports = {
    type: ["before", "after"],

    process: function (f, data, ops, type) {
        if (!data) return;

        var text = f.text || "",
            ts = [];

        Q.makeArray(data).forEach(function (item) {
            if (isObject(item)) {
                if (item.match && item.text) {
                    var regexp = getPathRegex(item.match, false);
                    if (regexp.test(f.fullname)) ts.push(item.text);
                } else {
                    var s = item[f.filename] || item.def;
                    if (s) ts.push(s);
                }
            } else {
                ts.push(item);
            }
        });

        if (ts.length <= 0) return;

        var text_append = parseText(ts.join(''), f);

        f.text = type == "before" ? text_append + text : text + text_append;
    }
};