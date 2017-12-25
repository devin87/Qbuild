# Qbuild
简单高效的项目构建工具，基于Node.js，支持js压缩、文件合并、格式化、复制和重命名等。

### 特点：
<ul>
    <li>轻量高效，易于配置。支持js压缩、文件合并、格式化、复制和重命名等。</li>
	<li>基于js的配置文件，支持自定义任务模块和文本处理，支持模块重用。</li>
	<li>灵活的文件扫描规则，支持通配符（*和**），支持正则表达式，支持排除规则。</li>
	<li>自动跳过未更新的文件，大大提升处理效率。</li>
	<li>重命名文件时，自动更新文件引用（可配置）。</li>
	<li>支持将通过 document.write 输出内容的js文件，直接将js引用替换为输出内容。</li>
</ul>

### 运行环境：
1. 下载 [Node.js](https://nodejs.org/en/download/) 并安装
2. 下载或安装js压缩工具，任选其一

    1> 安装uglify，在命令行下执行以下命令

    ```npm install uglify-js -g```

    2> 下载 [Google Closure Compiler](https://github.com/google/closure-compiler)
    确保本机已安装 [java7+](http://www.java.com/zh_CN/download/manual.jsp)，
    [点此下载最新版](http://dl.google.com/closure-compiler/compiler-latest.zip)，若无法访问Google， [点此百度盘下载](https://pan.baidu.com/s/1cazLX8)。解压至任意文件夹，然后在 build.data.js 配置文件指定 compiler.jar 的路径
3. 在命令行下执行（Windows 可直接运行 build.bat ），注意build文件夹路径

    ```node build/build.js```
    
    可以手动指定配置文件和自定义存储文件（均为可选）
    
    ```node build/build.js build.data.js build.store.json```

### 使用教程
[使用Qbuild进行文件合并、压缩、格式化等处理](http://www.cnblogs.com/devin87/p/Qbuild-doc.html)


### 配置文件(build.data.js)：
```javascript
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

    //不保存自定义存储数据
    //noStore: false,

    //文件重命名
    //rename: "%f.name%.%date('yyyyMMddHHmm')%%f.ext%",
    //清理上次生成的文件
    //cleanDest: true,

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

        //指定要运行的文本模块和执行顺序
        //runText: ["replace", "before", "after", "*"],

        dir: "js/src",
        output: "js-concat",

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
                //不从父级继承，以/开头直接基于root定义的目录
                dir: "/release/js-concat/src",
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
                "def": "//%f.fullname%\n",
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

            //dir: "",

            //一般output可省略,将自动保持原始文件夹结构
            //output: "",

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
                //移除无效的空格或换行
                [/(<div[^>]*>)[\s\r\n]+(<\/div>)/gi, "$1$2"],
                //移除多余的换行
                [/(\r?\n)(\r?\n)+/g, "$1"],
                //移除首尾空格
                [/^\s+|\s+$/, ""]
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