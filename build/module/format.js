/// <reference path="../build.js" />
/*
* format.js 文件格式化模块
* author:devin87@qq.com
* update:2015/07/02 13:51
*/
var log = Qbuild.log,
    print = Qbuild.print;

module.exports = {
    type: ["format", "format0", "format1"],

    exec: function (f, data, callback) {
        if (f.skip) {
            log("跳过：" + f.relname);
            return Q.fire(callback);
        }

        //log("处理：" + f.relname, Qbuild.HOT);

        print("处理：" + f.relname, Qbuild.HOT);
        if (f.rename) print("  =>  " + f.rename);
        print("\n");

        Qbuild.readFile(f, function () {
            Qbuild.runTextModules(f, data);
            Qbuild.saveFile(f, callback);
        });
    }
};