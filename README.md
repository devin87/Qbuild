# build.js
简单高效的项目构建工具，基于Node.js，支持js压缩、文件合并、格式化、复制和重命名。

###特点：
<ul>
    <li>轻量高效，易于配置。支持js压缩、文件合并、格式化、复制和重命名等。</li>
	<li>基于js的配置文件，支持自定义任务模块和文本处理，支持模块重用。</li>
	<li>灵活的文件扫描规则，支持通配符（*和**），支持正则表达式，支持排除规则。</li>
	<li>自动跳过未更新的文件，大大提升处理效率。</li>
	<li>重命名文件时，自动更新文件引用（可配置）。</li>
	<li>支持将通过 document.write 输出内容的js文件，直接将js引用替换为输出内容。</li>
</ul>

###运行环境：
1. 下载 [Node.js](https://nodejs.org/download/) 并安装
2. 下载或安装js压缩工具，任选其一
    1> 安装uglify，在命令行下执行以下命令
    ```npm install uglify-js -g```

    2> 下载 [Google Closure Compiler](https://github.com/google/closure-compiler)
    确保本机已安装 [java7+](http://www.java.com/zh_CN/download/manual.jsp)
    [点此下载最新版](http://dl.google.com/closure-compiler/compiler-latest.zip)，若无法访问Google [点此百度盘下载](http://pan.baidu.com/s/1qW1I1as)
    解压至任意文件夹，然后在 build.data.js 配置文件指定compiler.jar的路径

###任务说明：
每个任务即一个过程，都有对应的模块处理。模块参数完全自定义，传入的参数以模块需要为主。每个任务模块可以有多个文本处理模块，参数也是高度自定义。任务模块和文本处理模块均需先注册，文本处理模块可注册到全局，默认对所有任务（任务模块里调用了文本处理模块）生效，也可注册到单独的任务模块，则仅对该任务生效。每个任务都可以配置要运行的文本处理模块以及执行的顺序。

一般来讲，仅需配置匹配的文件规则即可，其它参数依模块需要传递即可。

```一个简单的模块 eg: format.js```
```javascript
module.exports = {
    //模块类型(模块名)，也是参数名，可为字符串或数组
    type: ["format", "format0", "format1"],
    
    //针对单个文件的处理函数
    //若想直接处理所有文件，可将 exec 改为 process (data, callback)
    //data: 任务对象(传入的参数)
    exec: function (f, data, callback) {
        if (f.skip) {
            Qbuild.log("跳过：" + f.relname);
            return Q.fire(callback);
        }

        Qbuild.log("处理：" + f.relname, Qbuild.HOT);

        Qbuild.readFile(f, function () {
            Qbuild.runTextModules(f, data);
            Qbuild.saveFile(f, callback);
        });
    }
};
```

###注册模块：
1. 批量注册，支持通配符（*和**）和正则表达式
```javascript
module.exports = {
    //注册任务模块
    register: "./module/*.js",

    //单个任务对象或任务对象数组
    concat:{},
    format:[{},{}],

    //注册文本处理模块(同任务模块)
    registerText: "./module/text/*.js",

    //要运行的模块，模块名称可在js文件中定义
    run:["concat", "format", "cmd", "copy"]
};
```

2. 单独注册
```javascript
module.exports = {
    //模块名与任务模块一一对应，此时将忽略js模块中的定义(type)
    register: {
        concat: "./module/concat.js",  //文件合并
        format: "./module/format.js",  //文件格式化
        cmd: "./module/cmd.js",        //调用命令行执行js压缩
        copy: "./module/copy.js",      //文件复制

        //重用已注册的模块，使用同样的处理程序
        format2:"format"
    },

    registerText: {},

    //传递给 format.js 模块的参数
    format2:{}
};
```

###配置文件(build.data.js)：
```javascript
module.exports = {
    //根目录,默认为配置文件所在路径,所有目录均基于此目录
    //绝对路径优先;若以|开头则基于构建程序所在目录,以./开头则基于配置文件路径(下同)
    root: "../",
    //输入目录,以下所有dir目录均基于此目录(若以/开头则直接基于根目录)
    dir: "demo",
    //输出目录,同上
    output: "release",

    //是否自动跳过未更新的文件
    //若任务对象有同名属性,则以任务对象的值为主 eg: dir、output、skipOutput、autoSkip、enable、preload、rename、registerText、runText
    autoSkip: true,

    //文件重命名
    //rename: "%f.name%.%date('yyyyMMddHHmm')%%f.ext%",

    //注册任务处理模块,基于根目录
    register: {
        concat: "./module/concat.js",
        format: "./module/format.js",
        cmd: "./module/cmd.js",

        //若处理程序相同,可重用已注册的模块 eg: copy:"format"
        copy: "./module/copy.js"
    },

    //注册文本处理模块,基于根目录
    //registerText: {},
    registerText: "./module/text/*.js",

    //默认执行的文本处理模块(按顺序执行),*表示其它模块
    runText: ["replace", "before", "after", "*"],

    //任务:文件合并
    concat: {
        title: "文件合并",

        //指定要运行的文本模块和执行顺序
        //runText: ["replace", "before", "after", "*"],

        dir: "js/src",
        output: "/demo/js",

        //可以简写为 {"src/a.js":["a/t1.js", "a/t2.js", "a/t3.js"]}
        list: [
            {
                dir: "a",
                src: ["t1.js", "t2.js", "t3.js"],
                dest: "src/a.js"
            },
            {
                dir: "b",
                src: ["t1.js", "t2.js", "D:/t.js"],
                dest: "src/b.js"
            },
            {
                src: ["a.js", "b.js"],
                dest: "ab.js"
            }
        ],

        //在文件内容之前添加文本,见 ./module/text/append.js
        before: [
            "//build:%NOW% by Qbuild.js devin87@qq.com\n",

            //给不同文件追加不同文本,不适用有同名文件的情况
            {
                //其它文件追加的文本
                "def": "%//f.fullname%",
                //ab.js追加的文本
                "ab.js": "//a.js+b.js\n"
            }
        ],

        //在文件内容之后添加文本,同上,见 ./module/text/append.js
        after: [
            {
                "ab.js": "\n//append after test!"
            }
        ],

        replace: [
            //移除\r字符,第一个参数可以是正则表达式或字符串,若是字符串,则需要指定第3个参数(正则表达式标记 eg:g、i、m或其组合)
            [/\r/g, ""],
            //移除VS引用
            [/\/\/\/\s*<reference path="[^"]*" \/>\n/gi, ""]
        ],

        //禁用文件重命名
        rename: false
    },

    //任务:文件格式化
    format: [
        {
            title: "格式化html文件",
            //autoSkip: false,

            //注册单独的文本处理模块
            registerText: {
                include: "./module/text/custom/document.write.js"
            },

            //传给 document.write.js 的参数
            include: "/demo/js/**(head|bottom).js",

            //要扫描的目录,可为数组,默认只扫描当前目录下的文件,若要扫描子孙目录,请使用*或**
            //扫描根目录下所有子目录 eg:/*
            //扫描根目录下所有子孙目录(包括子目录的子目录等) eg:/**
            //dir: ["ab*/*", "m"],

            //一般output可省略,将自动保持原始文件夹结构
            output: "",

            //要匹配的文件,支持正则表达式 eg: (*|/demo/**).html
            //*可匹配斜杆之外的字符,2个*可匹配所有字符
            match: "**.html",
            //要排除的文件
            exclude: "**.old.html",

            replace: [
                //移除html注释
                [/(<!--(?!\[if\s)([^~]|~)*?-->)/gi, ""],
                //移除无效的空格或换行
                [/(<div[^>]*>)[\s\r\n]+(<\/div>)/gi, "$1$2"],
                //移除多余的换行
                [/(\r?\n)(\r?\n)+/g, "$1"],
                //移除首尾空格
                [/^\s+|\s+$/,""]
            ]
        },
        {
            title: "格式化css文件",
            //enable: false,

            dir: "css",
            match: "*.css",

            replace: [
                //移除css注释
                [/\/\*([^~]|~)*?\*\//g, ""],
                //移除多余的换行
                [/(\r?\n)(\r?\n)+/g, "$1"],
                //移除首尾空格
                [/^\s+|\s+$/, ""]
            ]
        }
    ],

    //任务:调用命令行压缩js
    cmd: [
        {
            title: "压缩js",

            dir: ["js", "m/js"],
            //cmd: "java -jar D:\\tools\\compiler.jar --js=%f.fullname% --js_output_file=%f.dest%",
            cmd: "uglifyjs %f.fullname% -o %f.dest% -c -m",

            match: "**.js",
            exclude: "data/**.js",

            replace: [
                //去掉文件头部压缩工具可能保留的注释
                [/^\/\*([^~]|~)*?\*\//, ""]
            ],

            //可针对单一的文件配置 before、after,def 表示默认
            before: [
                {
                    "def": "//devin87@qq.com\n",
                    "Q.js": "//Q.js devin87@qq.com\n"
                },
                "//build:%NOW%\n"
            ]
        }
    ],

    //任务:文件同步(复制)
    copy: [
        {
            title: "同步js数据",
            dir: "js/data",
            match: "**.js"
        },
        {
            title: "同步图片",
            dir: "images",
            match: "**"
        }
    ],

    //要启动的任务,按顺序执行,不支持*
    run: ["concat", "format", "cmd", "copy"]
};
`````