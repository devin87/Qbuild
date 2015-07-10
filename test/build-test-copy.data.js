module.exports = {
    dir: "../demo",
    output: "../release",

    copy: [
        {
            title: "同步js数据",
            match: "js/data/**.js"
        },
        {
            title: "同步图片",
            match: "images/**"
        }
    ]
};