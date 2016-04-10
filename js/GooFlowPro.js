(function (window, $, undefined) {

	var isIE678 = !+"\v1";
	var useSVG = isIE678 ? 0 : 1;
	var SVG_NS = 'http://www.w3.org/2000/svg';
	var baseImgUrl = './img/group/';

	function uuid(len, radix) {
		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
		var uuid = [],
			i;
		radix = radix || chars.length;

		if (len) {
			// Compact form
			for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
		}
		else {
			// rfc4122, version 4 form
			var r;

			// rfc4122 requires these characters
			uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
			uuid[14] = '4';

			// Fill in random data.  At i==19 set the high bits of clock sequence as
			// per rfc4122, sec. 4.1.5
			for (i = 0; i < 36; i++) {
				if (!uuid[i]) {
					r = 0 | Math.random() * 16;
					uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
				}
			}
		}

		return uuid.join('');
	}


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
		me.$switchGroup = null;

		me.$work = null;
		me.$workArea = null;
		me.$draw = null;

		me.EditEnum = {
			//选择状态
			SELECT: 1,

			//连接线状态
			LINE: 2

		}

		//默认编辑状态
		me.isEdit = options.isEdit || true;

		//默认为选择状态
		me.editType = me.EditEnum.SELECT;

		//流程图名称
		me.flowName = "流程图";

		//存储所有生成的控件
		me.controls = {};

		//存储所有生成的连接线
		me.lines = {};

		//存储所有生成的泳道
		me.swimlanes = {}


		//当前聚焦的控件/线/泳道 ID
		me.curId = null;

		me.options = {
			haveHead: true,
			haveTools: true,
			editable: true,
			color: {
				line: '#3892D3',
				mark: '#ff3300'

			},
			toolsGroup: null,
			swimlane: ['x', 'y']
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

			if(this.options.baseImgUrl){
				baseImgUrl = this.options.baseImgUrl;
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
			var templ = me.options.toolsTempl || '<div class="GooFlow_tool"><ul class="nav nav-tabs J_navTabs"><li data-plan="control" class="active"><a href="javascript:;">控件</a></li><li data-plan="attr"><a href="javascript:;">属性</a></li></ul><ul class="nav nav-cnts J_navCnts"><li class="J_toolsBox"></li><li class="J_attrBox" style="display:none;"></li></ul></div>';
			me.$tools = $(templ);
			me.$toolsBox = me.$container.append(me.$tools).find('.J_toolsBox');
			me.$attrBox = me.$tools.find('.J_attrBox');
			me.$navTabs = me.$tools.find('.J_navTabs');
			me.$navCnts = me.$tools.find('.J_navCnts');
			me.attrTempl = doT.template($('#attr_templ').text());

			me.$navTabs.on('click', 'li', function () {
				var plan = this.getAttribute('data-plan');
				me._switchPlan(plan);
			});

			//子控件拖拽时切换到 select 状态
			me.$toolsBox.on('dragstart', function () {
				me._switchEditType(me.EditEnum.SELECT);
			});

			//初始化切换状态工具
			me._initSwitchTools();

			//初始化工具组
			me.toolsGroup = $.isArray(me.options.toolsGroup) ? me.options.toolsGroup : [];
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
		 * 切换面板
		 * @param {String} 面板类型 control:0   attr:1
		 */
		_switchPlan: function (type, attrList) {
			var me = this,
				index = type == 'attr' ? 1 : 0;
			if(!me.options.haveTools){
				return;
			}

			me.$navTabs.children().removeClass('active').eq(index).addClass('active');
			me.$navCnts.children().hide().eq(index).show();

			if (type == 'attr') {
				var attrList = attrList || {
					name: me.flowName
				}
				me.$attrBox.empty().append(me.attrTempl({
					attrList: attrList
				}));
			}
		},

		/**
		 * 切换工作状态
		 */
		_initSwitchTools: function () {
			var me = this,
				id = GooFlow.getUID('GROUP');
			var templ = '';
			templ += '<h4 class="tools-title">工作状态</h4>';
			templ += '<ul class="tools-group" id="' + id + '">';
			templ += '<li><div data-switchtype="1" class="tools pointer J_switch J_select active"><span class=""></span><span>选择</span></div></li>';
			templ += '<li><div data-switchtype="2" class="tools pointer J_switch J_line"><span class=""></span><span>连接线</span></div></li></ul>';
			me.$toolsBox.append(templ);
			var $switchGroup = me.$switchGroup = me.$toolsBox.find('.J_switch');


			$switchGroup.on('click', function () {
				var switchType = this.getAttribute('data-switchtype');
				me._switchEditType(switchType);
			});

		},

		/**
		 * 初始化右侧工作区间
		 */
		_initWorkArea: function () {
			var me = this;
			var templ = '<div class="GooFlow_work"><div class="GooFlow_workArea J_workArea"></div></div>';
			me.$work = $(templ);
			me.$workArea = me.$container.append(me.$work).find('.J_workArea');
			//初始化泳道
			me._initSwimlane();
			me._initDraw();
			me.$textArea = $("<textarea style='display:none;'></textarea>");
			me.$textArea.on('mousedown', function (e) {
				e.stopPropagation();
			});
			me.$work.append(me.$textArea);

			me.$textArea.on('blur', function (e) {
				var dom = me.$textArea.data('dom'),
					attrName = me.$textArea.data('attrName'),
					type = me.$textArea.data('type');
				if (!dom) return;

				me.setAttr(me.curId, attrName, this.value, type);

				dom.innerHTML = this.value;

				me.$textArea.removeData(['dom', 'attrName', 'type']).hide();
			});

			//绑定双击编辑事件
			me.$workArea.on("dblclick", ".J_editAttr", function (e) {
				var $this = $(this),
					$parentControl = $this.parents('.control'),
					id = $parentControl[0].id,
					attrName = this.getAttribute('data-attrName') || 'name',
					oldTxt = this.innerHTML,
					t = me._getToWorkOffset($this.offset(), me.$work);

				me.$textArea.val(oldTxt).css({
					display: "block",
					position: "absolute",
					height: $this.height() - 2,
					width: $this.width() - 2,
					left: t.left,
					top: t.top,
					zIndex: 999
				}).data({
					dom: this,
					attrName: attrName,
					type: 'control'
				}).focus();
			});

			//接收拖拽生成的对象
			me.$workArea.droppable({
				accept: '.tools',
				tolerance: 'fit',
				drop: function (event, ui) {
					var type = ui.draggable.attr('data-type');
					var offset = me._getToWorkOffset(ui.offset);
					me.addControl({
						type: type,
						left: offset.left,
						top: offset.top
					});
				}
			});

			me.$workArea.on('click', function (e) {
				if (me.editType == me.EditEnum.SELECT) {
					var t = e.target;
					var n = t.tagName;
					if (n == "svg" || (n == "DIV" && t.className.indexOf("control") > -1) || n == "LABEL") {
						if (me.$lineOper.data("tid")) {
							me.focusItem(me.$lineOper.data("tid"), false);
						}
						else {
							me.blurItem();
							me._switchPlan('control');
						}
					}
				}
			});

			//拖拽停止时。重新划线
			me.$workArea.on('dragstart', '.control', function (event, ui) {
				me.focusItem(this.id);

			});

			//拖拽停止时。重新划线
			me.$workArea.on('dragstop', '.control', function (event, ui) {
				var thisControl = me.controls[this.id];
				thisControl.syncUI(ui.offset);
				me.resetLines(this.id, thisControl);

			});

			//改变大小时。重新划线
			me.$workArea.on('resizestop', '.control', function (event, ui) {
				var thisControl = me.controls[this.id];
				thisControl.syncUI();
				me.resetLines(this.id, thisControl);
			});

			//点击切换当前控件
			me.$workArea.on('click', '.control', function (e) {
				if (!me.isEdit) return;
				var thisCtl = me.controls[this.id];
				me.focusItem(thisCtl.id);
			});



			//划线或改线时用的绑定
			me.$workArea.on('mousemove', function (e) {

				if (me.editType != me.EditEnum.LINE && !me.$mpTo.data("p")) return;

				var lineStart = me.$workArea.data("lineStart");
				var lineEnd = me.$workArea.data("lineEnd");

				if (!lineStart && !lineEnd) return;

				var line = document.getElementById("GooFlow_tmp_line"),
					toWorkOffset = me._getToWorkOffset(e),
					X = toWorkOffset.left,
					Y = toWorkOffset.top;

				if (lineStart) {
					if (useSVG) {
						line.childNodes[0].setAttribute("d", "M " + lineStart.x + " " + lineStart.y + " L " + X + " " + Y);
						line.childNodes[1].setAttribute("d", "M " + lineStart.x + " " + lineStart.y + " L " + X + " " + Y);

						if (line.childNodes[1].getAttribute("marker-end") == "url(\"#arrow2\")") {
							line.childNodes[1].setAttribute("marker-end", "url(#arrow3)");
						}
						else {
							line.childNodes[1].setAttribute("marker-end", "url(#arrow2)");
						}
					}
				}
				else if (lineEnd) {
					if (useSVG) {
						line.childNodes[0].setAttribute("d", "M " + X + " " + Y + " L " + lineEnd.x + " " + lineEnd.y);
						line.childNodes[1].setAttribute("d", "M " + X + " " + Y + " L " + lineEnd.x + " " + lineEnd.y);

						if (line.childNodes[1].getAttribute("marker-end") == "url(\"#arrow2\")") {
							line.childNodes[1].setAttribute("marker-end", "url(#arrow3)");
						}
						else {
							line.childNodes[1].setAttribute("marker-end", "url(#arrow2)");
						}
					}
				}
			});

			//划线或改线时用的绑定
			me.$workArea.on('mouseup', function (e) {

				if (me.editType != me.EditEnum.LINE && !me.$mpTo.data("p")) return;

				var tmp = document.getElementById("GooFlow_tmp_line");
				if (tmp) {
					me.$workArea.css("cursor", "auto").removeData("lineStart").removeData("lineEnd");
					me.$mpTo.hide().removeData("p");
					me.$mpFrom.hide().removeData("p");
					me.$draw.removeChild(tmp);
					me.focusItem(me.curId, false);
				}
				else {
					me.$lineOper.removeData("tid");
				}
			});


			me._initLineMove()
			me._initLineOper();
			me._initLinePoints();

			//绑定连接线状态时鼠标覆盖/移出事件
			me.$workArea.on('mouseenter', '.control', function (e) {
				if (me.editType != me.EditEnum.LINE && !document.getElementById("GooFlow_tmp_line")) return;
				$(this).addClass("control-mark").addClass("crosshair").css("border-color", me.options.color.mark);

			});

			me.$workArea.on('mouseleave', '.control', function (e) {
				$(this).removeClass("control-mark").removeClass("crosshair").css("border-color", '');
			});


			//绑定连线时确定初始点
			me.$workArea.on('mousedown', '.control', function (e) {
				if (e.button == 2) return false;
				if (me.editType != me.EditEnum.LINE) return;

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


			//绑定连线时确定结束点
			me.$workArea.on('mouseup', '.control', function (e) {

				if (me.editType != me.EditEnum.LINE && !me.$mpTo.data("p")) return;

				var lineStart = me.$workArea.data("lineStart"),
					lineEnd = me.$workArea.data("lineEnd");

				if (lineStart && !me.$mpTo.data("p")) {
					me.addLine({
						from: lineStart.id,
						to: this.id,
						name: ''
					});
				}
				else {
					if (lineStart) {
						me.moveLinePoints(me.curId, lineStart.id, this.id);
					}
					else if (lineEnd) {
						me.moveLinePoints(me.curId, this.id, lineEnd.id);
					}

					if (!me.controls[this.id].marked) {
						$(this).removeClass("item_mark");
						if (this.id != me.curId) {
							$(this).css("border-color", me.options.color.node);
						}
						else {
							$(this).css("border-color", me.options.color.line);
						}
					}

				}
			});


			//绑定结点的删除功能
			me.$workArea.on("click", ".J_remove", function (e) {
				var e = e || window.event;
				me.delControl(me.curId);
				return false;
			});

			//删除快捷键
			$(document).keydown(function (e) {
				//绑定键盘操作
				if (me.curId == "") return;
				switch (e.keyCode) {
				case 46: //删除
					me.delControl(me.curId, true);
					me.delLine(me.curId);
					me.delSwimlane(me.curId);
					break;
				}
			});
		},



		_initSwimlane: function () {
			var me = this,
				i;
			if (!me.options.swimlane) return;

			me.swimlaneTempl = doT.template($('#swimlane_templ').text());
			var $swimlaneBox = me.$swimlaneBox = $('<div class="swimlane-box"></div>');

			$swimlaneBox.on('dblclick', '.J_swimlaneTitle', function () {
				var $this = $(this),
					$parent = $this.parent(),
					id = $parent[0].id,
					attrName = this.getAttribute('data-attrName') || 'name',
					oldTxt = this.innerHTML,
					t = me._getToWorkOffset($this.offset(), me.$work);

				me.$textArea.val(oldTxt).css({
					display: "block",
					position: "absolute",
					height: this.offsetHeight - 2,
					width: this.offsetWidth - 2,
					left: t.left,
					top: t.top,
					zIndex: 999
				}).data({
					dom: this,
					attrName: attrName,
					type: 'swimlane'
				}).focus();
			});


			var swimlane = $.isArray(me.options.swimlane) ? me.options.swimlane : me.options.swimlane.split(',');
			//生成泳道area
			for (i = 0; i < swimlane.length; i++) {
				var laneType = swimlane[i].toLowerCase();

				//横向泳道
				if (laneType == 'x') {
					me.$swimlaneX = $('<div class="swimlaneX-list"></div>');
					me.$swimlaneX.appendTo($swimlaneBox);
				}

				//纵向泳道
				if (laneType == 'y') {
					me.$swimlaneY = $('<div class="swimlaneY-list"></div>');
					me.$swimlaneY.appendTo($swimlaneBox);
				}
			}
			$swimlaneBox.appendTo(me.$work);
			var isSwimlaneY = !!me.$swimlaneY,
				isSwimlaneX = !!me.$swimlaneX;

			if (!isSwimlaneY && !isSwimlaneX || !me.isEdit) return;

			if (isSwimlaneX) {
				me.$swimlaneX.sortable({
					axis: 'y',
					handle: '.J_swimlaneTitle',
					tolerance: 'pointer',
					revert: true,
					start: function (event, ui) {
						ui.placeholder.height(ui.item.height());
						//me.$swimlaneX.sortable( "refreshPositions" );
					},
					update: function () {
						//a.a = 1;
						//return false;
					}
				});
			}

			if (isSwimlaneY) {
				me.$swimlaneY.sortable({
					axis: 'x',
					handle: '.J_swimlaneTitle',
					tolerance: 'pointer',
					revert: true,
					start: function (event, ui) {
						ui.placeholder.width(ui.item.width());
						//me.$swimlaneX.sortable( "refreshPositions" );
					}
				});
			}


			if (!me.options.haveTools) return;

			//初始化左边栏泳道工具
			var templ = '';
			templ += '<h4 class="tools-title">泳道</h4>';
			templ += '<ul class="tools-group">';
			if (isSwimlaneX) {
				templ += '<li><div data-lane="x" class="tools tools-click J_laneX"><span class=""></span><span>横向泳道</span></div></li>';
			}

			if (isSwimlaneY) {
				templ += '<li><div data-lane="y" class="tools tools-click  J_laneY"><span class=""></span><span>纵向泳道</span></div></li>';
			}

			templ += '</ul>';
			me.$toolsBox.append(templ);

			if (isSwimlaneX) {

				me.$toolsBox.find('.J_laneX').on('click', function () {
					me.addSwimlane('x');
				});
			}

			if (isSwimlaneY) {
				me.$toolsBox.find('.J_laneY').on('click', function () {
					me.addSwimlane('y');
				});
			}


			//获取焦点
			me.$swimlaneBox.on('click', '.swimlaneX,.swimlaneY', function (e) {
				me.focusItem(this.id);
			});


		},

		//初始化布局 
		_initLayout: function () {
			var me = this;
			$(window).on('resize', function () {
				if(me.options.width){
					me.$container.css('width', me.options.width);
				}

				var height = me.options.height || $(window).height(),
					width = me.options.width || me.$container.width(),
					workHeight = me.options.haveHead ? height - me.$head.outerHeight() : height,
					workWidth = me.options.haveTools ?  width -  me.$tools.outerWidth() : width;


				//最小宽度1000
				workWidth = workWidth > 1000 ? workWidth : 1000;
				
				me.$work.css('height', workHeight);

				if(me.options.haveHead){
					me.$tools.css('height', workHeight);
				}

				if(me.options.haveTools){
					me.$navCnts.css({
						'height': workHeight - me.$navTabs.outerHeight()
					});
				}else{
					me.$work.css('width', workWidth);
				}


				var workAreaTop = 0,
					workAreaLeft = 0;

				if (me.$swimlaneBox) {
					me.$swimlaneBox.css({
						height: workHeight * 3
					});
				}

				if (me.$swimlaneX) {
					workAreaLeft = 40;
					var laneXtop = me.$swimlaneY ? 41 : 0;
					me.$swimlaneX.css({
						width: workWidth + 84,
						height: workHeight * 3,
						marginTop: laneXtop
					});
				}


				if (me.$swimlaneY) {
					workAreaTop = 40;
					var laneYleft = me.$swimlaneX ? 42 : 0;
					me.$swimlaneY.css({
						width: workWidth + laneYleft,
						height: workHeight * 3,
						marginLeft: laneYleft
					});
				}


				//工作控件高度。默认为容器高度的三倍
				me.$workArea.css({
					width: workWidth,
					height: workHeight * 3,
					top: workAreaTop,
					left: workAreaLeft
				});


				$(me.$draw).css({
					width: workWidth,
					height: workHeight * 3
				});
			}).trigger('resize');
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
		_getToWorkOffset: function (offset, wk) {
			if (offset.pageX) {
				offset = {
					left: offset.pageX,
					top: offset.pageY
				}
			}
			var $wk = wk || this.$workArea,
				workOffset = $wk.offset(),
				sT = $wk.scrollTop(),
				sL = $wk.scrollLeft();

			return {
				left: offset.left - workOffset.left + sL,
				top: offset.top - workOffset.top + sT
			}
		},

		/**
		 * 切换工作状态
		 */
		_switchEditType: function (type) {
			var me = this;
			if (!me.isEdit || me.editType == type) return;

			me.blurItem();

			if (type == me.EditEnum.SELECT) {
				$.each(me.controls, function () {
					this.$el.draggable("enable");
					this.$el.resizable("enable");

				});
			}
			else {
				$.each(me.controls, function () {
					this.$el.draggable("disable");
					this.$el.resizable("disable");
				});
			}

			me.editType = type;

			me.$switchGroup.removeClass('active').filter(function () {
				return this.getAttribute('data-switchtype') == type;
			}).addClass('active');
		},


		/**
		 * 向工作空间中添加泳道
		 */
		addSwimlane: function (laneType, obj) {
			var me = this,
				laneType = laneType.toLowerCase()
			var obj = $.extend({
				name: '泳道',
				type: laneType.toUpperCase(),
				height: 150,
				width: 150
			}, obj);

			obj.id = obj.id || GooFlow.getUID('SWIMLANE');

			me.swimlanes[obj.id] = obj;

			if (laneType == 'x') {
				if (!me.$swimlaneX) return;

				window.$swimlaneX = me.$swimlaneX;
				var $item = $(me.swimlaneTempl(obj));
				me.$swimlaneX.append($item);

				$item.css({
					height: obj.height
				});

				$item.resizable({
					handles: 's',
					minHeight: 100,
					maxHeight: 400,
					stop: function (e, ui) {
						var id = ui.element.attr('id');
						me.swimlanes[id].height = ui.size.height;
						//me.$swimlanesX.sortable( "refreshPositions" );
					}
				});
				$item = null;
			}


			if (laneType == 'y') {
				if (!me.$swimlaneY) return;

				window.$swimlaneY = me.$swimlaneY;
				var $item = $(me.swimlaneTempl(obj));
				me.$swimlaneY.append($item);

				$item.css({
					width: obj.width
				});

				$item.resizable({
					handles: 'e',
					minWidth: 100,
					maxWidth: 400,
					stop: function (e, ui) {
						var id = ui.element.attr('id');
						me.swimlanes[id].width = ui.size.width;
						//me.$swimlanesY.sortable( "refreshPositions" );
					}
				});
				$item = null;
			}
		},

		/**
		 * 删除工作空间中泳道
		 */
		delSwimlane: function (id) {
			var me = this;
			if (!me.swimlanes[id]) return;
			$('#' + id).remove();
			delete me.swimlanes[id];
			me._switchPlan('control');
		},

		/**
		 * 向工作空间中添加控件
		 * @param {String} 控件类型
		 * @param {Object} 控件offset
		 */
		addControl: function (obj) {
			var me = this;
			var ctl = new GooFlow.Control(obj);
			ctl.syncUI();
			me.$workArea.append(ctl.$el);


			//加入总控件组
			me.controls[ctl.id] = ctl;
			me.focusItem(ctl.id);
		},

		/**
		 * 删除工作空间中控件
		 */
		delControl: function (id) {
			var me = this;
			if (!me.controls[id]) return;
			//if (me.onItemDel != null && !me.onItemDel(id, "node")) return;
			//先删除可能的连线
			for (var k in me.lines) {
				if (me.lines[k].from == id || me.lines[k].to == id) {
					me.delLine(k);
				}
			}
			//再删除结点本身
			// if (me.$undoStack) {
			// 	var paras = [id, me.$nodeData[id]];
			// 	me.pushOper("addNode", paras);
			// } 

			me.controls[id].remove();
			delete me.controls[id];
			if (me.curId == id) {
				me.curId = "";
			}
			me._switchPlan('control');
			// if (me.$editable) {
			// 	//在回退新增操作时,如果节点ID以this.$id+"_node_"开头,则表示为本次编辑时新加入的节点,这些节点的删除不用加入到$deletedItem中
			// 	if (id.indexOf(this.$id + "_node_") < 0)
			// 		this.$deletedItem[id] = "node";
			// }
		},

		/**
		 * 聚焦id
		 * @param  {String} id
		 */
		focusItem: function (id) {
			var me = this;
			if (!me.blurItem() || !id) return;

			//属性列表
			var attrList = null;

			if (/CONTROL/.test(id)) {
				attrList = me.controls[id];
				//控件
				me._switchEditType(me.EditEnum.SELECT);
				me.controls[id].$el.removeClass("control-mark").removeClass("crosshair").css("border-color", '');
				me.controls[id].focus();
			}
			else if (/LINE/.test(id)) {
				attrList = me.lines[id];
				//连接线
				var lineDom = me.lines[id].$el;
				if (useSVG) {
					lineDom.childNodes[1].setAttribute("stroke", me.options.color.mark);
					lineDom.childNodes[1].setAttribute("marker-end", "url(#arrow2)");
				}
				if (!me.isEdit) return;

				var x, y, from, to, n;
				if (useSVG) {
					from = lineDom.getAttribute("from").split(",");
					to = lineDom.getAttribute("to").split(",");
					n = [from[0], from[1], to[0], to[1]];
				}
				from[0] = parseInt(from[0], 10);
				from[1] = parseInt(from[1], 10);
				to[0] = parseInt(to[0], 10);
				to[1] = parseInt(to[1], 10);

				if (me.lines[id].type == "lr") {
					from[0] = me.lines[id].M;
					to[0] = from[0];

					me.$lineMove.css({
						width: "5px",
						height: (to[1] - from[1]) * (to[1] > from[1] ? 1 : -1) + "px",
						left: from[0] - 3 + "px",
						top: (to[1] > from[1] ? from[1] : to[1]) + 1 + "px",
						cursor: "e-resize",
						display: "block"
					}).data({
						"type": "lr",
						"tid": id
					});
				}
				else if (me.lines[id].type == "tb") {
					from[1] = me.lines[id].M;
					to[1] = from[1];
					me.$lineMove.css({
						width: (to[0] - from[0]) * (to[0] > from[0] ? 1 : -1) + "px",
						height: "5px",
						left: (to[0] > from[0] ? from[0] : to[0]) + 1 + "px",
						top: from[1] - 3 + "px",
						cursor: "s-resize",
						display: "block"
					}).data({
						"type": "tb",
						"tid": id
					});
				}

				x = (from[0] + to[0]) / 2 - 35;
				y = (from[1] + to[1]) / 2 + 6;

				me.$lineOper.css({
					display: "block",
					left: x + "px",
					top: y + "px"
				}).data("tid", id);

				if (me.isEdit) {
					me.$mpFrom.css({
						display: "block",
						left: n[0] - 4 + "px",
						top: n[1] - 4 + "px"
					}).data("p", n[0] + "," + n[1]);
					me.$mpTo.css({
						display: "block",
						left: n[2] - 4 + "px",
						top: n[3] - 4 + "px"
					}).data("p", n[2] + "," + n[3]);
				}

				me.$draw.appendChild(lineDom);

			}
			else {
				attrList = me.swimlanes[id];
				//泳道
				$('#' + id).addClass('cur');
			}

			var pick = _.pick(attrList, _.keys(attrList));
			attrList = _.omit(pick, ['$el', 'marked', 'templ', 'drag', 'resize', 'baseImgUrl']);

			me._switchPlan('attr', attrList);
			me.curId = id;
		},


		/**
		 * 取消所有结点/连线被选定的状态
		 */
		blurItem: function () {
			var me = this;
			if (me.curId) {
				if (/CONTROL/.test(me.curId)) {
					//控件
					me.controls[me.curId].blur();
				}
				else if (/LINE/.test(me.curId)) {
					//连接线
					var line = me.lines[me.curId];
					if (useSVG) {
						if (!line.marked) {
							line.$el.childNodes[1].setAttribute("stroke", me.options.color.line || "#3892D3");
							line.$el.childNodes[1].setAttribute("marker-end", "url(#arrow1)");
						}
					}

					me.$lineMove.hide().removeData("type").removeData("tid");

					if (me.isEdit) {
						me.$lineOper.hide().removeData("tid");
						me.$mpFrom.hide().removeData("p");
						me.$mpTo.hide().removeData("p");
					}

				}
				else {
					//泳道
					$('#' + me.curId).removeClass('cur');
				}
			}
			me.curId = "";
			return true;
		},


		/**
		 * 设置结点/连线/永道 属性值
		 * @param {String} id   控件id
		 * @param {String} attr 属性
		 * @param {String} val  值
		 * @param {String} type 控件类型
		 */
		setAttr: function (id, attr, val, type) {
			var me = this;
			if (type == "control") {
				var control = me.controls[id];
				//如果是控件
				if (!control || control[attr] == val) return;

				//if (me.onItemRename != null && !me.onItemRename(id, name, "node")) return;
				var oldVal = control[attr];
				control[attr] = val;
				control.syncUI();

				// if (me.isEdit) {
				// 	control.alt = true;
				// }
				//重画转换线
				me.resetLines(id, control);
			}

			if (type == "swimlane") {
				var swimlane = me.swimlanes[id];
				//如果是泳道
				if (!swimlane || swimlane[attr] == val) return;
				var oldVal = swimlane[attr];
				swimlane[attr] = val;
			}
		},

		/**
		 * 设置结点/连线/分组区域的文字信息
		 */
		setName: function (id, name, type) {
			var oldName, me = this;
			if (type == "control") {
				var control = me.controls[id];
				//如果是控件
				if (!control || control.name == name) return;

				//if (me.onItemRename != null && !me.onItemRename(id, name, "node")) return;
				oldName = control.name;
				control.name = name;
				control.$el.find(".J_text").text(name);
				control.syncUI();

				// if (me.isEdit) {
				// 	control.alt = true;
				// }
				//重画转换线
				me.resetLines(id, control);
			}
			else if (type == "line") {
				//如果是线
				if (!me.lines[id] || me.lines[id].name == name) return;
				//if (me.onItemRename != null && !me.onItemRename(id, name, "line")) return;
				oldName = me.lines[id].name;
				me.lines[id].name = name;
				if (useSVG) {
					me.lines[id].$el.childNodes[2].textContent = name;
				}
				// if (me.isEdit) {
				// 	me.lines[id].alt = true;
				// }
			}

			// if (me.$undoStack) {
			// 	var paras = [id, oldName, type];
			// 	me.pushOper("setName", paras);
			// }
		},


		//清空工作区及已载入的数据
		clearData: function () {
			for (var key in this.controls) {
				this.delControl(key);
			}
			for (var key in this.lines) {
				this.delLine(key);
			}
			for (var key in this.swimlanes) {
				this.delSwimlane(key);
			}
			this.controls = {};
			this.swimlanes = {};
			this.lines = {};
		},


		//载入一组数据
		loadData: function (data) {
			var me = this;
			var t = me.isEdit;
			me.isEdit = false;

			//if (data.title) me.setTitle(data.title);
			if(!$.isEmptyObject(me.controls) || !$.isEmptyObject(me.swimlanes) || !$.isEmptyObject(me.lines)){
				if(confirm('确定覆盖当前数据么？')){
					me.clearData();
				}else{
					return false;
				}
			}

			_.each(data.controls, function (v) {
				me.addControl(v);
			});

			_.each(data.lines, function (v) {
				me.addLine(v);
			});


			var swimlanes = _.groupBy(data.swimlanes, 'type');

			_.each(swimlanes['X'], function (v) {
				me.addSwimlane('x', v);
			});

			_.each(swimlanes['Y'], function (v) {
				me.addSwimlane('y', v);
			});

			me.blurItem();
			me._switchPlan('control');
			me.isEdit = t;
			//me.$deletedItem = {};
		},

		/**
		 * 获取流程图 json 数据
		 */
		getToJSON: function () {
			var me = this;
			var controls = _.map(me.controls, function (v) {
				return v.getToJSON();
			});


			var lines = _.map(me.lines, function (v) {
				return _.omit(v, ['$el', 'marked']);
			});

			var swimlanes = [],
				i;
			if (me.$swimlaneX) {
				var swimlaneX = me.$swimlaneX.sortable("toArray");
				for (i = 0; i < swimlaneX.length; i++) {
					swimlanes.push(me.swimlanes[swimlaneX[i]]);
				}
			}

			if (me.$swimlaneY) {
				var swimlaneY = me.$swimlaneY.sortable("toArray");
				for (i = 0; i < swimlaneY.length; i++) {
					swimlanes.push(me.swimlanes[swimlaneY[i]]);
				}
			}

			var json = {
				controls: controls,
				lines: lines,
				swimlanes: swimlanes
			};
			return json;
		},



		/**
		 * 初始化SVG画布
		 */
		_initDraw: function () {
			var me = this;
			//创建SVG
			me.$draw = document.createElementNS(SVG_NS, 'svg');
			me.$workArea.prepend(me.$draw);

			//创建箭头
			var defs = document.createElementNS(SVG_NS, "defs");
			me.$draw.appendChild(defs);
			defs.appendChild(me._getSvgMarker("arrow1", me.options.color.line));
			defs.appendChild(me._getSvgMarker("arrow2", me.options.color.mark));
			defs.appendChild(me._getSvgMarker("arrow3", me.options.color.mark));

			me.$draw.id = GooFlow.getUID('DRAW');


			//绑定连线的点击选中以及双击编辑事件
			if (!me.isEdit) return;
			var tmpClk = null;
			if (useSVG) {
				tmpClk = "g";
			}
			else {
				tmpClk = "PolyLine";
			}

			$(me.$draw).on('click', tmpClk, function (e) {
				me.focusItem(this.id);
			});

			$(me.$draw).on('dblclick', tmpClk, function (e) {
				var oldTxt, x, y, from, to;
				if (useSVG) {
					oldTxt = this.childNodes[2].textContent;
					from = this.getAttribute("from").split(",");
					to = this.getAttribute("to").split(",");
				}

				if (me.lines[this.id].type == "lr") {
					from[0] = me.lines[this.id].M;
					to[0] = from[0];
				}
				else if (me.lines[this.id].type == "tb") {
					from[1] = me.lines[this.id].M;
					to[1] = from[1];
				}

				x = (parseInt(from[0], 10) + parseInt(to[0], 10)) / 2 - 60;
				y = (parseInt(from[1], 10) + parseInt(to[1], 10)) / 2 - 12;

				var t = me.$workArea.offset();

				me.$textArea.val(oldTxt).css({
					display: 'block',
					position: 'absolute',
					width: 120,
					height: 14,
					left: x + (me.$swimlaneY ? 40 : 0),
					top: y + (me.$swimlaneX ? 40 : 0)
				}).data("id", me.curId).focus();

				me.$workArea.parent().one("mousedown", function (e) {
					if (e.button == 2) return false;
					me.setName(me.$textArea.data("id"), me.$textArea.val(), "line");
					me.$textArea.val("").removeData("id").hide();
				});
			});

		},

		/**
		 * 获取svg marker （箭头）
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
		 * 初始化操作折线时的移动框
		 */
		_initLineMove: function () {
			var me = this;

			me.$lineMove = $("<div class='GooFlow_line_move' style='display:none'></div>");
			me.$workArea.append(me.$lineMove);

			me.$lineMove.draggable({
				opacity: 0.5,
				containment: "#J_workArea",
				start: function (e, ui) {
					me.$lineMove.css('background-color', '#333');
					if (me.$lineMove.data("type") == "lr") {
						me.$lineMove.draggable("option", "axis", "x");
					}
					else if (me.$lineMove.data("type") == "tb") {
						me.$lineMove.draggable("option", "axis", "y");
					}
				},
				stop: function (e, ui) {
					me.$lineMove.css({
						"background-color": "transparent"
					});
					var p = me.$lineMove.position();
					if (me.$lineMove.data("type") == "lr") {
						me.setLineM(me.$lineMove.data("tid"), p.left + 3);
					}
					else if (me.$lineMove.data("type") == "tb") {
						me.setLineM(me.$lineMove.data("tid"), p.top + 3);
					}

					if (me.curId == me.$lineMove.data("tid")) {
						me.focusItem(me.$lineMove.data("tid"));
					}
				}
			});
		},

		/**
		 * 初始化选定一条转换线后出现的浮动操作栏，有改变线的样式和删除线等按钮。
		 */
		_initLineOper: function () {
			var me = this;
			//选定线时显示的操作框
			me.$lineOper = $("<div class='GooFlow_line_oper' style='display:none'><i class='b_l1'></i><i class='b_l2'></i><i class='b_l3'></i><i class='b_x'></i></div>");
			me.$workArea.parent().append(me.$lineOper);
			me.$lineOper.on("click", function (e) {
				var e = e || window.event;
				if (e.target.tagName != "I") return;
				var id = $(this).data("tid");
				switch ($(e.target).attr("class")) {
				case "b_x":
					me.delLine(id);
					this.style.display = "none";
					break;
				case "b_l1":
					me.setLineType(id, "lr");
					break;
				case "b_l2":
					me.setLineType(id, "tb");
					break;
				case "b_l3":
					me.setLineType(id, "sl");
					break;
				}
			});
		},

		/**
		 * 初始化用来改变连线的连接端点的两个小方块
		 */
		_initLinePoints: function () {
			var me = this;
			me.$mpFrom = $("<div class='GooFlow_line_mp' style='display:none'></div>");
			me.$mpTo = $("<div class='GooFlow_line_mp' style='display:none'></div>");
			me.$workArea.append(me.$mpFrom).append(me.$mpTo);

			me.$mpFrom.on("mousedown", function (e) {
				$(this).hide();
				//This.switchToolBtn("cursor");
				var ps = me.$mpFrom.data("p").split(",");
				var pe = me.$mpTo.data("p").split(",");

				me.$workArea.data("lineEnd", {
					"x": pe[0],
					"y": pe[1],
					"id": me.lines[me.$lineOper.data("tid")].to
				}).css("cursor", "crosshair");

				var line = me.drawLine("GooFlow_tmp_line", [ps[0], ps[1]], [pe[0], pe[1]], true, true);
				me.$draw.appendChild(line);
				return false;
			});


			me.$mpTo.on("mousedown", function (e) {
				$(this).hide();
				//me.switchToolBtn("cursor");
				var ps = me.$mpFrom.data("p").split(",");
				var pe = me.$mpTo.data("p").split(",");

				me.$workArea.data("lineStart", {
					"x": ps[0],
					"y": ps[1],
					"id": me.lines[me.$lineOper.data("tid")].from
				}).css("cursor", "crosshair");

				var line = me.drawLine("GooFlow_tmp_line", [ps[0], ps[1]], [pe[0], pe[1]], true, true);
				me.$draw.appendChild(line);
				return false;
			});
		},


		//原lineData已经设定好的情况下，只在绘图工作区画一条线的页面元素
		addLineDom: function (id, lineData) {

			var me = this;
			//获取开始/结束结点的数据
			var n1 = me.controls[lineData.from],
				n2 = me.controls[lineData.to];

			if (!n1 || !n2)
				return;
			//开始计算线端点坐标
			var res;

			if (lineData.type && lineData.type != "sl")
				res = me.calcPolyPoints(n1, n2, lineData.type, lineData.M);
			else
				res = me.calcStartEnd(n1, n2);

			if (!res) return;

			if (lineData.type == "sl")
				me.lines[id].$el = me.drawLine(id, res.start, res.end, lineData.marked);
			else
				me.lines[id].$el = me.drawPoly(id, res.start, res.m1, res.m2, res.end, lineData.marked);

			me.$draw.appendChild(me.lines[id].$el);

			if (useSVG) {

				me.lines[id].$el.childNodes[1].innerHTML = lineData.name;
				me.lines[id].$el.childNodes[2].textContent = lineData.name;

				if (lineData.type != "sl") {

					var Min = (res.start[0] > res.end[0] ? res.end[0] : res.start[0]);
					if (Min > res.m2[0]) Min = res.m2[0];
					if (Min > res.m1[0]) Min = res.m1[0];

					me.lines[id].$el.childNodes[1].style.left = (res.m2[0] + res.m1[0]) / 2 - Min - me.lines[id].$el.childNodes[1].offsetWidth / 2 + 4;

					Min = (res.start[1] > res.end[1] ? res.end[1] : res.start[1]);
					if (Min > res.m2[1]) Min = res.m2[1];
					if (Min > res.m1[1]) Min = res.m1[1];

					me.lines[id].$el.childNodes[1].style.top = (res.m2[1] + res.m1[1]) / 2 - Min - me.lines[id].$el.childNodes[1].offsetHeight / 2;
				}
				else {

					me.lines[id].$el.childNodes[1].style.left =
						((res.end[0] - res.start[0]) * (res.end[0] > res.start[0] ? 1 : -1) - me.lines[id].$el.childNodes[1].offsetWidth) / 2 + 4;

				}

			}
		},

		//增加一条线
		addLine: function (json) {

			var id = GooFlow.getUID('LINE');
			var me = this;

			//回调函数
			//if (me.onItemAdd != null && !me.onItemAdd(id, "line", json)) return;

			// if (me.$undoStack && me.$editable) {
			// 	me.pushOper("delLine", [id]);
			// }

			if (json.from == json.to) return;

			//获取开始/结束结点的数据
			var n1 = me.controls[json.from],
				n2 = me.controls[json.to];

			if (!n1 || !n2) {
				return
			};

			//避免两个节点间不能有一条以上同向接连线
			for (var k in me.lines) {
				if ((json.from == me.lines[k].from && json.to == me.lines[k].to)) {
					return;
				}
			}


			//设置lines

			me.lines[id] = {
				$el: '',
				type: 'sl', //默认为直线
				M: '',
				from: '',
				to: '',
				name: '',
				marked: false
			};
			$.extend(me.lines[id], json);

			me.addLineDom(id, me.lines[id]);

			// if (me.$editable) {
			// 	me.lines[id].alt = true;
			// 	if (me.$deletedItem[id]) delete me.$deletedItem[id]; //在回退删除操作时,去掉该元素的删除记录
			// }
		},


		//重构所有连向某个结点的线的显示，传参结构为controls数组的一个单元结构
		resetLines: function (id, node) {
			var me = this;
			for (var i in me.lines) {
				//获取结束/开始结点的数据
				var other = null,
					res,
					line = me.lines[i];

				if (line.from == id) { //找结束点
					other = me.controls[line.to] || null;
					if (other == null) continue;
					if (line.type == "sl")
						res = me.calcStartEnd(node, other);
					else
						res = me.calcPolyPoints(node, other, line.type, line.M)
					if (!res) break;
				}
				else if (line.to == id) { //找开始点
					other = me.controls[line.from] || null;
					if (other == null) continue;
					if (line.type == "sl")
						res = me.calcStartEnd(other, node);
					else
						res = me.calcPolyPoints(other, node, line.type, line.M);
					if (!res) break;
				}
				if (other == null) continue;
				me.$draw.removeChild(line.$el);
				if (line.type == "sl") {
					line.$el = me.drawLine(i, res.start, res.end, line.marked);
				}
				else {
					line.$el = me.drawPoly(i, res.start, res.m1, res.m2, res.end, line.marked);
				}
				me.$draw.appendChild(line.$el);
				if (useSVG == "") {
					line.$el.childNodes[2].textContent = line.name;
				}
			}
		},

		/**
		 * 重新设置连线的样式 newType= "sl":直线, "lr":中段可左右移动型折线, "tb":中段可上下移动型折线
		 */
		setLineType: function (id, newType, M) {
			var me = this;
			if (!newType || newType == null || newType == "" || newType == me.lines[id].type) return false;
			//if (me.onLineSetType != null && !me.onLineSetType(id, newType)) return;
			//if (me.$undoStack) {
			//	var paras = [id, me.lines[id].type, me.lines[id].M];
			//	me.pushOper("setLineType", paras);
			//}
			var from = me.lines[id].from;
			var to = me.lines[id].to;
			me.lines[id].type = newType;
			var res;
			//如果是变成折线
			if (newType != "sl") {
				var res = me.calcPolyPoints(me.controls[from], me.controls[to], me.lines[id].type, me.lines[id].M);
				if (M) {
					me.setLineM(id, M, true);
				}
				else {
					me.setLineM(id, me.getMValue(me.controls[from], me.controls[to], newType), true);
				}
			}
			//如果是变回直线
			else {
				delete me.lines[id].M;
				me.$lineMove.hide().removeData("type").removeData("tid");
				res = me.calcStartEnd(me.controls[from], me.controls[to]);
				if (!res) return;
				me.$draw.removeChild(me.lines[id].$el);
				me.lines[id].$el = me.drawLine(id, res.start, res.end, me.lines[id].marked || me.curId == id);
				me.$draw.appendChild(me.lines[id].$el);
				if (useSVG) {
					me.lines[id].$el.childNodes[2].textContent = me.lines[id].name;
				}
			}
			if (me.curId == id) {
				me.focusItem(id);
			}

			// if (me.isEdit) {
			// 	me.lines[id].alt = true;
			// }
		},

		/**
		 * 设置折线中段的X坐标值（可左右移动时）或Y坐标值（可上下移动时）
		 */
		setLineM: function (id, M, noStack) {
			var me = this;
			if (!me.lines[id] || M < 0 || !me.lines[id].type || me.lines[id].type == "sl") return false;
			//if (me.onLineMove != null && !me.onLineMove(id, M)) return false;
			// if (me.$undoStack && !noStack) {
			// 	var paras = [id, me.lines[id].M];
			// 	me.pushOper("setLineM", paras);
			// }
			var from = me.lines[id].from;
			var to = me.lines[id].to;
			me.lines[id].M = M;

			var ps = me.calcPolyPoints(me.controls[from], me.controls[to], me.lines[id].type, me.lines[id].M);

			me.$draw.removeChild(me.lines[id].$el);

			me.lines[id].$el = me.drawPoly(id, ps.start, ps.m1, ps.m2, ps.end, me.lines[id].marked || me.curId == id);

			me.$draw.appendChild(me.lines[id].$el);

			if (useSVG) {
				me.lines[id].$el.childNodes[2].textContent = me.lines[id].name;
			}

			// if (me.isEdit) {
			// 	me.lines[id].alt = true;
			// }
		},

		/**
		 * 删除转换线
		 */
		delLine: function (id) {
			var me = this;
			if (!me.lines[id]) return;
			//if (me.onItemDel != null && !me.onItemDel(id, "node")) return;
			// if (me.$undoStack) {
			// 	var paras = [id, me.lines[id]];
			// 	me.pushOper("addLine", paras);
			// } 

			me.$draw.removeChild(me.lines[id].$el);
			delete me.lines[id];

			if (me.curId == id) {
				me.curId = "";
			}

			if (me.isEdit) {
				//在回退新增操作时,如果节点ID以me.$id+"_line_"开头,则表示为本次编辑时新加入的节点,这些节点的删除不用加入到$deletedItem中
				// if (id.indexOf(me.$id + "_line_") < 0){
				// 	me.$deletedItem[id] = "line";
				// }
				me.$mpFrom.hide().removeData("p");
				me.$mpTo.hide().removeData("p");
			}
			me.$lineOper.hide().removeData("tid");
		},



		//变更连线两个端点所连的结点
		//参数：要变更端点的连线ID，新的开始结点ID、新的结束结点ID；如果开始/结束结点ID是传入null或者""，则表示原端点不变
		moveLinePoints: function (lineId, newStart, newEnd, noStack) {

			if (newStart == newEnd) return;

			if (!lineId || !this.lines[lineId]) return;

			if (newStart == null || newStart == "")
				newStart = this.lines[lineId].from;

			if (newEnd == null || newEnd == "")
				newEnd = this.lines[lineId].to;

			//避免两个节点间不能有一条以上同向接连线
			for (var k in this.lines) {
				if ((newStart == this.lines[k].from && newEnd == this.lines[k].to))
					return;
			}

			//if (this.onLinePointMove != null && !this.onLinePointMove(id, newStart, newEnd)) return;

			// if (this.$undoStack && !noStack) {
			// 	var paras = [lineId, this.lines[lineId].from, this.lines[lineId].to];
			// 	this.pushOper("moveLinePoints", paras);
			// }  

			if (newStart != null && newStart != "") {
				this.lines[lineId].from = newStart;
			}

			if (newEnd != null && newEnd != "") {
				this.lines[lineId].to = newEnd;
			}

			//重建转换线
			this.$draw.removeChild(this.lines[lineId].$el);
			this.addLineDom(lineId, this.lines[lineId]);

			// if (this.$editable) {
			// 	this.lines[lineId].alt = true;
			// }
		},



		/**
		 * 绘制一条箭头线，并返回线的DOM
		 */
		drawLine: function (id, sp, ep, mark, dash) {
			var line;
			if (useSVG) {
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
			if (useSVG) {
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

	GooFlow.getUID = function (ns) {
		return ns + uuid(8, 16);
	}

	// GooFlow.getUID = (function () {
	// 	var obj = {};
	// 	return function (ns) {
	// 		if (ns in obj) {
	// 			obj[ns]++;
	// 		}
	// 		else {
	// 			obj[ns] = 0;
	// 		}
	// 		return ns + obj[ns];
	// 	}
	// })();


	/**
	 * 控件配置
	 * @type {Object}
	 */
	var ToolsConfig = GooFlow.prototype.ToolsConfig = {
		label: {
			name: '标签',
			drag: true,
			resize: true,
			width: '100',
			height: '46'
		},
		processStart: {
			name: '开始',
			drag: true,
			resize: true,
			width: '110',
			height: '65',
			templ: '#img_templ',
			img: 'processStart.png'
		},
		processSwitch: {
			name: '分支',
			drag: true,
			resize: true,
			width: '110',
			height: '65',
			templ: '#img_templ',
			img: 'processSwitch.png'
		},
		processCourse1: {
			name: '过程1',
			drag: true,
			resize: true,
			width: '110',
			height: '65',
			templ: '#img_templ',
			img: 'processCourse1.png'
		},
		processCourse2: {
			name: '过程2',
			drag: true,
			resize: true,
			width: '110',
			height: '65',
			templ: '#img_templ',
			img: 'processCourse2.png'
		},
		processEnd: {
			name: '结束',
			drag: true,
			resize: true,
			width: '110',
			height: '35',
			templ: '#img_templ',
			img: 'processEnd.png'
		},
		business1: {
			name: '业务1',
			drag: true,
			resize: true,
			width: '100',
			height: '50',
			templ: '#img_templ',
			img: 'business1.png'
		},
		business2: {
			name: '业务2',
			drag: true,
			resize: true,
			width: '100',
			height: '50',
			templ: '#img_templ',
			img: 'business2.png'

		},
		business3: {
			name: '业务3',
			drag: true,
			resize: true,
			width: '100',
			height: '50',
			templ: '#img_templ',
			img: 'business3.png'
		},

		plan2: {
			name: '面板2',
			drag: true,
			resize: true,
			width: '80',
			height: '80',
			attr1: '1',
			attr2: '2'

		},
		plan3: {
			name: '面板3',
			drag: true,
			resize: true,
			width: '80',
			height: '80',
			attr1: '1',
			attr2: '2',
			attr3: '3'
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
	GooFlow.Tools = function (type, options) {
		this.$el = '';
		this.id = GooFlow.getUID('TOOLS');
		this.type = type;

		this.options = options || {};

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
				var templSelector = me.templ || '#' + me.type + '_templ';
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
							img: me.img,
							baseImgUrl: baseImgUrl,
							isHelper: true
						});
					},
					opacity: 0.5,
					cursorAt: {
						left: 20,
						top: 0
					},
					containment: "document",
					zIndex: 1000
				});
			}
		}
	}



	/**
	 * 右边控件对象
	 */
	GooFlow.Control = function (obj) {
		this.id = GooFlow.getUID('CONTROL');
		this.$el = null;
		this.name = this.id;
		this.type = obj.type;
		this.left = 0;
		this.top = 0;
		this.width = 0;
		this.height = 0;
		this.baseImgUrl = baseImgUrl;
		//继承config属性
		$.extend(this, ToolsConfig[obj.type], obj);
		this._init();

	}
	GooFlow.Control.prototype = {
		constructor: GooFlow.Control,

		_init: function () {
			var me = this;
			var templSelector = me.templ || '#' + me.type + '_templ';
			me.templ = doT.template($(templSelector).text());

			me.$el = $(me.templ(me));

			me.$el.css({
				width: me.width,
				height: me.height,
				left: me.left,
				top: me.top
			});

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
				//snap: true ,
				cursor: 'move',
				opacity: 0.5,
				appendTo: 'body',
				containment: ".J_workArea"
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

		getToJSON: function () {
			var me = this,
				pick = _.pick(me, _.keys(me)),
				json = _.omit(pick, ['$el', 'marked', 'templ', 'baseImgUrl']);
			return json;
		},

		syncUI: function (offset) {
			var $el = this.$el;
			if (offset) {
				$el.offset(offset);
			}
			var pos = $el.is(':hidden') ? offset : $el.position();
			$.extend(this, pos, {
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