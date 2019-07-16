/// <reference path="../build.js" />
/*
* concat.js 文件合并模块
* author:devin87@qq.com
* update:2015/08/13 11:14
*/
require("../lib/colors.js");

var fs = require("fs"),
    log = Qbuild.log,
    error = Qbuild.error,
    hasUpdate = Qbuild.hasUpdate,

    STR_SPACE = ' '.repeat(4);

function writeInfo(fullname, isOk, next, errMsg, changed) {
    log(STR_SPACE + ((isOk ? "√".green : "×".red)) + ' ' + (changed ? fullname.red : fullname));

    if (isOk) next();
    else error(fullname + " " + errMsg);
};

module.exports = {
    type: "concat",

    dirInfo: false,

    exec: function (f, task, callback) {
        var tmp = [],
            dir = f.dir,
            is_skip = f.skip && !hasUpdate(f.src, f.dest);

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

                    writeInfo(relname, !err, ok, "读取错误！", hasUpdate(fullname, f.dest));
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
                if (f.prefix) f.text = Qbuild.parseText(f.prefix, f) + f.text;

                Qbuild.runTextModules(f, task);
                Qbuild.saveFile(f, next_task);
            }
        });
    }
};