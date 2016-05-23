;
(function($) {

    var HDDanmuPlayer = function(element, options) {

        this.$element = $(element);
        this.options = options;
        $(element).data("paused", 1);
        var that = this;
        //播放器全局样式
        this.$element.css({
            "position": "relation",
            "width": this.options.width,
            "height": this.options.height,
            "overflow": "hidden"
        });

        //选择器规范
        this.$element.addClass("danmu-player");
        if (!$(element).attr("id"))
            $(element).attr("id", (Math.random() * 65535).toString());
        this.id = "#" + $(element).attr("id");

        //弹幕层设置,使用了定制的jquery.danmu.js
        this.$element.append('<div class="danmu-div"id="' + $(element).attr("id") + '-danmu-div" ></div>');
        $(this.id + " .danmu-div").danmu({
            width: "100%",
            height: "196px",
            bottom: "45px",
            speed: options.speed,
            opacity: options.opacity,
            fontSizeSmall: options.fontSizeSmall,
            FontSizeBig: options.FontSizeBig,
            topBottonDanmuTime: options.topBottonDanmuTime,
            SubtitleProtection: true,
            positionOptimize: true
        });


        var videoAry = [];
        var videoSrcAry = options.src;

        for (var i = 0; i < options.src.length; i++) {

            videoAry[i] = $('<video class="danmu-video" x-webkit-airplay="true" webkit-playsinline="true"></video>');
            videoAry[i].attr({
                id: "danmu-video" + [i],
                src: options.src[i],
                width: options.width,
                height: options.height
            });

        }

        var vDuration = 1;
        $.each(videoAry, function(index, video) {
            that.$element.append(video);
            $(".danmu-video").hide();
        });

        var allDuration = 0;
        var videoInfo = {};
        var videoDivAry = $(".danmu-video");

        for (var i = 0; i < videoDivAry.length; i++) {
            var video = $("#danmu-video" + i);
            
            video.one("durationchange", {
                video: video,
                that: that
            }, function(e) {

                var idKey = parseInt(this.id.replace(/[^0-9]/g, ""));
                videoInfo[idKey] = this.duration;
                e.data.that.videoInfo = videoInfo;
                allDuration += this.duration;
                $(e.data.that.id + " .all-duration").text(allDuration);

                var durationSum = [];
                durationSum.push(videoInfo[0]);
                for (var i in videoInfo) {  
                    durationSum.push(videoInfo[i] + videoInfo[parseInt(i) + 1]);
                }
                durationSum = durationSum.slice(0, durationSum.length - 1);
                e.data.that.durationSum = durationSum;
            });
        }


        $("#danmu-video0").show();

        this.$element.append('<div class="danmu-player-load" ></div>');
        this.$element.append('<div class="danmu-player-ctrl" ></div>');
        this.$element.append('<div class="danmu-player-tip" ></div>');
        this.$tip = $(this.id + " .danmu-player-tip");
        this.$ctrl = $(this.id + " .danmu-player-ctrl");
        this.$ctrl.append('<div class="play-btn ctrl-btn"><span class="glyphicon glyphicon-play" aria-hidden="true"></span></div>');
        this.$ctrl.append('<div class="progress-state">' +
                            '<div class="current-time time-text ctrl-btn">0:00</div>' +
                            '<div class="ctrl-progress">' +
                            '<div class="current">' +
                            '<div class="progress-handle"></div></div>' +
                            '<div class="buffered"></div></div>' +
                            '<div class="duration ctrl-btn time-text" style="float:right">0:00</div></div>'
                            );
        this.$ctrl.append('<div class="all-duration ctrl-btn time-text" style="display:none"></div>');
        
        $("body").append('<div id="' + this.id.slice(1, this.id.length) + 'fontTip"  hidden="true">' +
            '<form  id="danmu-position">弹幕位置：' +
            '<input type="radio" checked="checked"  name="danmu_position" value=0 />滚动&nbsp;&nbsp;<input type="radio" name="danmu_position" value=1 />顶端' +
            '&nbsp;&nbsp;<input type="radio" name="danmu_position" value=2 />底端&nbsp;&nbsp;</form>' +
            '<form  id="danmu-size" >弹幕大小：<input   type="radio" checked="checked"  name="danmu_size" value="1" />大文字&nbsp;&nbsp;' +
            '<input   type="radio" name="danmu_size" value="0" />小文字&nbsp;&nbsp;</form>' +
            '<div class="colpicker" ></div></div>');

        //播放器状态
        this.video = $(this.id + " .danmu-video").get(0);
        this.danmuVideoAry = $(this.id + " .danmu-video");

        this.current = 0; //当前播放时间
        this.duration = this.video.duration; //总时间
        this.srcAry = this.currentSrc;
        this.HDDanmuPlayerFullScreen = false;
        this.danmuShowed = true;
        this.isLoop = false;
        this.danmuSize = 0;
        this.danmuColor = this.options.defaultColor;
        this.danmuPosition = 0;
        //等待层
        $(this.id + " .danmu-player-load").shCircleLoader({
            keyframes: "0%   {background:black}\
         40%  {background:transparent}\
         60%  {background:transparent}\
         100% {background:black}"
        });

        //tip声明
        var temFontTipID = this.id + "fontTip";
        $(this.id + " .opt-btn").scojs_tooltip({
            appendTo: this.id,
            contentElem: temFontTipID,
            position: "n"
        });
        $(this.id + " .opacity").scojs_tooltip({
            appendTo: this.id,
            content: '弹幕透明度'
        });
        $(this.id + " .show-danmu").scojs_tooltip({
            appendTo: this.id,
            content: '开启/关闭 弹幕'
        });
        $(this.id + " .loop-btn").scojs_tooltip({
            appendTo: this.id,
            content: '循环播放'
        });
        $(this.id + " .full-screen").scojs_tooltip({
            appendTo: this.id,
            content: '全屏'
        });
        $(this.id + ' .colpicker').colpick({
            flat: true,
            layout: 'hex',
            submit: 0,
            color: "ffffff",
            onChange: function(hsb, hex, rgb, el, bySetColor) {
                that.danmuColor = "#" + hex
            }
        });


        //从后端获取弹幕
        this.getDanmu = function() {
            $.get(that.options.urlToGetDanmu, function(data, status) {
                danmuFromSql = eval(data);
                for (var i = 0; i < danmuFromSql.length; i++) {
                    try {
                        var danmuLs = eval('(' + danmuFromSql[i] + ')');
                    } catch (e) {
                        continue;
                    }
                    $(that.id + ' .danmu-div').danmu("addDanmu", danmuLs);
                }
            });
        };

        if (options.urlToGetDanmu)
            this.getDanmu();

        //发送弹幕
        this.sendDanmu = function(e) {
            var text = $(e.data.that.id + " .danmu-input").get(0).value;
            if (text.length == 0) {
                return;
            }
            if (text.length > 255) {
                alert("弹幕过长！");
                return;
            }
            text = text.replace(/&/g, "&gt;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/\n/g, "<br>");
            var color = e.data.that.danmuColor;
            var position = $(e.data.that.id + " input[name=danmu_position]:checked").val();
            var size = $(e.data.that.id + " input[name=danmu_size]:checked").val();
            var time = $(e.data.that.id + " .danmu-div").data("nowTime") + 3;
            var textObj = '{ "text":"' + text + '","color":"' + color + '","size":"' + size + '","position":"' + position + '","time":' + time + '}';
            if (e.data.that.options.urlToPostDanmu)
                $.post(e.data.that.options.urlToPostDanmu, {
                    danmu: textObj
                });
            textObj = '{ "text":"' + text + '","color":"' + color + '","size":"' + size + '","position":"' + position + '","time":' + time + ',"isnew":""}';
            var newObj = eval('(' + textObj + ')');
            $(e.data.that.id + " .danmu-div").danmu("addDanmu", newObj);
            $(e.data.that.id + " .danmu-input").get(0).value = '';
            //触发事件
            $(e.data.that).trigger("senddanmu");
        };

        //播放暂停
        this.playPause = function(e) {
            if (e.data.video.paused) {
                e.data.video.play();
                $(e.data.that.id + " .danmu-div").danmu('danmuResume');
                $(e.data.that.id + " .play-btn span").removeClass("glyphicon-play").addClass("glyphicon-pause");
            } else {
                e.data.video.pause();
                $(e.data.that.id + " .danmu-div").danmu('danmuPause');
                $(e.data.that.id + " .play-btn span").removeClass("glyphicon-pause").addClass("glyphicon-play");
            }
        };

        //主计时器
        var mainTimer = setInterval(function() {
            var bufTime = $(that.id + " .danmu-video").get(0).buffered.end($(that.id + " .danmu-video").get(0).buffered.length - 1);
            if (bufTime != undefined) {
                clearInterval(mainTimer);
            }
            var buffPrecent = (bufTime / that.duration) * 100;
            $(that.id + ".danmu-player .ctrl-progress .buffered ").css("width", buffPrecent + "%");
        }, 300);

        var secTimer = setInterval(function() {
            if (Math.abs($(that.id + " .danmu-div").data("nowTime") - parseInt(that.current * 10)) > 1) {
                $(that.id + " .danmu-div").data("nowTime", parseInt(that.current * 10));

            }
        }, 50);

        //按键事件
        $(document).ready(function() {
            jQuery("body").keydown({
                that: that
            }, function(event) {
                if (event.which == 13) {
                    that.sendDanmu(event);
                    return false
                }
            });
        });


        //播放事件
        $(this.id + " .play-btn").on("click", {
            video: this.video,
            that: that
        }, function(e) {
            that.playPause(e);
        });

        $(this.id + " .danmu-div").on("click", {
            video: this.video,
            that: that
        }, function(e) {
            that.playPause(e);

        });

        //waiting事件
        $(this.id + " .danmu-video").on('waiting', {
            that: that
        }, function(e) {

            if (e.data.that.current == 0) {
                $(e.data.that.id + " .danmu-div").data("nowTime", 0);
                $(e.data.that.id + " .danmu-div").data("danmuPause");
            } else {
                $(e.data.that.id + " .danmu-div").data("nowTime", parseInt(e.data.that.current) * 10);
                $(e.data.that.id + " .danmu-div").data("danmuPause");
            }
            $(e.data.that.id + " .danmu-player-load").css("display", "block");
        });

        //playing事件
        $(this.id + " .danmu-video").on('play playing', {
            that: that
        }, function(e) {
            if (e.data.that.current == 0) {
                $(e.data.that.id + " .danmu-div").data("nowTime", 0);
                $(e.data.that.id + " .danmu-div").data("danmuResume");
            } else {
                $(e.data.that.id + " .danmu-div").data("nowTime", parseInt(e.data.that.current) * 10);
                $(e.data.that.id + " .danmu-div").data("danmuResume");
            }
            $(e.data.that.id + " .danmu-player-load").css("display", "none");

        });

        //seeked事件
        $(this.id + " .danmu-video").on('seeked ', {
            that: that
        }, function(e) {
            $(e.data.that.id + " .danmu-div").danmu("danmuHideAll");
        });


        //调整透明度事件
        $(this.id + " .danmu-op").on('mouseup touchend', {
            that: that
        }, function(e) {
            $(e.data.that.id + " .danmu-div").data("opacity", (e.target.value / 100));
            $(e.data.that.id + " .danmaku").css("opacity", (e.target.value / 100));

        });

        //全屏事件
        $(this.id + " .full-screen").on("click", {
            video: this.video,
            that: that
        }, function(e) {
            if (!e.data.that.HDDanmuPlayerFullScreen) {
                //$css({"position":"fixed","zindex":"999","top":"0","left":"0","height":"100vh","width":"100vw"});
                $(e.data.that.id).addClass("danmu-player-full-screen");
                e.data.that.HDDanmuPlayerFullScreen = true;
                $(e.data.that.id + " .full-screen span").removeClass("glyphicon-resize-full").addClass("glyphicon-resize-small");
            } else {
                $(e.data.that.id).removeClass("danmu-player-full-screen");
                e.data.that.HDDanmuPlayerFullScreen = false;
                $(e.data.that.id + " .full-screen span").removeClass("glyphicon-resize-small").addClass("glyphicon-resize-full");
            }

        });

        //显示和隐藏弹幕按钮事件
        $(this.id + " .show-danmu").on("click", {
            that: that
        }, function(e) {
            if (e.data.that.danmuShowed) {
                $(e.data.that.id + " .danmu-div").css("visibility", "hidden");
                e.data.that.danmuShowed = false;
                $(e.data.that.id + " .show-danmu").removeClass("ctrl-btn-right-active");
            } else {
                e.data.that.danmuShowed = true;
                $(e.data.that.id + " .danmu-div").css("visibility", "visible");
                $(e.data.that.id + " .show-danmu").addClass("ctrl-btn-right-active");
            }

        });

        //循环播放按钮事件
        $(this.id + " .loop-btn").on("click", {
            that: that
        }, function(e) {
            if (!e.data.that.isLoop) {
                e.data.that.video.loop = true;
                e.data.that.isLoop = true;
                $(e.data.that.id + " .loop-btn").addClass("ctrl-btn-right-active");
            } else {
                e.data.that.video.loop = true;
                e.data.that.isLoop = false;

                $(e.data.that.id + " .loop-btn").removeClass("ctrl-btn-right-active");
            }
        });

        //时间改变事件
        $(this.id + " .danmu-video").on('loadedmetadata', {
            video: this.video,
            that: that
        }, function(e) {

            var allDuration = $(".all-duration").text();
            e.data.that.duration = parseInt(allDuration);
            var duraMin = parseInt(allDuration / 60);
            var duraSec = parseInt(allDuration % 60) < 10 ? "0" + parseInt(allDuration % 60) : parseInt(allDuration % 60);
            $(e.data.that.id + " .duration").text(duraMin + ":" + duraSec);

            var videoInfo = e.data.that.videoInfo;
            var vIndex = 0;
            var currentVideoIndex = 0;
            var srcAry = options.src;
            var durationSum = e.data.that.durationSum;
            var aimTime = e.data.that.aimTime;

            if(aimTime != undefined){
                e.data.that.current = aimTime;
                if (e.data.that.preDuration != undefined) {
                    e.data.video.currentTime = aimTime - e.data.that.preDuration;
                } else {
                    e.data.video.currentTime = aimTime;
                }
            }
            $(e.data.that.id + " .danmu-video").on('timeupdate', {
                video: e.data.video,
                that: e.data.that
            }, function(e) {

                var allDuration = $(".all-duration").text();
                var current = e.data.video.currentTime;
                var idKey = 0;

                for (var i in videoInfo) {
                    if (videoInfo.hasOwnProperty(i)) {
                        if (videoInfo[i] === e.data.video.duration) {
                            idKey = i;
                        }
                    }
                }
                
                if (current >= e.data.video.duration) {
                    
                    if (e.data.that.preDuration == undefined) {
                        e.data.that.preDuration = e.data.video.duration;
                    } else {
                        e.data.that.preDuration = e.data.video.duration + e.data.that.preDuration;
                    }
                    e.data.video.src = srcAry[++idKey];
                    if ($(e.data.that.id + " .play-btn span").hasClass('glyphicon-pause')) {
                        this.play();
                    }
                }
                
                if (e.data.that.preDuration == 0 || e.data.that.preDuration == undefined) {
                    current = e.data.that.current = e.data.video.currentTime;
                } else if (e.data.that.preDuration != 0) {
                    current = e.data.that.current = e.data.that.preDuration + e.data.video.currentTime;
                }

                var curMin = parseInt(current / 60);
                var curSec = parseInt(current % 60) < 10 ? "0" + parseInt(current % 60) : parseInt(current % 60);
                $(e.data.that.id + " .current-time").text(curMin + ":" + curSec);

                var duraMin = parseInt(allDuration / 60);
                var duraSec = parseInt(allDuration % 60) < 10 ? "0" + parseInt(allDuration % 60) : parseInt(allDuration % 60);
                $(e.data.that.id + " .duration").text(duraMin + ":" + duraSec);
                var percentage = 100 * current / allDuration;
                $(e.data.that.id + '.danmu-player .ctrl-progress .current ').css('width', percentage + '%');
                e.data.that.reviseFlag = e.data.that.reviseFlag + 1;
            });
        });
    
        $("#danmu-video0").on("ended", {
            video: this.video,
            that: that
        }, function(e){

            if (e.data.that.current >= e.data.that.duration) {
                window.location.reload();
            }
        });

        //进度条事件
        $(this.id + " .ctrl-progress").on('click', {
            video: this.video,
            that: that
        }, function(e) {
            var sumLen = $(e.data.that.id + " .ctrl-progress").width();
            var pos = e.pageX - $(e.data.that.id + " .ctrl-progress").offset().left;
            var percentage = pos / sumLen;
            e.data.that.percentage = percentage;

            var videoInfo = e.data.that.videoInfo;
            var durationSum = [];
            durationSum.push(videoInfo[0]);
            for (var i in videoInfo) {  
                durationSum.push(videoInfo[i] + videoInfo[parseInt(i) + 1]);
            }
            durationSum = durationSum.slice(0, durationSum.length - 1);

            $(e.data.that.id + '.danmu-player .ctrl-progress .current ').css('width', percentage * 100 + '%');
            aimTime = parseFloat(percentage * e.data.that.duration);

            var srcAry = options.src;
            var videoIndex;
            if (aimTime < durationSum[0]) {
                e.data.video.src = srcAry[0];
                if ($(e.data.that.id + " .play-btn span").hasClass('glyphicon-pause')) {
                    e.data.video.play();
                }
                videoIndex = 0;
                e.data.that.preDuration = undefined;
            } else if (aimTime >= durationSum[0] && aimTime < durationSum[1]) {
                e.data.video.src = srcAry[1];
                if ($(e.data.that.id + " .play-btn span").hasClass('glyphicon-pause')) {
                    e.data.video.play();
                }
                videoIndex = 1;
                e.data.that.preDuration = durationSum[videoIndex - 1];
            } else if (aimTime >= durationSum[1] && aimTime < durationSum[2]) {
                e.data.video.src = srcAry[2];
                if ($(e.data.that.id + " .play-btn span").hasClass('glyphicon-pause')) {
                    e.data.video.play();
                }
                videoIndex = 2;
                e.data.that.preDuration = durationSum[videoIndex - 1];
            }

            e.data.that.current = aimTime;

            if (e.data.that.preDuration != undefined) {
                e.data.that.aimTime = aimTime;
                e.data.video.currentTime = aimTime - e.data.that.preDuration;
            } else {
                e.data.that.aimTime = aimTime;
                e.data.video.currentTime = aimTime;
            }

        });

        var timeDrag = false;
        $(this.id + " .ctrl-progress").on('mousedown touchstart', function(e) {
            timeDrag = true;
        });
        $(document).on('mouseup', function(e) {
            if (timeDrag) timeDrag = false;
        });
        $(this.id + " .ctrl-progress").on('mousemove touchmove', {
            video: this.video,
            that: that
        }, function(e) {
            if (timeDrag) {
                var sumLen = $(e.data.that.id + " .ctrl-progress").width();
                var pos = e.pageX - $(e.data.that.id + " .ctrl-progress").offset().left;
                var percentage = pos / sumLen;
                if (percentage > 1)
                    percentage = 1;
                if (percentage < 0)
                    percentage = 0;

                var videoInfo = e.data.that.videoInfo;
                var durationSum = [];
                durationSum.push(videoInfo[0]);
                for (var i in videoInfo) {  
                    durationSum.push(videoInfo[i] + videoInfo[parseInt(i) + 1]);
                }
                durationSum = durationSum.slice(0, durationSum.length - 1);


                aimTime = parseFloat(percentage * e.data.that.duration);
                var srcAry = options.src;
                var videoIndex;
                if (aimTime < durationSum[0]) {
                    e.data.video.src = srcAry[0];
                    if ($(e.data.that.id + " .play-btn span").hasClass('glyphicon-pause')) {
                        e.data.video.play();
                    }
                    videoIndex = 0;
                    e.data.that.preDuration = undefined;
                } else if (aimTime >= durationSum[0] && aimTime < durationSum[1]) {
                    e.data.video.src = srcAry[1];
                    if ($(e.data.that.id + " .play-btn span").hasClass('glyphicon-pause')) {
                        e.data.video.play();
                    }
                    videoIndex = 1;
                    e.data.that.preDuration = durationSum[videoIndex - 1];
                } else if (aimTime >= durationSum[1] && aimTime < durationSum[2]) {
                    e.data.video.src = srcAry[2];
                    if ($(e.data.that.id + " .play-btn span").hasClass('glyphicon-pause')) {
                        e.data.video.play();
                    }
                    videoIndex = 2;
                    e.data.that.preDuration = durationSum[videoIndex - 1];
                }

                e.data.that.current = aimTime;
                
                if (e.data.that.preDuration != undefined) {
                    e.data.that.aimTime = aimTime;
                    e.data.video.currentTime = aimTime - e.data.that.preDuration;
                } else {
                    e.data.that.aimTime = aimTime;
                    e.data.video.currentTime = aimTime;
                }

                $(e.data.that.id + '.danmu-player .ctrl-progress .current ').css('width', percentage * 100 + '%');
            }
        });

        //发送弹幕事件
        $(this.id + " .send-btn").on("click", {
            that: that
        }, function(e) {
            e.data.that.sendDanmu(e);
        });

        //用户操作控制条事件
        $(this.id + " .ctrl-progress").on("mouseup touchend", {
            that: that
        }, function(e) {
            $(e.data.that.id + " .danmaku").remove();
        });

    }; //HDDanmuPlayer构造函数

    HDDanmuPlayer.DEFAULTS = {
        left: 0,
        top: 0,
        height: 360,
        bottom: 0,
        width: 640,
        zindex: 100,
        speed: 8000,
        sumTime: 65535,
        defaultColor: "#ffffff",
        fontSizeSmall: 16,
        FontSizeBig: 24,
        opacity: "1",
        topBottonDanmuTime: 6000,
        urlToGetDanmu: "",
        urlToPostDanmu: ""
    };


    function objGetKeyByValue(value) {

    }

    function Plugin(option, arg) {
        return this.each(function() {
            var $this = $(this);
            var options = $.extend({}, HDDanmuPlayer.DEFAULTS, typeof option == 'object' && option);
            var data = $this.data('HDDanmuPlayer');
            var action = typeof option == 'string' ? option : NaN;
            if (!data) $this.data('danmu', (data = new HDDanmuPlayer(this, options)));
            if (action) data[action](arg);
        })
    }


    $.fn.HDDanmuPlayer = Plugin;
    $.fn.HDDanmuPlayer.Constructor = HDDanmuPlayer;


})(jQuery);
