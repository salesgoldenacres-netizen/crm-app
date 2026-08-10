import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Ruler } from "lucide-react";

import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useCustomRolesStore } from "@/features/admin/hooks/adminStores";
import { isManagerial as isManagerialUtil } from "@/shared/utils/roleUtils";

import { useAdminMapEditor } from "@/features/plots/hooks/useAdminMapEditor";
import { useMapEditCapability } from "@/features/plots/hooks/useMapEditCapability";
import AdminMapCanvas from "@/features/plots/components/AdminMapCanvas";
import AdminMapSidebar from "@/features/plots/components/AdminMapSidebar";
import AdminMapHeader from "@/features/plots/components/AdminMapHeader";
import AdminMapSettings from "@/features/plots/components/AdminMapSettings";

import { User } from "@/shared/types";
import InteractionDialog from "@/shared/components/ui/InteractionDialog";

interface AdminMapEditorProps {
  user: User;
}

export default function AdminMapEditor({ user }: AdminMapEditorProps) {
  const { id } = useParams<{ id: string }>();
  const { roles: customRoles } = useCustomRolesStore();
  const isManagerial = (roleCode: string) => isManagerialUtil(roleCode, customRoles);
  const { canEditMaps } = useMapEditCapability();

  const { projects, isLoaded, updateProject } = useProjectsStore();
  const project = projects[id || ""];

  const {
    svgRef,
    viewportRef,
    mapElementRef,
    mode,
    setMode,
    editSubMode,
    setEditSubMode,
    drawingPoints,
    setDrawingPoints,
    activePlotId,
    setActivePlotId,
    draggedPointIdx,
    setDraggedPointIdx,
    draggedLabelId,
    slicePoints,
    setSlicePoints,
    roadCutPoints,
    setRoadCutPoints,
    geometryPreview,
    frontageForm,
    setFrontageForm,
    mousePos,
    editingPlot,
    setEditingPlot,
    plotForm,
    setPlotForm,
    subdivisionActive,
    setSubdivisionActive,
    subdivisionForm,
    setSubdivisionForm,
    selectedPlotIds,
    setSelectedPlotIds,
    showSettings,
    setShowSettings,
    bulkStatus,
    setBulkStatus,
    bulkRate,
    setBulkRate,
    freeSelectActive,
    setFreeSelectActive,
    isMouseDown,
    setIsMouseDown,
    history,
    uploadingImage,
    layers,
    setLayers,
    searchQuery,
    setSearchQuery,
    flashPlotId,
    mapTransform,
    calibrationPoints,
    setCalibrationPoints,
    dragPreviewPlots,
    canUndo,
    canRedo,
    getBoundingBox,
    getCenter,
    getPlotLayer,
    pushToHistory,
    handleUndo,
    handleRedo,
    handleMapEditorImageUpload,
    handleRemoveMapImage,
    handleClearCalibration,
    handleEditShapeClick,
    handleFinishDrawing,
    handleFinishRoadCut,
    handleBatchRenumber,
    executeFrontageSplit,
    handleSvgClick,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleMapPanStart,
    handleMapPanMove,
    handleMapPanEnd,
    resetMapTransform,
    handleMergePlots,
    handlePlotClick,
    handlePlotDoubleClick,
    handleSavePlot,
    handleDeletePlot,
    handleAutoCalculateSize,
    orthogonalizePlot,
    handleDuplicatePlot,
    executeSubdivision,
    handleSelectAll,
    handleBulkDelete,
    startTransform,
    startDragVertex,
    startDragLabel,
    insertPoint,
    handleVertexManualEdit,
    handleVertexManualDelete,
    handleSearchFocus,
    interaction,
    clearInteraction,
  } = useAdminMapEditor({
    projectId: id || "",
    project,
    updateProject: updateProject as any,
  });

  // Force view-only when touch/coarse — never leave silent broken edit modes.
  useEffect(() => {
    if (canEditMaps) return;
    setMode("view");
    setEditingPlot(null);
    setShowSettings(false);
    setSelectedPlotIds([]);
    setDrawingPoints([]);
    setSlicePoints([]);
    setFreeSelectActive(false);
  }, [
    canEditMaps,
    setMode,
    setEditingPlot,
    setShowSettings,
    setSelectedPlotIds,
    setDrawingPoints,
    setSlicePoints,
    setFreeSelectActive,
  ]);

  const isAuthorized = isManagerial(user?.role);
  if (!isAuthorized) {
    return (
      <div className="p-10 text-center text-theme-danger font-bold">Access Denied.</div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <div
          className="w-16 h-16 border-4 border-theme-accent border-t-transparent rounded-full animate-spin"
          role="status"
          aria-label="Loading map editor"
        />
      </div>
    );
  }

  if (!project) {
    return <div className="p-10 text-center text-theme-text">Project not found</div>;
  }

  const gatedPlotClick = canEditMaps ? handlePlotClick : () => undefined;
  const gatedPlotDoubleClick = canEditMaps
    ? handlePlotDoubleClick
    : () => undefined;
  const gatedSvgClick = canEditMaps ? handleSvgClick : () => undefined;

  // Enable Undo while drawing even when plot-history past is empty.
  const pastHistoryLength = canUndo
    ? Math.max(history.past.length, mode === "draw" && drawingPoints.length > 0 ? 1 : 0)
    : 0;
  const futureHistoryLength = canRedo ? history.future.length : 0;

  return (
    <div className="h-full min-h-0 flex flex-col bg-theme-bg transition-colors">
      <AdminMapHeader
        project={project}
        projectId={id || ""}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearchFocus={handleSearchFocus}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        resetMapTransform={resetMapTransform}
        pastHistoryLength={pastHistoryLength}
        futureHistoryLength={futureHistoryLength}
        mode={mode}
        setMode={setMode}
        setActivePlotId={setActivePlotId}
        setSelectedPlotIds={setSelectedPlotIds}
        setSlicePoints={setSlicePoints}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        selectedPlotIds={selectedPlotIds}
        freeSelectActive={freeSelectActive}
        setFreeSelectActive={setFreeSelectActive}
        bulkStatus={bulkStatus}
        setBulkStatus={setBulkStatus}
        bulkRate={bulkRate}
        setBulkRate={setBulkRate}
        handleMergePlots={handleMergePlots}
        handleBulkDelete={handleBulkDelete}
        handleSelectAll={handleSelectAll}
        editSubMode={editSubMode}
        setEditSubMode={setEditSubMode}
        setDrawingPoints={setDrawingPoints}
        handleFinishDrawing={handleFinishDrawing}
        setCalibrationPoints={setCalibrationPoints}
        setRoadCutPoints={setRoadCutPoints}
        handleFinishRoadCut={handleFinishRoadCut}
        handleBatchRenumber={handleBatchRenumber}
        pushToHistory={pushToHistory}
        updateProject={updateProject as any}
        canEditMaps={canEditMaps}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div
          ref={viewportRef}
          className="flex-1 relative overflow-hidden bg-theme-surface flex justify-center items-center p-4 touch-none"
          onMouseDown={handleMapPanStart}
          onMouseMove={(e) => {
            if (isMouseDown) handleMapPanMove(e);
          }}
          onMouseUp={() => {
            handleMapPanEnd();
            handleMouseUp();
          }}
          onMouseLeave={() => {
            handleMapPanEnd();
            handleMouseLeave();
          }}
        >
          <AdminMapCanvas
            project={
              dragPreviewPlots
                ? { ...project, plots: dragPreviewPlots }
                : project
            }
            layers={layers}
            mode={canEditMaps ? mode : "view"}
            editSubMode={editSubMode}
            activePlotId={activePlotId}
            flashPlotId={flashPlotId}
            selectedPlotIds={canEditMaps ? selectedPlotIds : []}
            drawingPoints={canEditMaps ? drawingPoints : []}
            slicePoints={canEditMaps ? slicePoints : []}
            calibrationPoints={calibrationPoints}
            roadCutPoints={canEditMaps ? roadCutPoints : []}
            geometryPreview={canEditMaps ? geometryPreview : null}
            mousePos={mousePos}
            draggedPointIdx={draggedPointIdx}
            setDraggedPointIdx={setDraggedPointIdx}
            draggedLabelId={draggedLabelId}
            isMouseDown={isMouseDown}
            setIsMouseDown={setIsMouseDown}
            mapTransform={mapTransform}
            freeSelectActive={canEditMaps && freeSelectActive}
            setSelectedPlotIds={setSelectedPlotIds}
            svgRef={svgRef}
            mapElementRef={mapElementRef}
            handlePlotClick={gatedPlotClick}
            handlePlotDoubleClick={gatedPlotDoubleClick}
            handleSvgClick={gatedSvgClick}
            handleMouseMove={handleMouseMove}
            handleMouseUp={handleMouseUp}
            handleMouseLeave={handleMouseLeave}
            startTransform={startTransform}
            startDragVertex={startDragVertex}
            insertPoint={insertPoint}
            startDragLabel={startDragLabel}
            getCenter={getCenter}
            getBoundingBox={getBoundingBox}
            getPlotLayer={getPlotLayer}
          />

          {project.scaleRatio && (
            <div className="absolute bottom-3 left-3 bg-theme-card/95 shadow-md px-2.5 py-1 rounded-theme text-[10px] text-theme-text border border-theme-border select-none flex items-center space-x-1.5 font-bold pointer-events-none z-10">
              <Ruler className="w-3.5 h-3.5 text-theme-accent" aria-hidden="true" />
              <span>Scale calibrated: 1 unit = {project.scaleRatio.toFixed(2)} ft</span>
            </div>
          )}

          {canEditMaps && mode !== "view" && (
            <div className="absolute bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 bg-theme-text/90 text-theme-bg px-4 md:px-6 py-2 md:py-3 rounded-theme shadow-lg flex items-center space-x-2 md:space-x-3 pointer-events-none w-[90%] md:w-auto justify-center text-xs md:text-sm z-10">
              <span>
                {mode === "draw" &&
                  "Click corners to plot polygon. Ctrl+Z undoes points. Tab: distance+angle. Hold Alt to snap."}
                {mode === "editShape" &&
                  (editSubMode === "vertices"
                    ? "Drag corners to adjust shape. Click edges to insert a corner. Double-click area for details."
                    : "Use rotation handle (top) or corners to scale shape. Drag area boundary to move.")}
                {mode === "slice" &&
                  (!activePlotId
                    ? "Click an area to choose it for cutting."
                    : "Click two cut points across the area to split it.")}
                {mode === "roadCut" &&
                  "Draw a road centerline, then Finish to enter width (ft). Hold Alt to snap."}
                {mode === "calibrate" &&
                  "Click two points on a known distance, then enter feet. Cancel clears the line."}
                {mode === "editLabels" &&
                  "Drag green circles/plot labels to change label offset placements."}
              </span>
            </div>
          )}
        </div>

        {canEditMaps && editingPlot && (
          <AdminMapSidebar
            editingPlot={editingPlot}
            setEditingPlot={setEditingPlot}
            subdivisionActive={subdivisionActive}
            setSubdivisionActive={setSubdivisionActive}
            subdivisionForm={subdivisionForm}
            setSubdivisionForm={setSubdivisionForm}
            executeSubdivision={executeSubdivision}
            frontageForm={frontageForm}
            setFrontageForm={setFrontageForm}
            executeFrontageSplit={executeFrontageSplit}
            plotForm={plotForm}
            setPlotForm={setPlotForm}
            handleSavePlot={handleSavePlot}
            handleDeletePlot={handleDeletePlot}
            handleEditShapeClick={handleEditShapeClick}
            handleDuplicatePlot={handleDuplicatePlot}
            orthogonalizePlot={orthogonalizePlot}
            project={project}
            handleAutoCalculateSize={handleAutoCalculateSize}
            handleVertexManualEdit={handleVertexManualEdit}
            handleVertexManualDelete={handleVertexManualDelete}
          />
        )}
      </div>

      {canEditMaps && (
        <AdminMapSettings
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          project={project}
          updateProject={updateProject as any}
          projectId={id || ""}
          pushToHistory={pushToHistory}
          layers={layers}
          setLayers={setLayers as any}
          setMode={setMode}
          setCalibrationPoints={setCalibrationPoints as any}
          handleMapEditorImageUpload={handleMapEditorImageUpload}
          uploadingImage={uploadingImage}
          handleRemoveMapImage={handleRemoveMapImage}
          handleClearCalibration={handleClearCalibration}
          setDrawingPoints={setDrawingPoints}
          setSlicePoints={setSlicePoints}
          setActivePlotId={setActivePlotId}
          setSelectedPlotIds={setSelectedPlotIds}
        />
      )}

      <InteractionDialog state={interaction} onClose={clearInteraction} />
    </div>
  );
}
