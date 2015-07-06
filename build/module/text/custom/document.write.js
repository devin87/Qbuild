/// <reference path="../../../build.js" />
/*
* document.write.js 文本模块: document.write 输出支持
* author:devin87@qq.com
* update:2015/07/02 16:25
*/
var global = Q.G,

    KEY_STORE = "mtime_dwi",
    RE_TAG_SCRIPT = /<script[^>]+?src=(['"])([^>]+?)\1[^>]*>/ig,

    store = Qbuild.store,

    map_mtime = store.get(KEY_STORE) || {},

    list_include = [],
    map_include = {},
    fullname = "",

    has_changed = false;

//获取引用对象
function get_include_obj(dir, pathname) {
    var key = path.join(dir, pathname).toLowerCase();

    return map_include[key];
}

//实现 document.write 接口
var document = {
    write: function (html) {
        var key = fullname.toLowerCase(),
            stat = fs.lstatSync(fullname),
            last_time = map_mtime[key],
            changed = !last_time || +stat.mtime > last_time;

        if (changed && !has_changed) has_changed = true;
        if (changed && map_mtime) map_mtime[key] = +stat.mtime;

        map_include[key] = { path: fullname, html: html, changed: changed };
    }
};

//向全局对象注册 window 和 document 对象
global.window = { document: document };
global.document = document;

module.exports = {
    type: "include",

    init: function (data, ops) {
        list_include = [];
        map_include = {};
        fullname = "";

        if (!data) return;

        list_include = Qbuild.getFiles(data);
        list_include.forEach(function (f) {
            fullname = f.fullname;
            if (fs.existsSync(fullname)) require(fullname);
        });

        store.set(KEY_STORE, map_mtime);

        ops.preload = true;

        //检查文件是否需要更新,如果引用的js文件发生了改变,则更新文件
        if (has_changed) {
            Qbuild.setCheck(ops, function (f) {
                if (!f.text) return;

                RE_TAG_SCRIPT.lastIndex = 0;

                var dir = path.dirname(f.fullname), t;
                while ((ms = RE_TAG_SCRIPT.exec(f.text))) {
                    t = get_include_obj(dir, ms[2]);

                    if (t && t.changed) return true;
                }
            });

            RE_TAG_SCRIPT.lastIndex = 0;
        }
    },

    process: function (f, data, ops) {
        if (!f.text) return;

        var dir = path.dirname(f.fullname);

        f.text = f.text.replace(RE_TAG_SCRIPT, function (m, m1, m2) {
            var t = get_include_obj(dir, m2);

            return t ? t.html : m;
        });
    }
};