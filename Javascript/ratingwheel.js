//ENORMOUS ISSUE: how do I reference d3 inside these files?

var rating_wheel = {};

rating_wheel.wheel =
{
	create: function(bigR, c, t, p, g, s, q, fontInfo, catInfo)
	{
		// static vars

		var createCon = function(bigR, c, t, p, g, s, q, fontInfo, catInfo)
		{
			//NOTES
			/*
				bigR = radius of entire plot
				c = number of concept categories ("families")
				t = number of intensities/levels
				p = ratio of (circle area / next biggest circle area)
				g = gap between category sectors, 
					as [(gap size) / (circle size * c)]
				s = minimum space between intensity levels (pixels)
				q = center "blank" circle size, 
					as percent change from outermost radius size
				fontFam = for text labels, font family name, from CSS standards
				fontSize = for text labels, font size
			*/

			//user-provided parameters
			this.bigR = bigR;
			this.c = c;
			this.t = t;
			this.p = p;
			this.g = g;
			this.s = s;
			this.q = q;
			this.fontFam = fontInfo.family;
			this.fontSize = fontInfo.size;
			this.catInfo = catInfo;

			//default "advanced" values used in calculations
			/*
				values not adjustable in GUI
				precisionR = increments of percentage points to decrease radius
					when checking overlap
				precisionS = increments of percentage points to decrease space
					when checking overspacing
			*/
			this.precisionR = 0.05;
			this.precisionS = 0.05;
			this.spacePadding = 0.1;
			this.expFactor = 1.2;
			this.setPreciR = function(value)
			{
				this.precisionR = value;
			}
			this.setPreciS = function(value)
			{
				this.precisionS = value;
			}
			this.setSpacePadding = function(value)
			{
				this.spacePadding = value;
			}
			this.setExpFactor = function(value)
			{
				this.expFactor = value;
			}

			//values calculated from parameters
			var sumVal = 0;
			for (i = 0; i < t+1; i++)
			{
				sumVal += 2 * Math.pow(p, i);
			}
			this.r = ((bigR - (s*t) - s) / (sumVal + (1+q)))
			
			this.trigVal = (2 * Math.PI) / this.c;

			//TODO delete
			alert("V30: parameters set");

			//overlap and spacing scaling functions
			this.overspaceScaleCalc = function()
			{
				var obj = this; //is this good?
				//checks over-spacing
				//returns array of position value scaling

				checkSpacing = function(distance, layer, increment)
				{
					var outerRad = obj.r * Math.pow(obj.r, layer);
					var innerRad = obj.r * Math.pow(obj.r, layer+1);
					var maxSpace = outerRad + (obj.s * (1+obj.spacePadding)) + innerRad;

					var distScale = distance * (1 - (increment*obj.precisionS));

					if (distScale <= maxSpace)
					{
						return true;
					}
					else
					{
						return false;
					}
				}

				var scaling = [];
				for (var i = 0; i < this.t + 1; i++)
				{
					var outRad = this.r * Math.pow(this.p, i*this.expFactor);
					var inRad = this.r * Math.pow(this.p, (i+1)*this.expFactor);
					var outZ = rating_wheel.math.summation(i, this.r, this.p, this.s) + this.r;
						if (i == 0) { outZ = this.r + this.s; }
					var inZ = rating_wheel.math.summation(i+1, this.r, this.p, this.s) + this.r;
					
					var outX = (this.bigR - outZ) * Math.cos(this.trigVal);
					var outY = (this.bigR - outZ) * Math.sin(this.trigVal);
					var inX = (this.bigR - inZ) * Math.cos(this.trigVal);
					var inY = (this.bigR - inZ) * Math.sin(this.trigVal)

					var increment = 0;
					var condition = true;
					while (condition)
					{

						var eval = checkSpacing(rating_wheel.math.distance(outX, outY, inX, inY), i, increment);

						if (eval)
						{
							condition = false;
						}
						else
						{
							increment++;
						}
					}

					scaling[i] = 1 - (increment * this.precisionS);

				}
				return scaling;
			}
			this.spacingScl = this.overspaceScaleCalc();

			this.overlapScaleCalc = function()
			{
				var obj = this;
				checkOverlap = function(distance, layer, increment)
				{
					//check for overlapping circles
					var origRad = obj.r * Math.pow(obj.p, layer * obj.expFactor);
					var multiplier = 1 - (increment * obj.precisionR);

					var layerCircum = 0;
					if (layer == 0)
					{
						layerCircum = 2 * Math.PI * (obj.bigR - obj.r);
					}
					else
					{
						layerCircum = 2 * Math.PI * (obj.bigR - rating_wheel.math.summation(layer, obj.r, obj.p, obj.s) - obj.r);
					}

					var gap = obj.g * layerCircum;
					var needSpace = (2 * origRad * multiplier) + gap;

					if (distance >= needSpace)
					{
						return true;
					}
					else
					{
						return false;
					}				
				}

				//returns array of radius scaling
				var scaling = [];
				for (var i = 0; i < this.t + 1; i++)
				{
					var outRad = this.r * Math.pow(this.p, i*this.expFactor);
					var z = rating_wheel.math.summation(i, this.r, this.p, this.s) + this.r;
						if (i == 0) { z = this.r + this.s; }
					
					var x1 = (this.bigR - z) * this.spacingScl[i];
					var y1 = 0;
					var x2 = (this.bigR - z) * Math.cos(this.trigVal) * this.spacingScl[i];
					var y2 = (this.bigR - z) * Math.sin(this.trigVal) * this.spacingScl[i];

					var increment = 0;
					var condition = true;
					while (condition)
					{
						var eval = checkOverlap(rating_wheel.math.distance(x1, y1, x2, y2), i, increment);
						if (eval)
						{
							condition = false;
						}
						else
						{
							increment++;
						}
					}
					scaling[i] = 1 - (increment * this.precisionS);
				}
				return scaling;
			}
			this.radiusScl = this.overlapScaleCalc();
	
			this.points = function()
			{
				var circlePoints = [];
				var textPositions = [];
				for (var n = 0; n < this.c; n++)
				{
					var textX = ((this.bigR + this.s) * Math.cos(this.trigVal*n) * this.spacingScl[0]) + this.bigR;
					var textY = ((this.bigR + this.s) * Math.sin(this.trigVal*n) * this.spacingScl[0]) + this.bigR;

					if (textX < 0) { textX = 0; }
					if (textY < 0) { textY = 0; }
					textPositions.push([textX, textY]);
				
					for (var l = 0; l < this.t+1; l++)
					{
						var radius = this.r * Math.pow(this.p, l*this.expFactor) * this.radiusScl[l];
						var z = rating_wheel.math.summation(l, this.r, this.p, this.s) + this.r;
							if (l == 0) { z = this.r + this.s; }

						var x = ((this.bigR - z) * Math.cos(this.trigVal*n) * this.spacingScl[l]) + this.bigR;
						var y = ((this.bigR - z) * Math.sin(this.trigVal*n) * this.spacingScl[l]) + this.bigR;

						circlePoints.push([radius, x, y, n, l]);
					}			
				}
				var circleConvert = rating_wheel.etc.toJSON(circlePoints, "circles");
				var textConvert = rating_wheel.etc.toJSON(textPositions, "text");
				var allPoints = {circles:circleConvert, text:textConvert};
				return allPoints;
			}
			this.allPoints = this.points();
		};
		return new createCon(bigR, c, t, p, g, s, q, fontInfo, catInfo);
	},

	font: function(size, family)
	{
		//renders font information as an array usable by "create"

		//TODO: check validity of family input
		var familyCorr = family; //TODO: remove after fix

		return {size:size, family:familyCorr};
	},

	categories: function(names, colors)
	{
		//renders category information as an array usable by "create"
		if (names.length == null || colors.length == null)
		{
			// if these are not arrays
			return null;
		}
		else if (names.length != colors.length)
		{
			// if these are not of equal size
			return null;
		}
		else
		{
			var combined = [];
			for (var i = 0; i < names.length; i++)
			{
				//TODO: check validity of color input
				var colorCorr = colors[i]; //TODO: remove after fix

				combined.push({name: names[i], color: colorCorr});
			}
			return combined;
		}
	}
}

rating_wheel.render =
{

	go: function(wheelObj)
	{

	},

	draw: function(wheelObj)
	{
		var svgContainer = d3.select("body").append("svg");
		var circleData = wheelObj.allPoints.circles;
		var textData = wheelObj.allPoints.text;
		var catInfo = wheelObj.catInfo;

		var circles = svgContainer.append("g")
			.selectAll("circle")
			.data(circleData)
			.enter().append("circle");
		var circlesAtt = circles
			.attr("cx", function (d) { return d.x_pos; })
			.attr("cy", function (d) { return d.y_pos; })
			.attr("r", function (d) { return d.radius; })
			.style("fill", function (d) {
				return catInfo[d.cat].color; });
		
		var texts = svgContainer.append("g")
			.selectAll("text")
			.data(textData)
			.enter().append("text");
		var textsAtt = texts
			.text(function (d, i) {
				return catInfo[i].name; })
			.attr("x", function (d, i) { return d.x;})
			.attr("y", function (d) { return d.y; })
			.style("fill", "black")
			.style("font-family", wheelObj.fontFam)
			.style("font-size", wheelObj.fontSize);

		var maxTextHeight = 0;
		var maxTextWidth = 0;
		texts.each(function() 
		{
		    if (this.getBBox().height > maxTextHeight)
		    {
		    	maxTextHeight = this.getBBox().height;
		    }
		    if (this.getBBox().width > maxTextWidth)
		    {
		    	maxTextWidth = this.getBBox().width;
		    }
		});

		var svgContainerTransform = svgContainer
			.attr("width", (wheelObj.bigR * 2) + wheelObj.r + 3*maxTextWidth)
			.attr("height", (wheelObj.bigR * 2) + wheelObj.r + 3*maxTextHeight);

		var fourthOfCats = Math.round((wheelObj.c+1)/4);
		var textsTransform = texts
			.attr("x", function(d, i) {
				var thisWidth = this.getBBox().width / 2;
				if (i > fourthOfCats && i < wheelObj.c - fourthOfCats)
				{
					var difference = -thisWidth + maxTextWidth/2;
					return d.x + difference;
				}
				else if (i != fourthOfCats && i != wheelObj.c - fourthOfCats)
				{
					var summed = thisWidth + maxTextWidth/2;
					return d.x + summed;
				}
				else
				{
					return d.x + (maxTextWidth*0.75 - thisWidth);
				}
			})
			.attr("y", function(d, i) {
				return d.y + maxTextHeight;
			});
		
		var circlesTransform = circles
			.attr("cx", function(d, i)
				{
					return d.x_pos + (maxTextWidth*0.75);
				})
			.attr("cy", function(d, i)
				{
					return d.y_pos + maxTextHeight;
				});
	}
}

rating_wheel.math =
{
	summation: function(l,r,p,s)
	{
		var result = 0;
		for (var k = 0; k < l+1; k++)
		{
			var term = 2 * r * Math.pow(p, k);
			result += term;
		}
		result += s * (l-1);
		result += Math.pow(p, l-1);
		return result;
	},

	distance: function(x1, y1, x2, y2)
	{
		// finds distance between points (x1, y1) and (x2, y2)
		return Math.pow((Math.pow((x2-x1), 2) + Math.pow((y2-y1), 2)), 0.5);
	}
}

rating_wheel.etc =
{
	toJSON: function(thisArray, identifier)
	{

		//identifier accepted as "circles" or "text"
		if (identifier == "circles")
		{
			var jsonText = '{ "entries" : [';
			for (var iter = 0; iter < thisArray.length; iter++)
			{
				var toAdd = '{ "radius":' + thisArray[iter][0];
				toAdd += ' , "x_pos":' + thisArray[iter][1];
				toAdd += ' , "y_pos":' + thisArray[iter][2];
				toAdd += ' , "cat":' + thisArray[iter][3];
				toAdd += ' , "intens":' + thisArray[iter][4];
				if (iter == thisArray.length - 1)
				{
					toAdd += "} ";
				}
				else
				{
					toAdd += '}, ';
				}
				jsonText += toAdd;
			}
			jsonText += ']}';

			var jsonObj = JSON.parse(jsonText);
			return jsonObj.entries;
		}
		else if (identifier == "text")
		{
			var jsonText = '{ "entries" : [';
			for (var iter = 0; iter < thisArray.length; iter++)
			{
				var toAdd = '{ "x":' + thisArray[iter][0];
				toAdd += ' , "y":' + thisArray[iter][1];
				if (iter == thisArray.length - 1)
				{
					toAdd += "} ";
				}
				else
				{
					toAdd += '}, ';
				}
				jsonText += toAdd;
			}
			jsonText += ']}';

			var jsonObj = JSON.parse(jsonText);
			return jsonObj.entries;			
		}
		else
		{
			return null;
		}
	}
}