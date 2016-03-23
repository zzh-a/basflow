(function (window, $, undefined) {

	var isIE678 = !+"\v1";
	var useSve = isIE678 ? 0 : 1;

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


		me.options = {
			haveHead: true,
			haveTools: true,
		}

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

		_initHeadBtns: function () {
			this.$container.addClass('GooFlow');
			var templ = this.options.headTempl || '<div class="GooFlow_head"></div>';
			this.$head = $(templ);
			this.$container.append(this.$head);
		},

		_initTools: function () {
			var templ = this.options.toolsTempl || '<div class="GooFlow_tool"><ul class="nav nav-tabs"><li class="active"><a href="javascript:;">控件</a></li><li><a href="javascript:;">属性</a></li></ul><ul class="nav nav-cnts"><li class="J_toolsBox"></li><li style="display:none;"></li></ul></div>';
			this.$tools = $(templ);
			this.$toolsBox = this.$container.append(this.$tools).find('.J_toolsBox');
		},

		_initWorkArea: function () {
			var templ = '<div class="GooFlow_work"><div class="J_workArea" style="position:relative;"></div></div>';
			this.$work = $(templ);
			this.$workArea = this.$container.append(this.$work).find('.J_workArea');
		},

		_initLayout: function () {
			var me = this;
			$(window).on('resize', function () {
				var height = me.options.height || $(window).height(),
					workHeight = me.options.haveHead ? height - me.$head.height() : height;
				me.$tools.css('height', workHeight);
				me.$work.css('height', workHeight);
				//工作控件高度。默认为容器高度的三倍
				me.$workArea.css('height', workHeight * 3);
			}).trigger('resize');
		},

		_createSVGArea: function () {

		},

		_createPlanArea: function () {

		}
	}


	$.fn.extend({
		createGooFlow: function (options) {
			return new GooFlow(this, options);
		}
	});

})(window, jQuery);