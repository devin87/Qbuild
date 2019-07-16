/// <reference path="../../build.js" />
/*
* join_url.js 文本模块:连接url
* author:devin87@qq.com
* update:2019/07/16 17:38
*/
module.exports = {
    type: ["join_url"],

    process: function (f, data, task, type) {
        if (!data) return;

        var text = f.text || "";

        Q.makeArray(data).forEach(function (item) {
            var pattern = item[0],
                match = item[1],
                url_append = item[2],
                flags = item[3];

            if (!pattern || !Q.isInt(match, 0) || !url_append || typeof url_append != "string") return;

            var regex = new RegExp(pattern, flags);

            url_append = Qbuild.parseText(url_append, f);

            if (!match) {
                text = text.replace(regex, function (m) {
                    return m ? Q.join(m, url_append) : m;
                });
            } else {
                text = text.replace(regex, function (m) {
                    if (!m) return m;

                    var args = arguments;

                    var match_text = args[match];
                    if (!match_text) return m;

                    return m.replace(match_text, Q.join(match_text, url_append));
                });
            }
        });

        f.text = text;
    }
};