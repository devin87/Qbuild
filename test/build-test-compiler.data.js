module.exports = {
    dir: "../demo",
    output: "../release",

    cmd: {
        title: "压缩js",
        //cmd: "java -jar D:\\tools\\compiler.jar --js=%f.fullname% --js_output_file=%f.dest%",
        cmd: "uglifyjs %f.fullname% -o %f.dest% -c -m",

        match: "js/*.js",
        exclude: "js/error.js",

        before: "//build:%NOW%\n"
    }
};