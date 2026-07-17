import { useParams } from "react-router-dom";
import { Ruler } from "lucide-react";

import { useProjectsStore } from "@/features/plots/hooks/useProjectsStore";
import { useCustomRolesStore } from "@/features/admin/hooks/adminStores";
import { isManagerial as isManagerialUtil } from "@/shared/utils/roleUtils";

import { useAdminMapEditor } from "@/features/plots/hooks/useAdminMapEditor";
import AdminMapCanvas from "@/features/plots/components/AdminMapCanvas";
import AdminMapSidebar from "@/features/plots/components/AdminMapSidebar";
import AdminMapHeader from "@/features/plots/components/AdminMapHeader";
import AdminMapSettings from "@/features/plots/components/AdminMapSettings";

import { User } from "@/shared/types";

interface AdminMapEditorProps {
  user: User;
}

export default function AdminMapEditor({ user }: AdminMapEditorProps) {
  const { id } = useParams<{ id: string }>();
  const { roles: customRoles } = useCustomRolesStore();
  const isManagerial = (roleCode: string) => isManagerialUtil(roleCode, customRoles);

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
    mousePos,
    editingPlot,
    setEditingPlot,
    plotForm,
    setPlotForm,
    snapToGrid,
    setSnapToGrid,
    snapToGeometry,
    setSnapToGeometry,
    snapTolerancePx,
    setSnapTolerancePx,
    subdivisionActive,
    setSubdivisionActive,
    subdivisionForm,
    setSubdivisionForm,
    selectedPlotIds,
    setSelectedPlotIds,
    snappedPoint,
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
    getBoundingBox,
    getCenter,
    getPlotLayer,
    pushToHistory,
    handleUndo,
    handleRedo,
    handleMapEditorImageUpload,
    handleEditShapeClick,
    handleFinishDrawing,
    handleSvgClick,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
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
    startDragLabel,
    insertPoint,
    handleVertexManualEdit,
    handleVertexManualDelete,
    handleSearchFocus,
  } = useAdminMapEditor({
    projectId: id || "",
    project,
    updateProject: updateProject as any,
  });

  const isAuthorized = isManagerial(user?.role);
  if (!isAuthorized) {
    return <div className="p-10 text-center text-red-600 font-bold">Access Denied.</div>;
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return <div className="p-10 text-center dark:text-white">Project not found</div>;
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      <AdminMapHeader
        project={project}
        projectId={id || ""}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearchFocus={handleSearchFocus}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        pastHistoryLength={history.past.length}
        futureHistoryLength={history.future.length}
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
        setCalibrationPoints={() => {}}
        pushToHistory={pushToHistory}
        updateProject={updateProject as any}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div
          ref={viewportRef}
          className="flex-1 relative overflow-auto bg-gray-200 dark:bg-gray-950 flex justify-center items-center p-4"
        >
          <AdminMapCanvas
            project={project}
            layers={layers}
            mode={mode}
            editSubMode={editSubMode}
            activePlotId={activePlotId}
            flashPlotId={flashPlotId}
            selectedPlotIds={selectedPlotIds}
            drawingPoints={drawingPoints}
            slicePoints={slicePoints}
            calibrationPoints={[]}
            mousePos={mousePos}
            snappedPoint={snappedPoint}
            draggedPointIdx={draggedPointIdx}
            setDraggedPointIdx={setDraggedPointIdx}
            draggedLabelId={draggedLabelId}
            isMouseDown={isMouseDown}
            setIsMouseDown={setIsMouseDown}
            mapTransform={mapTransform}
            freeSelectActive={freeSelectActive}
            setSelectedPlotIds={setSelectedPlotIds}
            svgRef={svgRef}
            mapElementRef={mapElementRef}
            handlePlotClick={handlePlotClick}
            handlePlotDoubleClick={handlePlotDoubleClick}
            handleSvgClick={handleSvgClick}
            handleMouseMove={handleMouseMove}
            handleMouseUp={handleMouseUp}
            handleMouseLeave={handleMouseLeave}
            startTransform={startTransform}
            insertPoint={insertPoint}
            startDragLabel={startDragLabel}
            getCenter={getCenter}
            getBoundingBox={getBoundingBox}
            getPlotLayer={getPlotLayer}
          />

          {project.scaleRatio && (
            <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-gray-800/95 shadow-md px-2.5 py-1 rounded text-[10px] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 select-none flex items-center space-x-1.5 font-bold pointer-events-none z-10">
              <Ruler className="w-3.5 h-3.5 text-indigo-505" />
              <span>Scale calibrated: 1 unit = {project.scaleRatio.toFixed(2)} ft</span>
            </div>
          )}

          {mode !== "view" && (
            <div className="absolute bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 md:px-6 py-2 md:py-3 rounded-full shadow-lg flex items-center space-x-2 md:space-x-3 pointer-events-none w-[90%] md:w-auto justify-center text-xs md:text-sm z-10">
              <span>
                {mode === "draw" &&
                  "Click corners to plot polygon. Press Ctrl+Z to undo points. Click 'Save' to input details."}
                {mode === "editShape" &&
                  (editSubMode === "vertices"
                    ? "Drag corners to adjust shape. Click edges to insert a corner. Double-click area for details."
                    : "Use rotation handle (top) or corners to scale shape. Drag area boundary to move.")}
                {mode === "slice" &&
                  (!activePlotId
                    ? "Click an area to choose it for cutting."
                    : "Click two cut points across the area to split it.")}
                {mode === "calibrate" &&
                  "Calibrating map scale..."}
                {mode === "editLabels" &&
                  "Drag green circles/plot labels to change label offset placements."}
              </span>
            </div>
          )}
        </div>

        {editingPlot && (
          <AdminMapSidebar
            editingPlot={editingPlot}
            setEditingPlot={setEditingPlot}
            subdivisionActive={subdivisionActive}
            setSubdivisionActive={setSubdivisionActive}
            subdivisionForm={subdivisionForm}
            setSubdivisionForm={setSubdivisionForm}
            executeSubdivision={executeSubdivision}
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

      <AdminMapSettings
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        project={project}
        updateProject={updateProject as any}
        projectId={id || ""}
        pushToHistory={pushToHistory}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        snapToGeometry={snapToGeometry}
        setSnapToGeometry={setSnapToGeometry}
        snapTolerancePx={snapTolerancePx}
        setSnapTolerancePx={setSnapTolerancePx}
        layers={layers}
        setLayers={setLayers}
        setMode={setMode}
        setCalibrationPoints={() => {}}
        handleMapEditorImageUpload={handleMapEditorImageUpload}
        uploadingImage={uploadingImage}
      />
    </div>
  );
}
