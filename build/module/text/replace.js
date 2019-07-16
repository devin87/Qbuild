/// <reference path="../../build.js" />
/*
* replace.js 文本模块:内容替换
* author:devin87@qq.com
* update:2019/07/16 17:58
*/
module.exports = {
    type: ["replace"],

    process: function (f, data, task, type) {
        if (!data) return;

        var text = f.text || "";

        Q.makeArray(data).forEach(function (item) {
            var pattern = item[0],
                replacement = item[1],
                flags = item[2];

            if (!pattern) return;

            var regex = new RegExp(pattern, flags);

            if (typeof replacement == "string") {
                text = text.replace(regex, Qbuild.parseText(replacement, f));
            } else if (typeof replacement == "number") {
                if (!Q.isInt(replacement, 1, 9)) return;

                text = text.replace(regex, function (m) {
                    return Qbuild.parseText(arguments[+replacement] || "", f);
                });
            } else if (Q.isObject(replacement) && typeof replacement.value == "string") {
                var match = +replacement.match || 0, value = Qbuild.parseText(replacement.value, f);
                if (match == 0) return text.replace(regex, value);

                var sub_regex = replacement.pattern ? new RegExp(replacement.pattern, replacement.flags) : undefined;

                text = text.replace(regex, function (m) {
                    var args = arguments;

                    var match_text = args[match];
                    if (!match_text) return m;

                    var match_value = value ? value.replace(/\$(\d)/g, function (m, m1) {
                        return args[+m1] || m;
                    }) : "";

                    return m.replace(match_text, sub_regex ? match_text.replace(sub_regex, match_value) : match_value);
                });
            }
        });

        f.text = text;
    }
};