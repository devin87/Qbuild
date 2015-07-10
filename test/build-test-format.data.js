module.exports = {
    dir: "../demo",
    output: "../release",

    format: [
        {
            title: "格式化html文件",

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
    ]
};