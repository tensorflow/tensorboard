/*
@license
Copyright 2019 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * A D3-based implementation of a parallel-coordinates plot of the sessions
 * groups.
 *  
 * This tf-hparams-parallel-coords-plot element displays a collection of 
 * parallel vertical axes uniformally spaced with each axis corresponding to a
 * column--either an hyperparameter or a metric. Additionally each session 
 * group is represented by a polyline whose vertices are points on the axes; 
 * the vertex on the axis corresponding to a given column is the point on that 
 * axis representing the column-value of the session group.
 *  
 * Since the relations shown by the plot depends on the ordering of
 * the axes, the element allows re-ordering of the axes by dragging the axes
 * titles. For columns with a numeric domain (e.g. metrics), it allows
 * setting the scale of an axis to be 'linear', 'logarithmic' or 'quantile'.
 * The element also colors each line based on a given 'color-by' column value
 * of the represented session group. The 'color-by' column can be selected
 * to be any column with numeric domain.
 * 
 * Finally, the user can filter the displayed session groups by "brushing"
 * axes. By clicking and dragging the mouse pointer vertically along an axis
 * the user can select part of the axes represented by a semi-transparent
 * overlay on the axis. We call that rectangle the brush-selection for the
 * axis. The user can cancel the brush-selection by clicking on the axis
 * outside the selection. Brush selections "filter" the polylines that are
 * displayed as follows. At any given time--for the axes that have a brush
 * selection--only the polylines that have each of these axes' vertices be
 * inside the axis' brush-selection are displayed colored; the rest
 * of the polylines are grayed-out.
 * 
 * The implementation is based on the following cooperating classes:
 * + Axis. Represents a single axis.
 * + AxisManager. Represents the collection of axes. Responsible for handling 
 *   axis drag and re-ordering behavior.
 * + LinesManager. Manages the collection of lines representing the session
 *   groups.
 * + InteractionManager. Manages the interaction of entire plot with the user. 
 *   Contains event handlers that respond to events in the DOM (such as an Axis
 *   being dragged) and calls appropriate methods in the other classes to update
 *   their state and redraw the necessary parts of the plot in response.
 * See the individual class comments below for more details.
 */
namespace tf.hparams.parallel_coords_plot {

/** Stores some global properties such as width and height of the SVG element 
 * used for rendering the parallel coordinates plot. Also contains the top-level
 * DOM <g> element underwhich the plot will be rendered.
 */
export class SVGProperties {
  /**
   * Computes the width and height of the SVG element based on the number of
   * columns in the schema. Adds some margins and adds a top-level <g> element
   * underwhich the plot should be rendered.
   */
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

/**
 * Denotes the callback function type that InteractionManager uses to
 * notify a consumer that either the peaked or selected session group has
 * changed. The peaked session group is the session group represented by the
 * line closest to the mouse pointer, and the selected session group is the
 * last session group line that was clicked.
 */
type SessionGroupCallback = (SessionGroup: any) => void;

/**
 * Orchastrates the behavior of the parallel coordinates plot. This is the
 * class that consumers of this module should use.
 * Usage example:
 *    manager = new InteractionManager(svgProps, schema, peakedSessionChangedCB,
 *                                     selectedSessionChangedCB);
 *    ...
 *    // Notify manager of new options or session groups: 
 *    manager.onOptionsOrSessionGroupsChanged(newOptions, newSessionGroups)
 *    ...
 *    // This will be called when peaked session changed:
 *    function peakedSessionChangedCB(newSessionGroup) {
 *      // Do something with the newSessionGroup.
 *    }
 */
export class InteractionManager {
  public constructor(svgProps: SVGProperties,
                     schema: any,
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

  public onOptionsOrSessionGroupsChanged(newOptions: any,
                                         newSessionGroups: any[]) {
    this._axesManager.updateAxes(newOptions, newSessionGroups);
    const oldPeakedSessionGroupHandle =
      this._linesManager.peakedSessionGroupHandle();
    const oldSelectedSessionGroupHandle =
      this._linesManager.selectedSessionGroupHandle();  
    this._linesManager.redraw(
      newSessionGroups,
      newOptions.colorByColumnIndex !== undefined
        ? tf.hparams.utils.getAbsoluteColumnIndex(
          this._schema, newOptions.colorByColumnIndex)
        : null,
      newOptions.minColor,
      newOptions.maxColor);
    // A redraw may change the selected / peaked session group. So call the
    // apropriate callbacks if needed.
    if (!oldPeakedSessionGroupHandle.equalsTo(
      this._linesManager.peakedSessionGroupHandle())) {
      this._peakedSessionGroupChangedCB(
        this._linesManager.peakedSessionGroupHandle().sessionGroup());
    }
    if (!oldSelectedSessionGroupHandle.equalsTo(
      this._linesManager.selectedSessionGroupHandle())) {
      this._selectedSessionGroupChangedCB(
        this._linesManager.selectedSessionGroupHandle().sessionGroup());
    }
    
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
  private _schema: any;
  private _peakedSessionGroupChangedCB: SessionGroupCallback;
  private _selectedSessionGroupChangedCB: SessionGroupCallback;
  private _axesManager: AxesManager;
  private _linesManager: LinesManager;
};
  
/**
 * The scale types a column can have. These correspond to the values of 
 * options.columns[].scale. See the comments in
 * tf-hparam-scale-and-color-controls.html for more details on the various
 * scale types.
 */
export enum ScaleType {
  Linear = "LINEAR",
  Logarithmic = "LOG",
  Quantile = "QUANTILE",
  NonNumeric = "NON_NUMERIC"
}

/** 
 * An AxisBrushFilter is essentially a function indicating whether a given
 * value in the domain of the axis is inside the current axis brush selection.
 */
interface AxisBrushFilter {
  /** The function represented by the filter. Should return true if 
   * 'value' is in the current brush selection for the axis. 
   */
  isPassing(value: any): boolean;
}

/** 
 * An AlwaysPassingBrushFilter returns 'true' for any value. It is used
 * to represent the case when an Axis does not have an active brush selection.
 */
class AlwaysPassingBrushFilter implements AxisBrushFilter {
  public isPassing(value: any): boolean {
    return true;
  }
}

/** 
 * An IntervalBrushFilter returns 'true' if the given (numeric) value lies
 * in a given interval specified on construction . It's used to represent
 * brush filters for Axis with linear, logarithmic or quantile scales.
 */
class IntervalBrushFilter implements AxisBrushFilter {
  /** Constructs the filter. The interval used is defined by lower, and upper.
   * If lowerOpen (resp. upperOpen) is true, the interval will be open in 
   * its lower (resp. upper) end, otherwise it will be closed.
   */
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

/**
 * A SetBrushFilter returns 'true' if the value is in a given set specified
 * in construction.
 */
class SetBrushFilter implements AxisBrushFilter {
  public constructor(domainSet: any[]) {
    this._domainSet = domainSet;
  }

  public isPassing(value: any): boolean {
    return this._domainSet.indexOf(value) !== -1;
  }

  private _domainSet: any[];
}

/**
 * Represents a single Axis. An axis does not know its horizontal location in
 * the SVG; instead the axes locations are managed by the AxesManager class.
 * An axis represents a single column (metric or haparam).It stores a scale type
 * and a D3 scale that maps values in the axis domain (column values) 
 * to y-coordinates in the SVG. Additionally, an axis stores a 
 * D3-brush-selection which is a 2-element numeric array of the form 
 * [lower, upper] containing the upper and lower y-coordinates of the current
 * brush selection. If no brush selection exists, the brush selection stored is
 * null.
 * Finally, an axis can be visible (displayed) or invisible (which will be 
 * set based on the user's settings for the corresponding column). An invisible
 * axis need not have its scale or scale-type populated. 
 */
class Axis {
  /**
   * Constructs an axis representing the column indexed by 'colIndex' with 
   * respect to 'schema'. Needs an InteractionManager instance so that it can
   * call its event handlers upon receiving events from the DOM.
   */
  public constructor(svgProps: SVGProperties,
                     schema: any,
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

  /** 
   * Sets the domain and scale type for the axis. The current brush selection
   * is preserved. 
   */
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
    // Currently, we keep the same brush selection and recalculate the filter.
    // Note that this function will be called every time data is reloaded
    // (e.g. every 30 seconds by default in Tensorboard), so we have to make
    // sure not to change the selection if the data hasn't changed, as that
    // would be very annoying to the end user.
    this._brushFilter = this._buildBrushFilter(this._brushSelection);
  }

  public brushFilter(): AxisBrushFilter {
    return this._brushFilter;
  }

  /**
   * Renders the axis as child elements of 'axisParent'. Removes any preexisting
   * children of axisParent. 'axisParent' is expected to be a <g> element.
   */
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
    axisParentSel.append("g").classed("axis", true)
      .call(d3Axis)
       // Add axis title.
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
    // We need to cast brushG to 'any' here since TypeScript doesn't realize
    // the brushG is a <g> selection and complains.
    d3Brush.move(brushG as any, this.brushSelection());
  }

  public setDisplayed(value: boolean) {
    this._isDisplayed = value;
  }

  /**
   * @returns the brush filter for the given selection using the current
   * scale.
   */
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
  private readonly _schema: any;
  private readonly _interactionManager: InteractionManager;
  private readonly _colIndex: number;
  private _isDisplayed: boolean;
  private _yScale: any;  /* D3 scale */
  private _scaleType: ScaleType | null;
  private _brushSelection: d3.BrushSelection;
  private _brushFilter: AxisBrushFilter;
}

/**
 * Manages the collection of axes shown in the plot. Has methods that handle
 * dragging an axis and contains the logic for re-ordering the axes 
 * during dragging. 
 */
class AxesManager {
  public constructor(svgProps: SVGProperties, schema: any,
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

  /**
   * Updates all axes based on the given 'options' (see the comments in 
   * tf-hparams-scale-and-color-controls.html) and sessionGroups. SessionGroups
   * are used to update the domain (and thus scale) of the axes. The 'options'
   * object control which axes are visible.
   */
  public updateAxes(options: any, sessionGroups: any[]) {
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

  /* Axis dragging.
   * To drag an axis, call: dragStart(), followed by one or more drag() calls
   * followed by a single call to dragEnd(). 
   * At most one axis can be dragged at any given time.
   * Each axis (whether dragged or not) has an associated "stationary" 
   * position which is its (x-coordinate) position when it is not being dragged.
   * The actual position of an axis is either its associated stationary 
   * position if its not dragged or its currently dragged position. This class
   * maintains the invariant that the axes' stationary positions match the order
   * of their actual position by re-assigning stationary positions to axes when
   * dragging an axis causes it to "pass" another axes.
   */
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
   * Reassigns stationary positions to axes so that the only visible 
   * axes are the ones with column indices in 'visibleColIndices'.
   * Sets the domain of 'stationaryAxesPositions' to be the given 
   * visibleColIndices, by removing indices in the domain that are not
   * in visibleColIndices and appending indices in visibleColIndices that are
   * not currently in the domain. 
   * Indices in visibleColIndices that are already in stationaryAxesPositions
   * will maintain their order in stationaryAxesPositions and will precede
   * the new elements.
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
  private _schema: any;
  private _axes: Axis[];
  /** 
   * The current assignment of stationary positions to axes. 
   * The axis representing column i has an associated stationary position
   * _stationaryAxesPositions(i).
   */
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

/**
 * A handle to a representation of a session group in the 'LinesManager' class 
 * below.
 * The handle can also be "null" -- meaning it references no session group (
 * similar to a "null pointer"), in which case the 'sessionGroup()' method 
 * returns null.
 *
 * Note: we use this class rather than a simple SessionGroup object so that we
 * won't need to search the DOM for the <path> representing the session group;
 * instead the (foreground) <path> element is stored in the handle.
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

  /**
   * Compares this handle to 'otherHandle' and returns true if both are null
   * or both are not null and they reference equal session groups. 
   * Session group equality is determined by their names.
   */
  public equalsTo(otherHandle: SessionGroupHandle): boolean {
    if (this.isNull()) {
      return otherHandle.isNull();
    }
    if (otherHandle.isNull()) {
      return false;
    }
    return otherHandle.sessionGroup().name == this.sessionGroup().name;
  }

  private _sessionGroupSel: any /* D3 selection */
};
  
/**
 * Manages the lines representing the session groups. Each session group is
 * represented by two <path> elements with the same control points: a foreground
 * and a background line, with the foreground line always rendered after the
 * background line (it succeeds it in document order). The foreground line is
 * colored based on the value  of the 'color-by' column (specified in options),
 * whereas the background line is gray. The foreground line is displayed only
 * if the session group passes the current axes brush filters. This way, only 
 * session groups that pass the current brush filters will be represented by 
 * colored lines, and the other session groups will be represented by gray 
 * lines. 
 *
 * Note that we could have represented each session group with a single line 
 * with a color that depends on whether the session group passed the brush 
 * filters. However, this would have required us to re-order the DOM to avoid 
 * rendering gray lines on top of colored lines (which would look bad, 
 * especially if the density of lines is large).
 *
 * This class also stores two SessionGroupHandles: peakedSessionGroupHandle and
 * selectedSessionGroupHandle, and provides methods for updating them. These
 * are used to store the peaked session group: the session group whose line
 * is closest to the mouse point. The peaked session group can be selected
 * by clicking the mouse pointer. The currently selected session group is
 * referenced by the selectedSessionGroupHandle.
 */
class LinesManager {
  public constructor(svgProps: SVGProperties,
                     schema: any,
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

  /**
   * Rerenders the foreground lines so that their visibility matches the 
   * current brush filters.
   */
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

  /**
   * Sets the coloring scheme of the (visible) foreground lines.
   * A foreground line will be colored by a color corresponding to the value
   * of the column indexed by colorByColumnIndex in the session group 
   * represented by the line. The color corresponding to a value is
   * interpolated between minColor and maxColor.
   */
  public setForegroundLinesColor(
    colorByColumnIndex: number | null,
    minColor: string,
    maxColor: string) {
    const lineColorFunction =
      this._createLineColorFunction(colorByColumnIndex, minColor, maxColor);
    this._fgPathsSel.attr("stroke", lineColorFunction)
  }

  /**
   * Updates the sessionGroups, colorByColumnIndex, minColor and maxColor and
   * redraws the lines.
   */
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

  /**
   * Returns a handle referencing the closest session group to a given point
   * in the SVG or a null handle if the closest session group is 
   * too far away.
   */ 
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
  private readonly _schema: any;
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
