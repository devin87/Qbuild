/// <reference path="../build.js" />
/*
* diffcopy.js 文件增量同步模块
* author:devin87@qq.com
* update:2020/01/07 18:11
*/
var crypto = require('crypto'),
    fs = require('fs'),
    path = require('path');

var log = Qbuild.log,
    print = Qbuild.print,
    mkdir = Qbuild.mkdir,

    formatSize = Q.formatSize;

/**
 * 计算文件Hash
 * @param {string} algorithm Hash算法 eg: md5、sha1、sha256、sha384、sha512
 * @param {string} fullname 文件完整路径
 * @param {function} cb 回调函数(err,hash)
 */
function computeFileHash(algorithm, fullname, cb) {
    var stream = fs.createReadStream(fullname);
    var hasher = crypto.createHash(algorithm || 'sha1');  //eg: md5、sha1、sha256、sha384、sha512

    stream.on('data', function (buffer) {
        hasher.update(buffer);
    });

    stream.on('end', function (err) {
        if (err) return cb(err);
        return cb(undefined, hasher.digest('hex'));
    });
}

var list_support_diffmode = ['mtime', 'md5', 'sha1', 'sha256', 'sha384', 'sha512'],
    map_support_diffmode = list_support_diffmode.toMap(true);

/**
 * 检查文件变更
 * @param {string} old_path 旧文件完整路径
 * @param {string} new_path 新文件完整路径
 * @param {string} diffmode 比较模式 mtime|md5|sha1|sha256|sha384|sha512
 * @param {function} cb(err,changed) 
 */
function checkFileChange(old_path, new_path, diffmode, cb) {
    if (!fs.existsSync(old_path)) return cb(undefined, true);
    
    var old_stat = fs.statSync(old_path),
        new_stat = fs.statSync(new_path);
    
    if (!old_stat.isFile() || old_stat.size != new_stat.size) return cb(undefined, true);

    if (diffmode == 'mtime') return cb(new_stat.mtime > old_stat.mtime);

    computeFileHash(diffmode, old_path, function (err, old_hash) {
        if (err) return cb(err);

        computeFileHash(diffmode, new_path, function (err, new_hash) {
            if (err) return cb(err);

            return cb(undefined, new_hash != old_hash);
        });
    });
}

module.exports = {
    type: "diffcopy",

    init: function (task) {
        //不预加载文件内容,不重命名文件
        task.preload = task.rename = false;

        if (!task.diffdir) return Qbuild.error("未配置比较文件夹(diffdir)");
        if (!task.diffmode) return Qbuild.error("未配置比较模式(diffmode)");
        if (!map_support_diffmode[task.diffmode]) return Qbuild.error("比较模式(diffmode)不可用: " + task.diffmode);

        task.diffdir = Qbuild.joinPath(Qbuild.config.root, task.diffdir);
    },

    exec: function (f, task, callback) {
        if (!task.diffdir || !task.diffmode || !map_support_diffmode[task.diffmode]) return;

        checkFileChange(path.join(task.diffdir, f.relname), f.fullname, task.diffmode, function (err, changed) {
            if (err) return Qbuild.error(err.message);

            if (!changed) {
                if (task.logSkip) log("跳过：" + f.relname);
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
        });
    }
};