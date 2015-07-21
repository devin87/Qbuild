//build 配置文件
module.exports = {
    //根目录,默认为配置文件所在路径,所有目录均基于此目录
    //绝对路径优先;若以./开头则基于配置文件路径(下同)
    root: "../",
    //输入目录,以下所有dir目录均基于此目录(若以/开头则直接基于根目录)
    dir: "demo",
    //输出目录,同上
    output: "release2",

    //是否自动跳过未更新的文件
    //若任务对象有同名属性,则以任务对象的值为主 eg: dir、output、skipOutput、autoSkip、enable、preload、rename、registerText、runText
    autoSkip: true,

    //文件重命名
    rename: "%f.name%.%date('yyyyMMddHHmm')%%f.ext%",
    //清理上次生成的文件
    cleanDest: true,

    //注册任务处理模块,基于根目录,默认导入./module/*.js
    /*register: {
        concat: "./module/concat.js",
        format: "./module/format.js",
        cmd: "./module/cmd.js",

        //若处理程序相同,可重用已注册的模块 eg: copy:"format"
        copy: "./module/copy.js"
    },*/

    //注册文本处理模块,基于根目录,默认导入./module/text/*.js
    //registerText: {},
    //registerText: "./module/text/*.js",

    //默认执行的文本处理模块(按顺序执行),*表示其它模块
    runText: ["replace", "before", "after", "*"],

    //任务:文件合并
    concat: {
        title: "文件合并",

        dir: "js/src",
        output: "js-concat",

        list: [
            {
                dir: "a",
                src: ["t1.js", "t2.js", "t3.js"],
                dest: "src/a.js"
            },
            {
                dir: "b",
                src: ["t1.js", "t2.js"],
                dest: "src/b.js"
            },
            {
                //不从父级继承，以/开头直接基于root定义的目录
                dir: "/release2/js-concat/src",
                src: ["a.js", "b.js"],
                dest: "ab.js"
            }
        ],

        before: [
            "//build:%NOW% by Qbuild.js devin87@qq.com\n",
            {
                "ab.js": "//a.js+b.js\n"
            }
        ],

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
    format: {
        title: "格式化html文件",
        //autoSkip: false,
        rename: false,

        //注册单独的文本处理模块,|开头表示程序所在目录
        registerText: {
            include: "|./module/text/custom/document.write.js",
            update_link: "|./module/text/custom/update_link.js"
        },

        include: "/**(head|bottom).js",

        //可配置重命名更新匹配规则
        //update_link: {
        //    match: /<(script|link|img)[^>]+?(src|href)=(['"])([^>]+?)\3[^>]*>/ig,
        //    index: 4
        //},

        runText: ["replace", "before", "after", "include", "update_link"],

        //dir: "",

        //一般output可省略,将自动保持原始文件夹结构
        output: "www",

        //要匹配的文件,可为数组 eg:["about/*.html", "m/*.html"]
        //*可匹配斜杆之外的字符,2个*可匹配所有字符
        match: "**.html",
        //要排除的文件
        exclude: "**.old.html",

        //默认会优化匹配规则以加速扫描 eg:[ab]/*.js => { dir:"[ab]",match:"*.js" }
        //若想在一些特殊情况下使用正则表达式,可以关闭优化
        //matchOptimize: true,

        replace: [
            //移除html注释
            [/(<!--(?!\[if\s)([^~]|~)*?-->)/gi, ""],
            //移除空script标签
            [/\s*<script(\s+type="[^"]+")?>\s*?<\/script>/gi, ""],
            //移除无效的空格或换行
            [/(<div[^>]*>)[\s\r\n]+(<\/div>)/gi, "$1$2"],
            //移除多余的换行
            [/(\r?\n)(\r?\n)+/g, "$1"],
            //移除首尾空格
            [/^\s+|\s+$/, ""]
        ]
    },
    format0: {
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
    },

    //任务:调用命令行压缩js
    cmd: [
        {
            title: "压缩js",

            //cmd: "java -jar D:\\tools\\compiler.jar --js=%f.fullname% --js_output_file=%f.dest%",
            cmd: "uglifyjs %f.fullname% -o %f.dest% -c -m",

            match: ["js/**.js", "m/js/**.js"],
            exclude: "js/data/**.js|js/error.js",

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
            match: "js/data/**.js"
        },
        {
            title: "同步图片",
            match: "images/**"
        }
    ],

    //要启动的任务,按顺序执行,不支持*
    run: ["concat", "cmd", "format0", "format", "copy"]
};