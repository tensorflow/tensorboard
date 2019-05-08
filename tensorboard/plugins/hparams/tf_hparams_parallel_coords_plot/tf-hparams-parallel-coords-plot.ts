namespace tf.hparams.parallel_coords_plot {

/* TODO(erez): Replace with a proper TS wrapper class for Schema. */
type Schema = any;
/* TODO(erez): Replace with a proper TS wrapper class for Options. */
type Options = any;
/* TODO(erez): Replace with a proper TS wrapper class for SVGProperties. */

export class SVGProperties {
  constructor(svg: HTMLElement, numColumns: number) {
    // We use the following algorithm for laying out our SVG:
    // We compute a minimum size for the SVG based on the number columns
    // and some margins. We set the svg "width" and "height" styles
    // to "100%" so that it takes up the full area of its parent, but use
    // "min-width" and "min-height", so that if the parent is too small
    // the svg won't shrink down (it will overflow with scroll bars).
    // If the parent is larger than the minimum size, we use the its
    // preserveAspectRatio attr to scale the contents to fit the larger
    // size.
    this.svg = d3.select(svg);
    const margin = {top: 30, right: 10, bottom: 10, left: 10};
    const COL_WIDTH = 100;
    const COL_HEIGHT = 200;
    const totalWidth =
      numColumns * COL_WIDTH + margin.left + margin.right;
    const totalHeight = COL_HEIGHT + margin.top + margin.bottom;
    this.svg.attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
    this.svg.attr("preserveAspectRatio", "xMidYMid");
    // Set a minimum width so scale factor want be less than 1
    // (but if size of '#container' is larger then we'll scale up
    // our svg).
    this.svg.style("min-width", totalWidth + "px");
    this.svg.style("min-height", totalHeight + "px");
    // 'width' and 'height' store the width of the svg without our margins.
    this.width = totalWidth - margin.left - margin.right;
    this.height = totalHeight - margin.top - margin.bottom;
    this.svgG = this.svg
      .append("g")
      .attr("transform",
            tf.hparams.utils.translateStr(margin.left, margin.top));
  }

  public readonly svg: any;   /* D3 selection of the top level SVG*/
  public readonly svgG: any;  /* D3 selection of the top level <g> element */
  public readonly height: number;
  public readonly width: number;
}

export enum ScaleType {
  Linear = "LINEAR",
  Logarithmic = "LOG",
  Quantile = "QUANTILE",
  NonNumeric = "NON_NUMERIC"
}

interface AxisBrushFilter {
  isPassing(value: any): boolean;
}

class AlwaysPassingBrushFilter implements AxisBrushFilter {
  public isPassing(value: any): boolean {
    return true;
  }
}

class IntervalBrushFilter implements AxisBrushFilter {
  public constructor(lower: number,
                     upper: number,
                     lowerOpen: boolean,
                     upperOpen: boolean) {
    this._lower = lower;
    this._upper = upper;
    this._lowerOpen = lowerOpen;
    this._upperOpen = upperOpen;
  }

  public isPassing(value: any): boolean {
    const numValue = (value as number);
    return this._before(this._lower, numValue, this._lowerOpen) &&
      this._before(numValue, this._upper, this._upperOpen)
  }

  private _before(a: number, b: number, useLessThan: boolean) : boolean {
    return (useLessThan && (a < b)) || (!useLessThan && (a <= b));
  }

  private _lower: number;
  private _upper: number;
  private _lowerOpen: boolean
  private _upperOpen: boolean;
}

class SetBrushFilter implements AxisBrushFilter {
  public constructor(domainSet: any[]) {
    this._domainSet = domainSet;
  }

  public isPassing(value: any): boolean {
    return this._domainSet.indexOf(value) !== -1;
  }

  private _domainSet: any[];
}

class Axis {
  public constructor(svgProps: SVGProperties,
                     schema: Schema,
                     interactionManager: InteractionManager,
                     colIndex: number) {
    this._svgProps = svgProps;
    this._schema = schema;
    this._interactionManager = interactionManager;
    this._colIndex = colIndex;
    this._isDisplayed = false;
    this._yScale = null;
    this._scaleType = null;
    this.setBrushSelection(null);
  }

  public colIndex(): number {
    return this._colIndex;
  }

  public yScale(): any {
    return this._yScale;
  }
  
  public scaleType(): ScaleType | null {
    return this._scaleType;
  }

  public brushSelection(): d3.BrushSelection {
    return this._brushSelection;
  }

  public isDisplayed(): boolean {
    return this._isDisplayed;
  }

  public setBrushSelection(brushSelection: d3.BrushSelection) {
    this._brushSelection = brushSelection;
    this._brushFilter = this._buildBrushFilter(this._brushSelection);
  }
  
  public setDomainAndScale(domainValues: any[], scaleType: ScaleType) {
    this._scaleType = scaleType;
    this._yScale = tf.hparams.parallel_coords_plot.createAxisScale(
      // Pass a copy since createAxisScale may permute the domainValues array.
      domainValues.slice(),
      this._svgProps.height,
      this.scaleType());
    // TODO(erez): Try to modify the brush selection so that it selects
    // the same subset of the axis domain which was selected before
    // this method was called.
    // This can't always be done (e.g. if we switched from a linear to a
    // quantile scale, or if the domain values changed significantly) but in
    // the cases when it is possible, it will be more convenient to the user.
    // Currently, we just remove the brush selection.
    this.setBrushSelection(null);
  }

  public brushFilter(): AxisBrushFilter {
    return this._brushFilter;
  }

  public updateDOM(axisParent: any /* HTML Element */) {
    let d3Axis = d3.axisLeft(this.yScale());
    if (this.scaleType() === ScaleType.Quantile) {
      // The default tickValues of a quantile scale is just the
      // scale domain, which produces overlapping labels if the
      // number of elements in the domain is greater than the
      // number of quantiles (since then the scale maps more than
      // one domain value to the same quantile).
      d3Axis = d3Axis
        .tickValues(this.yScale().quantiles())
        .tickFormat(d3.format("-.6g"));
    }
    const axisParentSel = d3.select(axisParent);
    axisParentSel.selectAll("g").remove();
    axisParentSel.append("g").classed("axis", true).call(d3Axis);
    // Add axis title.
    axisParentSel
      .append("text")
      .classed("axis-title", true)
      .style("cursor", "move")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(colIndex =>
            tf.hparams.utils.schemaColumnName(this._schema, colIndex));

    // Add dragging event handlers.
    axisParentSel.call(
      d3.drag()
        .on("start", () => {
          // We set an attribute on the axis that signals
          // that it is being dragged. This allows
          // integration tests to know when dragging is done.
          axisParent.setAttribute("is-dragging", "");
          this._interactionManager.onDragStart(this.colIndex());
        })
        .on("drag", () => this._interactionManager.onDrag(d3.event.x))
        .on("end", () => {
          this._interactionManager.onDragEnd();
          axisParent.removeAttribute("is-dragging");
        }));

    // Add the brush.
    const d3Brush = d3.brushY()
      .extent([[-8, 0], [8, this._svgProps.height + 1]])
      /* Define the brush event handlers. D3 will call these both when
         the user moves the brush selection and when we change the brush
         selection programmatically using d3Brush.move(). We'd like to 
         avoid calling the interactionManager in the latter case; thus,
         we call _isInteractiveD3Event() to find out if the event was fired 
         due to a programmetic change of the brush selection , and if so, 
         ignore the event. */
      .on("start", () => {
        if (!_isInteractiveD3Event(d3.event)) {
          return;
        }
        // We set the 'is-brushing' attribute on the containing
        // 'axis-parent'-classed <g> element to notify integration tests
        // that the axis is busy brushing.
        axisParent.setAttribute("is-brushing", "");
        this._interactionManager.onBrushChanged(
          this.colIndex(), d3.event.selection);
      })
      .on("brush", () => {
        if (!_isInteractiveD3Event(d3.event)) {
          return;
        }
        this._interactionManager.onBrushChanged(
          this.colIndex(), d3.event.selection);
      })
      .on("end", () => {
        if (!_isInteractiveD3Event(d3.event)) {
          return;
        }
        this._interactionManager.onBrushChanged(
          this.colIndex(), d3.event.selection);
        axisParent.removeAttribute("is-brushing");
      });
    const brushG = d3.select(axisParent as SVGGElement)
      .append("g")
      .classed("brush", true);
    brushG.call(d3Brush);
    // Set the brush selection programmatically.
    // We need to cast brushG to 'any' here, since 
    d3Brush.move(brushG as any, this.brushSelection());
  }

  public setDisplayed(value: boolean) {
    this._isDisplayed = value;
  }

  private _buildBrushFilter(brushSelection: d3.BrushSelection) {
    if (brushSelection === null) {
      return new AlwaysPassingBrushFilter();
    }
    if (this._scaleType === null) {
      console.error("Scale type is null, but brushSelection isn't: ",
                    brushSelection);
      return new AlwaysPassingBrushFilter();
    }
    switch (this._scaleType) {
      case ScaleType.Linear:
      case ScaleType.Logarithmic: { /* Fall Through */
        const [lower, upper] =
          tf.hparams.parallel_coords_plot.continuousScaleInverseImage(
            this.yScale(), brushSelection[0], brushSelection[1]);
        return new IntervalBrushFilter(lower,
                                       upper,
                                       /*lowerOpen=*/ false,
                                       /*upperOpen=*/ false);
      }
      case ScaleType.Quantile: {
        const [lower, upper] =
          tf.hparams.parallel_coords_plot.quantileScaleInverseImage(
            this.yScale(), brushSelection[0], brushSelection[1]);
        return new IntervalBrushFilter(lower,
                                       upper,
                                       /*lowerOpen=*/ false,
                                       /*upperOpen=*/ true);
      }
      case ScaleType.NonNumeric:
        return new SetBrushFilter(
          tf.hparams.parallel_coords_plot.pointScaleInverseImage(
            this.yScale(), brushSelection[0], brushSelection[1]));
    }
    console.error("Unknown scale type: ", this._scaleType);
    return new AlwaysPassingBrushFilter();
  }

  private readonly _svgProps: SVGProperties;
  private readonly _schema: Schema;
  private readonly _interactionManager: InteractionManager;
  private readonly _colIndex: number;
  private _isDisplayed: boolean;
  private _yScale: any;  /* D3 scale */
  private _scaleType: ScaleType | null;
  private _brushSelection: d3.BrushSelection;
  private _brushFilter: AxisBrushFilter;
}

class AxesManager {
  public constructor(
    svgProps: SVGProperties, schema: Schema,
    interactionManager: InteractionManager) {
    this._svgProps = svgProps;
    this._schema = schema;
    this._axes = this._createAxes(interactionManager);
    this._stationaryAxesPositions = d3.scalePoint()
      .range([1, this._svgProps.width - 1])
      .padding(0.5);
    this._draggedAxis = null;
    this._svgProps.svgG.selectAll("g.axis-parent").remove();
    this._parentsSel = this._svgProps.svgG.selectAll(".axis-parent");
  }
  
  public updateAxes(options: Options, sessionGroups: any[]) {
    console.assert(!this.isAxisDragging());

    // Traverse options.columns, and update each corresponding axis.
    const visibleColIndices: Set<number> = new Set<number>();
    options.columns.forEach(c => {
      const colIndex = tf.hparams.utils.getAbsoluteColumnIndex(
        this._schema, c.index);
      let axis = this._axes[colIndex];
      axis.setDisplayed(true);
      const domainValues = sessionGroups.map(
        sg => tf.hparams.utils.columnValueByIndex(this._schema, sg, colIndex));
      axis.setDomainAndScale(domainValues, c.scale);
      visibleColIndices.add(colIndex);
    });

    // Set the visibility of the remaining axes to false.
    this._axes.forEach(axis => {
      if (!visibleColIndices.has(axis.colIndex())) {
        axis.setDisplayed(false);
      }
    });  

    this._updateStationaryAxesPositions(visibleColIndices);
    
    // Update the DOM.
    this._parentsSel = this._parentsSel
      .data(Array.from(visibleColIndices), /*key=*/ (colIndex  => colIndex));
    this._parentsSel.exit().remove();
    this._parentsSel = this._parentsSel.enter()
      .append("g")
      .classed("axis-parent", true)
      .merge(this._parentsSel)
    const _this = this;
    this._parentsSel
      .call(sel => this._updateAxesPositionsInDOM(sel))
      .each(function(colIndex) {
        /* Here 'this' is the 'axis-parent'-classed <g> element,
           and '_this' is the AxesManager element. */
        _this._axes[colIndex].updateDOM(this);
      });
  }

  /** 
   * Executes mapFunction on each visible axis. Returns an array containing the
   * result from each invocation. The function is invoked on the axes ordered
   * by their increasing xPosition. 
   */
  public mapVisibleAxes<T>(mapFunction: (xPosition, axis)=>T): T[] {
    return this._stationaryAxesPositions.domain().map(
      colIndex => mapFunction(this.getAxisPosition(colIndex),
                              this._axes[colIndex]));
  }
  
  /**
   * @returns true if the given predicate returns true on every visible axis,
   *     false otherwise. Note that the predicate will only be evaluated until
   *     the first time it returns false.
   */
  public allVisibleAxesSatisfy(
    predicate: (xPosition, axis)=>boolean): boolean {
    return this._stationaryAxesPositions.domain().every(
      colIndex => predicate(this.getAxisPosition(colIndex),
                            this._axes[colIndex]));
  }

  public getAxisForColIndex(colIndex: number): Axis {
    return this._axes[colIndex];
  }

  public dragStart(colIndex: number) {
    console.assert(!this.isAxisDragging());
    console.assert(this._axes[colIndex].isDisplayed());
    this._draggedAxis = this._axes[colIndex];
    this._draggedAxisPosition = this._stationaryAxesPositions(colIndex);
  }

  public drag(newX: number) {
    newX = Math.min(Math.max(newX, 0), this._svgProps.width);
    this._draggedAxisPosition = newX;
    let visibleColIndices = this._stationaryAxesPositions.domain();
    visibleColIndices.sort(
      (ci1, ci2) => this.getAxisPosition(ci1) - this.getAxisPosition(ci2));
    this._stationaryAxesPositions.domain(visibleColIndices);
    this._updateAxesPositionsInDOM(this._parentsSel);
  }

  public dragEnd(duration: number) {
    console.assert(this.isAxisDragging());
    this._draggedAxisPosition = null;
    this._draggedAxis = null;
    this._updateAxesPositionsInDOM(
      this._parentsSel.transition().duration(duration))
  }

  public isAxisDragging(): boolean {
    return this._draggedAxis !== null;
  }

  public getAxisPosition(colIndex: number) : number {
    return (this._draggedAxis !== null) &&
      (this._draggedAxis.colIndex() === colIndex)
      ? this._draggedAxisPosition
      : this._stationaryAxesPositions(colIndex);
  }

  /** 
   * Sets the domain of 'stationaryAxesPositions' to be the given 
   * visibleColIndices. Preserves the order of the indices in 
   * 'visibleColIndices' that already exist in the domain. Indices in
   * 'visibleColIndices' that don't already exist in the domain will be added
   * to the domain after the existing indices.
   */
  private _updateStationaryAxesPositions(visibleColIndices: Set<number>) {
    // We're going to modify visibleColIndices so make a copy first, since
    // the caller may count on it being unmodified.
    visibleColIndices = new Set<number>(visibleColIndices);    
    let newDomain: number[] = this._stationaryAxesPositions.domain().filter(
      colIndex => visibleColIndices.has(colIndex));
    newDomain.forEach(colIndex => visibleColIndices.delete(colIndex));
    this._stationaryAxesPositions.domain(
      /* TypeScript doesn't allow spreading a Set, so we convert to an 
         Array first. */
      newDomain.concat(...Array.from(visibleColIndices)));
  }
  
  private _updateAxesPositionsInDOM(selectionOrTransition) {
    selectionOrTransition.attr("transform",
                               colIndex =>
                               tf.hparams.utils.translateStr(
                                 this.getAxisPosition(colIndex)));
  }
  
  private _createAxes(interactionManager: InteractionManager): Axis[] {
    return d3.range(tf.hparams.utils.numColumns(this._schema)).map(
      colIndex => new Axis(
        this._svgProps, this._schema, interactionManager, colIndex)
    );
  }

  private _svgProps: SVGProperties;
  private _schema: Schema;
  private _axes: Axis[];
  private _stationaryAxesPositions: any /* D3 point scale */;
  private _draggedAxis: Axis | null;
  private _draggedAxisPosition: number | null;
  private _parentsSel: any;  
}

/** Represents the line 'type'. Either a foreground or a background line.
 * Each session group is drawn as two identical piecewise linear curves (which
 * we call "lines" here) drawn one on top of the other.
 * The background line is gray, and the foreground line drawn on top is 
 * typically colored according to the color-by column. Foreground lines are 
 * only displayed for the lines that satisfy the brush filter of each axis.
 * 
 * Note that we could have used just one line and set its color according to
 * whether it satisfies the brush filters of the axes. However, with this
 * strategy, if the line density is large, gray lines may overlap non
 * gray lines and cause parts of them to be gray as well.
 */
enum LineType {
  Foreground,
  Background,
}

type SessionGroupCallback = (SessionGroup: any) => void;
export class InteractionManager {
  public constructor(svgProps: SVGProperties,
                     schema: Schema,
                     peakedSessionGroupChangedCallback: SessionGroupCallback,
                     selectedSessionChangedCallback: SessionGroupCallback) {
    this._svgProps = svgProps;
    this._schema = schema;
    this._peakedSessionGroupChangedCB = peakedSessionGroupChangedCallback;
    this._selectedSessionGroupChangedCB = selectedSessionChangedCallback;
    this._axesManager = new AxesManager(svgProps, schema,
                                        /*interactionManager=*/ this);
    this._linesManager = new LinesManager(svgProps, schema, this._axesManager);
    this._svgProps.svg
      .on("click", () => this.onClick())
      .on("mousemove mouseenter", () => {
        const [x, y] = d3.mouse(this._svgProps.svgG.node());
        this.onMouseMoved(x, y);
      })
      .on("mouseleave", () => this.onMouseLeave());
  }
 
  public onDragStart(colIndex: number) {
    this._axesManager.dragStart(colIndex);
    this._linesManager.hideBackgroundLines();
  }
  
  public onDrag(newX: number) {
    this._axesManager.drag(newX);
    this._linesManager.recomputeControlPoints(LineType.Foreground);
  }

  public onDragEnd() {
    this._axesManager.dragEnd(/*transitionDuration=*/ 500);
    this._linesManager.recomputeControlPoints(LineType.Foreground,
                                       /* transitionDuration=*/ 500);
    window.setTimeout(() => {
      this._linesManager.recomputeControlPoints(LineType.Background);
      this._linesManager.showBackgroundLines();
    }, 500);
  }

  public onBrushChanged(colIndex: number,
                        newBrushSelection: d3.BrushSelection) {
    this._axesManager.getAxisForColIndex(colIndex).setBrushSelection(
      newBrushSelection);
    this._linesManager.recomputeForegroundLinesVisibility();
  }
  
  public onMouseMoved(newX:number, newY:number) {
    this._linesManager.updatePeakedSessionGroup(
      this._linesManager.findClosestSessionGroup(newX, newY));
    this._peakedSessionGroupChangedCB(
      this._linesManager.peakedSessionGroupHandle().sessionGroup());
  }

  public onMouseLeave() {
    if (!this._linesManager.peakedSessionGroupHandle().isNull()) {
      this._linesManager.clearPeakedSessionGroup()
      this._peakedSessionGroupChangedCB(null);
    }
  }

  public onClick() {
    if (this._linesManager.peakedSessionGroupHandle().sessionGroup() ===
        this._linesManager.selectedSessionGroupHandle().sessionGroup()) {
      /* If the selected session group is the same as the "peaked" one,
         clear the selection. */
      this._linesManager.updateSelectedSessionGroup(new SessionGroupHandle());
    } else {
      this._linesManager.updateSelectedSessionGroup(
        this._linesManager.peakedSessionGroupHandle());
    }
    this._selectedSessionGroupChangedCB(
      this._linesManager.selectedSessionGroupHandle().sessionGroup());
  }

  public onOptionsOrSessionGroupsChanged(newOptions: Options,
                                         newSessionGroups: any[]) {
    this._axesManager.updateAxes(newOptions, newSessionGroups);
    this._linesManager.redraw(
      newSessionGroups,
      newOptions.colorByColumnIndex !== undefined
        ? tf.hparams.utils.getAbsoluteColumnIndex(
          this._schema, newOptions.colorByColumnIndex)
        : null,
      newOptions.minColor,
      newOptions.maxColor);
    // Polymer adds an extra ".tf-hparams-parallel-coords-plot" class to
    // each rule selector in the <style> section in the element definition. When
    // polymer stamps a template it adds this class to every element
    // stamped; since we're injecting our own elements here, we add this
    // class to each element so that the style rules defined in the element will
    // apply.
    this._svgProps.svgG.selectAll("*")
      .classed("tf-hparams-parallel-coords-plot", true);
  }

  private _svgProps: SVGProperties;
  private _schema: Schema;
  private _peakedSessionGroupChangedCB: SessionGroupCallback;
  private _selectedSessionGroupChangedCB: SessionGroupCallback;
  private _axesManager: AxesManager;
  private _linesManager: LinesManager;
};

/**
 * A handle to a representation of a session group in the 'LinesManager' class 
 * below.
 * The handle can also be "null" -- meaning it references no session group (
 * similar to a "null pointer"), in which case the 'sessionGroup()' method 
 * returns null.
 */
class SessionGroupHandle {
  /** 
   * Constructs a session group handle from a D3 selection of the path
   * element representing the sessionGroup. This should only be called by the
   * 'LinesManager' class below. If sessionGroupSel is empty or undefined, a 
   * "null" handle will be constructed.
   */
  public constructor(sessionGroupSel?: any) {
    if (sessionGroupSel === undefined) {
      sessionGroupSel = d3.selectAll(null);
    }
    console.assert(sessionGroupSel.size() <= 1);
    this._sessionGroupSel = sessionGroupSel;
  }

  /** 
   * @returns the sessionGroup object this handle references or null if
   * this is a "null" reference.
   */
  public sessionGroup(): any {
    return this._sessionGroupSel.size() === 1
      ? this._sessionGroupSel.datum()
      : null;
  }

  public isNull(): boolean {
    return this.sessionGroup() === null;
  }

  /** 
   * Should only be called by the 'LinesManager' class below.
   * @returns the d3-selection given on construction.
   */
  public selection(): any {
    return this._sessionGroupSel;
  }

  private _sessionGroupSel: any /* D3 selection */
};
  
/**
 * The collection of foreground and background lines representing the session
 * groups.
 */
class LinesManager {
  public constructor(svgProps: SVGProperties,
                     schema: Schema,
                     axesManager: AxesManager) {
    this._svgProps = svgProps;
    this._schema = schema;
    this._axesManager = axesManager;
    this._sessionGroups = [];
    this._svgProps.svgG.selectAll("g.background").remove();
    this._svgProps.svgG.selectAll("g.foreground").remove();
    this._bgPathsSel = this._svgProps.svgG.append("g")
      .classed("background", true)
      .selectAll("path");
    this._fgPathsSel = this._svgProps.svgG.append("g")
      .classed("foreground", true)
      .selectAll("path");
    this._updateVisibleFgPathsSel();
    this._peakedSessionGroupHandle = new SessionGroupHandle();
    this._selectedSessionGroupHandle = new SessionGroupHandle();
    this._d3line = d3.line().curve(d3.curveLinear);
  }

  /**
   * @returns a SessionGroupHandle referencing the given sessionGroup. If the
   * given sessionGroup is null or undefined returns a "null" handle.
   */
  public getSessionGroupHandle(sessionGroup: any) {
    if (sessionGroup === null || sessionGroup === undefined) {
      return new SessionGroupHandle();
    }
    return new SessionGroupHandle(
      this._fgPathsSel.filter(sg => sg.name === sessionGroup.name));
  }
  
  public hideBackgroundLines() {
    this._bgPathsSel.attr("visibility", "hidden");
  }

  public showBackgroundLines() {
    this._bgPathsSel.attr("visibility", null);
  }

  public peakedSessionGroupHandle(): SessionGroupHandle {
    return this._peakedSessionGroupHandle;
  }

  public selectedSessionGroupHandle(): SessionGroupHandle {
    return this._selectedSessionGroupHandle;
  }

  /**
   * Recomputes the control points of the lines with the given 'type' 
   * (foreground or background) to correspond to the current state of the 
   * axesManager.
   *
   * @param lineType - The type of lines to update.
   * @param transitionDuration - The lines will be transitioned (animated) to 
   *     their new state. This specifies the duration of that transition. 0 
   *     means no animation.
   */
  public recomputeControlPoints(lineType: LineType, transitionDuration = 0) {
    const pathSel = (lineType === LineType.Foreground
                     ? this._fgPathsSel : this._bgPathsSel);
    pathSel
      .transition().duration(transitionDuration)
      .attr("d", sessionGroup => this._pathDAttribute(sessionGroup));
    if (lineType === LineType.Foreground) {
      // Update the control points property, if we're updating the foreground
      // lines.
      window.setTimeout(
        () => {
          const _this = this;
          this._fgPathsSel.each(
            function(sessionGroup) {
              // Here 'this' is the <path> element, and '_this' is the
              // 'LinesManager' instance.
              _this._setControlPointsProperty(this, sessionGroup);
            });
        });
    }
  }

  public recomputeForegroundLinesVisibility() {
    this._fgPathsSel.classed(
      "invisible-path",
      sessionGroup => 
        !this._axesManager.allVisibleAxesSatisfy(
          (xPosition, axis)=>
            axis.brushFilter().isPassing(
              tf.hparams.utils.columnValueByIndex(
                this._schema, sessionGroup, axis.colIndex())))
    );
    this._updateVisibleFgPathsSel()
  }

  public setForegroundLinesColor(
    colorByColumnIndex: number | null,
    minColor: string,
    maxColor: string) {
    const lineColorFunction =
      this._createLineColorFunction(colorByColumnIndex, minColor, maxColor);
    this._fgPathsSel.attr("stroke", lineColorFunction)
  }
  
  public redraw(sessionGroups: any[],
                colorByColumnIndex: number | null,
                minColor: string,
                maxColor: string) {
    const peakedSG = this._peakedSessionGroupHandle.sessionGroup();
    const selectedSG = this._selectedSessionGroupHandle.sessionGroup();
    this._sessionGroups = sessionGroups;
    this._fgPathsSel = this._recomputePathSelection(this._fgPathsSel);
    this._bgPathsSel = this._recomputePathSelection(this._bgPathsSel);
    this._peakedSessionGroupHandle = this.getSessionGroupHandle(peakedSG);
    this._selectedSessionGroupHandle = this.getSessionGroupHandle(selectedSG);
    this.recomputeControlPoints(LineType.Foreground);
    this.recomputeControlPoints(LineType.Background);
    this.recomputeForegroundLinesVisibility();
    this.setForegroundLinesColor(colorByColumnIndex, minColor, maxColor);
  }

  public updatePeakedSessionGroup(newHandle: SessionGroupHandle) {
    this._peakedSessionGroupHandle.selection().classed("peaked-path", false);
    this._peakedSessionGroupHandle = newHandle;
    this._peakedSessionGroupHandle.selection().classed("peaked-path", true);
  }

  public clearPeakedSessionGroup() {
    this.updatePeakedSessionGroup(new SessionGroupHandle());
  }

  public updateSelectedSessionGroup(newHandle: SessionGroupHandle) {
    this._selectedSessionGroupHandle.selection().classed(
      "selected-path", false);
    this._selectedSessionGroupHandle = newHandle;
    this._selectedSessionGroupHandle.selection().classed(
      "selected-path", true);
  }

  public findClosestSessionGroup(x: number, y:number): SessionGroupHandle {
    const axesPositions =
      this._axesManager.mapVisibleAxes<number>((xPosition, axis) => xPosition);
    const closestFgPath = tf.hparams.parallel_coords_plot.findClosestPath(
      this._visibleFgPathsSel.nodes(),
      axesPositions,
      [x, y],
      /* threshold */ 100);
    if (closestFgPath === null) {
      return new SessionGroupHandle();
    }
    return new SessionGroupHandle(d3.select(closestFgPath));
  }
  
  private _createLineColorFunction(
    colorByColumnIndex: number | null,
    minColor: string,
    maxColor: string): (any)=>string {
    if (colorByColumnIndex === null) {
      /* Use a default color if no color-by column is selected. */
      return () => "red";
    }
    const colorScale = d3.scaleLinear</*range=*/ string, /*output=*/ string>()
      .domain(tf.hparams.utils.numericColumnExtent(
        this._schema, this._sessionGroups, colorByColumnIndex))
      .range([minColor, maxColor])
      .interpolate(d3.interpolateLab);
    return sessionGroup => colorScale(tf.hparams.utils.columnValueByIndex(
      this._schema, sessionGroup, colorByColumnIndex));
  }
  
  private _recomputePathSelection(currentPathSel: any /* d3 selection */) {
    currentPathSel = currentPathSel
      .data(this._sessionGroups, /*key=*/ (sessionGroup=>sessionGroup.name));
    currentPathSel.exit().remove();
    return currentPathSel.enter().append("path").merge(currentPathSel);
  }
  
  /** Sets the controlPoints property of 'pathElement' to the control-points
   * array of the given sessionGroup with respect to the current state of
   * the axesManager. 
   */
  private _setControlPointsProperty(pathElement: any, sessionGroup: any) {
    pathElement.controlPoints = this._computeControlPoints(sessionGroup);
  }

  /** @returns an array of 2-tuples--each representing a control point for
   * a line representing the given 'sessionGroup'. The control points are
   * computed with respect to the current state of the axesManager.
   */
  private _computeControlPoints(sessionGroup): [number, number][] {
    return this._axesManager.mapVisibleAxes<[number, number]>(
      (xPosition, axis) => [
        xPosition,
        axis.yScale()(
          tf.hparams.utils.columnValueByIndex(
            this._schema, sessionGroup, axis.colIndex()))
      ]);
  }

  private _pathDAttribute(sessionGroup): string {
    return this._d3line(this._computeControlPoints(sessionGroup));
  }

  private _updateVisibleFgPathsSel() {
    this._visibleFgPathsSel = this._fgPathsSel.filter(":not(.invisible-path)");
  }

  private readonly _svgProps: SVGProperties;
  private readonly _schema: Schema;
  private readonly _d3line: any;  /* D3 line */
  private readonly _axesManager: AxesManager;
  private _sessionGroups: any[];
  private _fgPathsSel: any;  /* D3 selection */
  private _bgPathsSel: any;  /* D3 selection */
  /**
   * Contains the subset of _fgPathsSel which is visible w.r.t the current
   * brush filters.
   */
  private _visibleFgPathsSel: any /* D3 selection */
  private _peakedSessionGroupHandle: SessionGroupHandle;
  private _selectedSessionGroupHandle: SessionGroupHandle;
}

function _isInteractiveD3Event(d3Event: any) {
  return d3.event.sourceEvent !== null;
}
    
}  // namespace tf.hparams.parallel_coords_plot
