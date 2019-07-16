module.exports = {
    root: "../",
    dir: "demo",
    output: "release",

    format: [
        {
            title: "格式化html文件",
            //autoSkip: false,

            match: "*.html",
            exclude: "**.old.html",

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

            match: "css/*.css",

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
    copy: [
        {
            title: "同步js/boot.js",
            autoSkip: false,
            match: ["js/boot.js"]
        }
    ],
    format1: [
        {
            title: "html文件url添加打包时间",
            dir: "/release",
            output: "/release",
            autoSkip: false,

            match: ["*.html"],
            exclude: "**.old.html",

            replace: [
                //移除上次附加的url参数
                [/<(script|link|img)[^>]+?(src|href)=(['"])([^>]+?)\3[^>]*>/ig, { match: 4, pattern: /(\?|&)t=[^&"'>]*/g, value: "" }]
            ],

            join_url: [
                //附加url参数 eg: t=1563269131930
                [/<(script|link|img)[^>]+?(src|href)=(['"])([^>]+?)\3[^>]*>/ig, 4, 't=%START_TICK%']
            ]
        },
        {
            title: "css文件url添加打包时间",
            dir: "/release",
            output: "/release",
            autoSkip: false,

            match: ["css/*.css"],
            exclude: "**.old.css",

            replace: [
                //移除上次附加的url参数
                [/url\(([^)]+)\)/ig, { match: 1, pattern: /(\?|&)t=[^&"'>]*/g, value: "" }]
            ],

            join_url: [
                //附加url参数 eg: t=1563269131930
                [/url\(([^)]+)\)/ig, 1, 't=%START_TICK%']
            ]
        },
        {
            title: "js/boot.js文件替换打包时间",
            dir: "/release",
            output: "/release",
            autoSkip: false,

            match: ["js/boot.js"],
            exclude: "**.old.js",

            replace: [
                [/QBUILD_RUN\(([^)]+)\)/ig, 1]
            ]
        }
    ],

    run: ["format", "copy", "format1"]
};