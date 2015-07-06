/// <reference path="../build.js" />
/*
* copy.js 文件同步模块
* author:devin87@qq.com
* update:2015/07/02 13:52
*/
var log = Qbuild.log,
    print = Qbuild.print,
    mkdir = Qbuild.mkdir,

    formatSize = Q.formatSize;

module.exports = {
    type: ["copy", "copy0", "copy1"],

    init: function (data) {
        //不预加载文件内容,不重命名文件
        data.preload = data.rename = false;
    },

    exec: function (f, data, callback) {
        if (f.skip) {
            log("跳过：" + f.relname);
            return Q.fire(callback);
        }

        print("复制：" + f.relname, Qbuild.HOT);
        print("  " + formatSize(f.stat.size));

        //确保输出文件夹存在
        mkdir(path.dirname(f.dest));

        var rs = fs.createReadStream(f.fullname),  //创建读取流
            ws = fs.createWriteStream(f.dest);     //创建写入流

        //通过管道来传输流
        rs.pipe(ws);

        rs.on("end", function () {
            print("    √\n", Qbuild.GREEN);
            callback();
        });

        rs.on("error", function () {
            print("    ×\n", Qbuild.YELLOW);
        });
    }
};