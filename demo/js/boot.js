/// <reference path="_global.js" />
/// <reference path="jquery.all.js" />
(function (window, undefined) {
    "use strict";

    var extend = Q.extend,
        loadJS = Q.loadJS,
        waitFor = Q.waitFor,
        store = Q.store;

    var list_lang = [
        { lang: "EN", name: "English" },
        { lang: "CN", name: "简体中文" },
        { lang: "TW", name: "繁體中文" }
    ];

    var map_lang = list_lang.toObjectMap("lang");

    //获取默认语言
    function get_default_lang() {
        var lang = store.get("LANG");
        if (lang && map_lang[lang]) return lang;

        var browser_lang = (navigator.language || navigator.userLanguage).toUpperCase(),
            l,
            i = 0;

        while ((l = list_lang[i++])) {
            if (browser_lang.contains(l.lang)) {
                lang = l.lang;
                break;
            }
        }

        if (!lang) lang = "EN";

        store.set("LANG", lang);
        return lang;
    }

    var PAGE_ROOT = window.PAGE_ROOT || "",
        PAGE_PREFIX = window.PAGE_PREFIX || "",

        PAGE_HOME = PAGE_PREFIX + "index.html",
        PAGE_LOGIN = PAGE_PREFIX + "login.html",
        PAGE_NAME = window.PAGE_NAME || Q.getPageName() || PAGE_HOME,
        PAGE_HTML_JS = window.PAGE_HTML_JS || 'page/' + (window.PAGE_JS || PAGE_NAME + '.js'),

        lang = get_default_lang(),
        LANG = {};

    if (!lang || !map_lang[lang]) {
        lang = list_lang[0].lang;
        store.set("LANG", lang);
    }

    if (PAGE_PREFIX == "my") {
        PAGE_HOME = "index.html";
        PAGE_LOGIN = "login.html";
    }

    window.LANG = LANG;

    var ITV_TYPE_CN = MQ.ITV_TYPE_CN || "酒店",
        ITV_TYPE_TW = MQ.ITV_TYPE_TW || ITV_TYPE_CN,
        ITV_TYPE_EN = MQ.ITV_TYPE_EN || "Hotel";

    var map_lang_replacements_for_oem = {
        "CN": { deftype: "酒店", type: ITV_TYPE_CN, list: [{ pattern: /酒店/g, value: ITV_TYPE_CN }] },
        "TW": { deftype: "酒店", type: ITV_TYPE_TW, list: [{ pattern: /酒店/g, value: ITV_TYPE_TW }] },
        "EN": { deftype: "Hotel", type: ITV_TYPE_EN, list: [{ pattern: /Hotel/g, value: ITV_TYPE_EN }, { pattern: /hotel/g, value: ITV_TYPE_EN.toLowerCase() }] }
    };

    var lang_replacements_for_oem = map_lang_replacements_for_oem[lang];

    function replace_text_lang_for_oem(text) {
        if (!text || !lang_replacements_for_oem || !lang_replacements_for_oem.type || lang_replacements_for_oem.type == lang_replacements_for_oem.deftype) return text;

        lang_replacements_for_oem.list.forEach(function (r) {
            text = text.replace(r.pattern, r.value);
        });

        return text;
    }

    function parse_lang(text) {
        var result = {};
        if (!text) return result;

        text.split(/\r?\n/).forEach(function (row) {
            if (!row || row.startsWith("#")) return;

            var i = row.indexOf('=');
            if (i > 0) result[row.slice(0, i)] = replace_text_lang_for_oem(row.slice(i + 1));
        });

        return result;
    }

    //加载语言文件
    function load_lang(url, callback) {
        Q.ajax(url, {
            success: function (text) {
                window.LANG = LANG = parse_lang(text);

                store.set("COUNT_ERR_LANG", 0);

                callback && callback();
            },

            error: function () {
                var err_count = +store.get("COUNT_ERR_LANG", 0) || 0;
                if (err_count > 2) {
                    store.set("COUNT_ERR_LANG", 0);
                    return;
                }

                store.set("COUNT_ERR_LANG", err_count + 1);

                //store.set("LANG", "EN");
                //alert("语言文件加载失败！");
                setTimeout(function () { location.reload(); }, 2000);
            }
        });
    }

    //QBUILD_RUN 回退方案 for 开发环境
    function qbuild_fallback(value) {
        return value && !value.startsWith("QBUILD_RUN") ? value : undefined;
    }

    //打包时间,打包工具会将 QBUILD_RUN(%NOW%) 替换成对应内容
    var BUILD_TIME = qbuild_fallback("QBUILD_RUN(%START_TICK%)"),
        REFRESH_TICK = store.get("host") ? Date.now() : (BUILD_TIME || new Date().format("yyyyMMddHHmm"));

    extend(Q, {
        //根路径
        PAGE_ROOT: PAGE_ROOT,

        //页名称前缀
        PAGE_PREFIX: PAGE_PREFIX,

        //主页 index.html
        PAGE_HOME: PAGE_HOME,
        //当前页名称
        PAGE_NAME: PAGE_NAME,
        //登录页 login.html
        PAGE_LOGIN: PAGE_LOGIN,
        //当前页js文件
        PAGE_HTML_JS: PAGE_HTML_JS,
        //配置页 config.html
        PAGE_CONFIG: "config.html",

        list_lang: list_lang,
        map_lang: map_lang,
        lang: lang,

        formatLang: replace_text_lang_for_oem,
        parseLang: parse_lang,

        //语言包加载完毕(window.lang_loaded为true)后触发回调函数
        fireLang: function (callback) {
            if (!callback) return;

            //保证页面js已加载完毕
            if (window.lang_loaded) callback();
            else waitFor(function () { return window.lang_loaded; }, callback);
        },

        //页面加载完毕(window.page_loaded为true)后触发回调函数
        firePage: function (callback) {
            if (!callback) return;

            //保证页面js已加载完毕
            if (window.page_loaded) callback();
            else waitFor(function () { return window.page_loaded; }, callback);
        },

        //获取一个元素
        getEl: function (selector, container) {
            return $(selector, container)[0];
        },

        //快捷键快速提交
        quickSubmit: function (elements, submit) {
            $(elements.clean()).keyup(function (e) {
                if (e.keyCode == 13) submit();
                else Q.setInputDefault(this);
            });
        },

        Lang: {
            //解析文本中的语言参数
            //is2html:是否转为html
            parse: function (text, is2html) {
                text = text.replace(/<#([^>]+)#>/g, function (m, m1) {
                    return MQ[m1] || LANG[m1] || m1;
                });

                if (is2html) text = text.htmlEncode();

                return text.replace(/###(.+?)###/g, '<h2 class="title">$1</h2>');
            }
        },

        BUILD_TIME: BUILD_TIME,
        REFRESH_TICK: REFRESH_TICK,

        //仅为兼容以前代码,建议使用 REFRESH_TICK
        CURRENT_TICK: REFRESH_TICK
    });

    $(document.body).addClass("theme-" + MQ.THEME + (MQ.IS_OEM ? " v-oem-mode" : " v-mq-mode") + (PAGE_PREFIX ? " v-" + PAGE_PREFIX + "mode" : ""));

    var t = "?" + REFRESH_TICK,

        url_lang = PAGE_ROOT + 'lang/' + lang + '.txt' + t,
        url_basic = PAGE_ROOT + 'js/basic.js' + t,
        url_page = PAGE_HTML_JS + t;

    //load_lang(url_lang, function () {
    //    window.lang_loaded = true;
    //    Q.fire(window.onLangReady, undefined, LANG);
    //});

    //var html =
    //    //'<script type="text/javascript" src="' + url_lang + '"></script>' +
    //    '<script type="text/javascript" src="' + url_basic + '"></script>' +
    //    '<script type="text/javascript" src="' + url_page + '"></script>' +
    //    '<script type="text/javascript">window.page_loaded=true;</script>';

    //document.write(html);

    //加载语言文件并初始化
    load_lang(url_lang, function () {
        window.lang_loaded = true;
        Q.fire(window.onLangReady, undefined, LANG);

        loadJS(url_basic, function () {
            loadJS(url_page, function () {
                window.page_loaded = true;
            });
        });
    });

})(this);