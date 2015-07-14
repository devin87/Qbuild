/// <reference path="../../../build.js" />
/*
* update_link.js 文本模块: 更新文件引用
* author:devin87@qq.com
* update:2015/07/14 16:40
*/
var global = Q.G,
    def = Q.def,
    extend = Q.extend,

    RE_TAG_RESOURCE = /<(script|link|img)[^>]+?(src|href)=(['"])([^>]+?)\3[^>]*>/ig,
    regex_match = RE_TAG_RESOURCE,
    regex_match_index = 4,

    map_dest = {},
    map_last_dest = {},
    map_all = {};

module.exports = {
    type: "update_link",

    init: function (data, task) {
        //允许外部配置匹配规则
        if (data) {
            var match = data.match, index = data.index;

            if (match) regex_match = typeof match == "string" ? new RegExp(match, data.flags || "ig") : match;
            if (typeof index == "number") regex_match_index = index;
        }

        //获取重命名的路径映射 {map:{},last:{}}
        var maps = Qbuild.getDestMap(),
            has_changed;

        //格式化路径
        var format_map = function (dest_map) {
            var map = {};

            Object.forEach(dest_map, function (key, v) {
                map[v.src.toLowerCase()] = v.dest;
            });

            return map;
        };

        //本次构建发生更改的文件路径映射
        map_dest = format_map(maps.map);
        //上次构建映射
        map_last_dest = format_map(maps.last);

        has_changed = Object.hasItem(map_dest);
        map_all = extend(map_dest, map_last_dest);

        task.preload = true;

        //检查文件是否需要更新,如果引用的文件发生了改变,则更新文件
        if (has_changed) {
            Qbuild.setCheck(task, function (f) {
                if (!f.text) return;

                regex_match.lastIndex = 0;

                var dir = path.dirname(f.fullname), key;
                while ((ms = regex_match.exec(f.text))) {
                    key = path.join(dir, ms[regex_match_index]).toLowerCase();

                    if (map_dest[key]) return true;
                }
            });

            regex_match.lastIndex = 0;
        }
    },

    process: function (f, data, task) {
        if (!f.text) return;

        var dir = path.dirname(f.fullname), output = path.dirname(f.dest);

        //替换文件引用
        f.text = f.text.replace(regex_match, function (m) {
            var args = arguments,
                link = args[regex_match_index],
                key = path.join(dir, link).toLowerCase(),
                dest = map_all[key];

            //if (dest) Qbuild.log(key + " => " + dest , Qbuild.PINK);
            //if (dest) Qbuild.log(dest + " => " + path.relative(output, dest), Qbuild.PINK);

            //即使更改了输出文件夹结构,也能保持正确的文件引用 => path.relative(output, dest)
            return dest ? m.replace(link, path.relative(output, dest).replace(/\\/g, "/")) : m;
        });
    }
};