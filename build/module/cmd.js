/// <reference path="../build.js" />
/*
* cmd.js js压缩模块
* author:devin87@qq.com
* update:2015/08/12 11:37
*/
var shell = Qbuild.shell,

    formatSize = Q.formatSize,
    mkdir = Qbuild.mkdir,
    parseText = Qbuild.parseText,
    log = Qbuild.log,
    print = Qbuild.print;

module.exports = {
    type: ["cmd", "cmd0", "cmd1"],

    exec: function (f, task, callback) {
        if (f.skip) {
            log("跳过：" + f.relname);
            return Q.fire(callback);
        }

        //log("处理：" + f.relname, Qbuild.HOT);

        print("处理：" + f.relname, Qbuild.HOT);
        if (f.rename) print("  =>  " + f.rename);
        print("\n");

        //确保输出文件夹存在
        mkdir(path.dirname(f.dest));

        //执行命令行调用
        shell(parseText(task.cmd, f), function (has_error) {
            if (has_error) return;

            var stat = f.stat,
                stat_dest = fs.existsSync(f.dest) ? fs.lstatSync(f.dest) : undefined;

            if (stat_dest) {
                var size_source = stat.size,
                    size_dest = stat_dest.size,
                    size_saved = size_source - size_dest;

                if (size_source) log("压缩前：" + formatSize(size_source) + "，压缩后：" + formatSize(size_dest) + "，节省：" + formatSize(size_saved) + "，占比" + (size_saved * 100 / size_source).toFixed(2) + "%", Qbuild.PINK);

                fs.readFile(f.dest, function (err, text) {
                    f.text = text + "";

                    Qbuild.runTextModules(f, task);
                    Qbuild.saveFile(f, callback);
                });
            } else {
                Q.fire(callback);
            }
        }, task);
    }
};