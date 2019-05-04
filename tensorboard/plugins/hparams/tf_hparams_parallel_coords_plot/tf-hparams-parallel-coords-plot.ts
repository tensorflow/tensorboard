namespace tf {
namespace hparams {
namespace parallel_coords_plot {

class NonNullBrushSelection {
  public upperY: number;
  public lowerY: number;
}

type BrushSelection = NonNullBrushSelection | null;

enum ScaleType {
  Linear = "LINEAR",
  Logarithmic = "LOG",
  Quantile = "QUANTILE",
  NonNumeric = "NON_NUMERIC"
}

interface AxisBrushFilter {
  public isPassing(value: any): boolean;
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
}

class SetBrushFilter implements AxisBrushFilter {
  public constructor(domainSet: any[]) {
    this._domainSet = domainSet;
  }

  public isPassing(value: any): boolean {
    return this._domainSet.indexOf(value) !== -1;
  }
}

class Axis {
  public constructor(svgProps: SVGProperties,
                     interactionManager: interactionManager,
                     colIndex: colIndex) {
    this._svgProps = svgProps;
    this._interactionManager = interactionManager;
    this._colIndex = colIndex;
    this._isDisplayed = false;
    this._yScale = null;
    this._scaleType = null;
    this._setBrushSelection(null);
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

  public brushSelection(): BrushSelection {
    return this._brushSelection;
  }

  public isDisplayed(): boolean {
    return this._isDisplayed;
  }

  public setBrushSelection(brushSelection: BrushSelection) {
    this._brushSelection = brushSelection;
    this._brushFilter = this._buildBrushFilter(this._brushSelection);
  }
  
  public setDomainAndScale(domainValues: any[], scaleType: ScaleType) {
    this._yScale = tf.hparams.parallel_coords_plot.createAxisScale(
      // Pass a copy since createAxisScale may permute the domainValues array.
      domainValues.slice(),
      svgProps.height,
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
      d3axis = d3axis.tickValues(this.yScale().quantiles())
        .tickFormat(d3.format("-.6g"));
    }
    d3.select(axisParent).removeAll("g");
    d3.select(axisParent).append("g").classed("axis").call(d3Axis);
    d3.select(axisParent).call(
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
      .extent([[-8, 0], [8, this._svgProps.height + 1]]);
      .on("start", () => {
        if (!_isInteractiveEvent(d3.event)) {
          return;
        }
        // We set the 'is-brushing' attribute on the containing
        // 'axis-parent'-classed <g> element to notify integration tests
        // that the axis is busy brushing.
        axisParent.setAttribute("is-brushing", "");
        this._interactionManager.onBrushedChanged(
          this.colIndex,
          new BrushSelection(d3.event.selection));
      })
      .on("brush", () => {
        if (!_isInteractiveEvent(d3.event)) {
          return;
        }
        this._interactionManager.onBrushedChanged(
          this.colIndex,
          new BrushSelection(d3.event.selection));
      })
      .on("end", () => {
        if (!_isInteractiveEvent(d3.event)) {
          return;
        }
        this._interactionManager.onBrushedChanged(
          this.colIndex,
          new BrushSelection(d3.event.selection));
        axisParent.removeAttribute("is-brushing");
      });                                                          
    const brushG = d3.select(axisParent).append("g").classed("brush");
    brushG.call(d3Brush);
    // Set the brush selection programmatically.
    d3Brush.move(brushG, this.brushSelection().asArray());
  }

  public setDisplayed(value: boolean) {
    this._isDisplayed = value;
  }

  private _buildBrushFilter(brushSelection: BrushSelection) {
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
            this.yScale(), brushSelection.lowerY, brushSelection.upperY);
        return new IntervalBrushFilter(lower,
                                       upper,
                                       /*lowerOpen=*/ false,
                                       /*upperOpen=*/ false);
      }
      case ScaleType.Quantile: {
        const [lower, upper] =
          tf.hparams.parallel_coords_plot.quantileScaleInverseImage(
            this.yScale(), brushSelection.lowerY, brushSelection.upperY);
        return new IntervalBrushFilter(lower,
                                       upper,
                                       /*lowerOpen=*/ false,
                                       /*upperOpen=*/ true);
      }
      case ScaleType.NonNumeric:
        return new SetBrushFilter(
          tf.hparams.parallel_coords_plot.pointScaleInverseImage(
            this.yScale(), brushSelection.lowerY, brushSelection.upperY));
    }
    console.error("Unknown scale type: ", this._scaleType);
    return new AlwaysPassingBrushFilter();
  }
  
  private readonly _colIndex: number;
}

class AxesManager {
  public constructor(svgProps: SVGProperties, schema: Schema) {
    this._svgProps = svgProps;
    this._schema = schema;
    this._axes = this._createAxes();
    this._stationaryAxesPositions = d3.scalePoint()
      .range([1, svgProps.width - 1])
      .padding(0.5);
    this._draggedAxis = null;
    this._svgProps.svgG.selectAll("g.axis-parent").remove();
    this._parentSel = this._svgProps.svgG.selectAll(".axis-parent");
  }
  
  public updateAxes(options: Options, sessionGroups: any[]) {
    console.assert(!this.isAxisDragging());

    // Traverse options.columns, and update each corresponding axis.
    const visibleColIndices: Set<number> = new Set<number>();
    options.columns.forEach(c => {
      const colIndex = utils.getAbsoluteColIndex(this._schema, c.index);
      let axis = this._axes[colIndex];
      axis.setDisplayed(true);
      const domainValues = sessionGroups.map(
        sg => utils.columnValueByIndex(this._schema, sg, c.index));
      axis.setDomainAndScale(domainValues, _scaleTypeFromString(c.scaleType));
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
    this._parentSel = this._parentSel
      .data(visibleColIndices, /*key=*/ (colIndex  => colIndex))
      .join("g")
      .classed("axis-parent", true);
    const _this = this;
    this._parentSel
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
  public allVisibleAxesSatisfy(predicate: (xPosition, axis)=>boolean): boolean {
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
      (ci1, ci2) => this._getAxisPosition(ci1) - this._getAxisPosition(ci2));
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

  /** 
   * Sets the domain of 'stationaryAxesPositions' to be the given 
   * visibleColIndices. Preserves the order of the indices in 
   * 'visibleColIndices' that already exist in the domain. Indices in
   * 'visibleColIndices' that don't already exist in the domain will be added
   * to the domain after the existing indices.
   */
  private _updateStationaryAxesPositions(visibleColIndices: Set<number>) {
    let newDomain: number[] = this._stationaryAxesPositions.domain().filter(
      colIndex => visibleColIndices.has(colIndex));
    newDomain.forEach(colIndex => visibleColIndices.remove(colIndex));
    this._stationaryAxesPositions.domain(
      newDomain.concat(...visibleColIndices));
  }
  
  private _updateAxesPositionsInDOM(selectionOrTransition) {
    selectionOrTransition.attr("transform",
                               colIndex => this._getAxisPosition(colIndex));
  }
  
  private _getAxisPosition(colIndex: number) : number {
    return this._draggedAxis.colIndex() === colIndex
      ? this._draggedAxisPosition
      : this._stationaryAxesPositions(colIndex);
  }

  private _createAxes(interactionManager: InteractionManager): Axis[] {
    return d3.range(this._schema.numColumns()).map(
      colIndex => new Axis(this._svgProps, interactionManager, colIndex)
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
  
export class InteractionManager {
  public constructor(
    /* TODO(erez): Remove the parCoordsElement argument and replace
       with the two callbacks: {selected, peaked}SessionGroupChanged. */
    parCoordsElement: any /* HTMLElement */,
                     svgProps: SVGProperties,
                     schema: Schema) {
    this._parCoordsElement = parCoordsElement;
    this._svgProps = svgProps;
    this._schema = schema;
    this._axesManager = new AxesManager(svgProps, schema,
                                        /*interactionManager=*/ this);
    this._linesManager = new LinesManager(svgProps, schema, this._axesManager);
  }
 
  public onDragStart(colIndex: number) {
    this._axesManager.dragStart(colIndex);
    this._lines.hideBackgroundLines();
  }
  
  public onDrag(newX: number) {
    this._axesManager.drag(newX);
    this._lines.recomputeControlPoints(LineType.Foreground);
  }

  public onDragEnd() {
    this._axesManager.dragEnd(/*transitionDuration=*/ 500);
    this._lines.recomputeControlPoints(LineType.Foreground,
                                       /* transitionDuration=*/ 500);
    window.setTimeout(() => {
      this._lines.recomputeControlPoints(LineType.Background);
      this._lines.showBackground();
    }, 500);
  }

  public onBrushChanged(colIndex: number, brushSelection: newBrushSelection) {
    this._axesManager.getAxisForColIndex(colIndex).updateBrushSelection(
      colIndex, newBrushSelection);
    this._lines.recomputeForegroundLinesVisibility();
  }
  
  public mouseMoved(newX:number, newY:number) {
    this._lines.updatePeakedSessionGroup(
      this._lines.findClosestSessionGroup(newX, newY));
    this._parCoordsElement.closestSessionGroupChanged(
      this._lines.peakedSessionGroupHandle().sessionGroup());
  }

  public onClick() {
    if (this._lines.peakedSessionGroupHandle().sessionGroup() ===
        this._lines.selectedSessionGroupHandle().sessionGroup()) {
      /* If the selected session group is the same as the "peaked" one,
         clear the selection. */
      this._lines.updateSelectedSessionGroup(new SessionGroupHandle());
    } else {
      this._lines.updateSelectedSessionGroup(
        this._lines.peakedSessionGroupHandle());
    }
    this._element.selectedSessionGroupChanged(
      this._lines.selectedSessionGroupHandle().sessionGroup());
  }

  public onOptionsOrSessionGroupsChanged(newOptions: object,
                                         newSessionGroups: any[]) {
    this._axesManager.updateAxes(newOptions, newSessionGroups);
    this._lines.redraw(
      this._sessionGroups,
      utils.getAbsoluteColIndex(
        this._schema, newOptions.colorByColIndex),
      newOptions.minColor,
      newOptions.maxColor);
  }
};

/**
 * A handle to a representation of a session group in the 'LinesManager' class 
 * below.
 * The only public interface of this class is the 'sessionGroup' method which
 * returns the corresponding sessionGroup object referenced by the handle.
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
  SessionGroupHandle(sessionGroupSel?: any) {
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
    return this._sessionGroupSel.size() == 1 ? _sessionGroupSel.datum() : null;
  }

  /** 
   * Should only be called by the 'LinesManager' class below.
   * @returns the d3-selection given on construction.
   */
  public selection(): any {
    return this._sessionGroupSel;
  }
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
    this._bgPathSel = this._svgProps.svgG.append("g")
      .classed("background", true)
      .selectAll("path");
    this._fgPathSel = this._svgProps.svgG.append("g")
      .classed("foreground", true)
      .selectAll("path");
    this._peakedSessionGroup = new SessionGroupHandle();
    this._selectedSessionGroup = new SessionGroupHandle();
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
      this._fgPathSel.filter(sg => sg.name === sessionGroup.name));
  }
  
  public hideBackgroundLines() {
    this._backgroundHidden = true;
    this._bgPathSel.attr("visibility", "hidden");
  }

  public showBackgroundLines() {
    this._backgroundHidden = false;
    this._bgPathSel.attr("visibility", null);
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
    pathSel = lineType == LineType.Foreground ? fgPathSel : bgPathSel;
    pathSel
      .transition().duration(transitionDuration)
      .attr("d", sessionGroup => this._pathDAttribute(sessionGroup))
    if (lineType === LineType.Foreground) {
      // Update the control points property, if we're updating the foreground
      // lines.
      window.setTimeout(
        () => {
          const _this = this;
          this._fgPathSel.each(
            function(sessionGroup) {
              // Here 'this' is the <path> element, and '_this' is the
              // 'LinesManager' instance.
              _this._setControlPointsProperty(this, sessionGroup);
            });
        });
    }
  }

  public recomputeForegroundLinesVisibility() {
    this._fgPathSel.classed(
      "invisible-path",
      sessionGroup => {
        this._axesManager.allVisibleAxesSatisfy(
          (xPosition, axis)=>
            axis.brushFilter().isPassing(
              utils.columnValueByAbsoluteIndex(
                this._schema, sessionGroup, axis.colIndex())))
      });
    this._visibleFgPathsSel = this.fgPathSel.filter(":not(.invisible-path)");
  }

  public setForegroundLinesColor(
    colorByColIndex: number | null,
    minColor: string,
    maxColor: string) {
    const lineColorFunction =
      this._createLineColorFunction(colorByColIndex, minColor, maxColor);
    this._fgPathSel.attr("stroke", lineColorFunction)
  }
  
  public redraw(sessionGroups: any[],
                colorBycolIndex: number | null,
                minColor: string,
                maxColor: string) {
    const peakedSG = this._peakedSessionGroupHandle.sessionGroup();
    const selectedSG = this._selectedSessionGroupHandle.sessionGroup();
    this._sessionGroups = sessionGroups;
    this._fgPathSel = this._recomputePathSelection(this._fgPathSel);
    this._bgPathSel = this._recomputePathSelection(this._bgPathSel);
    this._peakedSessionGroupHandle = this.getSessionGroupHandle(peakedSG);
    this._selectedSessionGroupHandle = this.getSessionGroupHandle(selectedSG);
    this.recomputeControlPoints(LineType.Foreground);
    this.recomputeControlPoints(LineType.Background);
    this.recomputeForegroundLinesVisibility();
    this.setForegroundLinesColor(colorByColIndex, minColor, maxColor);
  }

  public updatePeakedSessionGroup(newHandle: SessionGroupHandle) {
    this._peakedSessionGroupHandle.selection().classed("peaked-path", false);
    this._peakedSessionGroupHandle = newHandle;
    this._peakedSessionGroupHandle.selection().classed("peaked-path", true);
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
    colorByColIndex: number | null,
    minColor: string,
    maxColor: string): (any)=>string {
    if (colorByColIndex === null) {
      /* Use a default color if no color-by column is selected. */
      return () => "red";
    }
    return d3.scaleLinear()
      .domain(utils.numericColumnExtentAbsoluteColIndex(
        this.schema, this._sessionGroups, colorByColIndex))
      .range([minColor, maxColor])
      .interpolate(d3.interpolateLab);
  }
  
  private _recomputePathSelection(currentPathSel: any /* d3 selection */) {
    return currentPathSel
      .data(sessionGroups, /*key=*/ (sessionGroup=>sessionGroup.name))
      .join("path");
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
  private _computeControlPoints(sessionGroup) {
    return this._axesManager.mapVisibleAxes<[number, number]>(
      (xPosition, axis) => [xPosition,
                            axis.yScale()(
                              utils.columnValueByAbsoluteIndex(
                                this._schema, sessionGroup, axis.colIndex()))]);
  }

  private _pathDAttribute(sessionGroup) {
    this._d3line(this._computeControlPoints(sessionGroup));
  }

  private _svgProps: SVGProperties;
  private _schema: Schema;
  private _axesManager: AxesManager;
  private _sessionGroups: any[];
  private _fgPathSel: any /* D3 selection */
  private _bgPathSel: any /* D3 selection */
  private _peakedSessionGroupHandle: SessionGroupHandle;
  private _selectedSessionGroup: SessionGroupHandle;
}

}  // namespace parallel_coords_plot
}  // namespace hparams
}  // namespace tf
