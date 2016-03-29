(function (window, $, undefined) {

	var isIE678 = !+"\v1";
	var useSve = isIE678 ? 0 : 1;
	var SVG_NS = 'http://www.w3.org/2000/svg';


	function mousePosition(ev) {
		if (!ev) ev = window.event;
		if (ev.pageX || ev.pageY) {
			return {
				x: ev.pageX,
				y: ev.pageY
			};
		}
		return {
			x: ev.clientX + document.documentElement.scrollLeft - document.body.clientLeft,
			y: ev.clientY + document.documentElement.scrollTop - document.body.clientTop
		};
	}

	/**
	 * 流程图主入口
	 * @param {document} el      流程图父元素
	 * @param {object} options 创建流程图属性
	 */
	function GooFlow($el, options) {
		var me = this;

		me.$container = $el;
		me.$head = null;

		me.$tools = null;
		me.$toolsBox = null;

		me.$work = null;
		me.$workArea = null;
		me.$draw = null;

		me.EditEnum = {
				//连接线状态
				DIRECT: 1
			}
			//当前编辑状态
		me.editType = me.EditEnum.DIRECT;

		//存储所有生成的控件
		me.controls = {};

		//当前聚焦的控件
		me.curControl = null;

		me.options = {
			haveHead: true,
			haveTools: true,
			editable: true,
			color: {
				line: '#3892D3',
				mark: '#ff3300'

			},
			toolsGroup: null
		}
		$.extend(me.options, options);

		me._init();
	}


	GooFlow.prototype = {

		constructor: GooFlow,

		_init: function () {

			if (this.options.haveHead) {
				this._initHeadBtns();
			}

			if (this.options.haveTools) {
				this._initTools()
			}

			this._initWorkArea();
			this._initLayout();

		},

		/**
		 * 初始化头部功能按钮
		 */
		_initHeadBtns: function () {
			this.$container.addClass('GooFlow');
			var templ = this.options.headTempl || '<div class="GooFlow_head"></div>';
			this.$head = $(templ);
			this.$container.append(this.$head);
		},

		/**
		 * 初始化左边工具栏
		 */
		_initTools: function () {
			var me = this;
			var templ = me.options.toolsTempl || '<div class="GooFlow_tool"><ul class="nav nav-tabs"><li class="active"><a href="javascript:;">控件</a></li><li><a href="javascript:;">属性</a></li></ul><ul class="nav nav-cnts"><li class="J_toolsBox"></li><li style="display:none;"></li></ul></div>';
			me.$tools = $(templ);
			me.$toolsBox = me.$container.append(me.$tools).find('.J_toolsBox');

			//初始化工具组
			var DefaultGroup = {
				name: '基本控件',
				controls: ['select', 'line']
			}
			me.toolsGroup = $.isArray(me.options.toolsGroup) ? me.options.toolsGroup : [];
			me.toolsGroup.unshift(DefaultGroup);
			me.toolsGroup = $.map(me.toolsGroup, function (value) {
				value.id = GooFlow.getUID('GROUP');
				return value;
			});

			for (var i = 0; i < me.toolsGroup.length; i++) {
				//增加工作组
				var tools = me.toolsGroup[i];
				templ = '<h4 class="tools-title">' + tools.name + '</h4>' +
					'<ul class="tools-group" id="' + tools.id + '"></ul>';
				me.$toolsBox.append(templ);


				//增加工作组控件
				for (var j = 0; j < tools.controls.length; j++) {
					var $li = $('<li></li>');
					var tool = new GooFlow.Tools(tools.controls[j]);
					$li.append(tool.$el);
					$('#' + tools.id).append($li);
				}
			}

		},

		/**
		 * 初始化右侧工作区间
		 */
		_initWorkArea: function () {
			var me = this;
			var templ = '<div class="GooFlow_work"><div class="GooFlow_workArea J_workArea"></div></div>';
			me.$work = $(templ);
			me.$workArea = me.$container.append(me.$work).find('.J_workArea');

			me._initDraw();

			//接收拖拽生成的对象
			me.$workArea.droppable({
				accept: '.tools',
				tolerance: 'fit',
				drop: function (event, ui) {
					var type = ui.draggable.attr('data-type');
					me.addControl(type, ui.offset);
				}
			});

			//点击切换当前控件
			me.$workArea.on('mousedown', '.control', function (e) {
				var thisCtl = me.controls[this.id];
				me.focusControl(thisCtl);
			});

			me.$workArea.on('mouseenter', '.control', function (e) {
				//if(me.editType !== me.EditEnum.DIRECT && !document.getElementById("GooFlow_tmp_line")) return;
				$(this).addClass("control-mark").addClass("crosshair").css("border-color", me.options.color.mark);
			});

			me.$workArea.on('mouseleave', '.control', function (e) {
				$(this).removeClass("control-mark").removeClass("crosshair").css("border-color", '');
			});

			me.$workArea.on('mousedown', '.control', function (e) {
				if (e.button == 2) return false;
				//if (This.$nowType != "direct") return;

				var toWorkOffset = me._getToWorkOffset(e),
					X = toWorkOffset.left,
					Y = toWorkOffset.top;

				me.$workArea.data("lineStart", {
					"x": X,
					"y": Y,
					"id": this.id
				}).css("cursor", "crosshair");

				var line = me.drawLine("GooFlow_tmp_line", [X, Y], [X, Y], true, true);
				me.$draw.appendChild(line);
			});

			me.$workArea.on('mouseup', '.control', function () {

			});

		},

		/**
		 * 初始化SVG画布
		 */
		_initDraw: function () {
			var me = this;
			me.$draw = document.createElementNS(SVG_NS, 'svg'); //可创建带有指定命名空间的元素节点
			me.$work.prepend(me.$draw);

			var defs = document.createElementNS(SVG_NS, "defs");
			me.$draw.appendChild(defs);

			defs.appendChild(me._getSvgMarker("arrow1", me.options.color.line));
			defs.appendChild(me._getSvgMarker("arrow2", me.options.color.mark));
			defs.appendChild(me._getSvgMarker("arrow3", me.options.color.mark));

			this.$draw.id = GooFlow.getUID('DRAW');
		},

		//初始化布局 
		_initLayout: function () {
			var me = this;
			$(window).on('resize', function () {
				var height = me.options.height || $(window).height(),
					workHeight = me.options.haveHead ? height - me.$head.height() : height;
				me.$tools.css('height', workHeight);
				me.$work.css('height', workHeight);
				//工作控件高度。默认为容器高度的三倍
				me.$workArea.css({
					width: '100%',
					height: workHeight * 3
				});
				me.$draw.style.width = '100%';
				me.$draw.style.height = (workHeight * 3) + 'px';
			}).trigger('resize');
		},


		/**
		 * 获取svg marker
		 */
		_getSvgMarker: function (id, color) {
			var m = document.createElementNS(SVG_NS, 'marker');
			m.setAttribute("id", id);
			m.setAttribute("viewBox", "0 0 6 6");
			m.setAttribute("refX", 5);
			m.setAttribute("refY", 3);
			m.setAttribute("markerUnits", "strokeWidth");
			m.setAttribute("markerWidth", 6);
			m.setAttribute("markerHeight", 6);
			m.setAttribute("orient", "auto");
			var path = document.createElementNS(SVG_NS, 'path');
			path.setAttribute("d", "M 0 0 L 6 3 L 0 6 z");
			path.setAttribute("fill", color);
			path.setAttribute("stroke-width", 0);
			m.appendChild(path);
			return m;
		},


		/**
		 * 增加工具组
		 * @param {String}
		 * @param {Object}
		 */
		_addToolsGroup: function (title, group) {
			if (!$.isArray(group) || group.length == 0) {
				return '';
			}
			var templ = '',
				i;
			templ += '<h4 class="tools-title">' + title + '</h4>';
			templ += '<ul class="tools-group">';
			for (i = 0; i < group.length; i++) {
				templ += '<li><div data-drag="' + group[i].drag + '" class="tools"><span class="' + group[i].icon + '"></span><span>' + group[i].name + '</span></div></li>';
			}
			templ += '</ul>';

			this.$toolsBox.append(templ);
		},


		_createPlanArea: function () {

		},


		/**
		 * 获取鼠标相对工作区间距离
		 * @param  {Object} 如果为空则取鼠标距离
		 * @return {Object}
		 */
		_getToWorkOffset: function (offset) {
			if (offset.pageX) {
				offset = {
					left: offset.pageX,
					top: offset.pageY
				}
			}
			var $wk = this.$workArea,
				workOffset = $wk.offset();

			return {
				left: offset.left - workOffset.left,
				top: offset.top - workOffset.top
			}
		},

		/**
		 * 向工作空间中添加控件
		 * @param {String} 控件类型
		 * @param {Object} 控件offset
		 */
		addControl: function (type, offset) {
			var me = this;
			var ctl = new GooFlow.Control(type);

			offset = me._getToWorkOffset(offset);
			ctl.$el.offset(offset);
			me.$workArea.append(ctl.$el);

			//加入总控件组
			me.focusControl(ctl);
			me.controls[ctl.id] = ctl;
		},

		/**
		 * 聚焦控件
		 * @param  {Control} 控件
		 */
		focusControl: function (ctl) {
			var me = this;
			if (me.curControl == ctl) {
				return;
			}
			ctl.focus();
			me.curControl && me.curControl.blur();
			me.curControl = ctl;
		},







		/**
		 * 绘制一条箭头线，并返回线的DOM
		 */
		drawLine: function (id, sp, ep, mark, dash) {
			var line;
			if (useSve) {
				line = document.createElementNS(SVG_NS, "g");
				var hi = document.createElementNS(SVG_NS, "path");
				var path = document.createElementNS(SVG_NS, "path");

				if (id != "") line.setAttribute("id", id);

				line.setAttribute("from", sp[0] + "," + sp[1]);
				line.setAttribute("to", ep[0] + "," + ep[1]);
				hi.setAttribute("visibility", "hidden");
				hi.setAttribute("stroke-width", 9);
				hi.setAttribute("fill", "none");
				hi.setAttribute("stroke", "white");
				hi.setAttribute("d", "M " + sp[0] + " " + sp[1] + " L " + ep[0] + " " + ep[1]);
				hi.setAttribute("pointer-events", "stroke");
				path.setAttribute("d", "M " + sp[0] + " " + sp[1] + " L " + ep[0] + " " + ep[1]);
				path.setAttribute("stroke-width", 1.4);
				path.setAttribute("stroke-linecap", "round");
				path.setAttribute("fill", "none");


				if (dash) path.setAttribute("style", "stroke-dasharray:6,5");
				if (mark) {
					path.setAttribute("stroke", this.options.color.mark);
					path.setAttribute("marker-end", "url(#arrow2)");
				}
				else {
					path.setAttribute("stroke", this.options.color.line);
					path.setAttribute("marker-end", "url(#arrow1)");
				}

				line.appendChild(hi);
				line.appendChild(path);
				line.style.cursor = "crosshair";

				if (id != "" && id != "GooFlow_tmp_line") {
					var text = document.createElementNS(SVG_NS, "text");
					text.setAttribute("fill", this.options.color.font);
					line.appendChild(text);
					var x = (ep[0] + sp[0]) / 2;
					var y = (ep[1] + sp[1]) / 2;
					text.setAttribute("text-anchor", "middle");
					text.setAttribute("x", x);
					text.setAttribute("y", y);
					line.style.cursor = "pointer";
					text.style.cursor = "text";
				}
			}
			return line;
		},

		/**
		 * 画一条只有两个中点的折线
		 */
		drawPoly: function (id, sp, m1, m2, ep, mark) {
			var poly, strPath;
			if (useSve) {
				poly = document.createElementNS(SVG_NS, "g");
				var hi = document.createElementNS(SVG_NS, "path");
				var path = document.createElementNS(SVG_NS, "path");

				if (id != "") poly.setAttribute("id", id);
				poly.setAttribute("from", sp[0] + "," + sp[1]);
				poly.setAttribute("to", ep[0] + "," + ep[1]);
				hi.setAttribute("visibility", "hidden");
				hi.setAttribute("stroke-width", 9);
				hi.setAttribute("fill", "none");
				hi.setAttribute("stroke", "white");

				strPath = "M " + sp[0] + " " + sp[1];
				if (m1[0] != sp[0] || m1[1] != sp[1])
					strPath += " L " + m1[0] + " " + m1[1];
				if (m2[0] != ep[0] || m2[1] != ep[1])
					strPath += " L " + m2[0] + " " + m2[1];
				strPath += " L " + ep[0] + " " + ep[1];
				hi.setAttribute("d", strPath);
				hi.setAttribute("pointer-events", "stroke");
				path.setAttribute("d", strPath);
				path.setAttribute("stroke-width", 1.4);
				path.setAttribute("stroke-linecap", "round");
				path.setAttribute("fill", "none");

				if (mark) {
					path.setAttribute("stroke", this.options.color.mark);
					path.setAttribute("marker-end", "url(#arrow2)");
				}
				else {
					path.setAttribute("stroke", this.options.color.line);
					path.setAttribute("marker-end", "url(#arrow1)");
				}

				poly.appendChild(hi);
				poly.appendChild(path);
				var text = document.createElementNS(SVG_NS, "text");
				text.setAttribute("fill", this.options.color.font);
				poly.appendChild(text);

				var x = (m2[0] + m1[0]) / 2;
				var y = (m2[1] + m1[1]) / 2;
				text.setAttribute("text-anchor", "middle");
				text.setAttribute("x", x);
				text.setAttribute("y", y);
				text.style.cursor = "text";
				poly.style.cursor = "pointer";
			}

			return poly;
		},

		/**
		 * 计算两个结点间要连直线的话，连线的开始坐标和结束坐标
		 */
		calcStartEnd: function (n1, n2) {
			var X_1, Y_1, X_2, Y_2;
			//X判断：
			var x11 = n1.left,
				x12 = n1.left + n1.width,
				x21 = n2.left,
				x22 = n2.left + n2.width;
			//结点2在结点1左边
			if (x11 >= x22) {
				X_1 = x11;
				X_2 = x22;
			}
			//结点2在结点1右边
			else if (x12 <= x21) {
				X_1 = x12;
				X_2 = x21;
			}
			//结点2在结点1水平部分重合
			else if (x11 <= x21 && x12 >= x21 && x12 <= x22) {
				X_1 = (x12 + x21) / 2;
				X_2 = X_1;
			}
			else if (x11 >= x21 && x12 <= x22) {
				X_1 = (x11 + x12) / 2;
				X_2 = X_1;
			}
			else if (x21 >= x11 && x22 <= x12) {
				X_1 = (x21 + x22) / 2;
				X_2 = X_1;
			}
			else if (x11 <= x22 && x12 >= x22) {
				X_1 = (x11 + x22) / 2;
				X_2 = X_1;
			}

			//Y判断：
			var y11 = n1.top,
				y12 = n1.top + n1.height,
				y21 = n2.top,
				y22 = n2.top + n2.height;
			//结点2在结点1上边
			if (y11 >= y22) {
				Y_1 = y11;
				Y_2 = y22;
			}
			//结点2在结点1下边
			else if (y12 <= y21) {
				Y_1 = y12;
				Y_2 = y21;
			}
			//结点2在结点1垂直部分重合
			else if (y11 <= y21 && y12 >= y21 && y12 <= y22) {
				Y_1 = (y12 + y21) / 2;
				Y_2 = Y_1;
			}
			else if (y11 >= y21 && y12 <= y22) {
				Y_1 = (y11 + y12) / 2;
				Y_2 = Y_1;
			}
			else if (y21 >= y11 && y22 <= y12) {
				Y_1 = (y21 + y22) / 2;
				Y_2 = Y_1;
			}
			else if (y11 <= y22 && y12 >= y22) {
				Y_1 = (y11 + y22) / 2;
				Y_2 = Y_1;
			}
			return {
				"start": [X_1, Y_1],
				"end": [X_2, Y_2]
			};
		},

		/**
		 * 计算两个结点间要连折线的话，连线的所有坐标
		 */
		calcPolyPoints: function (n1, n2, type, M) {
			//开始/结束两个结点的中心
			var SP = {
				x: n1.left + n1.width / 2,
				y: n1.top + n1.height / 2
			};
			var EP = {
				x: n2.left + n2.width / 2,
				y: n2.top + n2.height / 2
			};
			var sp = [],
				m1 = [],
				m2 = [],
				ep = [];
			//如果是允许中段可左右移动的折线,则参数M为可移动中段线的X坐标
			//粗略计算起始点
			sp = [SP.x, SP.y];
			ep = [EP.x, EP.y];
			if (type == "lr") {
				//粗略计算2个中点
				m1 = [M, SP.y];
				m2 = [M, EP.y];
				//再具体分析修改开始点和中点1
				if (m1[0] > n1.left && m1[0] < n1.left + n1.width) {
					m1[1] = (SP.y > EP.y ? n1.top : n1.top + n1.height);
					sp[0] = m1[0];
					sp[1] = m1[1];
				}
				else {
					sp[0] = (m1[0] < n1.left ? n1.left : n1.left + n1.width)
				}
				//再具体分析中点2和结束点
				if (m2[0] > n2.left && m2[0] < n2.left + n2.width) {
					m2[1] = (SP.y > EP.y ? n2.top + n2.height : n2.top);
					ep[0] = m2[0];
					ep[1] = m2[1];
				}
				else {
					ep[0] = (m2[0] < n2.left ? n2.left : n2.left + n2.width)
				}
			}
			//如果是允许中段可上下移动的折线,则参数M为可移动中段线的Y坐标
			else if (type == "tb") {
				//粗略计算2个中点
				m1 = [SP.x, M];
				m2 = [EP.x, M];
				//再具体分析修改开始点和中点1
				if (m1[1] > n1.top && m1[1] < n1.top + n1.height) {
					m1[0] = (SP.x > EP.x ? n1.left : n1.left + n1.width);
					sp[0] = m1[0];
					sp[1] = m1[1];
				}
				else {
					sp[1] = (m1[1] < n1.top ? n1.top : n1.top + n1.height)
				}
				//再具体分析中点2和结束点
				if (m2[1] > n2.top && m2[1] < n2.top + n2.height) {
					m2[0] = (SP.x > EP.x ? n2.left + n2.width : n2.left);
					ep[0] = m2[0];
					ep[1] = m2[1];
				}
				else {
					ep[1] = (m2[1] < n2.top ? n2.top : n2.top + n2.height);
				}
			}
			return {
				start: sp,
				m1: m1,
				m2: m2,
				end: ep
			};
		},

		/**
		 * 初始化折线中段的X/Y坐标,mType='rb'时为X坐标,mType='tb'时为Y坐标
		 */
		getMValue: function (n1, n2, mType) {
			if (mType == "lr") {
				return (n1.left + n1.width / 2 + n2.left + n2.width / 2) / 2;
			}
			else if (mType == "tb") {
				return (n1.top + n1.height / 2 + n2.top + n2.height / 2) / 2;
			}
		},



	}

	GooFlow.getUID = (function () {
		var obj = {};
		return function (ns) {
			if (ns in obj) {
				obj[ns]++;
			}
			else {
				obj[ns] = 0;
			}
			return ns + obj[ns];
		}
	})();


	/**
	 * 控件配置
	 * @type {Object}
	 */
	var ToolsConfig = GooFlow.prototype.ToolsConfig = {
		select: {
			name: '选择',
			drag: false
		},
		line: {
			name: '连接线',
			drag: false
		},
		label: {
			name: '标签',
			drag: true,
			resize: true
		}
	}

	GooFlow.prototype.addToolsConfig = function (ns, obj) {
		if (!(ns in this.ToolsConfig)) {
			this.ToolsConfig[ns] = obj;
		}
	}

	/**
	 * 左边操作栏工具对象
	 */
	GooFlow.Tools = function (type) {
		this.$el = '';
		this.id = GooFlow.getUID('TOOLS');
		this.type = type;

		//继承config属性
		$.extend(this, ToolsConfig[type]);

		this._init();
	}

	GooFlow.Tools.prototype = {
		constructor: GooFlow.Tools,

		_init: function () {
			var me = this;
			if (!(me.type in ToolsConfig)) {
				return
			};

			var templ = '<div id="' + me.id + '" data-type="' + me.type + '" class="tools"><span class=""></span><span>' + me.name + '</span></div>'
			me.$el = $(templ);

			if (me.drag) {
				var templSelector = '#' + me.type + '_templ';
				me.helper = doT.template($(templSelector).text());
				me._initDrag();
			}

		},
		_initDrag: function () {
			var me = this;
			if (me.drag) {
				me.$el.draggable({
					helper: function () {
						return me.helper({
							id: me.id,
							name: me.name,
							type: me.type,
							isHelper: true
						});
					},
					opacity: 0.5,
					cursorAt: {
						left: 20,
						top: 0
					},
					containment: "document"
				});
			}
		}

	}



	/**
	 * 右边控件对象
	 */
	GooFlow.Control = function (type) {
		this.id = GooFlow.getUID('CONTROL');
		this.$el = null;
		this.type = type;

		//继承config属性
		$.extend(this, ToolsConfig[type]);
		this.prop = {
			name: this.id
		}

		this.ui = {
			left: 0,
			top: 0,
			width: 0,
			height: 0
		}

		this._init();

	}
	GooFlow.Control.prototype = {
		constructor: GooFlow.Control,

		_init: function () {
			var me = this;
			var templSelector = '#' + me.type + '_templ';
			me.templ = doT.template($(templSelector).text());

			me.$el = $(me.templ({
				id: me.id,
				name: me.prop.name,
				type: me.type
			}));

			me._syncUI();


			if (me.drag) {
				me._initDrag();
			}

			if (me.resize) {
				me._initResize();
			}
		},
		_initDrag: function () {
			var me = this;
			me.$el.draggable({
				helper: 'clone',
				opacity: 0.5,
				containment: "#J_workArea",
				stop: function (event, ui) {
					$(event.target).offset(ui.offset);
				}
			});
		},

		_initResize: function () {
			var me = this;
			me.$el.resizable({
				helper: "ui-resizable-helper",
				grid: [0, 2],
				minHeight: 30,
				maxHeight: 200,
				minWidth: 80,
				maxWidth: 400
			});
		},

		_syncUI: function () {
			var $el = this.$el
			$.extend(this.ui, $el.offset, {
				width: $el.width(),
				height: $el.height()
			});
		},

		focus: function () {
			this.$el.addClass('cur');
		},

		blur: function () {
			this.$el.removeClass('cur');
		},

		remove: function () {
			this.$el.resizable("destroy");
			this.$el.draggable("destroy");
			this.$el.remove();
		}

	}

	$.fn.extend({
		createGooFlow: function (options) {
			return new GooFlow(this, options);
		}
	});


})(window, jQuery);