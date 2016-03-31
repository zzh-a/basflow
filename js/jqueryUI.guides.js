$.ui.plugin.add("draggable", "guides", {
	start: function (event, ui, i) {
		var o = i.options;

		i.guidesElements = [];

		$(".contorl").not(this).each(function(){
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
		for (i = inst.guidesElements.length - 1; i >= 0; i--) {

			l = inst.guidesElements[i].left - inst.margins.left;
			r = l + inst.guidesElements[i].width;
			t = inst.guidesElements[i].top - inst.margins.top;
			b = t + inst.guidesElements[i].height;
			if (x2 < l - d || x1 > r + d || y2 < t - d || y1 > b + d || !$.contains(inst.guidesElements[i].item.ownerDocument, inst.guidesElements[i].item)) {
				if (inst.guidesElements[i].guidesping) {
					(inst.options.guides.release && inst.options.guides.release.call(inst.element, event, $.extend(inst._uiHash(), {
						guidesItem: inst.guidesElements[i].item
					})));
				}
				inst.guidesElements[i].guidesping = false;
				continue;
			}
			
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