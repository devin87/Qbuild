//build 配置文件
module.exports = {
    //根目录,默认为配置文件所在路径,所有目录均基于此目录
    //绝对路径优先;若以./开头则基于配置文件路径(下同)
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
                "def": "//%f.fullname%",
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