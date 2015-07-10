module.exports = {
    concat: {
        title: "文件合并",

        dir: "../demo/js/src",
        output: "../release/js-concat",

        list: [
            {
                dir: "a",
                src: ["t1.js", "t2.js", "t3.js"],
                dest: "a.js",
                prefix: "//----------- APPEND TEST (%f.filename%) -----------\n"
            },
            {
                dir: "b",
                src: ["t1.js", "t2.js", "t-error.js"],
                dest: "b.js"
            },
            {
                dir: "/release/js-concat",
                src: ["a.js", "b.js"],
                dest: "ab.js"
            }
        ]
    }
};