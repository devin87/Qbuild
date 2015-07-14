/// <reference path="../build.js" />
/*
* concat.js 文件合并模块
* author:devin87@qq.com
* update:2015/07/14 17:16
*/
var fs = require("fs"),
    colors = require("../lib/colors.js"),
    log = Qbuild.log,
    error = Qbuild.error,
    parseText = Qbuild.parseText,

    STR_SPACE = ' '.repeat(4);

function writeInfo(fullname, isOk, next, errMsg) {
    log(STR_SPACE + ((isOk ? '√'.green : '×'.red)) + ' ' + fullname);

    if (isOk) next();
    else error(fullname + " " + errMsg);
};

module.exports = {
    type: ["concat", "concat0", "concat1"],

    dirInfo: false,

    exec: function (f, task, callback) {
        var tmp = [],
            dir = f.dir,
            is_skip = f.skip;

        var next_task = function () {
            log();
            Q.fire(callback);
        };

        log("目录：" + dir);

        Q.series(f.src, {
            injectIndex: 1,

            exec: function (fullname, ok) {
                var relname = Qbuild.getRelname(fullname, dir);

                if (!fs.existsSync(fullname)) return writeInfo(relname, false, ok, "不存在！");

                if (is_skip) return writeInfo(relname, true, ok);

                fs.readFile(fullname, function (err, buffer) {
                    if (!err) tmp.push(buffer);

                    writeInfo(relname, !err, ok, "读取错误！");
                });
            },
            complete: function () {
                log();

                if (is_skip) {
                    log(STR_SPACE + "跳过：" + f.dest);
                    return Q.fire(next_task);
                }

                log(STR_SPACE + "合并：" + f.dest, Qbuild.HOT);

                f.text = tmp.join(f.join || task.join || '\n\n');
                if (f.prefix) f.text = parseText(f.prefix, f) + f.text;

                Qbuild.runTextModules(f, task);
                Qbuild.saveFile(f, next_task);
            }
        });
    }
};