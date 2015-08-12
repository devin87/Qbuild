/// <reference path="lib/Q.js" />
/*
* 文件合并、压缩、格式化工具
* author:devin87@qq.com
* update:2015/08/12 11:25
*/
(function () {
    "use strict";

    require('./lib/colors.js');
    require('./lib/Q.js');

    var fs = require('fs'),
        path = require('path'),

        //for VS智能提示
        global = Q.G;

    var getType = Q.type,
        isObject = Q.isObject,
        isArray = Q.isArray,
        isFunc = Q.isFunc,
        def = Q.def,
        fire = Q.fire,
        async = Q.async,
        extend = Q.extend,
        makeArray = Q.makeArray,
        Queue = Q.Queue;

    process.title = "文件合并、压缩、格式化工具 by devin87@qq.com";

    //----------------------- build.js -----------------------

    var ROOT = process.cwd(),
        ROOT_EXEC = __dirname,

        PATH_CONFIG = join_path(ROOT, process.argv[2] || "build.data.js"),
        PATH_STORE = path.join(path.dirname(PATH_CONFIG), process.argv[3] || "build.store.json"),

        map_module = {},
        map_text_module = {},

        map_last_dest = {},
        map_dest = {},

        config = {},
        storage = {};

    //----------------------- storage -----------------------

    //自定义存储操作
    var store = {
        //初始化自定义存储数据
        init: function (callback) {
            if (!fs.existsSync(PATH_STORE)) return fire(callback);

            fs.readFile(PATH_STORE, function (err, data) {
                if (data) storage = JSON.parse(data) || {};
                map_last_dest = storage["map_dest"] || {};

                fire(callback);
            });
        },

        //获取自定义存储数据
        get: function (key) {
            return storage[key];
        },
        //设置自定义存储数据
        set: function (key, value) {
            storage[key] = value;
        },
        //保存自定义存储数据
        save: function (callback) {
            if (config.noStore === true) return;

            mkdir(path.dirname(PATH_STORE));

            fs.writeFile(PATH_STORE, JSON.stringify(storage), 'utf-8', callback);
        }
    };

    //----------------------- util -----------------------

    var HOT = "red",
        GREEN = "green",
        YELLOW = "yellow",
        PINK = "magenta";

    //输出消息,不换行
    function print(msg, color) {
        if (typeof msg == "string" && color) {
            msg = msg[color];
        }

        process.stdout.write(msg !== undefined ? msg : "");
    }

    //输出消息,同console.log
    function log(msg, color) {
        if (typeof msg == "string" && color) {
            msg = msg[color];
        }

        console.log(msg !== undefined ? msg : "");
    }

    //输出错误信息
    function error(msg) {
        log("\n错误：" + (msg || "") + "\n", YELLOW);
    }

    //规格化路径
    function normalize_path(_path) {
        var pathname = path.normalize(_path);
        return pathname != "\\" && pathname.endsWith("\\") ? pathname.slice(0, -1) : pathname;
    }

    //判断是否绝对路径
    function is_absolute_path(_path) {
        var _path_rel = path.resolve(_path);
        return normalize_path(_path_rel) == normalize_path(_path);
    }

    //连接路径,若path2为绝对路径,则直接返回path2;若path2以斜杠(/)开头,则返回基于根目录的路径
    function join_path(path1, path2) {
        if (!path2) return path1;
        if (is_absolute_path(path2)) return path2;

        path2 = normalize_path(path2);
        if (path2.startsWith(".\\")) path1 = ROOT;
        else if (path2.startsWith("\\")) path1 = config.root;
        else if (path2.startsWith("|")) {
            path1 = ROOT_EXEC;
            path2 = path2.slice(1);
        }

        return path.join(path1, path2);
    }

    //创建目录
    function mkdirSync(url, mode, callback) {
        if (url == "..") return callback && callback();

        url = normalize_path(url);
        var arr = url.split("\\");

        //处理 ./aaa
        if (arr[0] === ".") arr.shift();

        //处理 ../ddd/d
        if (arr[0] == "..") arr.splice(0, 2, arr[0] + "\\" + arr[1]);

        mode = mode || 493;  //0755

        function inner(dir) {
            //不存在就创建一个
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, mode);

            if (arr.length) {
                inner(dir + "\\" + arr.shift());
            } else {
                callback && callback();
            }
        }

        arr.length && inner(arr.shift());
    }

    //创建路径筛选正则表达式,将默认匹配路径的结束位置
    //pattern: 匹配规则,点、斜杠等会被转义,**表示所有字符,*表示斜杠之外的字符 eg: demo/**.html
    //isdir: 是否目录,若为true,将匹配路径的起始位置
    function get_path_regex(pattern, isdir) {
        if (!pattern || typeof pattern != "string") return;

        pattern = pattern.replace(/\\+/g, "/").replace(/\\(?!d|B|w|W|s|S)/g, "\\\\").replace(/\./g, "\\.").replace(/\*+/g, function (m) {
            return m == "*" ? "[^\\\\]*" : ".*";
        }).replace(/\//g, "\\\\");

        if (isdir && pattern.slice(0, 1) != "^") pattern = "^" + pattern;
        if (pattern.slice(-1) != "$") pattern += isdir ? "(\\\\|$)" : "$";

        return new RegExp(pattern, "i");
    }

    //获取匹配的文件,默认基于config.root
    //pattern:匹配规则,支持数组 eg:["js/**.js","m/js/**.js"]
    //ops:可指定扫描目录、输出目录、排除规则、扫描时是否跳过输出目录 eg:{ dir:"demo/",output:"release/",exclude:"**.old.js",skipOutput:true,matchOptimize:true }
    function get_matched_files(pattern, ops) {
        if (isObject(pattern)) {
            ops = pattern;
        } else {
            ops = ops || {};
            ops.match = pattern;
        }

        var exclude = ops.exclude,
            RE_EXCLUDE_FILE = exclude && typeof exclude == "string" ? get_path_regex("^(" + normalize_path(exclude) + ")", false) : exclude,

            task_dir = join_path(config.dir, ops.dir || ""),
            task_output = join_path(config.output, ops.output || ""),
            rename = ops.rename,

            is_optimize_match = ops.matchOptimize !== false,
            is_skip_output = ops.skipOutput != false,

            list = [],
            map = {};

        makeArray(ops.match).forEach(function (match) {
            if (!match) return;

            //console.log("pattern : " + match);

            var RE_MATCH_FILE, dir = task_dir, all = true;

            if (typeof match == "string") {
                match = normalize_path(match);

                //优化匹配规则以加速扫描
                //eg: js/src/(a|b)/*.js => { dir:"js/src",match:"(a|b)/*.js" }
                //eg: js/src/[ab]/*.js => { dir:"js/src/[ab]",match:"*.js" }
                if (is_optimize_match) {
                    var start = match.length,
                        i1 = match.indexOf("*"),
                        i2 = match.indexOf("|", 1),
                        index;

                    if (i1 != -1 && i1 < start) start = i1;
                    if (i2 != -1 && i2 < start) start = i2;

                    index = match.lastIndexOf("\\", start);

                    if (index != -1) {
                        dir = join_path(task_dir, match.slice(0, index));
                        match = match.slice(index + 1);
                    }
                }

                RE_MATCH_FILE = get_path_regex("^" + match, false);
                all = match.contains("**") || match.contains("\\");
            } else {
                RE_MATCH_FILE = match;
            }

            var skip_dir = normalize_path(task_output).toLowerCase();

            var get_items = function (dir, rel) {
                if (!fs.existsSync(dir)) return;

                fs.readdirSync(dir).forEach(function (filename, i) {
                    var fullpath = path.join(dir, filename),
                        stat = fs.lstatSync(fullpath);
                    if (!stat) return;

                    if (stat.isDirectory()) {
                        if (all && (!is_skip_output || fullpath.toLowerCase() != skip_dir)) get_items(fullpath, path.join(rel, filename));
                    } else if (stat.isFile()) {
                        //过滤重复文件
                        if (map[fullpath]) return;
                        map[fullpath] = true;

                        var rel_dir_name = path.join(rel, filename),
                            rel_task_name = get_relname(fullpath, task_dir);

                        if (RE_EXCLUDE_FILE && RE_EXCLUDE_FILE.test(rel_task_name)) return;
                        if (RE_MATCH_FILE && !RE_MATCH_FILE.test(rel_dir_name)) return;

                        //console.log("    " + rel_task_name);

                        var dest = join_path(task_output, rel_task_name), f;

                        //文件对象
                        f = {
                            dir: dir,            //文件所在目录
                            destname: dest,      //默认文件保存路径
                            dest: dest,          //文件实际保存路径
                            fullname: fullpath,  //文件完整路径
                            relname: rel_task_name,    //相对于 task.dir 的路径
                            filename: filename,                   //文件名(带扩展名)
                            name: get_name_without_ext(filename), //文件名(不带扩展名)
                            ext: path.extname(filename),          //文件扩展名
                            stat: stat          //文件状态(最后访问时间、修改时间、文件大小等) {atime,mtime,size}
                        };

                        if (rename) {
                            //新文件名称(带扩展名)
                            f.rename = parse_text(rename, f);
                            //文件上次构建时的保存路径
                            f.last_dest = (map_last_dest[dest.toLowerCase()] || {}).dest;
                            //文件实际保存路径
                            f.dest = path.join(path.dirname(dest), f.rename);
                        }

                        list.push(f);
                    }
                });
            };

            get_items(dir, "");
            //console.log();
        });

        return list;
    }

    //获取相对路径,默认相对config.dir目录
    function get_relname(fullname, rel_dir) {
        return path.relative(rel_dir || config.dir, fullname);
    }

    //获取不带扩展名的名称
    function get_name_without_ext(name) {
        var i = name.lastIndexOf(".");
        return i != -1 ? name.slice(0, i) : name;
    }

    //根据文件修改时间判断文件是否有更新
    function has_update(src, dest) {
        if (!fs.existsSync(dest)) return true;

        var mtime_dest = fs.statSync(dest).mtime;
        if (typeof src == "string") return fs.statSync(src).mtime > mtime_dest;

        return src.some(function (fullname) {
            return fs.existsSync(fullname) && fs.statSync(fullname).mtime > mtime_dest;
        });
    }

    //设置文件变更 => map_dest[f.destname.toLowerCase()]={src: f.fullname, dest: f.dest}
    function set_changed_file(f) {
        var key = f.destname;
        if (key) map_dest[key.toLowerCase()] = { src: f.fullname, dest: f.dest };
    }

    //读取文件内容(f[read_key] => f.text)
    function read_file(f, callback, read_key) {
        var pathname = f[read_key || "fullname"];

        if (f.text || !pathname || !fs.existsSync(pathname)) return fire(callback);

        fs.readFile(pathname, function (err, data) {
            f.text = data + "";

            fire(callback, undefined, f);
        })
    }

    //确保文件夹存在
    function mkdir(dir) {
        if (!fs.existsSync(dir)) mkdirSync(dir);
    }

    //保存文件(f.text => f.dest)
    function save_file(f, callback, data) {
        if (config.noSave) return fire(callback);

        if (config.cleanDest) {
            var last_dest = f.last_dest;
            if (last_dest && fs.existsSync(last_dest)) fs.unlinkSync(last_dest);
        }

        mkdir(path.dirname(f.dest));

        fs.writeFile(f.dest, f.text || "", config.charset || "utf-8", function (err) {
            if (err) error(f.dest + " 写入错误！");
            else {
                set_changed_file(f);
                fire(callback);
            }
        });
    }

    var process_exec = require('child_process').exec;

    //执行命令行调用
    function do_shell(cmd, callback, ops) {
        var process = process_exec(cmd),
            is_skip_warning = ops.skipWarning,
            is_ignore_warning = ops.ignoreWarning !== false,
            has_error;

        process.stdout.on("data", function (data) {
            print(data);
        });

        process.stderr.on("data", function (data) {
            var is_warning = false;
            if (is_skip_warning || is_ignore_warning) {
                if (/^\s*(0.+?(error|错误)|(.+?\:\d+\:\s*)?(WARN|警告))/i.test(data + "")) is_warning = true;
            } else {
                if (!has_error) has_error = true;
            }

            if (!is_skip_warning || !is_warning) print(data, YELLOW);
        });

        process.on('exit', function () {
            async(callback, 50, has_error);
        });
    }

    //----------------------- 简单参数解析 -----------------------

    extend(global, {
        path: path,
        fs: fs,

        date: function (format) {
            return new Date().format(format || "yyyy/MM/dd HH:mm:ss");
        }
    });

    //属性解析 eg:%Q.formatSize(f.stat.size)%  => %Q.formatSize(16533)%
    function parse_props(key, f) {
        var context = f;

        key.split("\.").forEach(function (prop) {
            context = context[prop];
        });

        return JSON.stringify(context);
    }

    //简单文本解析,支持属性或函数的连续调用,支持简单参数传递,若参数含小括号,需用@包裹 eg:%Q.formatSize@(f.stat.size,{join:'()'})@%
    //不支持函数嵌套 eg:path.normalize(path.dirname(f.dest))
    //eg:parse_text("%f.name.trim().drop@({a:'1,2',b:'(1+2)'})@.toUpperCase()% | %Q.formatSize(f.stat.size).split('M').join(' M')%", { dest: "aa/b.js", name: "b.js", size: 666, stat: { size: 19366544 } })  => B.JS | 18.47 MB
    //eg:parse_text("%path.dirname(f.dest)%", { dest: "aa/b.js"});  => aa
    function parse_text(text, f) {
        return text.replace(/%([^%]+)%/g, function (g, g1) {
            var ks = [];

            g1.replace(/\.?([^\(\)\.]+)(@?\((.*?)\)(@|(?=\.|$)))?/g, function (m, m1, m2, m3) {
                if (m3) {
                    m3 = m3.replace(/(^|[\(:\[])f\.([^,}\]]+)/g, function (m, m1, m2) {
                        return m1 + parse_props(m2, f);
                    });

                    try { m3 = eval('([' + m3 + '])'); } catch (e) { m3 = null; }
                }

                var key = m1.replace(/@$/, "");
                ks.push({ key: key, args: m3 || (m2 ? [] : undefined) });
            });

            var kp1 = ks[0],
                key1 = kp1.key,
                args1 = kp1.args,
                obj;

            switch (key1) {
                case "NOW": obj = date(); break;
                case "DATE": obj = date("yyyy/MM/dd"); break;
                case "TIME": obj = date("HH:mm:ss"); break;
                default:
                    if (args1) obj = global[key1].apply(global, args1);
                    else obj = key1 == "f" ? f : global[key1];
            }

            ks.forEach(function (kp, i) {
                if (i == 0) return;

                var key = kp.key,
                    args = kp.args,
                    prop = obj[key];

                obj = args ? prop.apply(obj, args) : prop;
            });

            return obj + "";
        });
    }

    //----------------------- module -----------------------

    //获取模块映射对象
    function get_module_map(bind) {
        return bind ? bind._map_text || map_text_module : map_module;
    }

    //获取模块对象,若bind不存在则获取任务处理对象
    //bind:文本模块绑定对象(文本模块只在此对象上生效);若bind._map_text不存在,则表示全局文本模块
    function get_module(type, bind) {
        var map = get_module_map(bind);
        return map[type];
    }

    //查找模块对象
    function find_module(type, bind) {
        var module;

        if (bind) {
            if (bind._map_text) module = bind._map_text[type];
            if (!module) module = map_text_module[type];
        } else {
            module = map_module[type];
        }

        return module;
    }

    //注册处理模块,若bind不存在则表示任务处理对象
    //type:要注册的模块对象类型
    //module:模块对象或已存在的模块对象类型
    //bind:文本模块绑定对象(文本模块只在此对象上生效);若bind._map_text不存在,则表示全局文本模块
    function register_module(type, module, bind) {
        if (!type || !module) return;

        var map = get_module_map(bind);
        if (typeof module == "string") module = map[module];
        else if (isFunc(module)) module = { exec: module };

        if (isObject(module)) {
            makeArray(type).forEach(function (type) {
                map[type] = module;
            });
        }
    }

    //加载处理模块
    function load_module(type, src, bind) {
        var module = find_module(src, bind);
        if (module) return register_module(type, module, bind);

        src = join_path(ROOT, src);
        if (!fs.existsSync(src)) return error("模块 " + src + " 不存在!");

        module = require(src);
        if (module) {
            fire(module.load, module);

            return register_module(type || module.type, module, bind);
        }
    }

    //载入处理模块
    function load_modules(data, bind) {
        if (!data) return;

        if (isObject(data)) {
            Object.forEach(data, function (type, src) {
                load_module(type, src, bind);
            });
        } else {
            makeArray(data).forEach(function (src) {
                if (!src.contains("*")) {
                    load_module(undefined, src, bind);
                } else {
                    var fs = get_matched_files({ dir: ROOT, match: src });
                    fs.forEach(function (f) {
                        load_module(undefined, f.fullname, bind);
                    });
                }
            });
        }
    }

    //载入文本处理模块
    function load_text_modules(data, bind) {
        bind = bind || { _map_text: map_text_module };
        if (!bind._map_text) bind._map_text = {};

        load_modules(data, bind);
    }

    //初始化当前任务文本处理模块
    function init_text_modules(task) {
        var list_run = task.runText;
        if (list_run) list_run = makeArray(list_run);
        else {
            list_run = config.runText;
            if (task._map_text) list_run = list_run.concat(Object.keys(task._map_text));
        }

        var list = [],
            map_run = list_run.toMap(true),
            tmp = [],
            has_other;

        var fn = function (type, module) {
            list.push({ type: type, module: module });
        };

        Object.forEach(map_text_module, fn);
        if (task._map_text) Object.forEach(task._map_text, fn);

        list_run.forEach(function (type) {
            if (type != "*") {
                tmp.push(type);
                has_other = true;
            } else if (!has_other) {
                list.forEach(function (m) {
                    if (!map_run[m.type]) tmp.push(m.type);
                });
            }
        });

        task._list_text = list;
        task.runText = tmp;
    }

    //触发文本处理模块动作
    function fire_text_modules(action, task) {
        task._list_text.forEach(function (m) {
            var module = m.module;
            fire(module[action], module, task[m.type], task, m.type);
        });
    }

    //运行文本处理模块
    function run_text_modules(f, task) {
        var map = task._map_text,
            list_run = task.runText,
            len = list_run.length,
            i = 0;

        for (; i < len; i++) {
            var type = list_run[i],
                module = map[type] || map_text_module[type];

            if (!module) continue;

            //if (f.src && f[type]) fire(module.process, module, f, f[type], data, type);
            if (fire(module.process, module, f, task[type], task, type) === false) break;
        }
    }

    //----------------------- process -----------------------

    //处理任务
    function process_task(task, callback) {
        var module;
        if (!task || task.enable === false || !(module = map_module[task.type])) return fire(callback);

        //task.dir = makeArray(task.dir || "").map(function (dir) {
        //    return join_path(config.dir, dir);
        //});

        task.output = join_path(config.output, def(task.output, task.dir));
        task.dir = join_path(config.dir, task.dir);
        task.autoSkip = def(task.autoSkip, config.autoSkip) !== false;
        task.skipOutput = def(task.skipOutput, config.skipOutput) !== false;
        task.preload = !!def(task.preload, config.preload);

        var rename = task.rename;
        if (rename !== false) task.rename = typeof rename == "string" ? rename : config.rename;

        load_text_modules(task.registerText, task);

        init_text_modules(task);

        fire(module.init, module, task);
        fire_text_modules("init", task);

        log();
        log("-------------------- " + (task.title || task.type || "") + " --------------------");
        if (module.dirInfo !== false) {
            log("扫描目录：" + task.dir);
            log("输出目录：" + task.output);
        }
        log();

        var process = module.process,

            list_check = task._check,
            is_auto_skip = task.autoSkip,
            is_check_after_read = isArray(list_check) && list_check.length > 0;

        //检测是否跳过文件
        var check_skip = function (f) {
            f.skip = f.skip && !list_check.some(function (check) {
                return check(f, task) === true;
            });
        };

        //检测是否跳过文件之后执行一个回调函数
        var after_check = function (f, fn) {
            if (!f.skip) return fn();

            if (!is_check_after_read) return fn();

            if (f.fullname) {
                read_file(f, function () {
                    check_skip(f);

                    fn();
                });
            } else {
                check_skip(f);
                fn();
            }
        };

        //处理文件内容预加载
        var preload_text = function (is_preload, f, callback) {
            return is_preload ? read_file(f, callback) : fire(callback);
        };

        //match模式
        if (task.match) {
            var list_file = get_matched_files(task),
                length = list_file.length;

            task.files = list_file;

            log("匹配文件：" + length);
            log();

            if (length <= 0) return fire(callback);

            fire(module.before, module, task);

            list_file.forEach(function (f) {
                var dest = (map_last_dest[f.destname.toLowerCase()] || {}).dest || f.dest, old_stat;

                if (fs.existsSync(dest)) f.old = old_stat = fs.lstatSync(dest);
                if (!f.stat && fs.existsSync(f.fullname)) f.stat = fs.lstatSync(f.fullname);

                //是否跳过文件
                f.skip = is_auto_skip && old_stat && old_stat.mtime >= f.stat.mtime;

                //文件内容预加载
                preload_text(f, function () {
                    fire(module.check, module, f, task);
                });
            });
        } else if (task.list) {
            //list模式(for文件合并)
            var list = task.list, dir = task.dir, output = task.output;

            if (isObject(list)) {
                var tmp = [];
                Object.forEach(list, function (dest, src) {
                    tmp.push({ src: src, dest: dest });
                });
                list = tmp;
            }

            if (list.length <= 0) return fire(callback);

            task.list = list.map(function (f) {
                var _dir, _dest, _src;

                f.dir = _dir = join_path(dir, f.dir);
                f.fullname = f.dest = f.destname = _dest = join_path(output, f.dest);
                f.filename = path.basename(_dest);
                f.name = get_name_without_ext(f.filename);
                f.ext = path.extname(_dest);
                f.src = _src = f.src.map(function (filename) {
                    return join_path(_dir, filename);
                });
                //f.join = f.join || task.join;

                f.skip = is_auto_skip && !has_update(_src, _dest);

                fire(module.check, module, f, task);

                return f;
            });
        }

        //转交给 module.process 处理
        if (process) return fire(process, module, task, callback);

        //针对单一的文件或任务处理
        var module_exec = module.exec;

        if (isFunc(module_exec)) {
            var queue = new Queue({
                tasks: task.files || task.list,
                //注入参数索引(exec回调函数所在位置)
                injectIndex: 1,

                exec: function (f, ok) {
                    after_check(f, function () {
                        fire(module_exec, module, f, task, ok);
                    });
                },
                complete: function () {
                    log();
                    log("处理完毕！", GREEN);
                    log();

                    fire(module.after, module, task);
                    fire(callback);
                }
            });

            task.queue = queue;
        } else {
            log();
            fire(callback);
        }
    }

    //----------------------- init -----------------------

    function init() {
        if (!config) return log("未找到配置文件：" + PATH_CONFIG + "\n");

        Qbuild.config = config;

        var root = join_path(ROOT, config.root);

        config.root = root;
        config.dir = join_path(root, config.dir);
        config.output = join_path(root, config.output);

        //载入任务处理模块
        load_modules(config.register || path.join(ROOT_EXEC, "./module/*.js"));

        //载入文本处理模块
        load_text_modules(config.registerText || path.join(ROOT_EXEC, "./module/text/*.js"));

        var list_run = config.run ? makeArray(config.run) : Object.keys(map_module);

        config.run = list_run;
        config.runText = config.runText ? makeArray(config.runText).filter(function (type) {
            return map_text_module[type];
        }) : ["replace", "before", "after", "*"];

        var queue = new Queue({
            //注入参数索引(exec回调函数所在位置,即process_task回调函数所在位置)
            injectIndex: 1,
            exec: process_task,

            complete: function () {
                extend(map_last_dest, map_dest, true);
                store.set("map_dest", map_last_dest);

                //保存数据
                store.save();

                log();
                log("所有任务执行完毕!", GREEN);
                log();
            }
        });

        list_run.forEach(function (type) {
            var ts = config[type];
            if (!ts) return;

            makeArray(ts).forEach(function (task) {
                if (!task.type) task.type = type;

                queue.add(task);
            });
        });

        config.queue = queue;
    }

    //----------------------- api -----------------------

    var Qbuild = {
        //配置文件所在目录,与config.root不同
        ROOT: ROOT,

        //文件执行路径,即build.js所在路径
        ROOT_EXEC: ROOT_EXEC,

        //配置对象
        config: config,

        //红色输出,用于print和log,下同
        HOT: HOT,
        //绿色输出
        GREEN: GREEN,
        //黄色输出
        YELLOW: YELLOW,
        //粉红色输出
        PINK: PINK,

        //输出控制台信息,不换行,可指定输出颜色
        print: print,
        //输出控制台信息并换行,可指定输出颜色
        log: log,
        //输出错误信息
        error: error,

        //注册模块
        //type:String|Array|Object
        //     String:模块类型 eg: register("concat",fn|object)
        //     Array: 模块数组 eg: register([module,module],bind)
        //     Object:模块对象 eg: register({type:module},bind)
        //module:模块方法或对象,当为function时相当于 { exec:fn } ,若type为模块数组或对象,则同bind
        //bind:文本模块绑定对象(文本模块只在此对象上生效),可以传入一个空对象以注册一个全局文本模块
        register: function (type, module, bind) {
            if (typeof type == "string") return register_module(type, module, bind);

            bind = module;
            if (isArray(type)) {
                type.forEach(function (module) {
                    register_module(module.type, module, bind);
                });
            } else if (isObject(type)) {
                Object.forEach(function (type, module) {
                    register_module(type, module, bind);
                });
            }
        },

        //创建路径筛选正则表达式,将默认匹配路径的结束位置
        //pattern: 匹配规则,点、斜杠等会被转义,**表示所有字符,*表示斜杠之外的字符 eg: demo/**.html
        //isdir: 是否目录,若为true,将匹配路径的起始位置
        getPathRegex: get_path_regex,

        //获取匹配的文件,默认基于config.root
        //pattern:匹配规则,支持数组 eg:["js/**.js","m/js/**.js"]
        //ops:可指定扫描目录、输出目录、排除规则、扫描时是否跳过输出目录 eg:{ dir:"demo/",output:"release/",exclude:"**.old.js",skipOutput:true }
        getFiles: function (pattern, ops) {
            //var rs = [];

            //ops = ops || {};
            //if (!ops.dir) ops.dir = config.root;

            //makeArray(pattern).forEach(function (match) {
            //    ops.match = match;

            //    var fs = get_matched_files(ops);
            //    rs = rs.concat(fs);
            //});

            //return rs.unique("fullname");

            return get_matched_files(pattern, ops);
        },
        //获取相对路径,默认相对于config.dir
        getRelname: get_relname,
        //获取不带扩展名的名称
        getNameWithoutExt: get_name_without_ext,
        //设置文件变更,可通过getDestMap获取变更的文件映射
        setChangedFile: set_changed_file,
        //获取输出路径映射,返回 { map: map_dest, last: map_last_dest }
        getDestMap: function () {
            return { map: map_dest, last: map_last_dest };
        },
        //确保文件夹存在
        mkdir: mkdir,
        //读取文件内容(f.fullname => f.text)
        readFile: read_file,
        //保存文件(f.text => f.dest)
        saveFile: save_file,

        //简单文本解析,支持属性或函数的连续调用,支持简单参数传递,若参数含小括号,需用@包裹 eg:%Q.formatSize@(f.stat.size,{join:'()'})@%
        //不支持函数嵌套 eg:path.normalize(path.dirname(f.dest))
        //eg:parse_text("%f.name.trim().drop@({a:'1,2',b:'(1+2)'})@.toUpperCase()% | %Q.formatSize(f.stat.size).split('M').join(' M')%", { dest: "aa/b.js", name: "b.js", size: 666, stat: { size: 19366544 } })  => B.JS | 18.47 MB
        //eg:parse_text("%path.dirname(f.dest)%", { dest: "aa/b.js"});  => aa
        parseText: parse_text,

        //执行命令行调用
        shell: do_shell,

        //运行文本处理模块
        runTextModules: run_text_modules,

        //设置检测函数,检查文件是否需要更新
        setCheck: function (task, check) {
            if (!task._check) task._check = [];
            task._check.push(check);
        },

        //自定义存储操作
        store: store
    };

    //注册到全局对象
    global.Qbuild = Qbuild;

    //----------------------- ready -----------------------

    //加载配置文件
    if (fs.existsSync(PATH_CONFIG)) config = require(PATH_CONFIG);

    //加载自定义存储数据后初始化程序
    store.init(init);

})();