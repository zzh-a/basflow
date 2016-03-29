$('.process').resizable({
	autoHide: true,
	helper: "ui-resizable-helper",
	grid: [0, 2],
	minHeight: 20,
	maxHeight: 200,
	minWidth: 30,
	maxWidth: 300,
	stop: function (event, ui) {
		var $this = $(this),
			size = ui.size;

		//return false;

		var _w = size.height / 2;
		var isStart = $(this).hasClass('process-start');
		var isEnd = $(this).hasClass('process-end');

		$this.find('.pl').css('width', _w + 'px');
		$this.find('.st,.sd').css('borderWidth', _w + 'px');
		$this.find('.pc').css('width', (size.width - size.height) + 'px');
		if (isEnd) {
			$this.find('.pr').css('width', _w + 'px');
		}
		else {
			$this.find('.pr').css('borderWidth', _w + 'px');
		}
	} 
});
  


$.ui.plugin.add("draggable", "guides", {
		start: function (event, ui, i) {
			var o = i.options;

			i.guidesElements = [];

			$(":data(ui-draggable)").not(this).each(function(){
				var $t = $(this),
					$o = $t.offset();
				i.guidesElements.push({
					item:this,
					width: $t.outerWidth(),
					height: $t.outerHeight(),
					top: $o.top,
					left: $o.left
				});
			});
		},
		drag: function (event, ui, inst) {
			var ts, bs, ls, rs, l, r, t, b, i, first,
				o = inst.options,
				d = o.guidesTolerance || 10,
				x1 = ui.offset.left,
				x2 = x1 + inst.helperProportions.width,
				y1 = ui.offset.top,
				y2 = y1 + inst.helperProportions.height;
				console.log('grag--');
			for (i = inst.guidesElements.length - 1; i >= 0; i--) {

				l = inst.guidesElements[i].left - inst.margins.left;
				r = l + inst.guidesElements[i].width;
				t = inst.guidesElements[i].top - inst.margins.top;
				b = t + inst.guidesElements[i].height;
				// if (x2 < l - d || x1 > r + d || y2 < t - d || y1 > b + d || !$.contains(inst.guidesElements[i].item.ownerDocument, inst.guidesElements[i].item)) {
				// 	if (inst.guidesElements[i].guidesping) {
				// 		(inst.options.guides.release && inst.options.guides.release.call(inst.element, event, $.extend(inst._uiHash(), {
				// 			guidesItem: inst.guidesElements[i].item
				// 		})));
				// 	}
				// 	inst.guidesElements[i].guidesping = false;
				// 	continue;
				// }
				
				//inner
				ts = Math.abs(t - y2) <= d;
				bs = Math.abs(b - y1) <= d;
				ls = Math.abs(l - x2) <= d;
				rs = Math.abs(r - x1) <= d;
				
				if (ts) {

					$("#guide-h").css("top", inst.guidesElements[i].top).show();

					ui.position.top = inst._convertPositionTo("relative", {
						top: t - inst.helperProportions.height,
						left: 0
					}).top;
				}
				if (bs) {

					$("#guide-h").css("top", inst.guidesElements[i].top + inst.guidesElements[i].height).show();

					ui.position.top = inst._convertPositionTo("relative", {
						top: b,
						left: 0
					}).top;
				}


				if (ls) {

					$("#guide-v").css("left", inst.guidesElements[i].left).show();

					ui.position.left = inst._convertPositionTo("relative", {
						top: 0,
						left: l - inst.helperProportions.width
					}).left;
				}
				if (rs) {

					$("#guide-v").css("left", inst.guidesElements[i].left + inst.guidesElements[i].width).show();

					ui.position.left = inst._convertPositionTo("relative", {
						top: 0,
						left: r
					}).left;
				}

				first = (ts || bs || ls || rs);
				

				//outer
				ts = Math.abs(t - y1) <= d;
				bs = Math.abs(b - y2) <= d;
				ls = Math.abs(l - x1) <= d;
				rs = Math.abs(r - x2) <= d;

				if (ts) {

					$("#guide-h").css("top", inst.guidesElements[i].top).show();

					ui.position.top = inst._convertPositionTo("relative", {
						top: t,
						left: 0
					}).top;
				}
				if (bs) {

					$("#guide-h").css("top", inst.guidesElements[i].top + inst.guidesElements[i].height).show();

					ui.position.top = inst._convertPositionTo("relative", {
						top: b - inst.helperProportions.height,
						left: 0
					}).top;
				}


				if (ls) {

					$("#guide-v").css("left", inst.guidesElements[i].left).show();

					ui.position.left = inst._convertPositionTo("relative", {
						top: 0,
						left: l
					}).left;
				}


				if (rs) {

					$("#guide-v").css("left", inst.guidesElements[i].left + inst.guidesElements[i].width).show();

					ui.position.left = inst._convertPositionTo("relative", {
						top: 0,
						left: r - inst.helperProportions.width
					}).left;
				}

				if(first || ts || bs || ls || rs){
					break;
				}else{
					$("#guide-v").hide();
					$("#guide-h").hide();
				}

			}

		},
		stop: function (event, ui) {
			$("#guide-v, #guide-h").hide();
		}
	});




var MIN_DISTANCE = 10;
var guides = [];
var innerOffsetX, innerOffsetY;

$(".process").draggable({
	guides: true   
	// ,start: function (event, ui) {
	// 	guides = $.map($(".process").not(this), computeGuidesForElement);
	// 	innerOffsetX = event.originalEvent.offsetX;
	// 	innerOffsetY = event.originalEvent.offsetY;
	// },
	// drag: function (event, ui) {
	// 	//循环所有的引导
	// 	var guideV, guideH, distV = MIN_DISTANCE + 1,
	// 		distH = MIN_DISTANCE + 1,
	// 		offsetV, offsetH;
	// 	var chosenGuides = {
	// 		top: {
	// 			dist: MIN_DISTANCE + 1
	// 		},
	// 		left: {
	// 			dist: MIN_DISTANCE + 1
	// 		}
	// 	};
	// 	var $t = $(this);
	// 	var pos = {
	// 		top: event.originalEvent.pageY - innerOffsetY,
	// 		left: event.originalEvent.pageX - innerOffsetX
	// 	};
	// 	var w = $t.outerWidth() - 1;
	// 	var h = $t.outerHeight() - 1;
	// 	var elemGuides = computeGuidesForElement(null, pos, w, h);
	// 	$.each(guides, function (i, guide) {
	// 		$.each(elemGuides, function (i, elemGuide) {
	// 			if (guide.type == elemGuide.type) {
	// 				var prop = guide.type == "h" ? "top" : "left";
	// 				var d = Math.abs(elemGuide[prop] - guide[prop]);
	// 				if (d < chosenGuides[prop].dist) {
	// 					chosenGuides[prop].dist = d;
	// 					chosenGuides[prop].offset = elemGuide[prop] - pos[prop];
	// 					chosenGuides[prop].guide = guide;
	// 				}
	// 			}
	// 		});
	// 	});
	// 	if (chosenGuides.top.dist <= MIN_DISTANCE) {
	// 		$("#guide-h").css("top", chosenGuides.top.guide.top).show();

	// 		ui.position.offset = chosenGuides.top.guide.top - chosenGuides.top.offset;
	// 	}
	// 	else {
	// 		$("#guide-h").hide();
	// 		//ui.position.top = pos.top;
	// 	}

	// 	if (chosenGuides.left.dist <= MIN_DISTANCE) {
	// 		$("#guide-v").css("left", chosenGuides.left.guide.left).show();
	// 		//ui.position.left = chosenGuides.left.guide.left - chosenGuides.left.offset;
	// 	}
	// 	else {
	// 		$("#guide-v").hide();
	// 		//ui.position.left = pos.left;
	// 	}
	// },
	// stop: function (event, ui) {
	// 	$("#guide-v, #guide-h").hide();
	// }
});

function computeGuidesForElement(elem, pos, w, h) {
	if (elem != null) {
		var $t = $(elem);
		pos = $t.offset();
		w = $t.outerWidth() - 1;
		h = $t.outerHeight() - 1;
	}
	return [{
			type: "h",
			left: pos.left,
			top: pos.top
		}, {
			type: "h",
			left: pos.left,
			top: pos.top + h
		}, {
			type: "v",
			left: pos.left,
			top: pos.top
		}, {
			type: "v",
			left: pos.left + w,
			top: pos.top
		}
		// , //可以加上其他预定义提醒
		// {
		// 	type: "h",            
		// 	left: pos.left,
		// 	top: pos.top + h / 2
		// }, {
		// 	type: "v",
		// 	left: pos.left + w / 2,
		// 	top: pos.top
		// }
	];
}