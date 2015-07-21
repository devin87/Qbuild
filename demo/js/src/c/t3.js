//通用头部模块 t3.js
(function () {
    var href = location.href,
        ua = navigator.userAgent,
        title = document.title,

        start = href.indexOf("/demo"),
        url;

    if (start == -1) start = href.lastIndexOf("/");
    url = href.slice(start);

    var links = document.getElementsByTagName("a"),
        len = links.length,
        i = 0,
        link;

    for (; i < len; i++) {
        link = links[i];
        if (link.innerHTML == title) link.parentNode.className = "on";
    }

    document.getElementById("mark").innerHTML =
        '<div class="title">' + title + '</div>' +
        '<div class="' + (url.indexOf("about/") != -1 ? "green" : "hot") + '">' + url + '</div>' +
        '<div class="mark">' + ua + '</div>';
})();