/// <reference path="../../build.js" />
/*
* replace.js 文本模块:内容替换
* author:devin87@qq.com
* update:2015/07/10 16:23
*/
module.exports = {
    type: "replace",

    process: function (f, data, task, type) {
        if (!data) return;

        var text = f.text || "";

        Q.makeArray(data).forEach(function (item) {
            var pattern = item[0],
                replacement = item[1],
                flags = item[2];

            if (!pattern || typeof replacement != "string") return;

            var regex = new RegExp(pattern, flags);
            text = text.replace(regex, replacement);
        });

        f.text = text;
    }
};