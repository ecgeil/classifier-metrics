var dataView = function() {
  'use strict';

  var svg = d3.select("#data-view")
  var w = parseInt(svg.style("width"));
  var h = parseInt(svg.style("height"));
  var padding = {top:20, bottom:40, left:80, right:80}
  var ntot = 100;
  var fpos = 0.5
  var npos = Math.min(ntot - 1, Math.max(1,Math.round(fpos * ntot)))
  var nneg = ntot - npos
  var spread = 0.5
  var xp = [];
  var yp = [];
  var ypred = [];
  var dataChangeObserver = null;
  var metrics;
  var confusion;
  var rdn = [];
  var yoff = [];
  var thresh = 0.5;
  var dragging = false
  var quadrantLabelPad = 10;

  var generateData = function() {
    yp = [];
    xp = [];
    rdn = [];
    yoff = [];
    npos = Math.min(ntot - 1, Math.max(1,Math.round(fpos * ntot)))
    nneg = ntot - npos
    var i;
    for (i = 0; i < npos; i++) { yp.push(1); }
    for (i = 0; i < nneg; i++) { yp.push(0); }
    var sgn;
    for (i = 0; i < ntot; i++) {
      sgn = 2*(yp[i] - 0.5)
      rdn.push(Math.random());
      yoff.push(Math.random());
      xp.push(1 - yp[i] + sgn*spread*rdn[i]);
    }
    redraw()
  }

  var redraw = function() {
    updateMetrics();
    svg.selectAll("*").remove()
    svg.selectAll("#threshold-line").remove()
    var circle = svg.selectAll("circle")
      .data(d3.zip(xp, yp, yoff));
    var circleEnter = circle.enter().append("circle");
    circleEnter.attr("cx", function(d, i) { return xscale(d[0]) })
      .attr("cy", function(d, i) { return yscale(0.9*d[1] + (d[2])*0.05) - 10 })
      .attr("r", function(d) { return 4; })
      .attr("fill", function(d, i) { return pointColor(ypred[i])} )
      .attr("opacity", 0.7);

    var thresholdLine = d3.svg.line()
      .x(function(d) { return xscale(d.x); })
      .y(function(d) { return yscale(d.y); })

    var thresholdLinePts = [ {x:thresh, y:0.0},
                             {x:thresh, y:1.5}]
    svg.append("svg:path").attr("d", thresholdLine(thresholdLinePts))
        .style("stroke-width", 2)
        .style("stroke", "gray")
        .attr("id", "threshold-line")

    svg.append("svg:path").attr("d", thresholdLine([{x:0, y:0.5}, {x:1, y:0.5}]))
        .style("stroke-width", 2)
        .style("stroke", "gray")
        .attr("id", "threshold-line")

    svg.append("text")
      .attr("x", xscale(thresh) + quadrantLabelPad)
      .attr("y", yscale(0.5) + quadrantLabelPad)
      .attr("alignment-baseline", "hanging")
      .text("TN = " + metrics.tn);

    svg.append("text")
      .attr("x", xscale(thresh) - quadrantLabelPad)
      .attr("y", yscale(0.5) - quadrantLabelPad)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "auto")
      .text("TP = " + metrics.tp);

    svg.append("text")
      .attr("x", xscale(thresh) + quadrantLabelPad)
      .attr("y", yscale(0.5) - quadrantLabelPad)
      .attr("alignment-baseline", "auto")
      .text("FN = " + metrics.fn);

    svg.append("text")
      .attr("x", xscale(thresh) - quadrantLabelPad)
      .attr("y", yscale(0.5) + quadrantLabelPad)
      .attr("text-anchor", "end")
      .attr("alignment-baseline", "hanging")
      .text("FP = " + metrics.fp);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (h - padding.bottom) + ")")
        .call(xaxis);

    if (dataChangeObserver != null) {
      dataChangeObserver();
    }
  }

  var pointColor = function(y) {
    if (y) {
      return "#FF8C19";
    } else {
      return "#0089B2"
    }
  }

  var updateMetrics = function() {
    ypred = [];
    confusion = [[0,0],[0,0]]
    var i;
    for (i = 0; i < ntot; i++) {
      ypred.push(1 * (xp[i] <= thresh));
      confusion[1-yp[i]][1 - ypred[i]] += 1
    }
    metrics = {
      tp : confusion[0][0],
      tn : confusion[1][1],
      fp : confusion[1][0],
      fn : confusion[0][1]
    }
    metrics.tot = ntot;
    metrics.p = npos;
    metrics.n = nneg;
    metrics.tpr = metrics.tp / metrics.p;
    metrics.fpr = metrics.fp / metrics.n;
  }

  var setPositiveFraction = function(posFraction) {
    fpos = posFraction;
    generateData();
  }

  var setSpread = function(spreadVal) {
    spread = spreadVal;
    var sgn;
    for (var i = 0; i < ntot; i++) {
      sgn = 2*(yp[i] - 0.5)
      xp[i] = (1 - yp[i] + sgn*spread*rdn[i]);
    }
    redraw();
  }

  var setThresh = function(newThresh) {
    thresh = Math.max(0, Math.min(1, newThresh));
    redraw();
  }

  var setDataChangeObserver = function(observer) {
    dataChangeObserver = observer;
  }

  var getData = function() {
    return d3.zip(xp, yp)
  }

  var getThresh = function() {
    return thresh;
  }

  var xscale = d3.scale.linear().domain([0,1]).range([padding.left, w - padding.right])
  var yscale = d3.scale.linear().domain([0,1]).range([h - padding.bottom, padding.top])
  var xaxis = d3.svg.axis().scale(xscale).orient("bottom")
  var cmap = d3.scale.category10()

  svg.on("mousedown", function() {
    setThresh(xscale.invert(d3.mouse(this)[0]))
    dragging = true;
    d3.event.preventDefault(); 
  })

  svg.on("mouseup", function() { dragging = false; } )

  svg.on("mousemove", function() {
    if (dragging) {
      setThresh(xscale.invert(d3.mouse(this)[0]))
    }
    d3.event.preventDefault();
  })

  generateData();
  return {
    svg:svg,
    getData:getData,
    getThresh:getThresh,
    setPositiveFraction:setPositiveFraction,
    setSpread:setSpread,
    confusion:confusion,
    metrics:metrics,
    ypred:ypred,
    xscale:xscale,
    yscale:yscale,
    setDataChangeObserver:setDataChangeObserver
  }
}()

var metricView = function(dataView) {
  'use strict';

  var metric = "tpr"
  var svg = d3.select("#metric-view");
  var w = parseInt(svg.style("width"));
  var h = parseInt(svg.style("height"));
  var padding = {top:20, bottom:40, left:80, right:80}
  var xscale = d3.scale.linear().domain([0,1]).range([padding.left, w - padding.right])
  var yscale = d3.scale.linear().domain([0,1]).range([h - padding.bottom, padding.top])
  var tpr = [];
  var fpr = [];
  var precision = [];
  var recall = [];
  var accuracy = [];
  var fpthresh = 0;
  var tpthresh = 0;
  var thresh = 0;
  var xp = [];

  var line = d3.svg.line()
      .x(function(d) {return xscale(d[0])})
      .y(function(d) {return yscale(d[1])})

  var area = d3.svg.area()
    .x(function(d) { return xscale(d[0]); })
    .y0(h - padding.bottom)
    .y1(function(d) { return yscale(d[1]); });

  var updateMetrics = function() {
    var data = dataView.getData().map(function(pt) {return {x:pt[0], y:pt[1]}});
    thresh = dataView.getThresh();
    if (data.length == 0) { return; }
    data.sort(function(a, b) { return d3.ascending(a.x, b.x) })

    var ntot = data.length;
    var npos = d3.sum(data.map(function(d) {return d.y;}))
    var nneg = ntot - npos;

    tpr = []
    fpr = []
    recall = []
    precision = []
    accuracy = []
    xp = []
    var fpi = 0;
    var tpi = 0;
    var tni = 0;
    var fni = 0;
    var xprev = -1e6;
    var i;
    fpthresh = -1;
    tpthresh = -1;
    for (i = 0; i < data.length; i++) {
      tni = nneg - fpi;
      fni = npos - tpi;
      if (data[i].x != xprev) {
        xp.push(data[i].x)
        fpr.push(fpi/nneg);
        tpr.push(tpi/npos);
        recall.push(tpi/(tpi + fni))
        var curPrecision = tpi/(tpi + fpi)
        if (tpi + fpi > 0) {
          precision.push(tpi/(tpi + fpi))
        } else {
          precision.push(1)
        }
        accuracy.push((tpi + tni)/ntot)
        xprev = data[i].x;
        if (fpthresh < 0 && data[i].x > thresh) {
          fpthresh = fpi/nneg;
          tpthresh = tpi/npos;
        }
      }
      if (data[i].y == 1) {
        tpi += 1;
      } else {
        fpi+= 1;
      }
    }
    fpr.push(fpi/nneg);
    tpr.push(tpi/npos);

    metricPlots[metric]()
  }

  var plotRoc = function() {
    drawPlot(fpr, tpr, fpthresh, tpthresh, "FPR", "TPR", true)
  }

  var plotTpr = function() {
    drawPlot(xp, tpr, thresh, tpthresh, "Threshold", "TPR")
  }

  var plotFpr = function() {
    drawPlot(xp, fpr, thresh, fpthresh, "Threshold", "FPR")
  }

  var plotAccuracy = function() {
    var i = Math.min(d3.bisectLeft(xp, thresh), xp.length - 1)
    var xpAug = d3.merge([[0], xp])
    var accuracyAug = d3.merge([[accuracy[0]], accuracy])
    drawPlot(xpAug, accuracyAug, xp[i], accuracy[i], "Threshold", "Accuracy")
  }

  var plotPrecision = function() {
    var i = Math.min(d3.bisectLeft(xp, thresh), xp.length - 1)
    var xpAug = d3.merge([[0], xp])
    var precisionAug = d3.merge([[1], precision])
    drawPlot(xpAug, precisionAug, xp[i], precision[i], "Threshold", "Precision")
  }

  var plotRecall = function() {
    var i = Math.min(d3.bisectLeft(xp, thresh), xp.length - 1)
    drawPlot(xp, recall, xp[i], recall[i], "Threshold", "Recall")
  }

  var plotPrecisionRecall = function() {
    var i = Math.min(d3.bisectLeft(xp, thresh), xp.length - 1)
    var precisionAug = d3.merge([[1], precision])
    var recallAug = d3.merge([[0], recall])
    drawPlot(recallAug, precisionAug, recall[i], precision[i], "Recall", "Precision")
  }

  var drawPlot = function(xline, yline, xdot, ydot, xlabel, ylabel, drawArea) {
    var plotData = d3.zip(xline, yline)
    
    svg.selectAll("*").remove()

    if (drawArea) {
      svg.append("path")
          .datum(plotData)
          .attr("class", "area")
          .attr("d", area);
    }

    svg.append("path")
        .datum(plotData)
        .attr("class", "line")
        .attr("d", line)

    var circle = svg.selectAll("circle")
      .data(d3.zip([xdot], [ydot]));
    var circleEnter = circle.enter().append("circle");
    circleEnter.attr("cx", function(d, i) { return xscale(d[0]) })
      .attr("cy", function(d, i) { return yscale(d[1]) })
      .attr("r", function(d) { return 6; })
      .attr("fill", function(d, i) { return 'red'} )
      .attr("opacity", 0.7);

    var xaxis = d3.svg.axis().scale(xscale).orient("bottom")
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (h - padding.bottom) + ")")
        .call(xaxis);

    svg.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "end")
      .attr("x", w/2)
      .attr("y", h )
      .text(xlabel);

    var yaxis = d3.svg.axis().scale(yscale).orient("left")
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + (padding.left)  + ",0)")
        .call(yaxis);

    svg.append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "end")
      .attr("x", 0)
      .attr("y", 0)
      .attr("transform", "translate(" + (padding.left - 45) + "," + (h - padding.bottom)/2 + ") rotate(-90)")
      .text(ylabel);
  }

  var setMetric = function(newMetric) {
    metric = newMetric;
    updateMetrics();
  }

  var metricPlots = {
    'tpr':plotTpr,
    'fpr':plotFpr,
    'roc':plotRoc,
    'accuracy':plotAccuracy,
    'precision':plotPrecision,
    'recall':plotRecall,
    'precision-recall':plotPrecisionRecall
  }

  updateMetrics();

  return {
    updateMetrics:updateMetrics,
    setMetric:setMetric
  }

}(dataView)


dataView.setDataChangeObserver(metricView.updateMetrics);

var posFracSlider = document.getElementById("posfrac")
posFracSlider.onchange = function() {
  dataView.setPositiveFraction(this.value)
}

var spreadSlider = document.getElementById("spread")
spreadSlider.oninput = function() {
  dataView.setSpread(this.value)
}
dataView.setSpread(spreadSlider.value)

var metricMenu = document.getElementById("metric-menu")
metricMenu.onchange = function () {
  metricView.setMetric(this.value)
}
metricView.setMetric(metricMenu.value)

