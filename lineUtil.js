var useSVG = isIE678 ? 0 : 1;
var SVG_NS = 'http://www.w3.org/2000/svg';

var lineUtil = {
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
	}
}