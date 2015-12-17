﻿/*
* Q.js (包括 通用方法、原生对象扩展 等) for browser or Node.js
* https://github.com/devin87/Q.js
* author:devin87@qq.com  
* update:2015/12/02 13:15
*/
(function (undefined) {
    "use strict";

    //Node.js中闭包外部this并非global eg:(function(g){})(this); //this not global
    //严格模式下this不指向全局变量
    var GLOBAL = typeof global == "object" ? global : window,

        toString = Object.prototype.toString,
        has = Object.prototype.hasOwnProperty,
        slice = Array.prototype.slice;

    //严格模式与window识别检测
    function detect_strict_mode() {
        var f = function (arg) {
            arguments[0] = 1;

            return arg != arguments[0];
        };

        return f(0);
    }

    //是否严格模式
    var is_strict_mode = detect_strict_mode(),
        is_window_mode = GLOBAL == GLOBAL.window;

    //返回对象的类型(小写)
    function getType(obj) {
        if (obj == undefined) return "" + obj;

        //内置函数,性能最好 (注意：safari querySelectorAll返回值类型为function)
        if (typeof obj !== "object" && typeof obj !== "function") return typeof obj;

        //非window模式(Node)下禁用以下检测
        if (is_window_mode) {
            if (typeof obj.nodeType === "number") return "node";

            if (typeof obj.length === "number") {
                //严格模式禁止使用 arguments.callee,调用会报错
                //IE9+等使用 toString.call 会返回 [object Arguments],此为兼容低版本IE
                if (!is_strict_mode && obj.callee) return "arguments";

                //IE9+等使用 toString.call 会返回 [object Window],此为兼容低版本IE
                if (obj == obj.window) return "window";

                //document.getElementsByTagName("*") => HTMLCollection
                //document.querySelectorAll("*")     => NodeList
                //此处统一为 list
                if (obj.item) return "list";
            }
        }

        //在某些最新的浏览器中(IE11、Firefox、Chrome)性能与hash读取差不多 eg: return class2type[toString.call(obj)];
        return toString.call(obj).slice(8, -1).toLowerCase();
    }

    //检测是否为函数
    function isFunc(fn) {
        //在IE11兼容模式（ie6-8）下存在bug,当调用次数过多时可能返回不正确的结果
        //return typeof fn == "function";

        return toString.call(fn) === "[object Function]";
    }

    //检测是否为对象
    function isObject(obj) {
        //typeof null => object
        //toString.call(null) => [object Object]

        return obj && toString.call(obj) === "[object Object]";
    }

    //检测是否为数组
    function isArray(obj) {
        return toString.call(obj) === "[object Array]";
    }

    //检测是否为数组或类数组
    function isArrayLike(obj) {
        var type = getType(obj);

        return type == "array" || type == "list" || type == "arguments";
    }

    //若value不为undefine,则返回value;否则返回defValue
    function def(value, defValue) {
        return value !== undefined ? value : defValue;
    }

    //检测是否为数字
    function isNum(n, min, max) {
        if (typeof n != "number") return false;

        if (min != undefined && n < min) return false;
        if (max != undefined && n > max) return false;

        return true;
    }

    //检测是否为大于0的数字
    function isUNum(n) {
        return n !== 0 && isNum(n, 0);
    }

    //检测是否为整数
    function isInt(n, min, max) {
        return isNum(n, min, max) && n === Math.floor(n);
    }

    //检测是否为大于0的整数
    function isUInt(n) {
        return isInt(n, 1);
    }

    //判断字符串是否是符合条件的数字
    function checkNum(str, min, max) {
        return !isNaN(str) && isNum(+str, min, max);
    }

    //判断字符串是否是符合条件的整数
    function checkInt(str, min, max) {
        return !isNaN(str) && isInt(+str, min, max);
    }

    //将字符串转为大写,若str不是字符串,则返回defValue
    function toUpper(str, defValue) {
        return typeof str == "string" ? str.toUpperCase() : defValue;
    }

    //将字符串转为小写,若str不是字符串,则返回defValue
    function toLower(str, defValue) {
        return typeof str == "string" ? str.toLowerCase() : defValue;
    }

    //转为数组
    function toArray(obj, from) {
        var tmp = [];

        for (var i = from || 0, len = obj.length; i < len; i++) {
            tmp.push(obj[i]);
        }

        return tmp;
    }

    //将 NodeList 转为 Array
    var makeArrayNode = (function () {
        try {
            slice.call(document.documentElement.childNodes);

            return function (obj, from) {
                return slice.call(obj, from);
            }
        } catch (e) {
            return toArray;
        }
    })();

    //将类数组对象转为数组,若对象不存在,则返回空数组
    function makeArray(obj, from) {
        if (obj == undefined) return [];

        switch (getType(obj)) {
            case "array": return from ? obj.slice(from) : obj;
            case "list": return makeArrayNode(obj, from);
            case "arguments": return slice.call(obj, from);
        }

        return [obj];
    }

    //按条件产生数组 arr(5,2,2) => [2,4,6,8,10]
    //eg:按1-10项产生斐波那契数列 =>arr(10, function (value, i, list) { return i > 1 ? list[i - 1] + list[i - 2] : 1; })
    //length:数组长度
    //value:数组项的初始值
    //step:递增值或处理函数(当前值,索引,当前产生的数组)
    function arr(length, value, step) {
        if (isFunc(value)) {
            step = value;
            value = 0;
        }
        if (value == undefined) value = 0;
        if (step == undefined) step = 1;

        var list = [], i = 0;

        if (isFunc(step)) {
            while (i < length) {
                value = step(value, i, list);
                list.push(value);
                i++;
            }
        } else {
            while (i < length) {
                list.push(value);
                value += step;
                i++;
            }
        }

        return list;
    }

    //根据指定的键或索引抽取数组项的值
    //eg:vals([{id:1},{id:2}], "id")  =>  [1,2]
    //eg:vals([[1,"a"],[2,"b"]], 1)   =>  ["a","b"]
    //skipUndefined:是否跳过值不存在的项,默认为true
    function vals(list, prop, skipUndefined) {
        if (!list) return [];

        skipUndefined = skipUndefined !== false;

        var len = list.length,
            i = 0,
            item,
            tmp = [];

        for (; i < len; i++) {
            item = list[i];
            if ((item && item[prop] != undefined) || !skipUndefined) tmp.push(item[prop]);
        }

        return tmp;
    }

    //prototype 别名 eg:alias(Array,"forEach","each");
    function alias(obj, name, aliasName) {
        if (!obj || !obj.prototype) return;

        var prototype = obj.prototype;

        if (typeof name == "string") {
            prototype[aliasName] = prototype[name];
        } else {
            for (var key in name) {
                if (has.call(name, key) && has.call(prototype, key)) prototype[name[key]] = prototype[key];
            }
        }

        return obj;
    }

    //扩展对象
    //forced:是否强制扩展
    function extend(destination, source, forced) {
        if (!destination || !source) return destination;

        for (var key in source) {
            if (key == undefined || !has.call(source, key)) continue;

            if (forced || destination[key] === undefined) destination[key] = source[key];
        }
        return destination;
    }

    //数据克隆（for undefined、null、string、number、boolean、array、object）
    function clone(data) {
        if (!data) return data;

        switch (typeof data) {
            case "string":
            case "number":
            case "boolean":
                return data;
        }

        var result;

        if (isArray(data)) {
            result = [];
            for (var i = 0, len = data.length; i < len; i++) {
                result[i] = clone(data[i]);
            }
        } else if (isObject(data)) {
            result = {};
            for (var key in data) {
                if (has.call(data, key)) result[key] = clone(data[key]);
            }
        }

        return result;
    }

    //将数组或类数组转换为键值对
    //fv:默认值(fv可为处理函数,该函数返回一个长度为2的数组 eg:[key,value])
    //ignoreCase:键是否忽略大小写(如果是,则默认小写)
    function toMap(list, fv, ignoreCase) {
        if (!list) return;

        var map = {},
            isFn = isFunc(fv),
            hasValue = fv !== undefined;

        for (var i = 0, len = list.length; i < len; i++) {
            var key = list[i], value;
            if (key == undefined) continue;

            if (isFn) {
                var kv = fv.call(list, key, i);
                if (!kv) continue;

                key = kv[0];
                value = kv[1];
            } else {
                value = hasValue ? fv : i;
            }

            map[ignoreCase ? key.toLowerCase() : key] = value;
        }

        return map;
    }

    //将对象数组转换为键值对
    //keyProp:对象中作为键的属性
    //valueProp:对象中作为值的属性,若为空,则值为对象本身;为true时同isBuildIndex
    //isBuildIndex:是否给对象添加index属性,值为对象在数组中的索引
    function toObjectMap(list, keyProp, valueProp, isBuildIndex) {
        if (!list) return;

        if (valueProp === true) {
            isBuildIndex = valueProp;
            valueProp = undefined;
        }

        var map = {};

        for (var i = 0, len = list.length; i < len; i++) {
            var obj = list[i];
            if (!obj || typeof obj != "object") continue;

            if (isBuildIndex) obj.index = i;

            map[obj[keyProp]] = valueProp ? obj[valueProp] : obj;
        }

        return map;
    }

    //按字符串排序
    function sortString(list, prop, desc) {
        if (desc) list.sort(function (a, b) { return -(a[prop] || "").localeCompare(b[prop] || ""); });
        else list.sort(function (a, b) { return (a[prop] || "").localeCompare(b[prop] || ""); });
    }

    //按数字排序
    function sortNumber(list, prop, desc) {
        if (desc) list.sort(function (a, b) { return b[prop] - a[prop]; });
        else list.sort(function (a, b) { return a[prop] - b[prop]; });
    }

    //按日期排序
    function sortDate(list, prop, desc) {
        list.sort(function (a, b) {
            var v1 = a[prop], v2 = b[prop];
            if (v1 == v2) return 0;

            var d1 = Date.from(v1), d2 = Date.from(v2), rv = 0;

            if (d1 != INVALID_DATE && d2 != INVALID_DATE) rv = d1 - d2;
            else if (d1 == INVALID_DATE && d2 != INVALID_DATE) rv = -1;
            else if (d1 != INVALID_DATE && d2 == INVALID_DATE) rv = 1;

            return desc ? -rv : rv;
        });
    }

    //对象数组排序
    //type:排序类型 0:字符串排序|1:数字排序|2:日期排序
    function sortList(list, type, prop, desc) {
        switch (type) {
            case 1: sortNumber(list, prop, desc); break;
            case 2: sortDate(list, prop, desc); break;
            default: sortString(list, prop, desc); break;
        }
    }

    //返回一个绑定到指定作用域的新函数
    function proxy(fn, bind) {
        if (isObject(fn)) {
            var name = bind;
            bind = fn;
            fn = bind[name];
        }

        return function () {
            fn.apply(bind, arguments);
        }
    }

    //触发指定函数,如果函数不存在,则不触发 eg:fire(fn,this,arg1,arg2)
    function fire(fn, bind) {
        if (fn != undefined) return fn.apply(bind, slice.call(arguments, 2));
    }

    //延迟执行,若fn未定义,则忽略 eg:delay(fn,this,10,[arg1,arg2])
    //注意:若传入args,则args必须为数组
    function delay(fn, bind, time, args) {
        if (fn == undefined) return;

        return setTimeout(function () {
            //ie6-7,apply第二个参数不能为空,否则报错
            fn.apply(bind, args || []);
        }, def(time, 20));
    }

    //异步执行,相当于setTimeout,但会检查fn是否可用 eg:async(fn,10,arg1,arg2)
    function async(fn, time) {
        return isFunc(fn) && delay(fn, undefined, time, slice.call(arguments, 2));
    }

    //等待达到条件或超时时,执行一个回调函数 callback(ops,timedout)
    function _waitFor(ops) {
        var now_time = +new Date,

            timeout = ops.timeout,  //超时时间
            timedout = timeout && now_time - ops.startTime > timeout;  //是否超时

        //若未超时且未达到条件,则继续等待
        if (!timedout && !ops.check(ops)) {
            ops.count++;

            return async(_waitFor, ops.sleep, ops);
        }

        ops.endTime = now_time;
        ops.callback(ops, timedout);
    }

    //等待达到条件或超时时,执行一个回调函数 callback(ops,timedout)
    //timeout:超时时间(单位:ms),默认10000ms
    //sleep:每次休眠间隔(单位:ms),默认20ms
    function waitFor(check, callback, timeout, sleep) {
        _waitFor({
            check: check,
            callback: callback,
            timeout: timeout,
            sleep: sleep,

            count: 0,
            startTime: +new Date
        });
    };

    //遍历数组或类数组
    //与浏览器实现保持一致(忽略未初始化的项,注意:ie8及以下会忽略数组中 undefined 项)
    function each_array(list, fn, bind) {
        for (var i = 0, len = list.length; i < len; i++) {
            if (i in list) fn.call(bind, list[i], i, list);
        }
    }

    //简单通用工厂,取自mootools
    function factory(init) {
        var obj = init;

        obj.constructor = factory;
        obj.prototype.constructor = obj;

        //prototype扩展
        obj.extend = function (source, forced) {
            extend(this.prototype, source, forced);
        };

        //函数别名
        obj.alias = function (name, aliasName) {
            alias(this, name, aliasName);
        };

        return obj;
    };

    /*
    * extend.js:JavaScript核心对象扩展
    */
    each_array([String, Array, Number, Boolean, Function, Date, RegExp], factory);

    //----------------------------- Object extend -----------------------------

    //扩展Object
    extend(Object, {
        //创建一个拥有指定原型的对象,未实现第二个参数
        create: function (o) {
            var F = function () { };
            F.prototype = o;
            return new F();
        },

        //遍历对象
        forEach: function (obj, fn, bind) {
            for (var key in obj) {
                if (has.call(obj, key)) fn.call(bind, key, obj[key], obj);
            }
        },

        //获取对象所有键
        keys: function (obj) {
            var tmp = [];

            //注意:for in 在ie6下无法枚举 propertyIsEnumerable,isPrototypeOf,hasOwnProperty,toLocaleString,toString,valueOf,constructor 等属性
            //尽量不要使用上述属性作为键
            for (var key in obj) {
                if (has.call(obj, key)) tmp.push(key);
            }

            return tmp;
        },
        //获取对象所有值
        values: function (obj) {
            var tmp = [];

            for (var key in obj) {
                if (has.call(obj, key)) tmp.push(obj[key]);
            }

            return tmp;
        },

        //获取项数量
        size: function (obj) {
            var count = 0;

            for (var key in obj) {
                if (has.call(obj, key)) count++;
            }

            return count;
        },

        //对象是否拥有子项
        hasItem: function (obj) {
            for (var key in obj) {
                if (has.call(obj, key)) return true;
            }

            return false;
        }
    });

    //----------------------------- String extend -----------------------------

    //String原型扩展(已标准化,此为兼容浏览器原生方法)
    String.extend({
        //去掉首尾空格
        trim: function () {
            //return this.replace(/^\s+|\s+$/g, "");

            var str = "" + this,
                str = str.replace(/^\s\s*/, ""),
                ws = /\s/,
                i = str.length;

            while (ws.test(str.charAt(--i))) { };

            return str.slice(0, i + 1);
        },
        //返回将本身重复n次的字符串 eg:"abc".repeat(2) => "abcabc"
        repeat: function (n) {
            //if (n < 1) return "";

            //return new Array(n + 1).join(this);

            //二分法,性能大大提升
            var str = "" + this,
                total = "";

            while (n > 0) {
                if (n % 2 == 1) total += str;
                if (n == 1) break;

                str += str;
                n >>= 1;
            }

            return total;
        },
        //是否以指定字符串开头
        startsWith: function (str, index) {
            var s = "" + this;

            return s.substr(index || 0, str.length) === str;
        },
        //是否以指定字符串结尾
        endsWith: function (str, index) {
            var s = "" + this,
                end = index == undefined || index > s.length ? s.length : index;

            return s.substr(end - str.length, str.length) === str;
        },
        //是否包含指定字符串
        contains: function (str, index) {
            return this.indexOf(str, index) != -1;
        }
    });

    //String原型扩展
    String.extend({
        //删除指定字符串
        //pattern:要删除的字符串或正则表达式
        //flags:正则表达式标记,默认为g
        drop: function (pattern, flags) {
            var regexp = typeof pattern == "string" ? new RegExp(pattern, flags || "g") : pattern;
            return this.replace(regexp, "");
        },
        //字符串反转
        reverse: function () {
            return this.split("").reverse().join("");
        },
        //转为html输出(html编码) eg:\n => <br/>
        toHtml: function () {
            return this.replace(/\x26/g, "&amp;").replace(/\x3c/g, "&lt;").replace(/\x3e/g, "&gt;").replace(/\r?\n|\r/g, "<br/>").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;").replace(/\s/g, "&nbsp;");
        },
        //转为text输出(html解码) eg:<br/> => \n
        toText: function () {
            return this.replace(/<br[^>]*>/ig, "\n").replace(/<script[^>]*>([^~]|~)+?<\/script>/gi, "").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
        }
    });

    String.alias({
        toHtml: "htmlEncode",
        toText: "htmlDecode"
    });

    //----------------------------- Number extend -----------------------------

    //Number原型扩展
    Number.extend({
        //将数字按长度和进制转换为一个长度不低于自身的字符串 eg:(13).format(4) ->'0013'
        //(13).format(1) -> '13'   (13).format(4, 16)->'000d'   (13).format(4, 2) ->'1101'
        format: function (length, radix) {
            var str = this.toString(radix || 10), fix = length - str.length;
            return (fix > 0 ? "0".repeat(fix) : "") + str;
        }
    });

    //----------------------------- Array extend -----------------------------

    //Array原型扩展(已标准化,此为兼容浏览器原生方法)
    //与浏览器实现保持一致(忽略未初始化的项,注意:ie8及以下会忽略数组中 undefined 项)
    //部分函数未做参数有效性检测,传参时需注意
    Array.extend({
        //迭代器:用函数(fn)处理数组的每一项
        forEach: function (fn, bind) {
            var self = this;
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self) fn.call(bind, self[i], i, self);
            }
        },
        //迭代器:返回经过函数(fn)处理后的新数组
        map: function (fn, bind) {
            var self = this, tmp = [];
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self) tmp.push(fn.call(bind, self[i], i, self));
            }
            return tmp;
        },
        //查找方法(顺序)
        indexOf: function (item, index) {
            var self = this, len = self.length, i;
            if (len == 0) return -1;

            if (index == undefined) i = 0;
            else {
                i = Number(index);
                if (i < 0) i = Math.max(i + len, 0);
            }

            for (; i < len; i++) {
                if (i in self && self[i] === item) return i;
            }
            return -1;
        },
        //查找方法(倒序)
        lastIndexOf: function (item, index) {
            var self = this, len = self.length, i;
            if (len == 0) return -1;

            if (index == undefined) i = len - 1;
            else {
                i = Number(index);
                i = i >= 0 ? Math.min(i, len - 1) : i + len;
            }

            for (; i >= 0; i--) {
                if (i in self && self[i] === item) return i;
            }
            return -1;
        },
        //将所有在给定过滤函数中过滤通过的数组项创建一个新数组
        filter: function (fn, bind) {
            var self = this, tmp = [];
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self) {
                    var val = self[i];
                    if (fn.call(bind, val, i, self)) tmp.push(val);
                }
            }
            return tmp;
        },
        //如果数组中的每一项都通过给定函数的测试,则返回true
        every: function (fn, bind) {
            var self = this;
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self && !fn.call(bind, self[i], i, self)) return false;
            }
            return true;
        },
        //如果数组中至少有一个项通过了给出的函数的测试,则返回true
        some: function (fn, bind) {
            var self = this;
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self && fn.call(bind, self[i], i, self)) return true;
            }
            return false;
        }
    });

    //Array原型扩展
    Array.extend({
        //数组中是否存在指定的项
        contains: function (item, index) {
            return this.indexOf(item, index) !== -1;
        },
        //获取数组项
        //若index小于0,则从右往左获取
        get: function (index) {
            if (index >= 0) return this[index];

            index += this.length;
            return index >= 0 ? this[index] : undefined;
        },
        //获取数组第一项
        first: function () {
            return this.get(0);
        },
        //获取数组最后一项
        last: function () {
            return this.get(-1);
        },
        //根据索引删除数组中的项
        del: function (index, n) {
            return this.splice(index, n || 1);
        },
        //去掉数组中的重复项 eg:[0,"0",false,null,undefined] 不支持的特殊情况:[ new String(1), new Number(1) ]
        //如果是对象数组,可以指定对象的键 eg:[{id:1},{id:2}] -> ret.unique("id")
        unique: function (prop) {
            var ret = this, tmp = [], hash = {};

            for (var i = 0, len = ret.length; i < len; i++) {
                var item = ret[i],
                    value = prop ? item[prop] : item,
                    key = typeof (value) + value;  //typeof -> toString.call,性能略有下降

                if (!hash[key]) {
                    tmp.push(item);
                    hash[key] = true;
                }
            }

            return tmp;
        },
        //去掉空的项,并返回一个新数组
        clean: function () {
            var ret = this, tmp = [];

            for (var i = 0, len = ret.length; i < len; i++) {
                if (ret[i] != undefined) tmp.push(ret[i]);
            }

            return tmp;
        },
        //根据指定的键或索引抽取数组项的值 
        //eg:[{id:1},{id:2}]    ->  ret.items("id") => [1,2]
        //eg:[[1,"a"],[2,"b"]]  ->  ret.items(1)    => ["a","b"]
        items: function (prop, skipUndefined) {
            return vals(this, prop, skipUndefined);
        },
        //将数组转换为键值对
        //value:若为空,则使用数组索引;为处理函数,需返回包含键值的数组 eg: value(item,i) => [key,value]
        toMap: function (value, ignoreCase) {
            return toMap(this, value, ignoreCase);
        },
        //将对象数组转换为键值对
        //keyProp:对象中作为键的属性
        //valueProp:对象中作为值的属性,若为空,则值为对象本身;为true时同isBuildIndex
        //isBuildIndex:是否给对象添加index属性,值为对象在数组中的索引
        toObjectMap: function (keyProp, valueProp, isBuildIndex) {
            return toObjectMap(this, keyProp, valueProp, isBuildIndex);
        }
    });

    //Array静态方法扩展(已标准化,此为兼容浏览器原生方法)
    extend(Array, {
        forEach: each_array,

        isArray: isArray
    });

    //----------------------------- Date extend -----------------------------

    var DATE_REPLACEMENTS = [/y{2,4}/, /M{1,2}/, /d{1,2}/, /H{1,2}|h{1,2}/, /m{1,2}/, /s{1,2}/, /S/, /W/, /AP/],
        FIX_TIMEZONEOFFSET = new Date().getTimezoneOffset(),

        WEEKS = "日一二三四五六".split(""),
        APS = ["上午", "下午"],

        INVALID_DATE = new Date(""),

        DATE_FNS = ["getFullYear", "getMonth", "getDate", "getHours", "getMinutes", "getSeconds", "getMilliseconds", "getDay", "getHours"];

    //获取指定part形式表示的日期
    function format_date(part, t) {
        switch (part) {
            case "d": case "day": return t / 86400000;
            case "h": case "hour": return t / 3600000;
            case "m": case "minute": return t / 60000;
            case "s": case "second": return t / 1000;
        }
        return t;
    }

    //Date原型扩展
    Date.extend({
        //是否有效日期
        isValid: function () {
            return !isNaN(this.valueOf());
        },
        //格式化日期显示 eg:(new Date()).format("yyyy-MM-dd hh:mm:ss");
        format: function (format, lang) {
            lang = lang || {};

            if (!this.isValid()) return lang.invalid || "--";

            var months = lang.months,
                weeks = lang.weeks || WEEKS,
                aps = lang.aps || APS,

                len = DATE_REPLACEMENTS.length,
                i = 0;

            for (; i < len; i++) {
                var re_date = DATE_REPLACEMENTS[i], n = this[DATE_FNS[i]]();

                format = format.replace(re_date, function (match) {
                    var length = match.length;

                    //上午|下午
                    if (i == 8) return aps[n > 12 ? 1 : 0];

                    //星期
                    if (i == 7) return weeks[n];

                    //月份
                    if (i == 1) {
                        if (months) return months[n];

                        //月份索引从0开始,此处加1
                        n++;
                    }

                    //12小时制
                    if (i == 3 && match.charAt(0) == "h" && n > 12) n -= 12;

                    //匹配的长度为1时,直接转为字符串输出 H -> 9|19
                    if (length == 1) return "" + n;

                    //按照指定的长度输出字符串(从右往左截取)
                    return ("00" + n).slice(-length);
                });
            }

            return format;
        },
        //通过将一个时间间隔与指定 date 的指定 part 相加，返回一个新的 Date 值
        add: function (part, n) {
            var date = this;
            switch (part) {
                case "y": case "year": date.setFullYear(date.getFullYear() + n); break;
                case "M": case "month": date.setMonth(date.getMonth() + n); break;
                case "d": case "day": date.setDate(date.getDate() + n); break;
                case "h": case "hour": date.setHours(date.getHours() + n); break;
                case "m": case "minute": date.setMinutes(date.getMinutes() + n); break;
                case "s": case "second": date.setSeconds(date.getSeconds() + n); break;
                case "ms": case "millisecond": date.setMilliseconds(date.getMilliseconds() + n); break;
            }
            return date;
        },
        //返回两个指定日期之间所跨的日期或时间 part 边界的数目
        diff: function (part, date) {
            return format_date(part, this - date);
        },
        //从UTC时间转为本地时间
        fromUTC: function () {
            this.setMinutes(this.getMinutes() - FIX_TIMEZONEOFFSET);
            return this;
        },
        //转为UTC时间
        toUTC: function () {
            this.setMinutes(this.getMinutes() + FIX_TIMEZONEOFFSET);
            return this;
        },
        //返回一个日期副本,对该副本所做的修改,不会同步到原日期
        clone: function () {
            return new Date(this.getTime());
        }
    });

    //Date静态方法扩展(已标准化,此为兼容浏览器原生方法)
    extend(Date, {
        //获取当前日期和时间所代表的毫秒数
        now: function () {
            return +new Date;
        }
    });

    //Date静态方法扩展
    extend(Date, {
        //将字符串解析为Date对象
        from: function (s) {
            if (typeof s == "number") return new Date(s);
            if (typeof s == "string") {
                if (!s) return INVALID_DATE;

                //将年、月、横线(-)替换为斜线(/),将时、分替换为冒号(:),去掉日、号、秒
                //var ds = s.replace(/[-\u5e74\u6708]/g, "/").replace(/[\u65f6\u5206\u70b9]/g, ":").replace(/[T\u65e5\u53f7\u79d2]/g, ""), date = new Date(ds);
                var isUTC = s.slice(s.length - 1) == "Z",
                    ds = s.replace(/[-\u5e74\u6708]/g, "/").replace(/[\u65f6\u5206\u70b9]/g, ":").replace("T", " ").replace(/[Z\u65e5\u53f7\u79d2]/g, ""),
                    //毫秒检测
                    index = ds.lastIndexOf("."),
                    date,
                    ms;

                if (index != -1) {
                    ms = +ds.slice(index + 1);
                    ds = ds.slice(0, index);
                }

                date = new Date(ds);

                //兼容只有年月的情况 eg:2014/11
                if (!date.isValid() && ds.indexOf("/") > 0) {
                    var ps = ds.split(' '),
                        s_date = (ps[0] + (ps[0].endsWith("/") ? "" : "/") + "1/1").split('/').slice(0, 3).join("/");

                    date = new Date(s_date + ' ' + (ps[1] || ""));
                }

                //设置毫秒
                if (ms) date.setMilliseconds(ms);

                return date.isValid() ? (isUTC ? date.fromUTC() : date) : s;
            }

            return toString.call(s) == "[object Date]" ? s : INVALID_DATE;
        },

        //获取秒转化的时间部分
        parts: function (t) {
            var days = 0, hours = 0, mintues = 0;

            days = Math.floor(t / 86400);
            if (days > 0) t -= days * 86400;

            hours = Math.floor(t / 3600);
            if (hours > 0) t -= hours * 3600;

            mintues = Math.floor(t / 60);
            if (mintues > 0) t -= mintues * 60;

            return { days: days, hours: hours, mintues: mintues, seconds: t };
        },

        //计算时间t所代表的总数
        total: format_date
    });

    //---------------------- 事件监听器 ----------------------

    //自定义事件监听器
    //types:自定义事件列表
    //bind:事件函数绑定的上下文 eg:fn.call(bind)
    function Listener(types, bind) {
        this.map = {};
        this.bind = bind;

        var self = this;
        types.forEach(function (type) {
            self.map[type] = [];
        });
    }

    Listener.prototype = {
        constructor: Listener,

        //添加事件 eg:listener.add("start",fn);
        add: function (type, fn) {
            var map = this.map;

            if (typeof type == "string") {
                if (isFunc(fn)) map[type].push(fn);
            } else if (isObject(type)) {
                Object.forEach(type, function (k, v) {
                    if (map[k] && isFunc(v)) map[k].push(v);
                });
            }

            return this;
        },
        //触发自定义事件 eg:listener.trigger("click",args);
        trigger: function (type, args) {
            var self = this,
                list = self.map[type];

            return list.length > 0 ? list.map(function (fn) {
                //确保args为数组
                return fn.apply(self.bind, [].concat(args));
            }) : undefined;
        }
    };

    //---------------------- 其它 ----------------------

    //正则验证
    var RE_MAIL = /^[\w\.-]+@[\w-]+(\.[\w-]+)*\.[\w-]+$/,           //验证邮箱
        RE_PHONE = /^(1\d{10}|(\d{3,4}-?)?\d{7,8}(-\d{1,4})?)$/,    //验证电话号码(手机号码、带区号或不带区号、带分机号或不带分机号)
        RE_TEL = /^1\d{10}$/,                                       //验证手机号码
        RE_HTTP = /^https?:\/\//i;

    //判断字符串是否符合IPv4格式
    function isIP(ip) {
        var parts = ip.split("."), length = parts.length;
        if (length != 4) return false;

        for (var i = 0; i < length; i++) {
            var part = +parts[i];
            if (!parts[i] || isNaN(part) || part < 0 || part > 255) return false;
        }

        return true;
    }

    //是否符合邮箱格式
    function isMail(str) {
        return RE_MAIL.test(str);
    }

    //是否符合电话号码格式 18688889999 | 027-88889999-3912
    function isPhone(str) {
        return RE_PHONE.test(str);
    }

    //是否符合手机号码格式 18688889999
    function isTel(str) {
        return RE_TEL.test(str);
    }

    //是否http路径(以 http:// 或 https:// 开头)
    function isHttpURL(url) {
        return RE_HTTP.test(url);
    }

    //按照进制解析数字的层级 eg:时间转化 -> parseLevel(86400,[60,60,24]) => { value=1, level=3 }
    //steps:步进,可以是固定的数字(eg:1024),也可以是具有层次关系的数组(eg:[60,60,24])
    //limit:限制解析的层级,正整数,默认为100
    function parseLevel(size, steps, limit) {
        size = +size;
        steps = steps || 1024;

        var level = 0,
            isNum = typeof steps == "number",
            stepNow = 1,
            count = isUInt(limit) ? limit : (isNum ? 100 : steps.length);

        while (size >= stepNow && level < count) {
            stepNow *= (isNum ? steps : steps[level]);
            level++;
        }

        if (level && size < stepNow) {
            stepNow /= (isNum ? steps : steps.last());
            level--;
        }

        return { value: level ? size / stepNow : size, level: level };
    }

    var UNITS_FILE_SIZE = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];

    //格式化数字输出,将数字转为合适的单位输出,默认按照1024层级转为文件单位输出
    function formatSize(size, ops) {
        ops = ops === true ? { all: true } : ops || {};

        if (isNaN(size) || size == undefined || size < 0) {
            var error = ops.error || "--";

            return ops.all ? { text: error } : error;
        }

        var pl = parseLevel(size, ops.steps, ops.limit),

            value = pl.value,
            text = value.toFixed(def(ops.digit, 2));

        if (ops.trim !== false && text.lastIndexOf(".") != -1) text = text.replace(/\.?0+$/, "");

        pl.text = text + (ops.join || "") + (ops.units || UNITS_FILE_SIZE)[pl.level + (ops.start || 0)];

        return ops.all ? pl : pl.text;
    }

    //---------------------- export ----------------------

    var Q = {
        version: "1.2.2",
        G: GLOBAL,

        strict: is_strict_mode,

        type: getType,

        isFunc: isFunc,
        isObject: isObject,
        isArray: Array.isArray,
        isArrayLike: isArrayLike,

        def: def,
        isNum: isNum,
        isUNum: isUNum,
        isInt: isInt,
        isUInt: isUInt,
        checkNum: checkNum,
        checkInt: checkInt,

        toUpper: toUpper,
        toLower: toLower,

        toArray: toArray,
        makeArray: makeArray,

        arr: arr,
        vals: vals,

        alias: alias,
        extend: extend,
        clone: clone,

        toMap: toMap,
        toObjectMap: toObjectMap,

        sortNumber: sortNumber,
        sortString: sortString,
        sortDate: sortDate,
        sort: sortList,

        proxy: proxy,
        fire: fire,
        delay: delay,
        async: async,
        waitFor: waitFor,

        factory: factory,

        isIP: isIP,
        isMail: isMail,
        isPhone: isPhone,
        isTel: isTel,
        isHttpURL: isHttpURL,

        parseLevel: parseLevel,
        formatSize: formatSize,

        Listener: Listener
    };

    GLOBAL.Q = Q;

    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = Q;
    }

})();

﻿/*
* Q.Queue.js 队列
* author:devin87@qq.com
* update:2015/10/15 10:39
*/
(function (undefined) {
    "use strict";

    var delay = Q.delay,
        extend = Q.extend,
        fire = Q.fire,

        isFunc = Q.isFunc,
        isObject = Q.isObject,
        isArrayLike = Q.isArrayLike,
        isUInt = Q.isUInt,

        getType = Q.type,
        makeArray = Q.makeArray,
        factory = Q.factory,

        Listener = Q.Listener;

    var QUEUE_TASK_TIMEDOUT = -1,    //任务已超时
        QUEUE_TASK_READY = 0,        //任务已就绪，准备执行
        QUEUE_TASK_PROCESSING = 1,   //任务执行中
        QUEUE_TASK_OK = 2,           //任务已完成

        //自定义事件
        LIST_CUSTOM_EVENT = ["add", "start", "end", "stop", "complete"];

    //异步队列
    function Queue(ops) {
        ops = ops || {};

        var self = this,
            tasks = ops.tasks;

        //队列自定义事件
        self._listener = new Listener(LIST_CUSTOM_EVENT, self);

        self.auto = ops.auto !== false;
        self.workerThread = ops.workerThread || 1;
        self.timeout = ops.timeout;

        if (ops.rtype == "auto") self.rtype = getType(tasks);

        LIST_CUSTOM_EVENT.forEach(function (type) {
            var fn = ops[type];
            if (fn) self.on(type, fn);
        });

        if (ops.inject) self.inject = ops.inject;
        if (ops.process) self.process = ops.process;
        if (ops.processResult) self.processResult = ops.processResult;

        self.ops = ops;

        self.reset();

        delay(self.addList, self, 0, [tasks]);
    }

    factory(Queue).extend({
        //添加自定义事件
        on: function (type, fn) {
            this._listener.add(type, fn);
            return this;
        },
        //触发自定义事件
        trigger: function (type, args) {
            this._listener.trigger(type, args);
            return this;
        },

        //重置队列
        reset: function () {
            var self = this;

            self.tasks = [];
            self.index = 0;

            self.workerIdle = self.workerThread;

            return self;
        },

        //添加任务
        _add: function (args, key, auto) {
            var self = this;

            var task = { args: makeArray(args), state: QUEUE_TASK_READY };
            if (key != undefined) task.key = key;

            self.tasks.push(task);

            self.trigger("add", task);

            if (auto) self.start();

            return self;
        },

        //添加任务
        add: function () {
            return this._add(arguments, undefined, this.auto);
        },

        //批量添加任务
        addList: function (tasks) {
            var self = this;
            if (!tasks) return self;

            if (isArrayLike(tasks)) {
                Array.forEach(tasks, function (v, i) {
                    self._add(v, i, false);
                });
            } else {
                Object.forEach(tasks, function (k, v) {
                    self._add(v, k, false);
                });
            }

            if (self.auto) self.start();

            return self;
        },

        //返回队列长度,可指定任务状态
        size: function (state) {
            return state != undefined ? this.tasks.filter(function (task) { return task.state == state; }).length : this.tasks.length;
        },

        //运行队列
        _run: function () {
            var self = this;

            if (self.stoped || self.workerIdle <= 0 || self.index >= self.tasks.length) return self;

            var task = self.tasks[self.index++],
                timeout = self.timeout;

            self.workerIdle--;

            self.trigger("start", task);

            //跳过任务
            if (task.state != QUEUE_TASK_READY) return self.ok(task);

            task.state = QUEUE_TASK_PROCESSING;

            //超时检测
            if (isUInt(timeout)) task._timer = delay(self.ok, self, timeout, [task, QUEUE_TASK_TIMEDOUT]);

            //处理任务
            self.process(task, function () {
                self.ok(task, QUEUE_TASK_OK);
            });

            return self.workerIdle ? self._run() : self;
        },

        //启动队列,默认延迟10ms
        start: function () {
            var self = this;
            self.stoped = false;
            if (!self.auto) self.auto = true;

            delay(self._run, self, 10);

            return self;
        },

        //暂停队列,可以调用start方法重新启动队列
        //time:可选,暂停的毫秒数
        stop: function (time) {
            var self = this;
            self.stoped = true;

            if (isUInt(time)) delay(self.start, self, time);

            return self;
        },

        //回调函数注入(支持2级注入)
        inject: function (task, callback) {
            var self = this,
                ops = self.ops,

                injectIndex = ops.injectIndex || 0,     //执行函数中回调函数所在参数索引
                injectCallback = ops.injectCallback,    //如果该参数是一个对象,需指定参数名称,可选

                args = task.args.slice(0);

            //自执行函数
            if (!ops.exec && isFunc(args[0])) injectIndex++;

            //task.args 克隆,避免对原数据的影响
            var data = args[injectIndex],
                originalCallback;

            //注入回调函数
            var inject = function (result) {
                //注入结果仅取第一个返回值,有多个结果的请使用数组或对象传递
                task.result = result;

                //执行原回调函数(如果有)
                if (isFunc(originalCallback)) originalCallback.apply(this, arguments);

                //触发任务完成回调,并执行下一个任务 
                callback();
            };

            if (injectCallback != undefined) {
                //避免重复注入
                var qcallback = data.__qcallback;
                originalCallback = qcallback || data[injectCallback];
                if (!qcallback && originalCallback) data.__qcallback = originalCallback;

                data[injectCallback] = inject;
                args[injectIndex] = data;
            } else {
                originalCallback = data;

                args[injectIndex] = inject;
            }

            return args;
        },

        //处理队列任务
        process: function (task, callback) {
            var self = this,
                ops = self.ops,

                exec = ops.exec,    //执行函数
                bind = ops.bind,    //执行函数绑定的上下文,可选

                args = self.inject(task, callback),
                fn = args[0];

            if (fn instanceof Queue) fn.start();
            else if (exec) exec.apply(bind, args);
            else fn.apply(bind, args.slice(1));
        },

        //队列完成时,任务结果处理,用于complete事件参数
        processResult: function (tasks) {
            switch (this.rtype) {
                case "array":
                case "list":
                case "arguments":
                    return tasks.items("result");

                case "object": return tasks.toObjectMap("key", "result");
            }

            return [tasks];
        },

        //所有任务是否已完成
        isCompleted: function (tasks) {
            return (tasks || this.tasks).every(function (task) {
                return task.state == QUEUE_TASK_OK || task.state == QUEUE_TASK_TIMEDOUT;
            });
        },

        //设置任务执行状态为完成并开始新的任务
        ok: function (task, state) {
            var self = this;
            if (task.state != QUEUE_TASK_PROCESSING) return self._run();

            if (++self.workerIdle > self.workerThread) self.workerIdle = self.workerThread;

            if (task._timer) clearTimeout(task._timer);

            if (state != undefined) task.state = state;

            //触发任务完成事件
            self.trigger("end", task);

            if (self.stoped) {
                //任务已停止且完成时触发任务停止事件
                if (self.isCompleted(self.tasks.slice(0, self.index))) self.trigger("stop", self.processResult(self.tasks));
            } else {
                //当前队列任务已完成
                if (self.isCompleted()) {
                    self.trigger("complete", self.processResult(self.tasks));

                    //队列完成事件,此为提供注入接口
                    fire(self.complete, self);
                }
            }

            return self._run();
        }
    });

    //队列任务状态
    Queue.TASK = {
        TIMEDOUT: QUEUE_TASK_TIMEDOUT,
        READY: QUEUE_TASK_READY,
        PROCESSING: QUEUE_TASK_PROCESSING,
        OK: QUEUE_TASK_OK
    };

    //函数排队执行
    function series(tasks, complete, ops, workerThread) {
        if (isObject(complete)) {
            ops = complete;
            complete = undefined;
        }

        return new Queue(extend(ops || {}, {
            rtype: "auto",
            workerThread: workerThread,

            tasks: tasks,
            complete: complete
        }));
    }

    //函数并行执行
    function parallel(tasks, complete, ops) {
        return series(tasks, complete, ops, isArrayLike(tasks) ? tasks.length : Object.size(tasks));
    }

    //ajax队列
    function ajaxQueue(ops) {
        ops = ops || {};

        return new Queue(extend(ops, {
            exec: ops.ajax || Q.ajax || $.ajax,
            injectIndex: 1,
            injectCallback: "complete"
        }));
    }

    //------------------------- export -------------------------

    extend(Q, {
        Queue: Queue,

        series: series,
        parallel: parallel,

        ajaxQueue: ajaxQueue
    });

})();